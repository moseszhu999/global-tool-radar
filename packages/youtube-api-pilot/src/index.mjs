import { createSourceItem } from "../../source-records/src/index.mjs";
import { normalizeYouTubeVideo } from "../../connectors/youtube/src/index.mjs";

function assertInterface(value, method, field) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${field}.${method} must be a function`);
  }
}

function normalizeTimestamp(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function normalizeChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("channels must be a non-empty array");
  }
  const active = [];
  const seen = new Set();
  for (const [index, channel] of channels.entries()) {
    if (!channel || typeof channel !== "object") {
      throw new TypeError(`channels[${index}] must be an object`);
    }
    if (typeof channel.channelId !== "string" || channel.channelId.length === 0) {
      throw new TypeError(`channels[${index}].channelId is required`);
    }
    if ((channel.status ?? "active") !== "active") continue;
    if (seen.has(channel.channelId)) {
      throw new Error(`Duplicate channel ${channel.channelId}`);
    }
    seen.add(channel.channelId);
    active.push(
      Object.freeze({
        channelId: channel.channelId,
        title: channel.title ?? null,
        officialHandle: channel.officialHandle ?? null,
        category: channel.category ?? null,
        evidenceUrl: channel.evidenceUrl ?? null,
      }),
    );
  }
  if (active.length === 0) throw new Error("YouTube API pilot has no active channels");
  return Object.freeze(active);
}

function safeFailure(error) {
  return String(error?.message ?? error ?? "unknown error")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]")
    .slice(0, 500);
}

function normalizeApiVideo(video, channel, capturedAt) {
  const normalized = normalizeYouTubeVideo(video, capturedAt);
  if (normalized.channelId !== channel.channelId) {
    throw new Error(
      `Video ${normalized.sourceItem.externalId} belongs to an unexpected channel`,
    );
  }
  const sourceItem = createSourceItem({
    sourceType: normalized.sourceItem.sourceType,
    externalId: normalized.sourceItem.externalId,
    sourceUrl: normalized.sourceItem.sourceUrl,
    title: normalized.sourceItem.title,
    body: normalized.sourceItem.body,
    publishedAt: normalized.sourceItem.publishedAt,
    capturedAt: normalized.sourceItem.capturedAt,
    rawPayload: {
      ingestionSource: "youtube_data_api",
      videoId: normalized.sourceItem.externalId,
      channelId: channel.channelId,
      apiPayload: normalized.sourceItem.rawPayload,
    },
  });
  return Object.freeze({
    channel,
    sourceItem,
    metricSnapshot: normalized.metricSnapshot,
    ingestionSource: "youtube_data_api",
  });
}

export async function captureYouTubeApiChannels({
  youtubeClient,
  channels,
  capturedAt = new Date().toISOString(),
  maxVideosPerChannel = 15,
} = {}) {
  assertInterface(youtubeClient, "getChannel", "youtubeClient");
  assertInterface(youtubeClient, "listUploadVideoIds", "youtubeClient");
  assertInterface(youtubeClient, "getVideos", "youtubeClient");
  if (
    !Number.isInteger(maxVideosPerChannel) ||
    maxVideosPerChannel < 1 ||
    maxVideosPerChannel > 50
  ) {
    throw new TypeError("maxVideosPerChannel must be an integer from 1 to 50");
  }
  const activeChannels = normalizeChannels(channels);
  const captured = normalizeTimestamp(capturedAt, "capturedAt");
  const channelResults = [];
  const videos = new Map();
  let succeededChannels = 0;
  let failedChannels = 0;
  let metricSnapshotCount = 0;

  for (const channel of activeChannels) {
    try {
      const apiChannel = await youtubeClient.getChannel(channel.channelId);
      if (!apiChannel) throw new Error("YouTube channel not found");
      if (apiChannel.channelId !== channel.channelId) {
        throw new Error("YouTube API returned a different channel");
      }
      if (!apiChannel.uploadsPlaylistId) {
        throw new Error("YouTube uploads playlist is missing");
      }
      const listed = await youtubeClient.listUploadVideoIds({
        playlistId: apiChannel.uploadsPlaylistId,
        maxResults: maxVideosPerChannel,
      });
      const videoIds = [...new Set(listed.videoIds ?? [])].slice(
        0,
        maxVideosPerChannel,
      );
      if (videoIds.length === 0) throw new Error("YouTube channel has no public videos");
      const apiVideos = await youtubeClient.getVideos(videoIds);
      let acceptedVideos = 0;
      let acceptedSnapshots = 0;
      for (const video of apiVideos) {
        const normalized = normalizeApiVideo(video, channel, captured);
        const key = normalized.sourceItem.sourceKey;
        if (videos.has(key)) continue;
        videos.set(key, normalized);
        acceptedVideos += 1;
        if (normalized.metricSnapshot !== null) {
          acceptedSnapshots += 1;
          metricSnapshotCount += 1;
        }
      }
      if (acceptedVideos === 0) {
        throw new Error("YouTube API returned no observable public videos");
      }
      succeededChannels += 1;
      channelResults.push(
        Object.freeze({
          channel,
          status: "succeeded",
          provider: "youtube_data_api",
          feedTitle: apiChannel.title ?? channel.title,
          discoveredVideos: apiVideos.length,
          acceptedVideos,
          acceptedMetricSnapshots: acceptedSnapshots,
          error: null,
        }),
      );
    } catch (error) {
      failedChannels += 1;
      channelResults.push(
        Object.freeze({
          channel,
          status: "failed",
          provider: "youtube_data_api",
          feedTitle: null,
          discoveredVideos: 0,
          acceptedVideos: 0,
          acceptedMetricSnapshots: 0,
          error: safeFailure(error),
        }),
      );
    }
  }

  return Object.freeze({
    provider: "youtube_data_api",
    capturedAt: captured,
    requestedChannels: activeChannels.length,
    succeededChannels,
    failedChannels,
    videoCount: videos.size,
    metricSnapshotCount,
    channels: Object.freeze(channelResults),
    videos: Object.freeze([...videos.values()]),
  });
}
