import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetricSnapshot,
  createSourceItem,
  deriveMetricVelocity,
  hashPayload,
} from "../src/index.mjs";

test("payload hash is stable across object key order", () => {
  assert.equal(hashPayload({ b: 2, a: 1 }), hashPayload({ a: 1, b: 2 }));
});

test("source identity is stable while payload revisions retain distinct hashes", () => {
  const base = {
    sourceType: "youtube_video",
    externalId: "video-123",
    sourceUrl: "https://www.youtube.com/watch?v=video-123",
    title: "A tool demo",
    capturedAt: "2026-08-03T00:00:00Z",
  };
  const first = createSourceItem({ ...base, rawPayload: { title: "A" } });
  const second = createSourceItem({
    ...base,
    capturedAt: "2026-08-03T01:00:00Z",
    rawPayload: { title: "B" },
  });

  assert.equal(first.sourceKey, second.sourceKey);
  assert.notEqual(first.contentHash, second.contentHash);
});

test("unknown metrics remain null and velocity is not fabricated", () => {
  const older = createMetricSnapshot({
    sourceItemId: "source-1",
    capturedAt: "2026-08-03T00:00:00Z",
    metrics: { viewCount: 100, likeCount: null },
  });
  const newer = createMetricSnapshot({
    sourceItemId: "source-1",
    capturedAt: "2026-08-03T02:00:00Z",
    metrics: { viewCount: 160, likeCount: null },
  });

  assert.equal(deriveMetricVelocity(older, newer, "viewCount").perHour, 30);
  assert.equal(deriveMetricVelocity(older, newer, "likeCount").observable, false);
});

test("count decreases are preserved as observed data", () => {
  const older = createMetricSnapshot({
    sourceItemId: "source-1",
    capturedAt: "2026-08-03T00:00:00Z",
    metrics: { commentCount: 20 },
  });
  const newer = createMetricSnapshot({
    sourceItemId: "source-1",
    capturedAt: "2026-08-03T01:00:00Z",
    metrics: { commentCount: 18 },
  });

  const velocity = deriveMetricVelocity(older, newer, "commentCount");
  assert.equal(velocity.delta, -2);
  assert.equal(velocity.direction, "decrease");
});
