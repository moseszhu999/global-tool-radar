import { normalizeYouTubeVideo } from "../../connectors/youtube/src/index.mjs";

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function addMinutes(timestamp, minutes) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new TypeError("timestamp must be valid");
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function sanitizeErrorMessage(value) {
  return String(value ?? "unknown error")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

export function classifyIngestionError(error) {
  const message = String(error?.message ?? error);
  if (/quotaExceeded/i.test(message)) return "YOUTUBE_QUOTA_EXCEEDED";
  if (/rateLimitExceeded/i.test(message)) return "YOUTUBE_RATE_LIMITED";
  if (/API key|keyInvalid|forbidden/i.test(message)) return "YOUTUBE_CREDENTIALS_INVALID";
  if (/channel not found/i.test(message)) return "YOUTUBE_CHANNEL_NOT_FOUND";
  if (/uploads playlist/i.test(message)) return "YOUTUBE_UPLOADS_PLAYLIST_MISSING";
  return "YOUTUBE_SCAN_FAILED";
}

export function calculateFailureBackoffMinutes({ scanIntervalMinutes, consecutiveFailures }) {
  if (!Number.isInteger(scanIntervalMinutes) || scanIntervalMinutes < 1) {
    throw new TypeError("scanIntervalMinutes must be a positive integer");
  }
  if (!Number.isInteger(consecutiveFailures) || consecutiveFailures < 0) {
    throw new TypeError("consecutiveFailures must be a non-negative integer");
  }
  const multiplier = 2 ** Math.min(consecutiveFailures + 1, 5);
  return Math.min(scanIntervalMinutes * multiplier, 1440);
}

export async function collectUploadVideoIds(
  youtubeClient,
  playlistId,
  { maxPages = 2, pageSize = 50 } = {},
) {
  if (!youtubeClient || typeof youtubeClient.listUploadVideoIds !== "function") {
    throw new TypeError("youtubeClient.listUploadVideoIds is required");
  }
  assertNonEmptyString(playlistId, "playlistId");
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20) {
    throw new TypeError("maxPages must be an integer from 1 to 20");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new TypeError("pageSize must be an integer from 1 to 50");
  }

  const ids = [];
  let pageToken = null;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await youtubeClient.listUploadVideoIds({
      playlistId,
      pageToken,
      maxResults: pageSize,
    });
    ids.push(...result.videoIds);
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  return Object.freeze([...new Set(ids)]);
}

export async function scanYouTubeChannel({
  watch,
  youtubeClient,
  repository,
  workerId,
  now,
  maxPages = 2,
} = {}) {
  if (!watch || typeof watch !== "object") throw new TypeError("watch is required");
  assertNonEmptyString(workerId, "workerId");
  if (!youtubeClient || typeof youtubeClient.getChannel !== "function") {
    throw new TypeError("youtubeClient is required");
  }
  if (!repository || typeof repository.startIngestionRun !== "function") {
    throw new TypeError("repository is required");
  }
  const capturedAt = new Date(now).toISOString();
  const runId = await repository.startIngestionRun({
    watchlistId: watch.id,
    workerId,
    startedAt: capturedAt,
  });

  try {
    const channel = await youtubeClient.getChannel(watch.channelId);
    if (!channel) throw new Error("YouTube channel not found");
    if (!channel.uploadsPlaylistId) throw new Error("YouTube uploads playlist is missing");

    const videoIds = await collectUploadVideoIds(youtubeClient, channel.uploadsPlaylistId, {
      maxPages,
      pageSize: 50,
    });
    let persistedRevisionCount = 0;
    let persistedSnapshotCount = 0;

    for (const batch of chunks(videoIds, 50)) {
      if (batch.length === 0) continue;
      const videos = await youtubeClient.getVideos(batch);
      for (const video of videos) {
        const normalized = normalizeYouTubeVideo(video, capturedAt);
        const persisted = await repository.persistSourceCapture(normalized);
        if (persisted.revisionInserted) persistedRevisionCount += 1;
        if (persisted.snapshotInserted) persistedSnapshotCount += 1;
      }
    }

    const nextScanAt = addMinutes(capturedAt, watch.scanIntervalMinutes);
    await repository.completeYouTubeScan({
      watchlistId: watch.id,
      runId,
      workerId,
      at: capturedAt,
      nextScanAt,
      title: channel.title,
      uploadsPlaylistId: channel.uploadsPlaylistId,
      scannedVideoCount: videoIds.length,
      persistedRevisionCount,
      persistedSnapshotCount,
    });

    return Object.freeze({
      status: "succeeded",
      watchlistId: watch.id,
      runId,
      channelId: watch.channelId,
      scannedVideoCount: videoIds.length,
      persistedRevisionCount,
      persistedSnapshotCount,
      nextScanAt,
    });
  } catch (error) {
    const errorCode = classifyIngestionError(error);
    const errorMessage = sanitizeErrorMessage(error?.message ?? error);
    const backoffMinutes = calculateFailureBackoffMinutes({
      scanIntervalMinutes: watch.scanIntervalMinutes,
      consecutiveFailures: watch.consecutiveFailures ?? 0,
    });
    const nextScanAt = addMinutes(capturedAt, backoffMinutes);
    await repository.failYouTubeScan({
      watchlistId: watch.id,
      runId,
      workerId,
      at: capturedAt,
      nextScanAt,
      errorCode,
      errorMessage,
    });
    return Object.freeze({
      status: "failed",
      watchlistId: watch.id,
      runId,
      channelId: watch.channelId,
      errorCode,
      errorMessage,
      nextScanAt,
    });
  }
}

export async function runYouTubeWatchlistBatch({
  repository,
  youtubeClient,
  workerId,
  now = new Date().toISOString(),
  limit = 10,
  leaseMinutes = 15,
  maxPages = 2,
} = {}) {
  assertNonEmptyString(workerId, "workerId");
  const watches = await repository.claimDueYouTubeChannels({
    workerId,
    at: now,
    limit,
    leaseMinutes,
  });
  const results = [];
  for (const watch of watches) {
    results.push(
      await scanYouTubeChannel({
        watch,
        youtubeClient,
        repository,
        workerId,
        now,
        maxPages,
      }),
    );
  }
  return Object.freeze({
    workerId,
    claimed: watches.length,
    succeeded: results.filter((result) => result.status === "succeeded").length,
    failed: results.filter((result) => result.status === "failed").length,
    results: Object.freeze(results),
  });
}
