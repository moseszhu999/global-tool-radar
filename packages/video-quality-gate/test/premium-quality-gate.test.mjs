import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoQualityReport, validateVideoQualityReport } from "../src/index.mjs";

const GOLD = "video.production.gold-baseline.v1";
const PREMIUM = "video.production.premium.v1";

const basePackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "preview:premium:gate",
  timelineDurationSeconds: 30,
  format: { width: 1080, height: 1920, frameRate: 30 },
  placeholderSlideIds: [],
  renderSlides: [{ placeholderRequired: false, previewLabel: "production asset" }],
  subtitleCues: [{}],
  policy: { sourceVideoReuseAllowed: false },
  gates: {
    publicationAllowed: false,
    humanQualityReviewRequired: false,
    goldBaselineTarget: true,
    goldBaselineRequired: false,
    premiumBaselineTarget: true,
    premiumBaselineRequired: false,
  },
  voiceover: { finalVoiceApprovalRequired: false },
  qualityProfile: PREMIUM,
  inheritedQualityProfile: GOLD,
};

const receipt = {
  schemaVersion: "toolradar.render-preview-receipt.v1",
  previewId: "preview:premium:gate",
  sha256: "b".repeat(64),
  bytes: 4000000,
  placeholderSlideIds: [],
  publicationAllowed: false,
};

const probe = {
  format: { duration: "30.000" },
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30/1" },
    { codec_type: "audio", codec_name: "aac" },
  ],
};

const goldEvidence = {
  schemaVersion: "toolradar.creative-quality-evidence.v1",
  profile: GOLD,
  camera: { shake: 0, hasSinCosMicroWobble: false, hasRandomDrift: false, simpleMoveDirectionReversals: 0 },
  motion: { realMotionEvents: 9, cameraOnly: false },
  infographic: { mode: "world-space", objectOrPathBound: true, forbiddenTreatmentsDetected: [] },
  typography: { subtitleMinimumPx: 56, worldSpaceLabelMinimumEquivalentPx: 52, mobileReadabilityReviewed: true },
  voice: { naturalnessScore: 94, humanReviewed: true, timeStretchUsed: false },
  sound: { designScore: 94, synchronousEventCount: 10, loudnessEvidencePresent: true },
  visual: { qualityScore: 95, consistencyScore: 95, materialRealismScore: 94, motionQualityScore: 95, cameraStabilityScore: 99, captionReadabilityScore: 96 },
  review: { fullWatch: "PASS", technicalQc: "PASS", approvedAssetsUsed: true },
};

const premiumEvidence = {
  schemaVersion: "toolradar.premium-quality-evidence.v1",
  profile: PREMIUM,
  extends: GOLD,
  continuity: { physicalOrSemanticTransitionCoverage: 0.8, continuityScore: 95, crossShotEventCarry: true, crossfadeOnlyPrimaryGrammar: false },
  motion: { advancedMotionScore: 95, motionFamilies: ["physical", "material", "spatial"], causalMotion: true, cameraOnly: false },
  materials: { materialRealismScore: 95, lightingContinuityScore: 95, opticalInteractionScore: 94, heroMaterialInteractionPresent: true },
  brandWorld: { score: 94, recurringMotifCount: 3, motifCrossShotRecurrence: 0.75, logoOnlyBranding: false },
  voice: { performanceScore: 95, prosodyIntentCoverage: 0.95, humanReviewed: true, timeStretchUsed: false },
  sound: { narrativeScore: 95, bespokeMotifPresent: true, frameSynchronousSound: true, loudnessEvidencePresent: true },
  typography: { hierarchyScore: 95 },
  benchmark: { humanComparisonCompleted: true, referenceCount: 3, overallHumanReviewScore: 97, referenceCopyingUsed: false, goldNonRegressionPassed: true },
  review: { fullWatch: "PASS", technicalQc: "PASS" },
};

test("Premium target without evidence passes technical QA but remains blocked by both review layers", () => {
  const report = buildVideoQualityReport({ renderPackage: basePackage, renderReceipt: receipt, mediaProbe: probe });
  assert.equal(report.qualityProfile, PREMIUM);
  assert.equal(report.inheritedQualityProfile, GOLD);
  assert.equal(report.qualityStage, "PREMIUM_TARGET_PENDING");
  assert.equal(report.automatedGate, "PASS");
  assert.ok(report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED"));
  assert.ok(report.releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED"));
  assert.equal(validateVideoQualityReport(report), true);
});

test("Premium target with only Gold evidence still waits for Premium review", () => {
  const report = buildVideoQualityReport({
    renderPackage: basePackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: goldEvidence,
  });
  assert.equal(report.automatedGate, "PASS");
  assert.ok(!report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED"));
  assert.ok(report.releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED"));
});

test("Premium target with Gold and Premium evidence reaches evaluated state", () => {
  const report = buildVideoQualityReport({
    renderPackage: basePackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: goldEvidence,
    premiumQualityEvidence: premiumEvidence,
  });
  assert.equal(report.qualityStage, "PREMIUM_REVIEW_EVALUATED");
  assert.equal(report.automatedGate, "PASS");
  assert.equal(report.releaseBlockers.length, 0);
  assert.equal(report.releaseDecision, "ELIGIBLE_FOR_HUMAN_RELEASE_APPROVAL");
});

test("Premium final fails closed if Gold evidence is missing even when Premium evidence passes", () => {
  const finalPackage = structuredClone(basePackage);
  finalPackage.gates.premiumBaselineRequired = true;
  const report = buildVideoQualityReport({
    renderPackage: finalPackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    premiumQualityEvidence: premiumEvidence,
  });
  assert.equal(report.qualityStage, "PREMIUM_FINAL_ENFORCED");
  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("creative.gold_evidence_required"));
  assert.ok(report.releaseBlockers.includes("GOLD_BASELINE_QA_FAILED"));
});

test("Premium final fails distinctive Premium regressions after Gold passes", () => {
  const finalPackage = structuredClone(basePackage);
  finalPackage.gates.premiumBaselineRequired = true;
  const badPremium = structuredClone(premiumEvidence);
  badPremium.continuity.physicalOrSemanticTransitionCoverage = 0.3;
  badPremium.materials.lightingContinuityScore = 80;
  badPremium.voice.performanceScore = 86;
  badPremium.benchmark.goldNonRegressionPassed = false;

  const report = buildVideoQualityReport({
    renderPackage: finalPackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: goldEvidence,
    premiumQualityEvidence: badPremium,
  });
  assert.equal(report.automatedGate, "FAIL");
  assert.ok(report.failedCheckIds.includes("premium.transition_coverage"));
  assert.ok(report.failedCheckIds.includes("premium.lighting_continuity"));
  assert.ok(report.failedCheckIds.includes("premium.voice_performance"));
  assert.ok(report.failedCheckIds.includes("premium.benchmark_review"));
  assert.ok(report.releaseBlockers.includes("PREMIUM_BASELINE_QA_FAILED"));
});

test("Premium final accepts both complete Gold and Premium evidence but still never authorizes publication", () => {
  const finalPackage = structuredClone(basePackage);
  finalPackage.gates.premiumBaselineRequired = true;
  const report = buildVideoQualityReport({
    renderPackage: finalPackage,
    renderReceipt: receipt,
    mediaProbe: probe,
    creativeQualityEvidence: goldEvidence,
    premiumQualityEvidence: premiumEvidence,
  });
  assert.equal(report.automatedGate, "PASS");
  assert.equal(report.failedCheckIds.length, 0);
  assert.equal(report.publicationAllowed, false);
  assert.equal(validateVideoQualityReport(report), true);
});
