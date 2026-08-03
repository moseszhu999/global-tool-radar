import {
  createMetricSnapshot,
  createSourceItem,
} from "../../../source-records/src/index.mjs";

const DEFAULT_ENDPOINT = "https://www.googleapis.com/youtube/v3";
const MAX_BATCH_SIZE = 50;

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function toSafeCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

function buildRequest(endpoint, resource, params, apiKey) {
  const url = new URL(`${endpoint.replace(/\/$/, "")}/${resource}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("key", apiKey);
  const requestUrl = url.toString();
  const redactedUrl = requestUrl.replace(
    encodeURIComponent(apiKey),
    "[REDACTED]",
  );
  return { url: requestUrl, redactedUrl };
}

async function parseResponse(response, redactedUrl) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const reason =
      payload?.error?.errors?.[0]?.reason ??
      payload?.error?.message ??
      `HTTP ${response.status}`;
    throw new Error(`YouTube API request failed (${reason}) at ${redactedUrl}`);
  }
  if (!payload || typeof payload !== "object") {
    throw new Error(`YouTube API returned an invalid JSON object at ${redactedUrl}`);
  }
  return payload;
}

export function createYouTubeClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = DEFAULT_ENDPOINT,
} = {}) {
  assertNonEmptyString(apiKey, "apiKey");
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }

  async function request(resource, params) {
    const { url, redactedUrl } = buildRequest(endpoint, resource, params, apiKey);
    const response = await fetchImpl(url, { method: "GET" });
    return parseResponse(response, redactedUrl);
  }

  return Object.freeze({
    async getChannel(channelId) {
      assertNonEmptyString(channelId, "channelId");
      const payload = await request("channels", {
        part: "contentDetails,snippet,statistics",
        id: channelId,
        maxResults: 1,
      });
      const channel = payload.items?.[0] ?? null;
      if (!channel) return null;
      return Object.freeze({
        channelId: channel.id,
        title: channel.snippet?.title ?? "",
        uploadsPlaylistId:
          channel.contentDetails?.relatedPlaylists?.uploads ?? null,
        subscriberCount: toSafeCount(channel.statistics?.subscriberCount),
        videoCount: toSafeCount(channel.statistics?.videoCount),
        hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount === true,
        rawPayload: channel,
      });
    },

    async listUploadVideoIds({ playlistId, pageToken = null, maxResults = 50 }) {
      assertNonEmptyString(playlistId, "playlistId");
      if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_BATCH_SIZE) {
        throw new TypeError("maxResults must be an integer from 1 to 50");
      }
      const payload = await request("playlistItems", {
        part: "contentDetails,snippet",
        playlistId,
        maxResults,
        pageToken,
      });
      return Object.freeze({
        videoIds: Object.freeze(
          (payload.items ?? [])
            .map(
              (item) =>
                item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId,
            )
            .filter(Boolean),
        ),
        nextPageToken: payload.nextPageToken ?? null,
      });
    },

    async getVideos(videoIds) {
      if (!Array.isArray(videoIds) || videoIds.length === 0) {
        throw new TypeError("videoIds must be a non-empty array");
      }
      if (videoIds.length > MAX_BATCH_SIZE) {
        throw new TypeError("videoIds supports at most 50 IDs per request");
      }
      for (const videoId of videoIds) assertNonEmptyString(videoId, "videoId");
      const payload = await request("videos", {
        part: "snippet,statistics,contentDetails,status",
        id: videoIds.join(","),
      });
      return Object.freeze(payload.items ?? []);
    },
  });
}

export function normalizeYouTubeVideo(video, capturedAt) {
  if (!video || typeof video !== "object") {
    throw new TypeError("video must be an object");
  }
  assertNonEmptyString(video.id, "video.id");
  const sourceItem = createSourceItem({
    sourceType: "youtube_video",
    externalId: video.id,
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    title: video.snippet?.title ?? video.id,
    body: video.snippet?.description ?? "",
    publishedAt: video.snippet?.publishedAt ?? null,
    capturedAt,
    rawPayload: video,
  });
  const observableMetrics = {
    viewCount: toSafeCount(video.statistics?.viewCount),
    likeCount: toSafeCount(video.statistics?.likeCount),
    commentCount: toSafeCount(video.statistics?.commentCount),
  };
  const metricSnapshot = Object.values(observableMetrics).some((value) => value !== null)
    ? createMetricSnapshot({
        sourceItemId: sourceItem.sourceKey,
        capturedAt,
        metrics: observableMetrics,
      })
    : null;
  return Object.freeze({
    sourceItem,
    metricSnapshot,
    channelId: video.snippet?.channelId ?? null,
    duration: video.contentDetails?.duration ?? null,
    privacyStatus: video.status?.privacyStatus ?? null,
    licenseCode: video.status?.license ?? null,
  });
}
