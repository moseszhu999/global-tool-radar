import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFailureBackoffMinutes,
  collectUploadVideoIds,
  runYouTubeWatchlistBatch,
  scanYouTubeChannel,
} from "../src/index.mjs";

function video(id, views = "100") {
  return {
    id,
    snippet: {
      title: `Video ${id}`,
      description: "Demo",
      channelId: "channel-1",
      publishedAt: "2026-08-03T00:00:00Z",
    },
    statistics: { viewCount: views, likeCount: "5" },
    contentDetails: { duration: "PT1M" },
    status: { privacyStatus: "public", license: "youtube" },
  };
}

const watch = {
  id: "watch-1",
  channelId: "channel-1",
  scanIntervalMinutes: 120,
  consecutiveFailures: 0,
};

test("collectUploadVideoIds follows pages and removes duplicates", async () => {
  const pages = [
    { videoIds: ["v1", "v2"], nextPageToken: "next" },
    { videoIds: ["v2", "v3"], nextPageToken: null },
  ];
  const ids = await collectUploadVideoIds(
    { async listUploadVideoIds() { return pages.shift(); } },
    "uploads-1",
  );
  assert.deepEqual(ids, ["v1", "v2", "v3"]);
});

test("successful scan persists captures and completes the leased run", async () => {
  const calls = [];
  const repository = {
    async startIngestionRun() { return "run-1"; },
    async persistSourceCapture(normalized) {
      calls.push(normalized.sourceItem.externalId);
      return { revisionInserted: true, snapshotInserted: true };
    },
    async completeYouTubeScan(input) { calls.push(input); },
    async failYouTubeScan() { throw new Error("unexpected failure"); },
  };
  const youtubeClient = {
    async getChannel() {
      return { title: "Tools", uploadsPlaylistId: "uploads-1" };
    },
    async listUploadVideoIds() {
      return { videoIds: ["v1", "v2"], nextPageToken: null };
    },
    async getVideos(ids) { return ids.map((id) => video(id)); },
  };
  const result = await scanYouTubeChannel({
    watch,
    youtubeClient,
    repository,
    workerId: "worker-1",
    now: "2026-08-03T01:00:00Z",
  });
  assert.equal(result.status, "succeeded");
  assert.equal(result.scannedVideoCount, 2);
  assert.deepEqual(calls.slice(0, 2), ["v1", "v2"]);
  assert.equal(calls[2].persistedRevisionCount, 2);
  assert.equal(calls[2].nextScanAt, "2026-08-03T03:00:00.000Z");
});

test("failed scan records a redacted error and exponential backoff", async () => {
  let failure;
  const repository = {
    async startIngestionRun() { return "run-1"; },
    async failYouTubeScan(input) { failure = input; },
  };
  const result = await scanYouTubeChannel({
    watch: { ...watch, consecutiveFailures: 1 },
    youtubeClient: {
      async getChannel() {
        throw new Error("failed at https://x.test?key=top-secret&x=1 quotaExceeded");
      },
    },
    repository,
    workerId: "worker-1",
    now: "2026-08-03T01:00:00Z",
  });
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "YOUTUBE_QUOTA_EXCEEDED");
  assert.ok(!result.errorMessage.includes("top-secret"));
  assert.equal(failure.nextScanAt, "2026-08-03T09:00:00.000Z");
});

test("failure backoff caps at one day", () => {
  assert.equal(
    calculateFailureBackoffMinutes({ scanIntervalMinutes: 240, consecutiveFailures: 10 }),
    1440,
  );
});

test("watchlist batch scans only claimed channels", async () => {
  const repository = {
    async claimDueYouTubeChannels() { return [watch]; },
    async startIngestionRun() { return "run-1"; },
    async persistSourceCapture() { return { revisionInserted: false, snapshotInserted: true }; },
    async completeYouTubeScan() {},
    async failYouTubeScan() {},
  };
  const youtubeClient = {
    async getChannel() { return { title: "Tools", uploadsPlaylistId: "uploads-1" }; },
    async listUploadVideoIds() { return { videoIds: ["v1"], nextPageToken: null }; },
    async getVideos() { return [video("v1")]; },
  };
  const result = await runYouTubeWatchlistBatch({
    repository,
    youtubeClient,
    workerId: "worker-1",
    now: "2026-08-03T01:00:00Z",
  });
  assert.equal(result.claimed, 1);
  assert.equal(result.succeeded, 1);
});
