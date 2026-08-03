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
  for (const [index, channel] of channels.entries()) {
    if (!channel || typeof channel !== "object") {
      throw new TypeError(`channels[${index}] must be an object`);
    }
    if (typeof channel.channelId !== "string" || channel.channelId.length === 0) {
      throw new TypeError(`channels[${index}].channelId is required`);
    }
    if ((channel.status ?? "active") !== "active") continue;
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
  if (active.length === 0) {
    throw new Error("YouTube RSS pilot has no active channels");
  }
  return Object.freeze(active);
}

function safeFailure(error) {
  return String(error?.message ?? error ?? "unknown error")
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 500);
}

function createPilotFailure(message, channelResults) {
  const error = new Error(message);
  error.channelResults = Object.freeze([...channelResults]);
  return error;
}

function validateVideo(video, channelId) {
  if (!video || typeof video !== "object") {
    throw new TypeError(`Channel ${channelId} returned an invalid video`);
  }
  const sourceItem = video.sourceItem;
  if (
    !sourceItem ||
    sourceItem.sourceType !== "youtube_video" ||
    typeof sourceItem.externalId !== "string" ||
    typeof sourceItem.sourceKey !== "string"
  ) {
    throw new TypeError(`Channel ${channelId} returned an invalid source item`);
  }
  if (video.channelId && video.channelId !== channelId) {
    throw new Error(
      `Channel ${channelId} returned video ${sourceItem.externalId} for another channel`,
    );
  }
}

export async function captureYouTubeRssPilot({
  rssClient,
  channels,
  capturedAt = new Date().toISOString(),
} = {}) {
  assertInterface(rssClient, "getChannelFeed", "rssClient");
  const activeChannels = normalizeChannels(channels);
  const captured = normalizeTimestamp(capturedAt, "capturedAt");
  const channelResults = [];
  const videos = new Map();
  let succeededChannels = 0;
  let failedChannels = 0;
  let metricSnapshotCount = 0;

  for (const channel of activeChannels) {
    try {
      const feed = await rssClient.getChannelFeed({
        channelId: channel.channelId,
        capturedAt: captured,
      });
      if (!feed || !Array.isArray(feed.videos)) {
        throw new TypeError("RSS client returned an invalid feed");
      }
      let acceptedVideos = 0;
      let acceptedSnapshots = 0;
      for (const video of feed.videos) {
        validateVideo(video, channel.channelId);
        const key = video.sourceItem.sourceKey;
        if (videos.has(key)) continue;
        const metricSnapshot = video.metricSnapshot ?? null;
        videos.set(
          key,
          Object.freeze({
            channel,
            sourceItem: video.sourceItem,
            metricSnapshot,
            ingestionSource: video.ingestionSource ?? "youtube_atom_feed",
          }),
        );
        acceptedVideos += 1;
        if (metricSnapshot !== null) {
          acceptedSnapshots += 1;
          metricSnapshotCount += 1;
        }
      }
      succeededChannels += 1;
      channelResults.push(
        Object.freeze({
          channel,
          status: "succeeded",
          feedTitle: feed.feedTitle ?? null,
          discoveredVideos: feed.videos.length,
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
          feedTitle: null,
          discoveredVideos: 0,
          acceptedVideos: 0,
          acceptedMetricSnapshots: 0,
          error: safeFailure(error),
        }),
      );
    }
  }

  if (succeededChannels === 0) {
    throw createPilotFailure(
      "YouTube RSS pilot captured no successful channels",
      channelResults,
    );
  }
  if (videos.size === 0) {
    throw createPilotFailure(
      "YouTube RSS pilot captured no videos",
      channelResults,
    );
  }

  return Object.freeze({
    artifactVersion: "youtube-rss-pilot-v1",
    evidenceClass: "public_metadata_capture",
    promotionGate: "METRIC_CONFIRMATION_REQUIRED",
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
