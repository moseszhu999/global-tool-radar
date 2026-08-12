const freeze = Object.freeze;

export const PREMIUM_PROFILE = "video.production.premium.v1";
export const PREMIUM_EVIDENCE_SCHEMA = "toolradar.premium-quality-evidence.v1";
export const GOLD_PROFILE = "video.production.gold-baseline.v1";

export const PREMIUM_TARGET = freeze({
  targetBand: "95-105",
  continuity: freeze({
    physicalOrSemanticTransitionCoverageMinimum: 0.6,
    continuityScoreMinimum: 90,
    crossShotEventCarryRequired: true,
    crossfadeOnlyAsPrimaryGrammarAllowed: false,
  }),
  motion: freeze({
    advancedMotionScoreMinimum: 92,
    minimumAdvancedMotionFamilies: 2,
    causalMotionRequired: true,
    cameraOnlyAllowed: false,
  }),
  materials: freeze({
    materialRealismMinimum: 92,
    lightingContinuityMinimum: 92,
    opticalInteractionScoreMinimum: 90,
    heroMaterialInteractionRequired: true,
  }),
  brandWorld: freeze({
    brandWorldScoreMinimum: 90,
    minimumRecurringMotifs: 2,
    motifCrossShotRecurrenceMinimum: 0.6,
  }),
  voice: freeze({
    performanceScoreMinimum: 92,
    prosodyIntentCoverageMinimum: 0.9,
    humanReviewRequired: true,
    timeStretchAllowed: false,
  }),
  sound: freeze({
    soundNarrativeScoreMinimum: 92,
    bespokeMotifRequired: true,
    frameSynchronousSoundRequired: true,
    loudnessEvidenceRequired: true,
  }),
  typography: freeze({ hierarchyScoreMinimum: 92 }),
  benchmark: freeze({
    humanComparisonRequired: true,
    minimumReferenceCount: 2,
    overallHumanReviewMinimum: 95,
    referenceCopyingAllowed: false,
  }),
});

function copyObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

export function applyPremiumTarget(renderPackage) {
  if (renderPackage?.schemaVersion !== "toolradar.render-preview-package.v1") {
    throw new TypeError("render preview package v1 is required");
  }
  if (renderPackage.qualityProfile !== GOLD_PROFILE || renderPackage.gates?.goldBaselineTarget !== true) {
    throw new TypeError("Premium escalation requires a Gold-target package");
  }

  return freeze({
    ...renderPackage,
    inheritedQualityProfile: GOLD_PROFILE,
    qualityProfile: PREMIUM_PROFILE,
    premiumTarget: PREMIUM_TARGET,
    qualityStage: "PREMIUM_TARGET",
    gates: freeze({
      ...copyObject(renderPackage.gates),
      goldBaselineTarget: true,
      goldBaselineRequired: false,
      premiumBaselineTarget: true,
      premiumBaselineRequired: false,
      premiumQualityEvidenceRequiredForFinal: true,
    }),
  });
}

export function buildPendingPremiumEvidence(renderPackage) {
  if (renderPackage?.qualityProfile !== PREMIUM_PROFILE || renderPackage.gates?.premiumBaselineTarget !== true) {
    throw new TypeError("Premium-target render package is required");
  }

  return freeze({
    schemaVersion: PREMIUM_EVIDENCE_SCHEMA,
    profile: PREMIUM_PROFILE,
    extends: GOLD_PROFILE,
    sourcePreviewId: renderPackage.previewId,
    status: "PENDING_HUMAN_REVIEW",
    continuity: freeze({
      physicalOrSemanticTransitionCoverage: null,
      continuityScore: null,
      crossShotEventCarry: null,
      crossfadeOnlyPrimaryGrammar: null,
    }),
    motion: freeze({
      advancedMotionScore: null,
      motionFamilies: freeze([]),
      causalMotion: null,
      cameraOnly: null,
    }),
    materials: freeze({
      materialRealismScore: null,
      lightingContinuityScore: null,
      opticalInteractionScore: null,
      heroMaterialInteractionPresent: null,
    }),
    brandWorld: freeze({
      score: null,
      recurringMotifCount: null,
      motifCrossShotRecurrence: null,
      logoOnlyBranding: null,
    }),
    voice: freeze({
      performanceScore: null,
      prosodyIntentCoverage: null,
      humanReviewed: null,
      timeStretchUsed: null,
    }),
    sound: freeze({
      narrativeScore: null,
      bespokeMotifPresent: null,
      frameSynchronousSound: null,
      loudnessEvidencePresent: null,
    }),
    typography: freeze({ hierarchyScore: null }),
    benchmark: freeze({
      humanComparisonCompleted: null,
      referenceCount: null,
      overallHumanReviewScore: null,
      referenceCopyingUsed: null,
      goldNonRegressionPassed: null,
    }),
    review: freeze({ fullWatch: "PENDING", technicalQc: "PENDING" }),
  });
}

export function premiumChecks(evidence) {
  if (!evidence) return [{ id: "premium.evidence_required", passed: false, detail: "premium evidence required" }];
  const c = evidence.continuity ?? {};
  const m = evidence.motion ?? {};
  const material = evidence.materials ?? {};
  const brand = evidence.brandWorld ?? {};
  const voice = evidence.voice ?? {};
  const sound = evidence.sound ?? {};
  const type = evidence.typography ?? {};
  const benchmark = evidence.benchmark ?? {};
  const review = evidence.review ?? {};
  const families = Array.isArray(m.motionFamilies) ? new Set(m.motionFamilies) : new Set();
  const n = (value) => typeof value === "number" && Number.isFinite(value);
  const check = (id, passed, detail) => freeze({ id, passed: Boolean(passed), detail });

  return freeze([
    check("premium.schema", evidence.schemaVersion === PREMIUM_EVIDENCE_SCHEMA, String(evidence.schemaVersion)),
    check("premium.profile", evidence.profile === PREMIUM_PROFILE && evidence.extends === GOLD_PROFILE, `${evidence.profile} extends ${evidence.extends}`),
    check("premium.transition_coverage", n(c.physicalOrSemanticTransitionCoverage) && c.physicalOrSemanticTransitionCoverage >= 0.6, String(c.physicalOrSemanticTransitionCoverage)),
    check("premium.continuity_score", n(c.continuityScore) && c.continuityScore >= 90, String(c.continuityScore)),
    check("premium.cross_shot_event_carry", c.crossShotEventCarry === true, String(c.crossShotEventCarry)),
    check("premium.no_crossfade_only_grammar", c.crossfadeOnlyPrimaryGrammar === false, String(c.crossfadeOnlyPrimaryGrammar)),
    check("premium.advanced_motion_score", n(m.advancedMotionScore) && m.advancedMotionScore >= 92, String(m.advancedMotionScore)),
    check("premium.motion_families", families.size >= 2, [...families].join(",")),
    check("premium.causal_motion", m.causalMotion === true && m.cameraOnly === false, `causal=${m.causalMotion} cameraOnly=${m.cameraOnly}`),
    check("premium.material_realism", n(material.materialRealismScore) && material.materialRealismScore >= 92, String(material.materialRealismScore)),
    check("premium.lighting_continuity", n(material.lightingContinuityScore) && material.lightingContinuityScore >= 92, String(material.lightingContinuityScore)),
    check("premium.optical_interaction", n(material.opticalInteractionScore) && material.opticalInteractionScore >= 90 && material.heroMaterialInteractionPresent === true, `${material.opticalInteractionScore} hero=${material.heroMaterialInteractionPresent}`),
    check("premium.brand_world", n(brand.score) && brand.score >= 90 && n(brand.recurringMotifCount) && brand.recurringMotifCount >= 2 && n(brand.motifCrossShotRecurrence) && brand.motifCrossShotRecurrence >= 0.6 && brand.logoOnlyBranding === false, `${brand.score}`),
    check("premium.voice_performance", n(voice.performanceScore) && voice.performanceScore >= 92 && n(voice.prosodyIntentCoverage) && voice.prosodyIntentCoverage >= 0.9 && voice.humanReviewed === true && voice.timeStretchUsed === false, `${voice.performanceScore}`),
    check("premium.sound_narrative", n(sound.narrativeScore) && sound.narrativeScore >= 92 && sound.bespokeMotifPresent === true && sound.frameSynchronousSound === true && sound.loudnessEvidencePresent === true, `${sound.narrativeScore}`),
    check("premium.typography_hierarchy", n(type.hierarchyScore) && type.hierarchyScore >= 92, String(type.hierarchyScore)),
    check("premium.benchmark_review", benchmark.humanComparisonCompleted === true && n(benchmark.referenceCount) && benchmark.referenceCount >= 2 && n(benchmark.overallHumanReviewScore) && benchmark.overallHumanReviewScore >= 95 && benchmark.referenceCopyingUsed === false && benchmark.goldNonRegressionPassed === true, `${benchmark.overallHumanReviewScore}`),
    check("premium.full_watch", review.fullWatch === "PASS", String(review.fullWatch)),
    check("premium.technical_qc", review.technicalQc === "PASS", String(review.technicalQc)),
  ]);
}

export function validatePremiumTarget(value) {
  if (value?.qualityProfile !== PREMIUM_PROFILE) throw new TypeError("Premium profile is required");
  if (value.gates?.goldBaselineTarget !== true) throw new TypeError("Gold inheritance is required");
  if (value.gates?.premiumBaselineTarget !== true) throw new TypeError("Premium target is required");
  return true;
}
