import { PREMIUM_PROFILE, premiumChecks } from "../../video-premium-profile/src/index.mjs";

const freeze = Object.freeze;

function check(id, category, passed, detail, severity = "error") {
  return freeze({ id, category, passed: Boolean(passed), severity, detail });
}

function sha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

const GOLD_PROFILE = "video.production.gold-baseline.v1";
const CREATIVE_EVIDENCE_SCHEMA = "toolradar.creative-quality-evidence.v1";

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function goldCreativeChecks(evidence) {
  if (!evidence) {
    return [check("creative.gold_evidence_required", "creative", false, "gold creative-quality evidence is required")];
  }

  const camera = evidence.camera ?? {};
  const motion = evidence.motion ?? {};
  const infographic = evidence.infographic ?? {};
  const typography = evidence.typography ?? {};
  const voice = evidence.voice ?? {};
  const sound = evidence.sound ?? {};
  const visual = evidence.visual ?? {};
  const review = evidence.review ?? {};
  const forbiddenTreatments = Array.isArray(infographic.forbiddenTreatmentsDetected) ? infographic.forbiddenTreatmentsDetected : [];

  return [
    check("creative.schema", "creative", evidence.schemaVersion === CREATIVE_EVIDENCE_SCHEMA, String(evidence.schemaVersion)),
    check("creative.profile", "creative", evidence.profile === GOLD_PROFILE, String(evidence.profile)),
    check("creative.camera_shake", "creative", finiteNumber(camera.shake) && camera.shake === 0, `shake=${camera.shake}`),
    check("creative.camera_micro_wobble", "creative", camera.hasSinCosMicroWobble === false, `sin/cos micro wobble=${camera.hasSinCosMicroWobble}`),
    check("creative.camera_random_drift", "creative", camera.hasRandomDrift === false, `random drift=${camera.hasRandomDrift}`),
    check("creative.camera_direction_reversal", "creative", camera.simpleMoveDirectionReversals === 0, `simple-move reversals=${camera.simpleMoveDirectionReversals}`),
    check("creative.real_motion_events", "creative", finiteNumber(motion.realMotionEvents) && motion.realMotionEvents >= 6, `${motion.realMotionEvents} real motion events`),
    check("creative.camera_not_sole_motion", "creative", motion.cameraOnly === false, `camera-only=${motion.cameraOnly}`),
    check("creative.infographic_world_space", "creative", infographic.mode === "world-space" || infographic.mode === "product-ui-native", String(infographic.mode)),
    check("creative.infographic_object_binding", "creative", infographic.objectOrPathBound === true, `object/path bound=${infographic.objectOrPathBound}`),
    check("creative.infographic_no_forbidden_treatments", "creative", forbiddenTreatments.length === 0, forbiddenTreatments.join(",") || "none"),
    check("creative.subtitle_size", "creative", finiteNumber(typography.subtitleMinimumPx) && typography.subtitleMinimumPx >= 52, `${typography.subtitleMinimumPx}px`),
    check("creative.world_label_size", "creative", finiteNumber(typography.worldSpaceLabelMinimumEquivalentPx) && typography.worldSpaceLabelMinimumEquivalentPx >= 48, `${typography.worldSpaceLabelMinimumEquivalentPx}px`),
    check("creative.mobile_readability_review", "creative", typography.mobileReadabilityReviewed === true, `reviewed=${typography.mobileReadabilityReviewed}`),
    check("creative.voice_naturalness", "creative", finiteNumber(voice.naturalnessScore) && voice.naturalnessScore >= 85 && voice.humanReviewed === true, `${voice.naturalnessScore}/100 human=${voice.humanReviewed}`),
    check("creative.voice_no_time_stretch", "creative", voice.timeStretchUsed === false, `time-stretch=${voice.timeStretchUsed}`),
    check("creative.sound_design", "creative", finiteNumber(sound.designScore) && sound.designScore >= 85, `${sound.designScore}/100`),
    check("creative.sync_sound_events", "creative", finiteNumber(sound.synchronousEventCount) && sound.synchronousEventCount >= 6, `${sound.synchronousEventCount} events`),
    check("creative.loudness_evidence", "creative", sound.loudnessEvidencePresent === true, `present=${sound.loudnessEvidencePresent}`),
    check("creative.visual_quality", "creative", finiteNumber(visual.qualityScore) && visual.qualityScore >= 85, `${visual.qualityScore}/100`),
    check("creative.visual_consistency", "creative", finiteNumber(visual.consistencyScore) && visual.consistencyScore >= 88, `${visual.consistencyScore}/100`),
    check("creative.material_realism", "creative", finiteNumber(visual.materialRealismScore) && visual.materialRealismScore >= 85, `${visual.materialRealismScore}/100`),
    check("creative.motion_quality", "creative", finiteNumber(visual.motionQualityScore) && visual.motionQualityScore >= 85, `${visual.motionQualityScore}/100`),
    check("creative.camera_stability", "creative", finiteNumber(visual.cameraStabilityScore) && visual.cameraStabilityScore >= 95, `${visual.cameraStabilityScore}/100`),
    check("creative.caption_readability", "creative", finiteNumber(visual.captionReadabilityScore) && visual.captionReadabilityScore >= 90, `${visual.captionReadabilityScore}/100`),
    check("creative.full_watch", "creative", review.fullWatch === "PASS", String(review.fullWatch)),
    check("creative.technical_qc", "creative", review.technicalQc === "PASS", String(review.technicalQc)),
    check("creative.asset_adoption", "creative", review.approvedAssetsUsed === true, `approved assets used=${review.approvedAssetsUsed}`),
  ];
}

function premiumCreativeChecks(evidence) {
  return premiumChecks(evidence).map((item) => check(item.id, "premium", item.passed, item.detail));
}

export function buildVideoQualityReport({
  renderPackage,
  renderReceipt,
  mediaProbe,
  creativeQualityEvidence = null,
  premiumQualityEvidence = null,
  generatedAt = new Date().toISOString(),
}) {
  if (renderPackage?.schemaVersion !== "toolradar.render-preview-package.v1") throw new TypeError("unsupported render package");
  if (renderReceipt?.schemaVersion !== "toolradar.render-preview-receipt.v1") throw new TypeError("unsupported render receipt");
  if (!mediaProbe?.format || !Array.isArray(mediaProbe.streams)) throw new TypeError("ffprobe media data is required");

  const video = mediaProbe.streams.find((stream) => stream.codec_type === "video");
  const audio = mediaProbe.streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(mediaProbe.format.duration);
  const frameRateParts = String(video?.avg_frame_rate ?? "0/1").split("/").map(Number);
  const frameRate = frameRateParts[1] ? frameRateParts[0] / frameRateParts[1] : 0;
  const placeholders = renderPackage.placeholderSlideIds ?? [];

  const premiumBaselineRequired = renderPackage.gates?.premiumBaselineRequired === true;
  const premiumBaselineTarget = premiumBaselineRequired || renderPackage.gates?.premiumBaselineTarget === true || renderPackage.qualityProfile === PREMIUM_PROFILE;
  const goldBaselineRequired = renderPackage.gates?.goldBaselineRequired === true || premiumBaselineRequired;
  const goldBaselineTarget = premiumBaselineTarget || goldBaselineRequired || renderPackage.gates?.goldBaselineTarget === true || renderPackage.qualityProfile === GOLD_PROFILE;

  const hasCreativeEvidence = creativeQualityEvidence !== null && creativeQualityEvidence !== undefined;
  const hasPremiumEvidence = premiumQualityEvidence !== null && premiumQualityEvidence !== undefined;
  const goldCreativeEvaluationRequested = goldBaselineRequired || (goldBaselineTarget && hasCreativeEvidence);
  const premiumEvaluationRequested = premiumBaselineRequired || (premiumBaselineTarget && hasPremiumEvidence);
  const creativeChecks = goldCreativeEvaluationRequested ? goldCreativeChecks(creativeQualityEvidence) : [];
  const premiumChecksForReport = premiumEvaluationRequested ? premiumCreativeChecks(premiumQualityEvidence) : [];

  const checks = [
    check("technical.duration", "technical", Math.abs(duration - renderPackage.timelineDurationSeconds) <= 0.1, `${duration}s vs ${renderPackage.timelineDurationSeconds}s`),
    check("technical.resolution", "technical", video?.width === renderPackage.format.width && video?.height === renderPackage.format.height, `${video?.width}x${video?.height}`),
    check("technical.frame_rate", "technical", Math.abs(frameRate - renderPackage.format.frameRate) < 0.01, `${frameRate}fps`),
    check("technical.video_codec", "technical", video?.codec_name === "h264", String(video?.codec_name)),
    check("technical.audio_codec", "technical", audio?.codec_name === "aac", String(audio?.codec_name)),
    check("integrity.sha256", "integrity", sha256(renderReceipt.sha256), String(renderReceipt.sha256)),
    check("integrity.preview_id", "integrity", renderReceipt.previewId === renderPackage.previewId, String(renderReceipt.previewId)),
    check("integrity.placeholder_set", "integrity", JSON.stringify(renderReceipt.placeholderSlideIds) === JSON.stringify(placeholders), `${placeholders.length} placeholders`),
    check("content.subtitle_coverage", "content", renderPackage.subtitleCues.length === renderPackage.renderSlides.length, `${renderPackage.subtitleCues.length}/${renderPackage.renderSlides.length}`),
    check("safety.source_reuse_disabled", "safety", renderPackage.policy?.sourceVideoReuseAllowed === false, "source video reuse disabled"),
    check("safety.preview_not_publishable", "safety", renderReceipt.publicationAllowed === false && renderPackage.gates?.publicationAllowed === false, "publication disabled"),
    check("safety.placeholder_labels", "safety", renderPackage.renderSlides.filter((slide) => slide.placeholderRequired).every((slide) => slide.previewLabel.includes("待替换")), "all placeholder frames visibly labelled"),
    ...creativeChecks,
    ...premiumChecksForReport,
  ];

  const failedChecks = checks.filter((item) => !item.passed);
  const failedCreativeChecks = creativeChecks.filter((item) => !item.passed);
  const failedPremiumChecks = premiumChecksForReport.filter((item) => !item.passed);
  const automatedGatePassed = failedChecks.length === 0;

  const qualityProfile = premiumBaselineTarget ? PREMIUM_PROFILE : goldBaselineTarget ? GOLD_PROFILE : "legacy";
  const qualityStage = premiumBaselineRequired
    ? "PREMIUM_FINAL_ENFORCED"
    : premiumBaselineTarget
      ? (hasCreativeEvidence && hasPremiumEvidence ? "PREMIUM_REVIEW_EVALUATED" : "PREMIUM_TARGET_PENDING")
      : goldBaselineRequired
        ? "FINAL_ENFORCED"
        : goldBaselineTarget
          ? (hasCreativeEvidence ? "REVIEW_EVALUATED" : "TARGET_PENDING")
          : "LEGACY";

  const releaseBlockers = [
    ...(placeholders.length ? ["OWNED_SCREEN_RECORDINGS_REQUIRED"] : []),
    ...(renderPackage.voiceover?.finalVoiceApprovalRequired ? ["FINAL_VOICE_APPROVAL_REQUIRED"] : []),
    ...(renderPackage.gates?.humanQualityReviewRequired ? ["HUMAN_QUALITY_REVIEW_REQUIRED"] : []),
    ...(goldBaselineTarget && !goldBaselineRequired && !hasCreativeEvidence ? ["GOLD_CREATIVE_REVIEW_REQUIRED"] : []),
    ...(premiumBaselineTarget && !premiumBaselineRequired && !hasPremiumEvidence ? ["PREMIUM_CREATIVE_REVIEW_REQUIRED"] : []),
    ...(goldCreativeEvaluationRequested && failedCreativeChecks.length ? ["GOLD_BASELINE_QA_FAILED"] : []),
    ...(premiumEvaluationRequested && failedPremiumChecks.length ? ["PREMIUM_BASELINE_QA_FAILED"] : []),
    ...(!automatedGatePassed ? ["AUTOMATED_QA_FAILED"] : []),
  ];

  return freeze({
    schemaVersion: "toolradar.video-quality-report.v1",
    reportId: `${renderPackage.previewId}:quality-report:v1`,
    generatedAt,
    sourcePreviewId: renderPackage.previewId,
    qualityProfile,
    inheritedQualityProfile: premiumBaselineTarget ? GOLD_PROFILE : null,
    qualityStage,
    automatedGate: automatedGatePassed ? "PASS" : "FAIL",
    releaseDecision: releaseBlockers.length ? "BLOCKED" : "ELIGIBLE_FOR_HUMAN_RELEASE_APPROVAL",
    checks: freeze(checks),
    failedCheckIds: freeze(failedChecks.map((item) => item.id)),
    releaseBlockers: freeze(releaseBlockers),
    metrics: freeze({ durationSeconds: duration, width: video?.width, height: video?.height, frameRate, videoCodec: video?.codec_name, audioCodec: audio?.codec_name, bytes: renderReceipt.bytes, sha256: renderReceipt.sha256 }),
    publicationAllowed: false,
    nextMilestone: releaseBlockers.includes("OWNED_SCREEN_RECORDINGS_REQUIRED")
      ? "REPLACE_OWNED_SCREEN_RECORDINGS"
      : releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED")
        ? "COMPLETE_GOLD_CREATIVE_REVIEW"
        : releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED")
          ? "COMPLETE_PREMIUM_CREATIVE_REVIEW"
          : "HUMAN_FINAL_QUALITY_REVIEW",
  });
}

export function validateVideoQualityReport(report) {
  if (report?.schemaVersion !== "toolradar.video-quality-report.v1") throw new TypeError("unsupported quality report");
  if (!Array.isArray(report.checks) || report.checks.length === 0) throw new TypeError("quality checks are required");
  if (report.publicationAllowed !== false) throw new TypeError("quality report cannot authorize publication");
  if (report.automatedGate === "PASS" && report.failedCheckIds.length) throw new TypeError("passed gate cannot contain failed checks");
  if ((report.qualityProfile === GOLD_PROFILE || report.qualityProfile === PREMIUM_PROFILE) && report.checks.some((item) => item.category === "creative" && !item.passed) && report.automatedGate !== "FAIL") {
    throw new TypeError("gold creative failure must fail the automated gate");
  }
  if (report.qualityProfile === PREMIUM_PROFILE && report.checks.some((item) => item.category === "premium" && !item.passed) && report.automatedGate !== "FAIL") {
    throw new TypeError("premium failure must fail the automated gate");
  }
  if (report.qualityProfile === GOLD_PROFILE && report.qualityStage === "TARGET_PENDING" && !report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED")) {
    throw new TypeError("pending Gold target must remain blocked for creative review");
  }
  if (report.qualityProfile === PREMIUM_PROFILE && report.qualityStage === "PREMIUM_TARGET_PENDING") {
    if (!report.releaseBlockers.includes("GOLD_CREATIVE_REVIEW_REQUIRED")) throw new TypeError("Premium target must retain Gold review blocker until Gold evidence exists");
    if (!report.releaseBlockers.includes("PREMIUM_CREATIVE_REVIEW_REQUIRED")) throw new TypeError("Premium target must remain blocked for Premium review");
  }
  return true;
}
