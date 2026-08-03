import assert from "node:assert/strict";
import test from "node:test";
import { createYouTubeMetadataReader } from "../src/youtube-metadata.mjs";

test("metadata projection reads latest revisions and both channel payload shapes", async () => {
  let request;
  const reader = createYouTubeMetadataReader({
    query: async (text, params) => {
      request = { text, params };
      return [
        {
          source_identity_id: "source-1",
          external_id: "video-1",
          source_url: "https://www.youtube.com/watch?v=video-1",
          title: "Agent memory",
          body: "Description",
          published_at: "2026-08-03T00:00:00Z",
          channel_id: "channel-1",
          captured_at: "2026-08-03T01:00:00Z",
          ingestion_source: "youtube_atom_feed",
        },
      ];
    },
  });

  const rows = await reader.listYouTubeMetadataRows({
    since: "2026-08-01T00:00:00Z",
    limit: 200,
  });

  assert.match(request.text, /DISTINCT ON \(revision\.source_identity_id\)/);
  assert.match(request.text, /raw_payload #>> '\{snippet,channelId\}'/);
  assert.match(request.text, /raw_payload ->> 'channelId'/);
  assert.deepEqual(request.params, ["2026-08-01T00:00:00.000Z", 200]);
  assert.deepEqual(rows[0], {
    sourceIdentityId: "source-1",
    externalId: "video-1",
    sourceUrl: "https://www.youtube.com/watch?v=video-1",
    title: "Agent memory",
    body: "Description",
    publishedAt: "2026-08-03T00:00:00Z",
    channelId: "channel-1",
    capturedAt: "2026-08-03T01:00:00Z",
    ingestionSource: "youtube_atom_feed",
  });
});

test("metadata projection is bounded and rejects invalid limits", async () => {
  const reader = createYouTubeMetadataReader({ query: async () => [] });
  await assert.rejects(
    () => reader.listYouTubeMetadataRows({ since: "2026-08-01T00:00:00Z", limit: 0 }),
    /1 to 20000/,
  );
});

test("metadata projection redacts Neon credentials", async () => {
  const reader = createYouTubeMetadataReader({
    query: async () => {
      throw new Error(
        "failed postgresql://owner:npg_supersecret@host.neon.tech/neondb npg_supersecret",
      );
    },
  });
  await assert.rejects(
    () => reader.listYouTubeMetadataRows({ since: "2026-08-01T00:00:00Z" }),
    (error) =>
      error.message.includes("[REDACTED_DATABASE_URL]") &&
      !error.message.includes("npg_supersecret"),
  );
});
