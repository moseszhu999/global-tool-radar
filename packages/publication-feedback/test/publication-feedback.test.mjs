import test from "node:test";
import assert from "node:assert/strict";
import { buildBoundedFeedbackReport } from "../src/index.mjs";

const receipt = {
  platform: "bilibili",
  platformVideoId: "BV1REAL123",
  canonicalUrl: "https://www.bilibili.com/video/BV1REAL123",
  publishedAt: "2026-08-05T02:00:00.000Z",
  mediaSha256: "13a72f8139040d15956c1cbc74d45f0193a7eb9269bbeec2e3a6292cddf87f1c",
  humanConfirmed: true,
};

function snapshot(capturedAt, views, completionRate) {
  return {
    platform: receipt.platform,
    platformVideoId: receipt.platformVideoId,
    mediaSha256: receipt.mediaSha256,
    capturedAt,
    humanConfirmed: true,
    metrics: {
      views,
      likes: null,
      comments: null,
      favorites: null,
      shares: null,
      followersGained: null,
      averageWatchSeconds: null,
      completionRate,
    },
  };
}

test("builds a bounded report from two real snapshots", () => {
  const report = buildBoundedFeedbackReport({
    publicationReceipt: receipt,
    analyticsSnapshots: [
      snapshot("2026-08-05T03:00:00.000Z", 100, 0.41),
      snapshot("2026-08-05T05:00:00.000Z", 160, 0.46),
    ],
    generatedAt: "2026-08-05T05:01:00.000Z",
  });
  assert.equal(report.deltas.views.absolute, 60);
  assert.equal(report.deltas.completionRate.absolute, 0.05);
  assert.equal(report.gates.causalClaimAllowed, false);
  assert.equal(report.gates.automaticContentMutationAllowed, false);
  assert.equal(report.gates.automaticRepublishingAllowed, false);
});

test("rejects a single snapshot", () => {
  assert.throws(() => buildBoundedFeedbackReport({
    publicationReceipt: receipt,
    analyticsSnapshots: [snapshot("2026-08-05T03:00:00.000Z", 100, 0.41)],
  }), /at least two real analytics snapshots/);
});

test("rejects mismatched media evidence", () => {
  const bad = snapshot("2026-08-05T03:00:00.000Z", 100, 0.41);
  bad.mediaSha256 = "0".repeat(64);
  assert.throws(() => buildBoundedFeedbackReport({
    publicationReceipt: receipt,
    analyticsSnapshots: [bad, snapshot("2026-08-05T04:00:00.000Z", 120, 0.43)],
  }), /media digest mismatch/);
});

test("keeps unknown metrics null instead of inventing zero", () => {
  const report = buildBoundedFeedbackReport({
    publicationReceipt: receipt,
    analyticsSnapshots: [
      snapshot("2026-08-05T03:00:00.000Z", 0, null),
      snapshot("2026-08-05T04:00:00.000Z", 10, null),
    ],
  });
  assert.equal(report.deltas.likes.absolute, null);
  assert.equal(report.deltas.views.relative, null);
});
