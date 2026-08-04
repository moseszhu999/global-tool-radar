import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicationIntakePlan,
  validatePublicationReceipt,
  validateAnalyticsSnapshot,
  buildFeedbackReadiness,
} from "../src/index.mjs";

const releasePackage = {
  schemaVersion: "toolradar.platform-release-package.v1",
  releasePackageId: "video-case:test:release:v1",
  sourceCaseId: "video-case:test",
  media: { sha256: "a".repeat(64) },
};

const plan = buildPublicationIntakePlan({ releasePackage, generatedAt: "2026-08-04T13:00:00.000Z" });

function realReceipt(overrides = {}) {
  return {
    ...plan.platforms.douyin.publicationReceiptTemplate,
    platformVideoId: "real-platform-video-id",
    canonicalUrl: "https://www.douyin.com/video/real-platform-video-id",
    publishedAt: "2026-08-04T13:10:00.000Z",
    capturedAt: "2026-08-04T13:12:00.000Z",
    captureMethod: "platform_ui",
    evidenceUrl: "https://www.douyin.com/video/real-platform-video-id",
    operatorConfirmed: true,
    ...overrides,
  };
}

test("intake plan remains blocked before real publication", () => {
  assert.equal(plan.state, "AWAITING_REAL_PUBLICATION");
  assert.equal(plan.gates.analyticsCollectionAllowed, false);
  assert.equal(plan.policy.fabricatedMetricsAllowed, false);
  assert.deepEqual(buildFeedbackReadiness({ intakePlan: plan }).blockers, ["REAL_PUBLICATION_RECEIPT_REQUIRED"]);
});

test("publication receipt is bound to the exact media digest", () => {
  assert.throws(() => validatePublicationReceipt(realReceipt({ mediaSha256: "b".repeat(64) }), plan), /media digest mismatch/);
  assert.equal(validatePublicationReceipt(realReceipt(), plan).platformVideoId, "real-platform-video-id");
});

test("analytics snapshot requires observed non-negative platform metrics", () => {
  const receipt = realReceipt();
  const snapshot = {
    ...plan.platforms.douyin.analyticsSnapshotTemplate,
    platformVideoId: receipt.platformVideoId,
    observedAt: "2026-08-05T13:10:00.000Z",
    windowHoursSincePublication: 24,
    metrics: { views: 1200, likes: 84, comments: 9, completionRate: 0.41 },
    source: "manual_verified_export",
    evidenceUrl: "https://example.invalid/operator-owned-export",
    operatorConfirmed: true,
  };
  assert.equal(validateAnalyticsSnapshot(snapshot, { intakePlan: plan, publicationReceipt: receipt }).metrics.views, 1200);
  assert.equal(buildFeedbackReadiness({ intakePlan: plan, publicationReceipts: [receipt], analyticsSnapshots: [snapshot] }).state, "REAL_METRICS_AVAILABLE");
  assert.throws(() => validateAnalyticsSnapshot({ ...snapshot, metrics: { views: -1 } }, { intakePlan: plan, publicationReceipt: receipt }), /invalid metric/);
});

test("a real publication without metrics does not unlock optimization", () => {
  const readiness = buildFeedbackReadiness({ intakePlan: plan, publicationReceipts: [realReceipt()] });
  assert.equal(readiness.state, "PUBLISHED_AWAITING_METRICS");
  assert.equal(readiness.optimizationAllowed, false);
  assert.deepEqual(readiness.blockers, ["REAL_PLATFORM_ANALYTICS_REQUIRED"]);
});
