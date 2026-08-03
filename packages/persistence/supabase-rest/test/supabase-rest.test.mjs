import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseWorkerRepository } from "../src/index.mjs";

function response(payload, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    status,
    ok,
    async json() {
      return payload;
    },
  };
}

const sourceItem = {
  sourceType: "youtube_video",
  externalId: "video-1",
  sourceUrl: "https://www.youtube.com/watch?v=video-1",
  title: "Tool demo",
  body: "Description",
  publishedAt: "2026-08-03T00:00:00.000Z",
  capturedAt: "2026-08-03T01:00:00.000Z",
  rawPayload: { id: "video-1" },
  contentHash: "a".repeat(64),
};
const metricSnapshot = {
  sourceItemId: "youtube_video:video-1",
  capturedAt: "2026-08-03T01:00:00.000Z",
  metrics: {
    viewCount: 100,
    likeCount: 10,
    commentCount: null,
    voteCount: null,
    starCount: null,
    forkCount: null,
    downloadCount: null,
  },
};

test("persistSourceCapture upserts identity and appends revision and snapshot", async () => {
  const requests = [];
  const replies = [
    response([{ id: "identity-1" }]),
    response([{ id: "revision-1" }]),
    response([{ id: "snapshot-1" }]),
  ];
  const repository = createSupabaseWorkerRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-secret",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return replies.shift();
    },
  });

  const result = await repository.persistSourceCapture({ sourceItem, metricSnapshot });
  assert.deepEqual(result, {
    sourceIdentityId: "identity-1",
    revisionInserted: true,
    snapshotInserted: true,
  });
  assert.match(requests[0].url, /toolradar_source_identities/);
  assert.match(requests[0].url, /on_conflict=source_type%2Cexternal_id/);
  assert.equal(requests[0].options.headers.Authorization, "Bearer service-secret");
  assert.match(requests[1].url, /toolradar_source_revisions/);
  assert.match(requests[2].url, /toolradar_metric_snapshots/);
});

test("duplicate revision and snapshot are reported without fake inserts", async () => {
  const replies = [response([{ id: "identity-1" }]), response([]), response([])];
  const repository = createSupabaseWorkerRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-secret",
    fetchImpl: async () => replies.shift(),
  });
  const result = await repository.persistSourceCapture({ sourceItem, metricSnapshot });
  assert.equal(result.revisionInserted, false);
  assert.equal(result.snapshotInserted, false);
});

test("claimDueYouTubeChannels maps RPC rows to canonical watch objects", async () => {
  const repository = createSupabaseWorkerRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-secret",
    fetchImpl: async () =>
      response([
        {
          id: "watch-1",
          channel_id: "channel-1",
          title: "Tools",
          uploads_playlist_id: "uploads-1",
          status: "active",
          scan_interval_minutes: 120,
          next_scan_at: "2026-08-03T01:00:00Z",
          consecutive_failures: 0,
          lease_owner: "worker-1",
          lease_expires_at: "2026-08-03T01:15:00Z",
        },
      ]),
  });
  const rows = await repository.claimDueYouTubeChannels({
    workerId: "worker-1",
    at: "2026-08-03T01:00:00Z",
  });
  assert.equal(rows[0].channelId, "channel-1");
  assert.equal(rows[0].scanIntervalMinutes, 120);
  assert.equal(rows[0].leaseOwner, "worker-1");
});

test("Supabase failures do not expose the service role key", async () => {
  const repository = createSupabaseWorkerRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-secret",
    fetchImpl: async () => response({ code: "42501", message: "denied" }, { status: 403 }),
  });
  await assert.rejects(
    () =>
      repository.claimDueYouTubeChannels({
        workerId: "worker-1",
        at: "2026-08-03T01:00:00Z",
      }),
    (error) => error.message.includes("42501") && !error.message.includes("service-secret"),
  );
});

test("snapshot series preserves unknown counts as null", async () => {
  const repository = createSupabaseWorkerRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-secret",
    fetchImpl: async () =>
      response([
        {
          source_identity_id: "identity-1",
          external_id: "video-1",
          title: "Tool",
          published_at: "2026-08-03T00:00:00Z",
          channel_id: "channel-1",
          captured_at: "2026-08-03T01:00:00Z",
          view_count: null,
        },
      ]),
  });
  const rows = await repository.listYouTubeSnapshotSeries({
    since: "2026-07-20T00:00:00Z",
  });
  assert.equal(rows[0].viewCount, null);
});
