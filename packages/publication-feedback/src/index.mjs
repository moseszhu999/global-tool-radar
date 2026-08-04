const METRICS = [
  "views",
  "likes",
  "comments",
  "favorites",
  "shares",
  "followersGained",
  "averageWatchSeconds",
  "completionRate",
];

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireIso(value, label) {
  requireString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be ISO-8601`);
  return parsed;
}

function metricValue(snapshot, name) {
  const value = snapshot.metrics?.[name];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`metrics.${name} must be null or a non-negative number`);
  }
  if (name === "completionRate" && value > 1) {
    throw new Error("metrics.completionRate must be between 0 and 1");
  }
  return value;
}

function normalizeNumber(value) {
  return Number(value.toFixed(12));
}

export function validatePublicationReceipt(receipt) {
  requireObject(receipt, "publicationReceipt");
  requireString(receipt.platform, "publicationReceipt.platform");
  requireString(receipt.platformVideoId, "publicationReceipt.platformVideoId");
  requireString(receipt.canonicalUrl, "publicationReceipt.canonicalUrl");
  if (!receipt.canonicalUrl.startsWith("https://")) {
    throw new Error("publicationReceipt.canonicalUrl must use https");
  }
  requireIso(receipt.publishedAt, "publicationReceipt.publishedAt");
  requireString(receipt.mediaSha256, "publicationReceipt.mediaSha256");
  if (!/^[a-f0-9]{64}$/i.test(receipt.mediaSha256)) {
    throw new Error("publicationReceipt.mediaSha256 must be a SHA-256 digest");
  }
  if (receipt.humanConfirmed !== true) {
    throw new Error("publicationReceipt.humanConfirmed must be true");
  }
  return receipt;
}

export function validateAnalyticsSnapshot(snapshot, receipt) {
  requireObject(snapshot, "analyticsSnapshot");
  requireString(snapshot.platform, "analyticsSnapshot.platform");
  requireString(snapshot.platformVideoId, "analyticsSnapshot.platformVideoId");
  requireString(snapshot.mediaSha256, "analyticsSnapshot.mediaSha256");
  const capturedAt = requireIso(snapshot.capturedAt, "analyticsSnapshot.capturedAt");
  if (snapshot.platform !== receipt.platform) throw new Error("snapshot platform mismatch");
  if (snapshot.platformVideoId !== receipt.platformVideoId) throw new Error("snapshot video id mismatch");
  if (snapshot.mediaSha256 !== receipt.mediaSha256) throw new Error("snapshot media digest mismatch");
  if (capturedAt < Date.parse(receipt.publishedAt)) throw new Error("snapshot predates publication");
  if (snapshot.humanConfirmed !== true) throw new Error("analyticsSnapshot.humanConfirmed must be true");
  const values = Object.fromEntries(METRICS.map((name) => [name, metricValue(snapshot, name)]));
  if (Object.values(values).every((value) => value === null)) {
    throw new Error("snapshot must include at least one real metric");
  }
  return { ...snapshot, metrics: values };
}

function delta(first, last, name) {
  const from = first.metrics[name];
  const to = last.metrics[name];
  if (from === null || to === null) return { from, to, absolute: null, relative: null };
  const absolute = normalizeNumber(to - from);
  return {
    from,
    to,
    absolute,
    relative: from === 0 ? null : normalizeNumber(absolute / from),
  };
}

export function buildBoundedFeedbackReport({ publicationReceipt, analyticsSnapshots, generatedAt }) {
  const receipt = validatePublicationReceipt(publicationReceipt);
  if (!Array.isArray(analyticsSnapshots) || analyticsSnapshots.length < 2) {
    throw new Error("at least two real analytics snapshots are required");
  }
  const snapshots = analyticsSnapshots
    .map((snapshot) => validateAnalyticsSnapshot(snapshot, receipt))
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  for (let index = 1; index < snapshots.length; index += 1) {
    if (snapshots[index].capturedAt === snapshots[index - 1].capturedAt) {
      throw new Error("analytics snapshots must have distinct capturedAt values");
    }
  }
  const first = snapshots[0];
  const last = snapshots.at(-1);
  const deltas = Object.fromEntries(METRICS.map((name) => [name, delta(first, last, name)]));
  const recommendations = [];
  const completion = deltas.completionRate;
  if (completion.from !== null && completion.to !== null) {
    recommendations.push({
      type: "observe_completion_rate",
      evidence: completion,
      action: completion.absolute < 0
        ? "Review the opening hook and first transition before changing the topic or claim."
        : "Keep the current opening structure unchanged until another real publication provides comparison evidence.",
    });
  }
  const views = deltas.views;
  if (views.from !== null && views.to !== null) {
    recommendations.push({
      type: "observe_view_growth",
      evidence: views,
      action: "Treat view growth as distribution evidence only; do not infer product adoption or content quality from views alone.",
    });
  }
  return {
    schemaVersion: "toolradar.bounded-publication-feedback-report.v1",
    generatedAt: generatedAt ?? new Date().toISOString(),
    publication: {
      platform: receipt.platform,
      platformVideoId: receipt.platformVideoId,
      canonicalUrl: receipt.canonicalUrl,
      publishedAt: receipt.publishedAt,
      mediaSha256: receipt.mediaSha256,
    },
    observationWindow: {
      firstCapturedAt: first.capturedAt,
      lastCapturedAt: last.capturedAt,
      snapshotCount: snapshots.length,
    },
    deltas,
    recommendations,
    gates: {
      realPublicationProven: true,
      multipleRealSnapshotsProven: true,
      causalClaimAllowed: false,
      automaticContentMutationAllowed: false,
      automaticRepublishingAllowed: false,
      humanReviewRequired: true,
    },
  };
}
