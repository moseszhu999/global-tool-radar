function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const PLATFORM_METRICS = {
  douyin: ["views", "likes", "comments", "shares", "favorites", "followersGained", "averageWatchSeconds", "completionRate"],
  bilibili: ["views", "likes", "coins", "favorites", "comments", "danmaku", "shares", "followersGained", "averageWatchSeconds", "completionRate"],
};

export function buildPublicationIntakePlan({ releasePackage, generatedAt }) {
  invariant(releasePackage?.schemaVersion === "toolradar.platform-release-package.v1", "invalid release package");
  invariant(releasePackage.media?.sha256?.length === 64, "invalid media digest");

  const platforms = Object.fromEntries(Object.keys(PLATFORM_METRICS).map((platform) => [platform, {
    platform,
    publicationReceiptRequired: true,
    analyticsSnapshotsRequired: true,
    publicationReceiptTemplate: {
      schemaVersion: "toolradar.publication-receipt.v1",
      platform,
      releasePackageId: releasePackage.releasePackageId,
      sourceCaseId: releasePackage.sourceCaseId,
      mediaSha256: releasePackage.media.sha256,
      platformVideoId: null,
      canonicalUrl: null,
      publishedAt: null,
      capturedAt: null,
      captureMethod: null,
      evidenceUrl: null,
      operatorConfirmed: false,
    },
    analyticsSnapshotTemplate: {
      schemaVersion: "toolradar.platform-analytics-snapshot.v1",
      platform,
      sourceCaseId: releasePackage.sourceCaseId,
      mediaSha256: releasePackage.media.sha256,
      platformVideoId: null,
      observedAt: null,
      windowHoursSincePublication: null,
      metrics: Object.fromEntries(PLATFORM_METRICS[platform].map((metric) => [metric, null])),
      source: null,
      evidenceUrl: null,
      operatorConfirmed: false,
    },
  }]));

  return {
    schemaVersion: "toolradar.publication-intake-plan.v1",
    intakePlanId: `${releasePackage.releasePackageId}:feedback:v1`,
    generatedAt,
    releasePackageId: releasePackage.releasePackageId,
    sourceCaseId: releasePackage.sourceCaseId,
    mediaSha256: releasePackage.media.sha256,
    state: "AWAITING_REAL_PUBLICATION",
    platforms,
    gates: {
      realPublicationReceiptPresent: false,
      analyticsCollectionAllowed: false,
      optimizationAllowed: false,
    },
    policy: {
      fabricatedPublicationReceiptAllowed: false,
      fabricatedMetricsAllowed: false,
      automaticPlatformCredentialUseAllowed: false,
      inferenceFromMissingMetricsAllowed: false,
    },
  };
}

export function validatePublicationReceipt(receipt, intakePlan) {
  invariant(receipt?.schemaVersion === "toolradar.publication-receipt.v1", "invalid publication receipt");
  invariant(intakePlan?.schemaVersion === "toolradar.publication-intake-plan.v1", "invalid intake plan");
  invariant(Object.hasOwn(PLATFORM_METRICS, receipt.platform), "unsupported platform");
  invariant(receipt.releasePackageId === intakePlan.releasePackageId, "release package mismatch");
  invariant(receipt.sourceCaseId === intakePlan.sourceCaseId, "case mismatch");
  invariant(receipt.mediaSha256 === intakePlan.mediaSha256, "media digest mismatch");
  invariant(typeof receipt.platformVideoId === "string" && receipt.platformVideoId.trim().length > 0, "platform video id required");
  invariant(typeof receipt.canonicalUrl === "string" && /^https:\/\//.test(receipt.canonicalUrl), "canonical URL required");
  invariant(!Number.isNaN(Date.parse(receipt.publishedAt)), "publishedAt required");
  invariant(!Number.isNaN(Date.parse(receipt.capturedAt)), "capturedAt required");
  invariant(["platform_ui", "platform_api", "manual_verified_export"].includes(receipt.captureMethod), "unsupported capture method");
  invariant(receipt.operatorConfirmed === true, "operator confirmation required");
  return receipt;
}

export function validateAnalyticsSnapshot(snapshot, { intakePlan, publicationReceipt }) {
  invariant(snapshot?.schemaVersion === "toolradar.platform-analytics-snapshot.v1", "invalid analytics snapshot");
  validatePublicationReceipt(publicationReceipt, intakePlan);
  invariant(snapshot.platform === publicationReceipt.platform, "platform mismatch");
  invariant(snapshot.sourceCaseId === intakePlan.sourceCaseId, "case mismatch");
  invariant(snapshot.mediaSha256 === intakePlan.mediaSha256, "media digest mismatch");
  invariant(snapshot.platformVideoId === publicationReceipt.platformVideoId, "platform video id mismatch");
  invariant(!Number.isNaN(Date.parse(snapshot.observedAt)), "observedAt required");
  invariant(Number.isFinite(snapshot.windowHoursSincePublication) && snapshot.windowHoursSincePublication >= 0, "valid observation window required");
  invariant(["platform_ui", "platform_api", "manual_verified_export"].includes(snapshot.source), "unsupported analytics source");
  invariant(snapshot.operatorConfirmed === true, "operator confirmation required");

  const allowed = new Set(PLATFORM_METRICS[snapshot.platform]);
  invariant(snapshot.metrics && typeof snapshot.metrics === "object", "metrics required");
  for (const [key, value] of Object.entries(snapshot.metrics)) {
    invariant(allowed.has(key), `unsupported metric: ${key}`);
    invariant(value === null || (Number.isFinite(value) && value >= 0), `invalid metric: ${key}`);
  }
  invariant(Object.values(snapshot.metrics).some((value) => value !== null), "at least one observed metric required");
  return snapshot;
}

export function buildFeedbackReadiness({ intakePlan, publicationReceipts = [], analyticsSnapshots = [] }) {
  invariant(intakePlan?.schemaVersion === "toolradar.publication-intake-plan.v1", "invalid intake plan");
  const validReceipts = publicationReceipts.map((receipt) => validatePublicationReceipt(receipt, intakePlan));
  const receiptByPlatform = new Map(validReceipts.map((receipt) => [receipt.platform, receipt]));
  const validSnapshots = analyticsSnapshots.map((snapshot) => validateAnalyticsSnapshot(snapshot, {
    intakePlan,
    publicationReceipt: receiptByPlatform.get(snapshot.platform),
  }));

  const publishedPlatforms = [...receiptByPlatform.keys()].sort();
  const measuredPlatforms = [...new Set(validSnapshots.map((snapshot) => snapshot.platform))].sort();
  return {
    schemaVersion: "toolradar.feedback-readiness.v1",
    intakePlanId: intakePlan.intakePlanId,
    state: validSnapshots.length > 0 ? "REAL_METRICS_AVAILABLE" : validReceipts.length > 0 ? "PUBLISHED_AWAITING_METRICS" : "AWAITING_REAL_PUBLICATION",
    publishedPlatforms,
    measuredPlatforms,
    publicationReceiptCount: validReceipts.length,
    analyticsSnapshotCount: validSnapshots.length,
    optimizationAllowed: validSnapshots.length > 0,
    blockers: validReceipts.length === 0
      ? ["REAL_PUBLICATION_RECEIPT_REQUIRED"]
      : validSnapshots.length === 0
        ? ["REAL_PLATFORM_ANALYTICS_REQUIRED"]
        : [],
  };
}
