const PLATFORM_RULES = {
  douyin: {
    platform: "douyin",
    acceptedContainers: ["mp4", "webm"],
    maxBytes: 4_000_000_000,
    maxDurationSeconds: 900,
    minimumWidth: 720,
    minimumHeight: 1280,
    requiredScopes: ["video.create"],
    authorizationRequired: true,
    explicitUserAwarenessRequired: true,
    source: "https://open.douyin.com/platform/resource/docs/ability/content-management/douyin-publish-solution",
  },
  bilibili: {
    platform: "bilibili",
    acceptedContainers: ["mp4"],
    maxBytes: null,
    maxDurationSeconds: null,
    minimumWidth: 720,
    minimumHeight: 1280,
    requiredScopes: [],
    authorizationRequired: true,
    explicitUserAwarenessRequired: true,
    source: null,
  },
};

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function buildPlatformReleasePackage({ productionCase, renderPackage, renderReceipt, qualityReport, generatedAt }) {
  invariant(productionCase?.schemaVersion === "toolradar.video-production-case.v1", "invalid production case");
  invariant(renderPackage?.schemaVersion === "toolradar.render-preview-package.v1", "invalid render package");
  invariant(renderReceipt?.schemaVersion === "toolradar.render-preview-receipt.v1", "invalid render receipt");
  invariant(qualityReport?.schemaVersion === "toolradar.video-quality-report.v1", "invalid quality report");
  invariant(productionCase.caseId === renderPackage.sourceCaseId, "case mismatch");
  invariant(renderPackage.previewId === renderReceipt.previewId, "preview mismatch");

  const blockers = new Set(qualityReport.releaseBlockers ?? []);
  if (qualityReport.releaseDecision !== "READY") blockers.add("QUALITY_RELEASE_DECISION_NOT_READY");
  if (renderReceipt.finalRender !== true) blockers.add("FINAL_RENDER_REQUIRED");
  if (renderReceipt.publicationAllowed !== true) blockers.add("RENDER_PUBLICATION_AUTHORITY_REQUIRED");
  if (productionCase.gates?.publicationAllowed !== true) blockers.add("CASE_PUBLICATION_AUTHORITY_REQUIRED");
  if (productionCase.policy?.formalPublicationPerformed === true) blockers.add("DUPLICATE_PUBLICATION_GUARD");

  const media = {
    fileName: renderReceipt.outputFile,
    sha256: renderReceipt.sha256,
    bytes: renderReceipt.bytes,
    durationSeconds: renderReceipt.actualDurationSeconds,
    width: renderReceipt.width,
    height: renderReceipt.height,
    frameRate: renderReceipt.frameRate,
    container: "mp4",
  };

  const platformCopy = productionCase.script.platformCopy;
  const platforms = Object.fromEntries(Object.entries(PLATFORM_RULES).map(([key, rules]) => {
    const copy = platformCopy[key];
    const checks = {
      containerAccepted: rules.acceptedContainers.includes(media.container),
      fileSizeAccepted: rules.maxBytes == null || media.bytes <= rules.maxBytes,
      durationAccepted: rules.maxDurationSeconds == null || media.durationSeconds <= rules.maxDurationSeconds,
      resolutionAccepted: media.width >= rules.minimumWidth && media.height >= rules.minimumHeight,
      titlePresent: Boolean(copy?.title?.trim()),
      descriptionPresent: Boolean(copy?.description?.trim()),
      tagsPresent: Array.isArray(copy?.tags) && copy.tags.length > 0,
    };
    return [key, {
      rules,
      copy,
      checks,
      technicalPreflight: Object.values(checks).every(Boolean) ? "PASS" : "FAIL",
      uploadAllowed: false,
      publishAllowed: false,
      requiredHumanActions: [
        "review final video and copy",
        "authenticate the platform account",
        "grant required platform permission",
        "explicitly approve this exact SHA-256 for upload",
        "confirm the final publish action in the platform UI",
      ],
    }];
  }));

  return {
    schemaVersion: "toolradar.platform-release-package.v1",
    releasePackageId: `${productionCase.caseId}:release:v1`,
    generatedAt,
    sourceCaseId: productionCase.caseId,
    previewId: renderPackage.previewId,
    state: blockers.size === 0 ? "READY_FOR_HUMAN_AUTHORIZED_UPLOAD" : "BLOCKED_BEFORE_UPLOAD",
    media,
    platforms,
    releaseBlockers: [...blockers].sort(),
    gates: {
      technicalPackagePrepared: true,
      platformAccountAuthenticated: false,
      platformPermissionGranted: false,
      exactMediaApprovedByHuman: false,
      uploadAllowed: false,
      publicationAllowed: false,
    },
    policy: {
      automaticCredentialUseAllowed: false,
      automaticUploadAllowed: false,
      automaticPublishingAllowed: false,
      fabricatedPublicationReceiptAllowed: false,
    },
  };
}

export function validatePlatformReleasePackage(value) {
  invariant(value?.schemaVersion === "toolradar.platform-release-package.v1", "invalid release package");
  invariant(value.gates.uploadAllowed === false, "upload must remain disabled");
  invariant(value.gates.publicationAllowed === false, "publication must remain disabled");
  invariant(value.policy.automaticPublishingAllowed === false, "automatic publishing must remain disabled");
  invariant(value.media?.sha256?.length === 64, "invalid media digest");
  invariant(value.platforms?.douyin && value.platforms?.bilibili, "platform packages missing");
  return value;
}
