import assert from "node:assert/strict";
import test from "node:test";
import { createNeonWorkerRepository } from "../src/index.mjs";

const sourceItem = {
  sourceType: "youtube_video",
  externalId: "video-1",
  sourceUrl: "https://www.youtube.com/watch?v=video-1",
  title: "Tool demo",
  body: "Description",
  publishedAt: "2026-08-03T00:00:00Z",
  capturedAt: "2026-08-03T01:00:00Z",
  rawPayload: { snippet: { channelId: "channel-1" } },
  contentHash: "a".repeat(64),
};

test("persistSourceCapture uses one atomic database function", async () => {
  let request;
  const repository = createNeonWorkerRepository({
    query: async (text, params) => {
      request = { text, params };
      return [
        {
          source_identity_id: "0198a52f-854d-7d93-a0c8-bc1952f4ef43",
          revision_inserted: true,
          snapshot_inserted: true,
        },
      ];
    },
  });
  const result = await repository.persistSourceCapture({
    sourceItem,
    metricSnapshot: {
      capturedAt: sourceItem.capturedAt,
      metrics: { viewCount: 100 },
    },
  });
  assert.match(request.text, /persist_toolradar_source_capture_v1/);
  assert.equal(request.params[7], JSON.stringify(sourceItem.rawPayload));
  assert.equal(request.params[9], JSON.stringify({ viewCount: 100 }));
  assert.deepEqual(result, {
    sourceIdentityId: "0198a52f-854d-7d93-a0c8-bc1952f4ef43",
    revisionInserted: true,
    snapshotInserted: true,
  });
});

test("claimDueYouTubeChannels maps Neon rows to canonical watch objects", async () => {
  const repository = createNeonWorkerRepository({
    query: async () => [
      {
        id: "watch-1",
        channel_id: "channel-1",
        title: "Tools",
        uploads_playlist_id: "uploads-1",
        status: "active",
        scan_interval_minutes: 120,
        next_scan_at: "2026-08-03T02:00:00Z",
        last_scan_at: null,
        last_success_at: null,
        consecutive_failures: 0,
        lease_owner: "worker-1",
        lease_expires_at: "2026-08-03T02:15:00Z",
      },
    ],
  });
  const watches = await repository.claimDueYouTubeChannels({
    workerId: "worker-1",
    at: "2026-08-03T02:00:00Z",
  });
  assert.equal(watches[0].channelId, "channel-1");
  assert.equal(watches[0].leaseOwner, "worker-1");
});

test("complete and fail functions are called from FROM only once", async () => {
  const queries = [];
  const repository = createNeonWorkerRepository({
    query: async (text) => {
      queries.push(text);
      return [{ id: "watch-1" }];
    },
  });
  const common = {
    watchlistId: "0198a52f-854d-7d93-a0c8-bc1952f4ef43",
    runId: "0198a52f-854d-7d93-a0c8-bc1952f4ef44",
    workerId: "worker-1",
    at: "2026-08-03T02:00:00Z",
    nextScanAt: "2026-08-03T04:00:00Z",
  };
  await repository.completeYouTubeScan({
    ...common,
    title: "Tools",
    uploadsPlaylistId: "uploads-1",
    scannedVideoCount: 10,
    persistedRevisionCount: 1,
    persistedSnapshotCount: 2,
  });
  await repository.failYouTubeScan({
    ...common,
    errorCode: "quotaExceeded",
    errorMessage: "redacted",
  });
  assert.match(queries[0], /^SELECT \* FROM public\.complete_/);
  assert.match(queries[1], /^SELECT \* FROM public\.fail_/);
  assert.doesNotMatch(queries[0], /\)\.\*/);
});

test("snapshot series preserves unknown view counts as null", async () => {
  const repository = createNeonWorkerRepository({
    query: async () => [
      {
        source_identity_id: "source-1",
        external_id: "video-1",
        title: "Tool",
        published_at: "2026-08-03T00:00:00Z",
        channel_id: "channel-1",
        captured_at: "2026-08-03T01:00:00Z",
        view_count: null,
      },
    ],
  });
  const rows = await repository.listYouTubeSnapshotSeries({
    since: "2026-08-01T00:00:00Z",
  });
  assert.equal(rows[0].viewCount, null);
});

test("database failures redact credentials", async () => {
  const repository = createNeonWorkerRepository({
    query: async () => {
      throw new Error(
        "failed postgresql://owner:npg_supersecret@host.neon.tech/neondb",
      );
    },
  });
  await assert.rejects(
    () =>
      repository.listYouTubeSnapshotSeries({
        since: "2026-08-01T00:00:00Z",
      }),
    (error) =>
      error.message.includes("[REDACTED_DATABASE_URL]") &&
      !error.message.includes("npg_supersecret"),
  );
});
