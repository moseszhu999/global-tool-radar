import { captureYouTubeApiChannels } from "../../youtube-api-pilot/src/index.mjs";
import { captureYouTubeRssPilot } from "../../youtube-rss-pilot/src/index.mjs";

function assertRatio(value, field) {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new TypeError(`${field} must be greater than 0 and at most 1`);
  }
}

function normalizeTimestamp(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function activeChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("channels must be a non-empty array");
  }
  const active = channels.filter((channel) => (channel?.status ?? "active") === "active");
  if (active.length === 0) throw new Error("YouTube public capture has no active channels");
  return active;
}

function usefulSuccess(result) {
  return result?.status === "succeeded" && result.acceptedVideos > 0;
}

function indexResults(results) {
  return new Map(
    (results ?? []).map((result) => [result.channel.channelId, result]),
  );
}

function providerResult(result, provider) {
  return Object.freeze({ ...result, provider });
}

function failedProviderResult(channel, rssResult, apiResult, apiAvailable) {
  const reasons = [];
  if (rssResult?.error) reasons.push(`RSS: ${rssResult.error}`);
  if (apiResult?.error) reasons.push(`API: ${apiResult.error}`);
  if (!apiAvailable) reasons.push("API: fallback unavailable");
  return Object.freeze({
    channel: Object.freeze({
      channelId: channel.channelId,
      title: channel.title ?? null,
      officialHandle: channel.officialHandle ?? null,
      category: channel.category ?? null,
      evidenceUrl: channel.evidenceUrl ?? null,
    }),
    status: "failed",
    provider: null,
    feedTitle: null,
    discoveredVideos: 0,
    acceptedVideos: 0,
    acceptedMetricSnapshots: 0,
    error: reasons.join(" | ") || "No provider produced public video evidence",
  });
}

function coverageSummary(requested, succeeded, minimumSuccessRatio) {
  const required = Math.ceil(requested * minimumSuccessRatio);
  return Object.freeze({
    requestedChannels: requested,
    succeededChannels: succeeded,
    requiredChannels: required,
    minimumSuccessRatio,
    actualSuccessRatio: succeeded / requested,
  });
}

function createCoverageError(coverage, channels, apiAvailable) {
  const error = new Error(
    `YouTube public capture coverage gate failed: ${coverage.succeededChannels}/${coverage.requestedChannels} channels succeeded; ${coverage.requiredChannels} required`,
  );
  error.code = apiAvailable
    ? "YOUTUBE_PUBLIC_CAPTURE_COVERAGE_FAILED"
    : "YOUTUBE_API_FALLBACK_UNAVAILABLE";
  error.coverage = coverage;
  error.channelResults = channels;
  return error;
}

export async function captureYouTubePublicMetadata({
  rssClient,
  youtubeClient = null,
  channels,
  capturedAt = new Date().toISOString(),
  minimumSuccessRatio = 0.8,
  maxVideosPerChannel = 15,
} = {}) {
  if (!rssClient || typeof rssClient.getChannelFeed !== "function") {
    throw new TypeError("rssClient.getChannelFeed must be a function");
  }
  if (
    youtubeClient !== null &&
    (typeof youtubeClient.getChannel !== "function" ||
      typeof youtubeClient.listUploadVideoIds !== "function" ||
      typeof youtubeClient.getVideos !== "function")
  ) {
    throw new TypeError("youtubeClient must provide the YouTube Data API interface");
  }
  assertRatio(minimumSuccessRatio, "minimumSuccessRatio");
  const active = activeChannels(channels);
  const captured = normalizeTimestamp(capturedAt, "capturedAt");
  const requiredChannels = Math.ceil(active.length * minimumSuccessRatio);

  let rssArtifact = null;
  let rssFailureResults = [];
  try {
    rssArtifact = await captureYouTubeRssPilot({
      rssClient,
      channels: active,
      capturedAt: captured,
    });
  } catch (error) {
    rssFailureResults = error?.channelResults ?? [];
  }

  const rssResults = indexResults(rssArtifact?.channels ?? rssFailureResults);
  const rssSucceededIds = new Set(
    active
      .filter((channel) => usefulSuccess(rssResults.get(channel.channelId)))
      .map((channel) => channel.channelId),
  );
  const fallbackChannels = active.filter(
    (channel) => !rssSucceededIds.has(channel.channelId),
  );

  let apiArtifact = null;
  if (rssSucceededIds.size < requiredChannels && youtubeClient !== null) {
    apiArtifact = await captureYouTubeApiChannels({
      youtubeClient,
      channels: fallbackChannels,
      capturedAt: captured,
      maxVideosPerChannel,
    });
  }
  const apiResults = indexResults(apiArtifact?.channels ?? []);

  const channelResults = active.map((channel) => {
    const rssResult = rssResults.get(channel.channelId);
    if (usefulSuccess(rssResult)) {
      return providerResult(rssResult, "youtube_atom_feed");
    }
    const apiResult = apiResults.get(channel.channelId);
    if (usefulSuccess(apiResult)) return apiResult;
    return failedProviderResult(
      channel,
      rssResult,
      apiResult,
      youtubeClient !== null,
    );
  });

  const succeededChannels = channelResults.filter(usefulSuccess).length;
  const coverage = coverageSummary(
    active.length,
    succeededChannels,
    minimumSuccessRatio,
  );
  if (succeededChannels < requiredChannels) {
    throw createCoverageError(
      coverage,
      Object.freeze(channelResults),
      youtubeClient !== null,
    );
  }

  const videos = new Map();
  for (const video of rssArtifact?.videos ?? []) {
    videos.set(video.sourceItem.sourceKey, video);
  }
  for (const video of apiArtifact?.videos ?? []) {
    if (!videos.has(video.sourceItem.sourceKey)) {
      videos.set(video.sourceItem.sourceKey, video);
    }
  }
  if (videos.size === 0) {
    throw new Error("YouTube public capture produced no videos");
  }
  const mergedVideos = Object.freeze([...videos.values()]);
  const metricSnapshotCount = mergedVideos.filter(
    (video) => video.metricSnapshot !== null,
  ).length;
  const sourceCounts = mergedVideos.reduce(
    (counts, video) => {
      const source = video.ingestionSource ?? "unknown";
      counts[source] = (counts[source] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const apiSucceeded = apiArtifact?.succeededChannels ?? 0;
  const captureMode =
    apiSucceeded === 0
      ? "rss_only"
      : rssSucceededIds.size === 0
        ? "api_fallback"
        : "rss_with_api_fallback";

  return Object.freeze({
    artifactVersion: "youtube-public-capture-v1",
    evidenceClass: "public_metadata_capture",
    promotionGate: "METRIC_CONFIRMATION_REQUIRED",
    capturedAt: captured,
    captureMode,
    requestedChannels: active.length,
    succeededChannels,
    failedChannels: active.length - succeededChannels,
    videoCount: mergedVideos.length,
    metricSnapshotCount,
    channels: Object.freeze(channelResults),
    videos: mergedVideos,
    coverage,
    providerSummary: Object.freeze({
      rss: Object.freeze({
        attemptedChannels: active.length,
        succeededChannels: rssSucceededIds.size,
        failedChannels: active.length - rssSucceededIds.size,
      }),
      youtubeDataApi: Object.freeze({
        available: youtubeClient !== null,
        attemptedChannels: apiArtifact?.requestedChannels ?? 0,
        succeededChannels: apiSucceeded,
        failedChannels: apiArtifact?.failedChannels ?? 0,
      }),
      videoSourceCounts: Object.freeze(sourceCounts),
    }),
  });
}
