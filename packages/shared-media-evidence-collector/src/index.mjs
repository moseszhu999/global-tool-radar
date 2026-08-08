import {createHash} from 'node:crypto';

import {
  MEDIA_RENDER_V1,
  assertNoForbiddenDomainFieldsV1,
  validateMediaRenderRequestV1,
  validateMediaRenderResultV1,
} from '../../shared-media-render-contract/src/index.mjs';

export const SHARED_MEDIA_EVIDENCE_COLLECTOR_V1 = 'shared-media.evidence-collector.v1';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SHA = /^[a-f0-9]{64}$/;

export class SharedMediaEvidenceCollectorError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaEvidenceCollectorError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaEvidenceCollectorError(code, message, {path});
};

const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_FIELD', `${path} must be an object`, path);
  }
  return value;
};

const text = (value, path, {max = 1000} = {}) => {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_FIELD', `${path} must be non-empty`, path);
  const normalized = value.trim();
  if (normalized.length > max) fail('INVALID_FIELD', `${path} is too long`, path);
  return normalized;
};

const exactKeys = (value, allowed, path) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail('UNSUPPORTED_FIELD', `${path}.${key} is not supported`, `${path}.${key}`);
  }
};

const bytes = (value, path, {allowText = false} = {}) => {
  if (allowText && typeof value === 'string') return Buffer.from(value, 'utf8');
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  fail('INVALID_FIELD', `${path} must be bytes${allowText ? ' or UTF-8 text' : ''}`, path);
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const requireOperation = (value, name) => {
  if (typeof value !== 'function') fail('OPERATION_REQUIRED', `${name} must be a function`, `$${name}`);
  return value;
};

const requireAuthorized = async (decision, action) => {
  if (decision !== true) fail('JOB_NOT_AUTHORIZED', `job is not authorized for ${action}`, '$jobId');
};

const canonicalJobId = (value) => {
  const jobId = text(value, '$jobId', {max: 200});
  if (!SAFE_ID.test(jobId)) fail('INVALID_FIELD', '$jobId contains unsupported characters', '$jobId');
  return jobId;
};

const canonicalTimestamp = (value) => {
  const timestamp = text(value, '$collectedAt', {max: 80});
  if (Number.isNaN(Date.parse(timestamp))) fail('INVALID_FIELD', '$collectedAt must be an ISO-compatible timestamp', '$collectedAt');
  return timestamp;
};

const canonicalArtifactSource = (value) => {
  const artifact = object(value, '$artifactSource');
  exactKeys(artifact, new Set(['artifactId', 'locator', 'mediaType', 'bytes']), '$artifactSource');
  assertNoForbiddenDomainFieldsV1({
    artifactId: artifact.artifactId,
    locator: artifact.locator,
    mediaType: artifact.mediaType,
  }, '$artifactSource.metadata');
  const artifactId = text(artifact.artifactId, '$artifactSource.artifactId', {max: 200});
  const locator = text(artifact.locator, '$artifactSource.locator', {max: 2000});
  const mediaType = text(artifact.mediaType, '$artifactSource.mediaType', {max: 160});
  const artifactBytes = bytes(artifact.bytes, '$artifactSource.bytes');
  if (artifactBytes.byteLength < 1) fail('INVALID_FIELD', '$artifactSource.bytes must not be empty', '$artifactSource.bytes');
  return {artifactId, locator, mediaType, artifactBytes};
};

const canonicalInspection = (value) => {
  const inspection = structuredClone(object(value, '$mediaInspection'));
  assertNoForbiddenDomainFieldsV1(inspection, '$mediaInspection');
  if (inspection.tool !== 'ffprobe' || inspection.status !== 'passed') {
    fail('INSPECTION_REQUIRED', '$mediaInspection must be passed ffprobe evidence', '$mediaInspection');
  }
  const format = object(inspection.format, '$mediaInspection.format');
  const container = text(format.container, '$mediaInspection.format.container', {max: 80});
  if (!Number.isInteger(format.sizeBytes) || format.sizeBytes < 1) {
    fail('INVALID_FIELD', '$mediaInspection.format.sizeBytes must be positive integer', '$mediaInspection.format.sizeBytes');
  }
  if (typeof format.durationSeconds !== 'number' || !Number.isFinite(format.durationSeconds) || format.durationSeconds <= 0) {
    fail('INVALID_FIELD', '$mediaInspection.format.durationSeconds must be positive number', '$mediaInspection.format.durationSeconds');
  }
  if (!Array.isArray(inspection.streams) || inspection.streams.length < 1) {
    fail('INSPECTION_REQUIRED', '$mediaInspection.streams must not be empty', '$mediaInspection.streams');
  }
  const video = inspection.streams.find((stream) => stream?.type === 'video');
  if (!video) fail('INSPECTION_REQUIRED', '$mediaInspection requires a video stream', '$mediaInspection.streams');
  if (!Number.isInteger(video.width) || !Number.isInteger(video.height) || video.width < 1 || video.height < 1) {
    fail('INSPECTION_REQUIRED', 'video stream requires positive width/height', '$mediaInspection.streams');
  }
  const videoCodec = text(video.codecName, '$mediaInspection.streams.video.codecName', {max: 80});
  const audio = inspection.streams.find((stream) => stream?.type === 'audio');
  const audioCodec = audio ? text(audio.codecName, '$mediaInspection.streams.audio.codecName', {max: 80}) : null;
  return {inspection, container, video, videoCodec, audioCodec};
};

const canonicalRenderLog = (value) => {
  const log = bytes(value, '$renderLog', {allowText: true});
  if (log.byteLength < 1) fail('INVALID_FIELD', '$renderLog must not be empty', '$renderLog');
  return log;
};

const canonicalError = (value) => {
  const error = structuredClone(object(value, '$error'));
  exactKeys(error, new Set(['code', 'stage', 'message', 'retryable']), '$error');
  text(error.code, '$error.code', {max: 160});
  text(error.stage, '$error.stage', {max: 80});
  text(error.message, '$error.message', {max: 2000});
  if (typeof error.retryable !== 'boolean') fail('INVALID_FIELD', '$error.retryable must be boolean', '$error.retryable');
  assertNoForbiddenDomainFieldsV1(error, '$error');
  return error;
};

export const createSharedMediaEvidenceCollectorV1 = ({
  readArtifact,
  inspectArtifact,
  readRenderLog,
  isJobAuthorized,
  now = () => new Date().toISOString(),
} = {}) => {
  const artifactReader = requireOperation(readArtifact, 'readArtifact');
  const artifactInspector = requireOperation(inspectArtifact, 'inspectArtifact');
  const renderLogReader = requireOperation(readRenderLog, 'readRenderLog');
  const authorizeJob = requireOperation(isJobAuthorized, 'isJobAuthorized');
  const clock = requireOperation(now, 'now');

  const authorize = async ({request, jobId, action}) => {
    await requireAuthorized(await authorizeJob(Object.freeze({
      requestId: request.requestId,
      inputManifestDigest: request.inputManifestDigest,
      jobId,
      action,
    })), action);
  };

  return Object.freeze({
    async collectSucceeded({request, jobId} = {}) {
      validateMediaRenderRequestV1(request);
      const normalizedJobId = canonicalJobId(jobId);
      await authorize({request, jobId: normalizedJobId, action: 'collect_succeeded_evidence'});

      const source = canonicalArtifactSource(await artifactReader(Object.freeze({
        requestId: request.requestId,
        inputManifestDigest: request.inputManifestDigest,
        jobId: normalizedJobId,
      })));
      const inspectionData = canonicalInspection(await artifactInspector(Object.freeze({
        requestId: request.requestId,
        inputManifestDigest: request.inputManifestDigest,
        jobId: normalizedJobId,
        artifactId: source.artifactId,
        locator: source.locator,
        bytes: source.artifactBytes,
      })));
      const renderLog = canonicalRenderLog(await renderLogReader(Object.freeze({
        requestId: request.requestId,
        inputManifestDigest: request.inputManifestDigest,
        jobId: normalizedJobId,
      })));

      if (inspectionData.inspection.format.sizeBytes !== source.artifactBytes.byteLength) {
        fail('EVIDENCE_MISMATCH', 'ffprobe size does not match collected artifact bytes', '$mediaInspection.format.sizeBytes');
      }

      const artifactSha256 = sha256(source.artifactBytes);
      const collectedAt = canonicalTimestamp(await clock());
      const artifact = {
        artifactId: source.artifactId,
        locator: source.locator,
        mediaType: source.mediaType,
        byteLength: source.artifactBytes.byteLength,
        sha256: artifactSha256,
        durationSeconds: inspectionData.inspection.format.durationSeconds,
        width: inspectionData.video.width,
        height: inspectionData.video.height,
        container: inspectionData.container,
        videoCodec: inspectionData.videoCodec,
        ...(inspectionData.audioCodec ? {audioCodec: inspectionData.audioCodec} : {}),
      };
      const evidence = {
        contractVersion: MEDIA_RENDER_V1,
        messageType: 'evidence',
        requestId: request.requestId,
        jobId: normalizedJobId,
        inputManifestDigest: request.inputManifestDigest,
        artifactSha256,
        mediaInspection: inspectionData.inspection,
        renderLog: {
          sha256: sha256(renderLog),
          byteLength: renderLog.byteLength,
        },
        collectedAt,
      };
      const result = {
        contractVersion: MEDIA_RENDER_V1,
        messageType: 'result',
        requestId: request.requestId,
        jobId: normalizedJobId,
        status: 'succeeded',
        artifact,
        evidence,
      };
      validateMediaRenderResultV1(result, {request});
      return Object.freeze(structuredClone(result));
    },

    async collectFailed({request, jobId, error} = {}) {
      validateMediaRenderRequestV1(request);
      const normalizedJobId = canonicalJobId(jobId);
      const normalizedError = canonicalError(error);
      await authorize({request, jobId: normalizedJobId, action: 'collect_failed_evidence'});
      const renderLog = canonicalRenderLog(await renderLogReader(Object.freeze({
        requestId: request.requestId,
        inputManifestDigest: request.inputManifestDigest,
        jobId: normalizedJobId,
      })));
      const collectedAt = canonicalTimestamp(await clock());
      const result = {
        contractVersion: MEDIA_RENDER_V1,
        messageType: 'result',
        requestId: request.requestId,
        jobId: normalizedJobId,
        status: 'failed',
        evidence: {
          contractVersion: MEDIA_RENDER_V1,
          messageType: 'evidence',
          requestId: request.requestId,
          jobId: normalizedJobId,
          inputManifestDigest: request.inputManifestDigest,
          renderLog: {
            sha256: sha256(renderLog),
            byteLength: renderLog.byteLength,
          },
          collectedAt,
        },
        error: normalizedError,
      };
      validateMediaRenderResultV1(result, {request});
      return Object.freeze(structuredClone(result));
    },
  });
};

export const sha256EvidenceBytesV1 = (value) => {
  const digest = sha256(bytes(value, '$bytes', {allowText: true}));
  if (!SHA.test(digest)) fail('INTERNAL_ERROR', 'SHA-256 digest generation failed');
  return digest;
};