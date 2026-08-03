import { createHash } from "node:crypto";

const HEX_64 = /^[0-9a-f]{64}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

function assertObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeTimestamp(value, field) {
  assertNonEmptyString(value, field);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return parsed.toISOString();
}

function freezeReceipt(value) {
  return Object.freeze({
    ...value,
    batches: Object.freeze(value.batches.map((batch) => Object.freeze(batch))),
  });
}

export function sha256Hex(value) {
  if (!(typeof value === "string" || value instanceof Uint8Array)) {
    throw new TypeError("value must be a string or Uint8Array");
  }
  return createHash("sha256").update(value).digest("hex");
}

export function validateYouTubeRssArtifact(
  artifact,
  {
    expectedSourceCommitSha,
    requireSourceCommitSha = true,
  } = {},
) {
  assertObject(artifact, "artifact");
  if (artifact.artifactVersion !== "youtube-rss-pilot-v1") {
    throw new Error("Unsupported YouTube RSS artifact version");
  }
  if (artifact.evidenceClass !== "public_metadata_capture") {
    throw new Error("Artifact evidence class is not public metadata capture");
  }
  if (artifact.promotionGate !== "METRIC_CONFIRMATION_REQUIRED") {
    throw new Error("Artifact promotion gate is not metric-confirmation required");
  }
  const capturedAt = normalizeTimestamp(artifact.capturedAt, "artifact.capturedAt");
  const sourceCommitSha = artifact.sourceCommitSha ?? null;
  if (requireSourceCommitSha && !COMMIT_SHA.test(sourceCommitSha ?? "")) {
    throw new Error("Artifact sourceCommitSha must be a canonical 40-character SHA");
  }
  if (
    expectedSourceCommitSha !== undefined &&
    sourceCommitSha !== expectedSourceCommitSha
  ) {
    throw new Error("Artifact sourceCommitSha does not match the expected commit");
  }
  if (!Array.isArray(artifact.videos) || artifact.videos.length === 0) {
    throw new Error("Artifact must contain at least one video");
  }
  if (artifact.videoCount !== artifact.videos.length) {
    throw new Error("Artifact videoCount does not match videos length");
  }

  const seen = new Set();
  let metricSnapshotCount = 0;
  const captures = artifact.videos.map((video, index) => {
    assertObject(video, `artifact.videos[${index}]`);
    assertObject(video.channel, `artifact.videos[${index}].channel`);
    if (!CHANNEL_ID.test(video.channel.channelId ?? "")) {
      throw new Error(`artifact.videos[${index}] has a noncanonical channel ID`);
    }
    assertObject(video.sourceItem, `artifact.videos[${index}].sourceItem`);
    const sourceItem = video.sourceItem;
    if (sourceItem.sourceType !== "youtube_video") {
      throw new Error(`artifact.videos[${index}] is not a YouTube video`);
    }
    assertNonEmptyString(sourceItem.externalId, `artifact.videos[${index}].externalId`);
    if (seen.has(sourceItem.externalId)) {
      throw new Error(`Artifact contains duplicate video ${sourceItem.externalId}`);
    }
    seen.add(sourceItem.externalId);
    assertNonEmptyString(sourceItem.sourceUrl, `artifact.videos[${index}].sourceUrl`);
    assertNonEmptyString(sourceItem.title, `artifact.videos[${index}].title`);
    if (!HEX_64.test(sourceItem.contentHash ?? "")) {
      throw new Error(`artifact.videos[${index}] has an invalid content hash`);
    }
    if (normalizeTimestamp(sourceItem.capturedAt, "sourceItem.capturedAt") !== capturedAt) {
      throw new Error(`artifact.videos[${index}] capturedAt differs from the artifact`);
    }
    assertObject(sourceItem.rawPayload, `artifact.videos[${index}].rawPayload`);
    if (sourceItem.rawPayload.channelId !== video.channel.channelId) {
      throw new Error(`artifact.videos[${index}] channel ownership mismatch`);
    }
    if (sourceItem.rawPayload.videoId !== sourceItem.externalId) {
      throw new Error(`artifact.videos[${index}] video identity mismatch`);
    }

    const metricSnapshot = video.metricSnapshot ?? null;
    if (metricSnapshot !== null) {
      assertObject(metricSnapshot, `artifact.videos[${index}].metricSnapshot`);
      if (metricSnapshot.sourceItemId !== sourceItem.sourceKey) {
        throw new Error(`artifact.videos[${index}] snapshot source mismatch`);
      }
      if (
        normalizeTimestamp(metricSnapshot.capturedAt, "metricSnapshot.capturedAt") !==
        capturedAt
      ) {
        throw new Error(`artifact.videos[${index}] snapshot time mismatch`);
      }
      assertObject(metricSnapshot.metrics, `artifact.videos[${index}].metrics`);
      const views = metricSnapshot.metrics.viewCount;
      if (!(views === null || (Number.isInteger(views) && views >= 0))) {
        throw new Error(`artifact.videos[${index}] has an invalid viewCount`);
      }
      metricSnapshotCount += 1;
    }

    return Object.freeze({ sourceItem, metricSnapshot });
  });

  if (artifact.metricSnapshotCount !== metricSnapshotCount) {
    throw new Error("Artifact metricSnapshotCount does not match observable snapshots");
  }
  return Object.freeze({
    artifactVersion: artifact.artifactVersion,
    evidenceClass: artifact.evidenceClass,
    promotionGate: artifact.promotionGate,
    capturedAt,
    sourceCommitSha,
    videoCount: captures.length,
    metricSnapshotCount,
    captures: Object.freeze(captures),
  });
}

export async function importYouTubeRssArtifact({
  artifact,
  artifactSha256,
  expectedArtifactSha256,
  expectedSourceCommitSha,
  repository,
  batchSize = 25,
} = {}) {
  if (!HEX_64.test(artifactSha256 ?? "")) {
    throw new Error("artifactSha256 must be a lowercase SHA-256 digest");
  }
  if (
    expectedArtifactSha256 !== undefined &&
    artifactSha256 !== expectedArtifactSha256
  ) {
    throw new Error("Artifact SHA-256 does not match the expected digest");
  }
  if (!repository || typeof repository.persistSourceCaptureBatch !== "function") {
    throw new TypeError("repository.persistSourceCaptureBatch must be a function");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new TypeError("batchSize must be an integer from 1 to 100");
  }
  const validated = validateYouTubeRssArtifact(artifact, {
    expectedSourceCommitSha,
  });
  const batches = [];
  let processed = 0;
  let revisionsInserted = 0;
  let snapshotsInserted = 0;

  for (let offset = 0; offset < validated.captures.length; offset += batchSize) {
    const captures = validated.captures.slice(offset, offset + batchSize);
    const result = await repository.persistSourceCaptureBatch(captures);
    if (!result || result.processed !== captures.length) {
      throw new Error(`Artifact batch ${batches.length + 1} returned an invalid receipt`);
    }
    processed += result.processed;
    revisionsInserted += result.revisionsInserted;
    snapshotsInserted += result.snapshotsInserted;
    batches.push({
      batchNumber: batches.length + 1,
      offset,
      processed: result.processed,
      revisionsInserted: result.revisionsInserted,
      snapshotsInserted: result.snapshotsInserted,
    });
  }

  return freezeReceipt({
    receiptVersion: "toolradar-artifact-import-v1",
    artifactVersion: validated.artifactVersion,
    artifactSha256,
    sourceCommitSha: validated.sourceCommitSha,
    capturedAt: validated.capturedAt,
    promotionGate: validated.promotionGate,
    batchSize,
    processed,
    revisionsInserted,
    snapshotsInserted,
    exactReplay: revisionsInserted === 0 && snapshotsInserted === 0,
    batches,
  });
}
