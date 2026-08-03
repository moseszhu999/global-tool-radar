import { createHash } from "node:crypto";
import { SOURCE_TYPES } from "../../contracts/src/index.mjs";

export const SNAPSHOT_METRIC_KEYS = Object.freeze([
  "viewCount",
  "likeCount",
  "commentCount",
  "voteCount",
  "starCount",
  "forkCount",
  "downloadCount",
]);

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeTimestamp(value, field) {
  assertNonEmptyString(value, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function normalizeHttpUrl(value, field) {
  assertNonEmptyString(value, field);
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new TypeError(`${field} must use http or https`);
  }
  return url.toString();
}

function stableValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("rawPayload numbers must be finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => {
          if (value[key] === undefined) {
            throw new TypeError("rawPayload must not contain undefined");
          }
          return [key, stableValue(value[key])];
        }),
    );
  }
  throw new TypeError(`rawPayload contains unsupported value: ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(stableValue(value));
}

export function hashPayload(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function createSourceItem(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("source item input must be an object");
  }
  if (!SOURCE_TYPES.includes(input.sourceType)) {
    throw new TypeError(`sourceType must be one of: ${SOURCE_TYPES.join(", ")}`);
  }
  assertNonEmptyString(input.externalId, "externalId");
  assertNonEmptyString(input.title, "title");

  const rawPayload = stableValue(input.rawPayload ?? {});
  const item = {
    sourceType: input.sourceType,
    externalId: input.externalId.trim(),
    sourceKey: `${input.sourceType}:${input.externalId.trim()}`,
    sourceUrl: normalizeHttpUrl(input.sourceUrl, "sourceUrl"),
    title: input.title.trim(),
    body: typeof input.body === "string" ? input.body : "",
    publishedAt: input.publishedAt ? normalizeTimestamp(input.publishedAt, "publishedAt") : null,
    capturedAt: normalizeTimestamp(input.capturedAt, "capturedAt"),
    rawPayload,
    contentHash: hashPayload(rawPayload),
  };
  return Object.freeze(item);
}

function normalizeCount(value, field) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new TypeError(`${field} must be null or a non-negative safe integer`);
  }
  return numeric;
}

export function createMetricSnapshot(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("metric snapshot input must be an object");
  }
  assertNonEmptyString(input.sourceItemId, "sourceItemId");
  if (!input.metrics || typeof input.metrics !== "object" || Array.isArray(input.metrics)) {
    throw new TypeError("metrics must be an object");
  }

  const unknownKeys = Object.keys(input.metrics).filter(
    (key) => !SNAPSHOT_METRIC_KEYS.includes(key),
  );
  if (unknownKeys.length > 0) {
    throw new TypeError(`unknown snapshot metrics: ${unknownKeys.join(", ")}`);
  }

  const metrics = Object.fromEntries(
    SNAPSHOT_METRIC_KEYS.map((key) => [key, normalizeCount(input.metrics[key], `metrics.${key}`)]),
  );
  if (Object.values(metrics).every((value) => value === null)) {
    throw new TypeError("at least one snapshot metric must be observable");
  }

  const capturedAt = normalizeTimestamp(input.capturedAt, "capturedAt");
  return Object.freeze({
    sourceItemId: input.sourceItemId.trim(),
    capturedAt,
    snapshotKey: `${input.sourceItemId.trim()}@${capturedAt}`,
    metrics: Object.freeze(metrics),
  });
}

export function deriveMetricVelocity(older, newer, metricKey) {
  if (!SNAPSHOT_METRIC_KEYS.includes(metricKey)) {
    throw new TypeError(`unsupported metricKey: ${metricKey}`);
  }
  if (older.sourceItemId !== newer.sourceItemId) {
    throw new TypeError("snapshots must belong to the same source item");
  }

  const olderTime = new Date(older.capturedAt).getTime();
  const newerTime = new Date(newer.capturedAt).getTime();
  const elapsedHours = (newerTime - olderTime) / 3_600_000;
  if (!(elapsedHours > 0)) {
    throw new TypeError("newer snapshot must be later than older snapshot");
  }

  const from = older.metrics[metricKey];
  const to = newer.metrics[metricKey];
  if (from === null || to === null) {
    return Object.freeze({
      metricKey,
      observable: false,
      elapsedHours,
      delta: null,
      perHour: null,
      direction: "unknown",
    });
  }

  const delta = to - from;
  return Object.freeze({
    metricKey,
    observable: true,
    elapsedHours,
    delta,
    perHour: Math.round((delta / elapsedHours) * 100) / 100,
    direction: delta > 0 ? "increase" : delta < 0 ? "decrease" : "unchanged",
  });
}
