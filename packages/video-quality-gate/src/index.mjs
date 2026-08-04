const freeze = Object.freeze;

function check(id, category, passed, detail, severity = "error") {
  return freeze({ id, category, passed: Boolean(passed), severity, detail });
}

function sha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function buildVideoQualityReport({ renderPackage, renderReceipt, mediaProbe, generatedAt = new Date().toISOString() }) {
  if (renderPackage?.schemaVersion !== "toolradar.render-preview-package.v1") throw new TypeError("unsupported render package");
  if (renderReceipt?.schemaVersion !== "toolradar.render-preview-receipt.v1") throw new TypeError("unsupported render receipt");
  if (!mediaProbe?.format || !Array.isArray(mediaProbe.streams)) throw new TypeError("ffprobe media data is required");

  const video = mediaProbe.streams.find((stream) => stream.codec_type === "video");
  const audio = mediaProbe.streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(mediaProbe.format.duration);
  const frameRateParts = String(video?.avg_frame_rate ?? "0/1").split("/").map(Number);
  const frameRate = frameRateParts[1] ? frameRateParts[0] / frameRateParts[1] : 0;
  const placeholders = renderPackage.placeholderSlideIds ?? [];
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
  ];

  const failedChecks = checks.filter((item) => !item.passed);
  const automatedGatePassed = failedChecks.length === 0;
  const releaseBlockers = [
    ...(placeholders.length ? ["OWNED_SCREEN_RECORDINGS_REQUIRED"] : []),
    ...(renderPackage.voiceover?.finalVoiceApprovalRequired ? ["FINAL_VOICE_APPROVAL_REQUIRED"] : []),
    ...(renderPackage.gates?.humanQualityReviewRequired ? ["HUMAN_QUALITY_REVIEW_REQUIRED"] : []),
    ...(!automatedGatePassed ? ["AUTOMATED_QA_FAILED"] : []),
  ];

  return freeze({
    schemaVersion: "toolradar.video-quality-report.v1",
    reportId: `${renderPackage.previewId}:quality-report:v1`,
    generatedAt,
    sourcePreviewId: renderPackage.previewId,
    automatedGate: automatedGatePassed ? "PASS" : "FAIL",
    releaseDecision: releaseBlockers.length ? "BLOCKED" : "ELIGIBLE_FOR_HUMAN_RELEASE_APPROVAL",
    checks: freeze(checks),
    failedCheckIds: freeze(failedChecks.map((item) => item.id)),
    releaseBlockers: freeze(releaseBlockers),
    metrics: freeze({ durationSeconds: duration, width: video?.width, height: video?.height, frameRate, videoCodec: video?.codec_name, audioCodec: audio?.codec_name, bytes: renderReceipt.bytes, sha256: renderReceipt.sha256 }),
    publicationAllowed: false,
    nextMilestone: releaseBlockers.includes("OWNED_SCREEN_RECORDINGS_REQUIRED") ? "REPLACE_OWNED_SCREEN_RECORDINGS" : "HUMAN_FINAL_QUALITY_REVIEW",
  });
}

export function validateVideoQualityReport(report) {
  if (report?.schemaVersion !== "toolradar.video-quality-report.v1") throw new TypeError("unsupported quality report");
  if (!Array.isArray(report.checks) || report.checks.length === 0) throw new TypeError("quality checks are required");
  if (report.publicationAllowed !== false) throw new TypeError("quality report cannot authorize publication");
  if (report.automatedGate === "PASS" && report.failedCheckIds.length) throw new TypeError("passed gate cannot contain failed checks");
  return true;
}
