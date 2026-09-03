import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoQualityReport, validateVideoQualityReport } from "../src/index.mjs";

const GOLD = "video.production.gold-baseline.v1";
const PREMIUM = "video.production.premium.v1";
const renderPackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "preview:premium:state",
  timelineDurationSeconds: 10,
  format: { width: 1080, height: 1920, frameRate: 30 },
  placeholderSlideIds: [],
  renderSlides: [{ placeholderRequired: false, previewLabel: "production asset" }],
  subtitleCues: [{}],
  policy: { sourceVideoReuseAllowed: false },
  gates: { publicationAllowed: false, humanQualityReviewRequired: false, goldBaselineTarget: true, premiumBaselineTarget: true },
  voiceover: { finalVoiceApprovalRequired: false },
  qualityProfile: PREMIUM,
};
const receipt = { schemaVersion: "toolradar.render-preview-receipt.v1", previewId: "preview:premium:state", sha256: "c".repeat(64), bytes: 1, placeholderSlideIds: [], publicationAllowed: false };
const probe = { format: { duration: "10" }, streams: [{ codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30/1" }, { codec_type: "audio", codec_name: "aac" }] };
const goldEvidence = {
  schemaVersion: "toolradar.creative-quality-evidence.v1", profile: GOLD,
  camera: { shake: 0, hasSinCosMicroWobble: false, hasRandomDrift: false, simpleMoveDirectionReversals: 0 },
  motion: { realMotionEvents: 6, cameraOnly: false },
  infographic: { mode: "world-space", objectOrPathBound: true, forbiddenTreatmentsDetected: [] },
  typography: { subtitleMinimumPx: 56, worldSpaceLabelMinimumEquivalentPx: 52, mobileReadabilityReviewed: true },
  voice: { naturalnessScore: 90, humanReviewed: true, timeStretchUsed: false },
  sound: { designScore: 90, synchronousEventCount: 6, loudnessEvidencePresent: true },
  visual: { qualityScore: 90, consistencyScore: 90, materialRealismScore: 90, motionQualityScore: 90, cameraStabilityScore: 98, captionReadabilityScore: 94 },
  review: { fullWatch: "PASS", technicalQc: "PASS", approvedAssetsUsed: true },
};

test("Premium pending state may legitimately have only the Premium blocker after Gold review passes", () => {
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: probe, creativeQualityEvidence: goldEvidence });
  assert.equal(report.qualityStage, "PREMIUM_TARGET_PENDING");
  assert.ok(!report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED"));
  assert.ok(report.releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED"));
  assert.equal(validateVideoQualityReport(report), true);
});

test("Premium pending state with no evidence retains both review blockers", () => {
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: probe });
  assert.ok(report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED"));
  assert.ok(report.releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED"));
  assert.equal(validateVideoQualityReport(report), true);
});
