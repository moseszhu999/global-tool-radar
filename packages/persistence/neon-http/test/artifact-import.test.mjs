import assert from "node:assert/strict";
import test from "node:test";
import { createNeonArtifactImportRepository } from "../src/artifact-import.mjs";

function capture(id = "abcDEF12345") {
  return {
    sourceItem: {
      sourceType: "youtube_video",
      externalId: id,
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      title: "Video",
      body: "Description",
      publishedAt: "2026-08-03T01:00:00Z",
      capturedAt: "2026-08-03T05:00:00Z",
      rawPayload: { channelId: "UCXZCJLdBC09xxGZ6gcdrc6A", videoId: id },
      contentHash: "a".repeat(64),
    },
    metricSnapshot: {
      metrics: { viewCount: 100, likeCount: null },
    },
  };
}

test("batch persistence uses one atomic database statement", async () => {
  let call;
  const repository = createNeonArtifactImportRepository({
    query: async (text, params) => {
      call = { text, params };
      return [{ processed: 2, revisions_inserted: 2, snapshots_inserted: 2 }];
    },
  });
  const result = await repository.persistSourceCaptureBatch([
    capture("abcDEF12345"),
    capture("ZYX98765432"),
  ]);
  assert.match(call.text, /jsonb_to_recordset\(\$1::jsonb\)/);
  assert.match(call.text, /CROSS JOIN LATERAL public\.persist_toolradar_source_capture_v1/);
  assert.equal(call.params.length, 1);
  assert.equal(JSON.parse(call.params[0]).length, 2);
  assert.deepEqual(result, {
    processed: 2,
    revisionsInserted: 2,
    snapshotsInserted: 2,
  });
});

test("batch limits reject unbounded writes before query execution", async () => {
  let called = false;
  const repository = createNeonArtifactImportRepository({
    query: async () => {
      called = true;
    },
  });
  await assert.rejects(() => repository.persistSourceCaptureBatch([]), /1 to 100/);
  await assert.rejects(
    () => repository.persistSourceCaptureBatch(Array.from({ length: 101 }, (_, i) => capture(String(i)))),
    /1 to 100/,
  );
  assert.equal(called, false);
});

test("database failures redact connection strings and Neon passwords", async () => {
  const repository = createNeonArtifactImportRepository({
    query: async () => {
      throw new Error(
        "failed postgresql://user:npg_secret@host/db with npg_secret",
      );
    },
  });
  await assert.rejects(
    () => repository.persistSourceCaptureBatch([capture()]),
    (error) =>
      error.message.includes("REDACTED_DATABASE") &&
      !error.message.includes("npg_secret"),
  );
});
