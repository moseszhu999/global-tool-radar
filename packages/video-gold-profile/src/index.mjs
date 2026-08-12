const freeze = Object.freeze;

export const GOLD_PROFILE = "video.production.gold-baseline.v1";
export const CREATIVE_EVIDENCE_SCHEMA = "toolradar.creative-quality-evidence.v1";

const GOLD_REQUIREMENTS = freeze({
  targetBand: "85-95",
  camera: freeze({
    shake: 0,
    simpleMove: "monotonic-or-locked",
    randomDriftAllowed: false,
    sinCosMicroWobbleAllowed: false,
  }),
  motion: freeze({
    cameraOnlyAllowed: false,
    minimumRealMotionEventsForThirtySecondShort: 6,
  }),
  infographic: freeze({
    defaultMode: "world-space",
    objectOrPathBindingRequired: true,
    pptPanelTreatmentAllowed: false,
    productUiNativeExceptionAllowed: true,
  }),
  typography: freeze({
    subtitleMinimumPx: 52,
    subtitleTargetPx: 56,
    worldSpaceLabelMinimumEquivalentPx: 48,
  }),
  finalGates: freeze({
    voiceNaturalnessMinimum: 85,
    visualQualityMinimum: 85,
    visualConsistencyMinimum: 88,
    materialRealismMinimum: 85,
    motionQualityMinimum: 85,
    cameraStabilityMinimum: 95,
    soundDesignMinimum: 85,
    captionReadabilityMinimum: 90,
    fullWatchRequired: true,
    technicalQcRequired: true,
    approvedAssetAdoptionRequired: true,
  }),
});

function cloneObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...value };
}

function goldVisualType(visualType) {
  const mapping = {
    generated_title_card: "cinematic_infographic",
    generated_evidence_card: "cinematic_infographic",
    generated_comparison_card: "spatial_comparison",
    generated_end_card: "cinematic_end_frame",
  };
  return mapping[visualType] ?? visualType;
}

function goldInstruction(shot) {
  const visualType = goldVisualType(shot.visualType);
  const uiNative = visualType === "owned_screen_recording";
  const suffix = uiNative
    ? " Gold方向：镜头稳定；以产品UI自身变化作为主要运动，说明层绑定到具体控件/路径，避免额外PPT卡片；字幕按移动端可读字号执行。"
    : " Gold方向：镜头锁定或单向平滑移动；信息绑定到物体/路径/空间，不使用PPT式整屏卡片；必须有真实物体、粒子、液体、光影或空间图形运动，字幕按移动端可读字号执行。";
  return `${shot.visualInstruction ?? ""}${suffix}`.trim();
}

function creativeDirectionForShot(shot) {
  const visualType = goldVisualType(shot.visualType);
  const uiNative = visualType === "owned_screen_recording";
  return freeze({
    cameraPolicy: "stable-monotonic-or-locked",
    cameraShakeAllowed: false,
    randomDriftAllowed: false,
    sinCosMicroWobbleAllowed: false,
    motionRequirement: uiNative ? "product-ui-native-motion" : "real-physical-or-spatial-motion",
    cameraOnlyMotionAllowed: false,
    infographicMode: uiNative ? "product-ui-native" : "world-space",
    objectOrPathBindingRequired: true,
    pptPanelTreatmentAllowed: false,
    subtitleMinimumPx: 52,
    worldSpaceLabelMinimumEquivalentPx: 48,
  });
}

export function applyGoldDefaultsToProductionCase(productionCase) {
  if (productionCase?.schemaVersion !== "toolradar.video-production-case.v1") {
    throw new TypeError("video production case v1 is required");
  }
  return freeze({
    ...productionCase,
    qualityProfile: GOLD_PROFILE,
    qualityTarget: GOLD_REQUIREMENTS,
    gates: freeze({ ...cloneObject(productionCase.gates), goldBaselineTarget: true }),
  });
}

export function applyGoldDefaultsToStoryboardPackage(storyboardPackage) {
  if (storyboardPackage?.schemaVersion !== "toolradar.storyboard-package.v1") {
    throw new TypeError("storyboard package v1 is required");
  }
  const shots = storyboardPackage.storyboard?.shots;
  if (!Array.isArray(shots) || shots.length === 0) throw new TypeError("storyboard shots are required");

  const goldShots = shots.map((shot) => freeze({
    ...shot,
    visualType: goldVisualType(shot.visualType),
    visualInstruction: goldInstruction(shot),
    creativeDirection: creativeDirectionForShot(shot),
  }));

  return freeze({
    ...storyboardPackage,
    qualityProfile: GOLD_PROFILE,
    qualityTarget: GOLD_REQUIREMENTS,
    storyboard: freeze({ ...cloneObject(storyboardPackage.storyboard), shots: freeze(goldShots) }),
    gates: freeze({ ...cloneObject(storyboardPackage.gates), goldBaselineTarget: true }),
  });
}

export function applyGoldDefaultsToRenderPreviewPackage(renderPackage) {
  if (renderPackage?.schemaVersion !== "toolradar.render-preview-package.v1") {
    throw new TypeError("render preview package v1 is required");
  }
  const slides = renderPackage.renderSlides;
  if (!Array.isArray(slides) || slides.length === 0) throw new TypeError("render slides are required");

  return freeze({
    ...renderPackage,
    qualityProfile: GOLD_PROFILE,
    qualityStage: "PREVIEW_TARGET",
    qualityTarget: GOLD_REQUIREMENTS,
    renderSlides: freeze(slides.map((slide) => freeze({
      ...slide,
      creativeDirection: slide.creativeDirection ?? freeze({
        cameraPolicy: "stable-monotonic-or-locked",
        cameraShakeAllowed: false,
        cameraOnlyMotionAllowed: false,
        infographicMode: slide.visualType === "owned_screen_recording" ? "product-ui-native" : "world-space",
        objectOrPathBindingRequired: true,
        pptPanelTreatmentAllowed: false,
        subtitleMinimumPx: 52,
        worldSpaceLabelMinimumEquivalentPx: 48,
      }),
    }))),
    gates: freeze({
      ...cloneObject(renderPackage.gates),
      goldBaselineTarget: true,
      goldBaselineRequired: false,
      creativeQualityEvidenceRequiredForFinal: true,
    }),
    policy: freeze({
      ...cloneObject(renderPackage.policy),
      finalVoiceMustBeApprovedNeuralOrHuman: true,
      narrationTimeStretchAllowed: false,
    }),
  });
}

export function buildPendingCreativeQualityEvidence(renderPackage) {
  if (renderPackage?.qualityProfile !== GOLD_PROFILE || renderPackage.gates?.goldBaselineTarget !== true) {
    throw new TypeError("Gold-target render package is required");
  }
  return freeze({
    schemaVersion: CREATIVE_EVIDENCE_SCHEMA,
    profile: GOLD_PROFILE,
    sourcePreviewId: renderPackage.previewId,
    status: "PENDING_HUMAN_REVIEW",
    camera: freeze({ shake: null, hasSinCosMicroWobble: null, hasRandomDrift: null, simpleMoveDirectionReversals: null }),
    motion: freeze({ realMotionEvents: null, cameraOnly: null }),
    infographic: freeze({ mode: null, objectOrPathBound: null, forbiddenTreatmentsDetected: freeze([]) }),
    typography: freeze({ subtitleMinimumPx: null, worldSpaceLabelMinimumEquivalentPx: null, mobileReadabilityReviewed: null }),
    voice: freeze({ naturalnessScore: null, humanReviewed: null, timeStretchUsed: null }),
    sound: freeze({ designScore: null, synchronousEventCount: null, loudnessEvidencePresent: null }),
    visual: freeze({
      qualityScore: null,
      consistencyScore: null,
      materialRealismScore: null,
      motionQualityScore: null,
      cameraStabilityScore: null,
      captionReadabilityScore: null,
    }),
    review: freeze({ fullWatch: "PENDING", technicalQc: "PENDING", approvedAssetsUsed: null }),
  });
}

export function validateGoldTarget(value) {
  if (value?.qualityProfile !== GOLD_PROFILE) throw new TypeError("Gold profile is required");
  if (value.gates?.goldBaselineTarget !== true) throw new TypeError("Gold target gate is required");
  return true;
}
