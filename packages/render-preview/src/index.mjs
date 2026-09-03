const freeze = (value) => Object.freeze(value);
const TIMELINE_EPSILON_SECONDS = 1e-9;

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredNumber(value, field) {
  if (!Number.isFinite(value)) throw new TypeError(`${field} must be a finite number`);
  return value;
}

function timelineEqual(left, right) {
  return Math.abs(left - right) <= TIMELINE_EPSILON_SECONDS;
}

function formatSrtTime(totalSeconds) {
  const milliseconds = Math.round(totalSeconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function buildRenderPreviewPackage(
  storyboardPackage,
  { generatedAt = new Date().toISOString() } = {},
) {
  if (storyboardPackage?.schemaVersion !== "toolradar.storyboard-package.v1") {
    throw new TypeError("unsupported storyboard package schema");
  }
  if (Number.isNaN(new Date(generatedAt).getTime())) {
    throw new TypeError("generatedAt must be a valid timestamp");
  }

  const shots = storyboardPackage.storyboard?.shots;
  const assets = storyboardPackage.assetManifest?.assets;
  if (!Array.isArray(shots) || shots.length === 0) throw new TypeError("storyboard shots are required");
  if (!Array.isArray(assets)) throw new TypeError("asset manifest is required");

  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));
  let expectedStart = 0;
  const renderSlides = shots.map((shot, index) => {
    const shotId = requiredString(shot.shotId, `shots[${index}].shotId`);
    const startSecond = requiredNumber(shot.startSecond, `${shotId}.startSecond`);
    const endSecond = requiredNumber(shot.endSecond, `${shotId}.endSecond`);
    const durationSeconds = requiredNumber(shot.durationSeconds, `${shotId}.durationSeconds`);
    if (
      !timelineEqual(startSecond, expectedStart)
      || !timelineEqual(endSecond - startSecond, durationSeconds)
    ) {
      throw new TypeError(`${shotId} must form a contiguous timeline`);
    }
    expectedStart = endSecond;

    const requiredAssetIds = [...(shot.requiredAssetIds ?? [])];
    const missingAssetIds = requiredAssetIds.filter((assetId) => !assetById.has(assetId));
    if (missingAssetIds.length) {
      throw new TypeError(`${shotId} references missing assets: ${missingAssetIds.join(", ")}`);
    }

    const unresolvedHumanAssets = requiredAssetIds.filter((assetId) => {
      const asset = assetById.get(assetId);
      return asset?.required === true && asset?.state === "human_capture_required";
    });
    const placeholderRequired = unresolvedHumanAssets.length > 0;

    return freeze({
      slideId: `render:${shotId}`,
      shotId,
      order: shot.order,
      startSecond,
      endSecond,
      durationSeconds,
      narrationText: requiredString(shot.narrationText, `${shotId}.narrationText`),
      onScreenText: requiredString(shot.onScreenText, `${shotId}.onScreenText`),
      visualType: shot.visualType,
      evidenceRefs: freeze([...(shot.evidenceRefs ?? [])]),
      requiredAssetIds: freeze(requiredAssetIds),
      placeholderRequired,
      unresolvedHumanAssets: freeze(unresolvedHumanAssets),
      previewLabel: placeholderRequired
        ? "自有录屏待替换 · 本画面仅用于验证剪辑流水线"
        : "自有生成素材",
    });
  });

  const timelineDurationSeconds = requiredNumber(
    storyboardPackage.timelineDurationSeconds,
    "timelineDurationSeconds",
  );
  if (!timelineEqual(expectedStart, timelineDurationSeconds)) {
    throw new TypeError("render slides must cover the full storyboard duration");
  }

  const subtitleCues = renderSlides.map((slide, index) => freeze({
    index: index + 1,
    startSecond: slide.startSecond,
    endSecond: slide.endSecond,
    startSrt: formatSrtTime(slide.startSecond),
    endSrt: formatSrtTime(slide.endSecond),
    text: slide.narrationText,
  }));
  const placeholderSlideIds = renderSlides
    .filter((slide) => slide.placeholderRequired)
    .map((slide) => slide.slideId);

  return freeze({
    schemaVersion: "toolradar.render-preview-package.v1",
    previewId: `${storyboardPackage.packageId}:render-preview:v1`,
    generatedAt,
    sourceStoryboardPackageId: storyboardPackage.packageId,
    sourceCaseId: storyboardPackage.sourceCaseId,
    status: placeholderSlideIds.length
      ? "PREVIEW_RENDERABLE_WITH_PLACEHOLDERS"
      : "PREVIEW_RENDERABLE_WITH_COMPLETE_ASSETS",
    format: freeze({
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      frameRate: 30,
      videoCodec: "libx264",
      audioCodec: "aac",
    }),
    voiceover: freeze({
      engine: "espeak-ng",
      voice: "cmn",
      purpose: "pipeline_preview_only",
      finalVoiceApprovalRequired: true,
    }),
    timelineDurationSeconds,
    renderSlides: freeze(renderSlides),
    subtitleCues: freeze(subtitleCues),
    placeholderSlideIds: freeze(placeholderSlideIds),
    gates: freeze({
      previewRenderAllowed: true,
      finalRenderAllowed: placeholderSlideIds.length === 0,
      humanAssetReplacementRequired: placeholderSlideIds.length > 0,
      humanQualityReviewRequired: true,
      publicationAllowed: false,
    }),
    policy: freeze({
      sourceVideoDownloadAllowed: false,
      sourceVideoReuseAllowed: false,
      thirdPartyFootageAllowed: false,
      previewMustDisplayPlaceholderLabels: true,
      automaticPublishingAllowed: false,
    }),
    nextMilestone: placeholderSlideIds.length
      ? "REPLACE_PLACEHOLDERS_AND_RUN_FINAL_QA"
      : "RUN_FINAL_VIDEO_QA",
  });
}

export function validateRenderPreviewPackage(renderPackage) {
  if (renderPackage?.schemaVersion !== "toolradar.render-preview-package.v1") {
    throw new TypeError("unsupported render preview package schema");
  }
  if (renderPackage.gates?.publicationAllowed !== false) {
    throw new TypeError("render preview must not be publishable");
  }
  if (renderPackage.policy?.sourceVideoReuseAllowed !== false) {
    throw new TypeError("source video reuse must remain disabled");
  }
  if (!Array.isArray(renderPackage.renderSlides) || renderPackage.renderSlides.length === 0) {
    throw new TypeError("render slides are required");
  }
  if (!Array.isArray(renderPackage.subtitleCues)) {
    throw new TypeError("subtitle cues are required");
  }
  for (const slide of renderPackage.renderSlides) {
    requiredString(slide.slideId, "slideId");
    requiredString(slide.narrationText, `${slide.slideId}.narrationText`);
    if (slide.placeholderRequired && !slide.previewLabel.includes("待替换")) {
      throw new TypeError("placeholder slides must be visibly labelled");
    }
  }
  return true;
}

export function buildSrt(renderPackage) {
  validateRenderPreviewPackage(renderPackage);
  return `${renderPackage.subtitleCues.map((cue) => [
    cue.index,
    `${cue.startSrt} --> ${cue.endSrt}`,
    cue.text,
  ].join("\n")).join("\n\n")}\n`;
}
