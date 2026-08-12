import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoQualityReport, validateVideoQualityReport } from "../src/index.mjs";

const renderPackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "preview:1",
  timelineDurationSeconds: 89,
  format: { width: 1080, height: 1920, frameRate: 30 },
  placeholderSlideIds: ["render:shot:03"],
  renderSlides: [{ placeholderRequired: true, previewLabel: "自有录屏待替换" }],
  subtitleCues: [{}],
  policy: { sourceVideoReuseAllowed: false },
  gates: { publicationAllowed: false, humanQualityReviewRequired: true },
  voiceover: { finalVoiceApprovalRequired: true },
};
const receipt = {
  schemaVersion: "toolradar.render-preview-receipt.v1",
  previewId: "preview:1",
  sha256: "a".repeat(64),
  bytes: 2161388,
  placeholderSlideIds: ["render:shot:03"],
  publicationAllowed: false,
};
const probe = {
  format: { duration: "89.046" },
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30/1" },
    { codec_type: "audio", codec_name: "aac" },
  ],
};

const goldCreativeEvidence = {
  schemaVersion: "toolradar.creative-quality-evidence.v1",
  profile: "video.production.gold-baseline.v1",
  camera: {
    shake: 0,
    hasSinCosMicroWobble: false,
    hasRandomDrift: false,
    simpleMoveDirectionReversals: 0,
  },
  motion: {
    realMotionEvents: 8,
    cameraOnly: false,
  },
  infographic: {
    mode: "world-space",
    objectOrPathBound: true,
    forbiddenTreatmentsDetected: [],
  },
  typography: {
    subtitleMinimumPx: 56,
    worldSpaceLabelMinimumEquivalentPx: 52,
    mobileReadabilityReviewed: true,
  },
  voice: {
    naturalnessScore: 90,
    humanReviewed: true,
    timeStretchUsed: false,
  },
  sound: {
    designScore: 89,
    synchronousEventCount: 8,
    loudnessEvidencePresent: true,
  },
  visual: {
    qualityScore: 92,
    consistencyScore: 91,
    materialRealismScore: 90,
    motionQualityScore: 91,
    cameraStabilityScore: 98,
    captionReadabilityScore: 95,
  },
  review: {
    fullWatch: "PASS",
    technicalQc: "PASS",
    approvedAssetsUsed: true,
  },
};

test("passes automated checks but blocks release on human-owned assets", () => {
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: probe, generatedAt: "2026-08-04T11:00:00.000Z" });
  assert.equal(report.automatedGate, "PASS");
  assert.equal(report.qualityProfile, "legacy");
  assert.equal(report.releaseDecision, "BLOCKED");
  assert.deepEqual(report.releaseBlockers, ["OWNED_SCREEN_RECORDINGS_REQUIRED", "FINAL_VOICE_APPROVAL_REQUIRED", "HUMAN_QUALITY_REVIEW_REQUIRED"]);
  assert.equal(report.publicationAllowed, false);
  assert.equal(validateVideoQualityReport(report), true);
});

test("fails automated gate when media dimensions are wrong", () => {
  const badProbe = structuredClone(probe);
  badProbe.streams[0].width = 720;
  const report = buildVideoQualityReport({ renderPackage, renderReceipt: receipt, mediaProbe: badProbe });
  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("technical.resolution"));
  assert.ok(report.releaseBlockers.includes("AUTOMATED_QA_FAILED"));
});

test("gold baseline fails closed when creative-quality evidence is missing", () => {
  const goldPackage = structuredClone(renderPackage);
  goldPackage.gates.goldBaselineRequired = true;
  const report = buildVideoQualityReport({ renderPackage: goldPackage, renderReceipt: receipt, mediaProbe: probe });
  assert.equal(report.qualityProfile, "video.production.gold-baseline.v1");
  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("creative.gold_evidence_required"));
  assert.ok(report.releaseBlockers.includes("GOLD_BASELINE_QA_FAILED"));
  assert.ok(report.releaseBlockers.includes("AUTOMATED_QA_FAILED"));
});

test("gold baseline accepts complete creative-quality evidence", () => {
  const goldPackage = structuredClone(renderPackage);
  goldPackage.gates.goldBaselineRequired = true;
  goldPackage.placeholderSlideIds = [];
  goldPackage.renderSlides = [{ placeholderRequired: false, previewLabel: "production asset" }];
  goldPackage.subtitleCues = [{}];
  goldPackage.voiceover.finalVoiceApprovalRequired = false;
  goldPackage.gates.humanQualityReviewRequired = false;
  const goldReceipt = structuredClone(receipt);
  goldReceipt.placeholderSlideIds = [];

  const report = buildVideoQualityReport({
    renderPackage: goldPackage,
    renderReceipt: goldReceipt,
    mediaProbe: probe,
    creativeQualityEvidence: goldCreativeEvidence,
  });

  assert.equal(report.qualityProfile, "video.production.gold-baseline.v1");
  assert.equal(report.automatedGate, "PASS");
  assert.equal(report.releaseDecision, "ELIGIBLE_FOR_HUMAN_RELEASE_APPROVAL");
  assert.equal(report.failedCheckIds.length, 0);
  assert.equal(validateVideoQualityReport(report), true);
});

test("gold baseline rejects micro-shake and undersized mobile subtitles", () => {
  const goldPackage = structuredClone(renderPackage);
  goldPackage.gates.goldBaselineRequired = true;
  const badCreative = structuredClone(goldCreativeEvidence);
  badCreative.camera.shake = 1;
  badCreative.camera.hasSinCosMicroWobble = true;
  badCreative.typography.subtitleMinimumPx = 42;

  const report = buildVideoQualityReport({
    renderPackage: goldPackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: badCreative,
  });

  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("creative.camera_shake"));
  assert.ok(report.failedCheckIds.includes("creative.camera_micro_wobble"));
  assert.ok(report.failedCheckIds.includes("creative.subtitle_size"));
  assert.ok(report.releaseBlockers.includes("GOLD_BASELINE_QA_FAILED"));
});

test("gold baseline rejects PPT-style infographic evidence and camera-only motion", () => {
  const goldPackage = structuredClone(renderPackage);
  goldPackage.gates.goldBaselineRequired = true;
  const badCreative = structuredClone(goldCreativeEvidence);
  badCreative.motion.cameraOnly = true;
  badCreative.motion.realMotionEvents = 1;
  badCreative.infographic.mode = "screen-space";
  badCreative.infographic.objectOrPathBound = false;
  badCreative.infographic.forbiddenTreatmentsDetected = ["full-screen-card"];

  const report = buildVideoQualityReport({
    renderPackage: goldPackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: badCreative,
  });

  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("creative.real_motion_events"));
  assert.ok(report.failedCheckIds.includes("creative.camera_not_sole_motion"));
  assert.ok(report.failedCheckIds.includes("creative.infographic_world_space"));
  assert.ok(report.failedCheckIds.includes("creative.infographic_object_binding"));
  assert.ok(report.failedCheckIds.includes("creative.infographic_no_forbidden_treatments"));
});
