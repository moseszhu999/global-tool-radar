import test from "node:test";
import assert from "node:assert/strict";
import {
  GOLD_PROFILE,
  PREMIUM_PROFILE,
  PREMIUM_EVIDENCE_SCHEMA,
  applyPremiumTarget,
  buildPendingPremiumEvidence,
  premiumChecks,
  validatePremiumTarget,
} from "../src/index.mjs";

const goldRenderPackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "preview:premium:test",
  qualityProfile: GOLD_PROFILE,
  qualityStage: "PREVIEW_TARGET",
  gates: {
    publicationAllowed: false,
    goldBaselineTarget: true,
    goldBaselineRequired: false,
  },
  renderSlides: [{ slideId: "render:01" }],
};

const goodEvidence = {
  schemaVersion: PREMIUM_EVIDENCE_SCHEMA,
  profile: PREMIUM_PROFILE,
  extends: GOLD_PROFILE,
  continuity: {
    physicalOrSemanticTransitionCoverage: 0.8,
    continuityScore: 94,
    crossShotEventCarry: true,
    crossfadeOnlyPrimaryGrammar: false,
  },
  motion: {
    advancedMotionScore: 95,
    motionFamilies: ["physical", "material", "spatial"],
    causalMotion: true,
    cameraOnly: false,
  },
  materials: {
    materialRealismScore: 95,
    lightingContinuityScore: 94,
    opticalInteractionScore: 93,
    heroMaterialInteractionPresent: true,
  },
  brandWorld: {
    score: 93,
    recurringMotifCount: 3,
    motifCrossShotRecurrence: 0.75,
    logoOnlyBranding: false,
  },
  voice: {
    performanceScore: 94,
    prosodyIntentCoverage: 0.95,
    humanReviewed: true,
    timeStretchUsed: false,
  },
  sound: {
    narrativeScore: 95,
    bespokeMotifPresent: true,
    frameSynchronousSound: true,
    loudnessEvidencePresent: true,
  },
  typography: { hierarchyScore: 94 },
  benchmark: {
    humanComparisonCompleted: true,
    referenceCount: 3,
    overallHumanReviewScore: 97,
    referenceCopyingUsed: false,
    goldNonRegressionPassed: true,
  },
  review: { fullWatch: "PASS", technicalQc: "PASS" },
};

test("Premium escalation requires an existing Gold target", () => {
  const value = applyPremiumTarget(goldRenderPackage);
  assert.equal(validatePremiumTarget(value), true);
  assert.equal(value.inheritedQualityProfile, GOLD_PROFILE);
  assert.equal(value.qualityProfile, PREMIUM_PROFILE);
  assert.equal(value.gates.goldBaselineTarget, true);
  assert.equal(value.gates.premiumBaselineTarget, true);
  assert.equal(value.gates.premiumBaselineRequired, false);
  assert.equal(value.qualityStage, "PREMIUM_TARGET");
});

test("Premium cannot be applied to a non-Gold package", () => {
  const legacy = structuredClone(goldRenderPackage);
  legacy.qualityProfile = "legacy";
  legacy.gates.goldBaselineTarget = false;
  assert.throws(() => applyPremiumTarget(legacy), /Gold-target package/);
});

test("Premium target emits pending evidence without fabricated scores", () => {
  const premium = applyPremiumTarget(goldRenderPackage);
  const pending = buildPendingPremiumEvidence(premium);
  assert.equal(pending.status, "PENDING_HUMAN_REVIEW");
  assert.equal(pending.sourcePreviewId, premium.previewId);
  assert.equal(pending.continuity.continuityScore, null);
  assert.equal(pending.voice.performanceScore, null);
  assert.equal(pending.benchmark.overallHumanReviewScore, null);
  assert.equal(pending.review.fullWatch, "PENDING");
});

test("complete Premium evidence passes all escalation checks", () => {
  const checks = premiumChecks(goodEvidence);
  assert.ok(checks.length >= 15);
  assert.deepEqual(checks.filter((item) => !item.passed), []);
});

test("Premium fails continuous-transition, material, voice, brand and benchmark regressions", () => {
  const bad = structuredClone(goodEvidence);
  bad.continuity.physicalOrSemanticTransitionCoverage = 0.2;
  bad.continuity.crossfadeOnlyPrimaryGrammar = true;
  bad.motion.motionFamilies = ["spatial"];
  bad.materials.materialRealismScore = 84;
  bad.brandWorld.logoOnlyBranding = true;
  bad.voice.performanceScore = 88;
  bad.sound.bespokeMotifPresent = false;
  bad.benchmark.referenceCount = 1;
  bad.benchmark.overallHumanReviewScore = 92;
  const failed = premiumChecks(bad).filter((item) => !item.passed).map((item) => item.id);
  assert.ok(failed.includes("premium.transition_coverage"));
  assert.ok(failed.includes("premium.no_crossfade_only_grammar"));
  assert.ok(failed.includes("premium.motion_families"));
  assert.ok(failed.includes("premium.material_realism"));
  assert.ok(failed.includes("premium.brand_world"));
  assert.ok(failed.includes("premium.voice_performance"));
  assert.ok(failed.includes("premium.sound_narrative"));
  assert.ok(failed.includes("premium.benchmark_review"));
});
