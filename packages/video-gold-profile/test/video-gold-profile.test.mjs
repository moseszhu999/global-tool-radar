import test from "node:test";
import assert from "node:assert/strict";
import {
  GOLD_PROFILE,
  applyGoldDefaultsToProductionCase,
  applyGoldDefaultsToStoryboardPackage,
  applyGoldDefaultsToRenderPreviewPackage,
  buildPendingCreativeQualityEvidence,
  validateGoldTarget,
} from "../src/index.mjs";

const productionCase = {
  schemaVersion: "toolradar.video-production-case.v1",
  caseId: "video-case:test",
  gates: { publicationAllowed: false },
};

const storyboardPackage = {
  schemaVersion: "toolradar.storyboard-package.v1",
  packageId: "video-case:test:storyboard:v1",
  gates: { renderAllowed: false, publicationAllowed: false },
  storyboard: {
    schemaVersion: "toolradar.storyboard.v1",
    shots: [
      { shotId: "shot:01", visualType: "generated_title_card", visualInstruction: "title" },
      { shotId: "shot:02", visualType: "generated_evidence_card", visualInstruction: "evidence" },
      { shotId: "shot:03", visualType: "owned_screen_recording", visualInstruction: "product UI" },
      { shotId: "shot:04", visualType: "generated_comparison_card", visualInstruction: "comparison" },
      { shotId: "shot:05", visualType: "generated_end_card", visualInstruction: "cta" },
    ],
  },
};

const renderPackage = {
  schemaVersion: "toolradar.render-preview-package.v1",
  previewId: "video-case:test:preview:v1",
  gates: { previewRenderAllowed: true, publicationAllowed: false },
  policy: { sourceVideoReuseAllowed: false },
  renderSlides: [
    { slideId: "render:shot:01", visualType: "cinematic_infographic" },
    { slideId: "render:shot:02", visualType: "owned_screen_recording" },
  ],
};

test("new production cases receive the Gold quality target without weakening safety gates", () => {
  const value = applyGoldDefaultsToProductionCase(productionCase);
  assert.equal(validateGoldTarget(value), true);
  assert.equal(value.qualityProfile, GOLD_PROFILE);
  assert.equal(value.gates.goldBaselineTarget, true);
  assert.equal(value.gates.publicationAllowed, false);
  assert.equal(value.qualityTarget.camera.shake, 0);
  assert.equal(value.qualityTarget.typography.subtitleMinimumPx, 52);
});

test("storyboard adapter removes card-first visual grammar and injects shot-level Gold direction", () => {
  const value = applyGoldDefaultsToStoryboardPackage(storyboardPackage);
  const visualTypes = value.storyboard.shots.map((shot) => shot.visualType);
  assert.deepEqual(visualTypes, [
    "cinematic_infographic",
    "cinematic_infographic",
    "owned_screen_recording",
    "spatial_comparison",
    "cinematic_end_frame",
  ]);
  assert.ok(value.storyboard.shots.every((shot) => shot.creativeDirection.cameraShakeAllowed === false));
  assert.ok(value.storyboard.shots.every((shot) => shot.creativeDirection.cameraOnlyMotionAllowed === false));
  assert.equal(value.storyboard.shots[0].creativeDirection.infographicMode, "world-space");
  assert.equal(value.storyboard.shots[2].creativeDirection.infographicMode, "product-ui-native");
  assert.doesNotMatch(value.storyboard.shots.map((shot) => shot.visualType).join(" "), /generated_.*_card/);
});

test("render previews inherit Gold as a target while final enforcement stays pending", () => {
  const value = applyGoldDefaultsToRenderPreviewPackage(renderPackage);
  assert.equal(validateGoldTarget(value), true);
  assert.equal(value.qualityStage, "PREVIEW_TARGET");
  assert.equal(value.gates.goldBaselineTarget, true);
  assert.equal(value.gates.goldBaselineRequired, false);
  assert.equal(value.gates.creativeQualityEvidenceRequiredForFinal, true);
  assert.equal(value.policy.finalVoiceMustBeApprovedNeuralOrHuman, true);
  assert.equal(value.policy.narrationTimeStretchAllowed, false);
});

test("Gold render package produces a pending human-review evidence skeleton", () => {
  const value = applyGoldDefaultsToRenderPreviewPackage(renderPackage);
  const evidence = buildPendingCreativeQualityEvidence(value);
  assert.equal(evidence.profile, GOLD_PROFILE);
  assert.equal(evidence.sourcePreviewId, value.previewId);
  assert.equal(evidence.status, "PENDING_HUMAN_REVIEW");
  assert.equal(evidence.camera.shake, null);
  assert.equal(evidence.review.fullWatch, "PENDING");
});
