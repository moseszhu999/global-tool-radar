import {
  assertNoForbiddenDomainFieldsV1,
  computeMediaRenderInputManifestDigestV1,
  sha256CanonicalJsonV1,
  stableStringifyV1,
  validateMediaRenderRequestV1,
} from '../../shared-media-render-contract/src/index.mjs';

export const SHARED_MEDIA_MAC_BINDING_V1 = 'shared-media.mac-remotion-pre-materialized-binding.v1';
export const SHARED_MEDIA_MAC_TRANSPORT_RECEIPT_V1 = 'shared-media.mac-remotion-transport-receipt.v1';

export const MAC_REMOTION_RUNTIME_SCHEMA_V1 = Object.freeze({
  serverMjsSha256: 'bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f',
  openapiSha256: '73c31a31861f3cd086ff72ce123ce612e0cd3b9ddb54a15cac8ea52c34b90656',
  schemaDiscoveryEvidence: Object.freeze({
    repository: 'moseszhu999/training-learning-rails',
    carrierPr: 615,
    runId: 31249615638,
    jobId: 93083754232,
  }),
  fieldUseEvidence: Object.freeze({
    repository: 'moseszhu999/training-learning-rails',
    carrierPr: 618,
    runId: 31249800726,
    jobId: 93084219896,
  }),
  route: '/v1/render',
  method: 'POST',
  requiredFields: Object.freeze(['brief', 'projectName', 'compositionId']),
  allowedModes: Object.freeze(['create_or_update', 'render_existing']),
});

const SHA = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_OUTPUT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
const SECRET_KEY = /(authorization|bearer|token|secret|password|cookie|api[_-]?key|action_token)/i;
const MAC_TERMINAL = new Set(['completed', 'failed', 'cancelled']);
const MAC_STATUS = new Set(['queued', 'running', ...MAC_TERMINAL]);

export class SharedMediaMacCompatibilityError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaMacCompatibilityError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaMacCompatibilityError(code, message, {path});
};

const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_FIELD', `${path} must be an object`, path);
  }
  return value;
};

const text = (value, path, {min = 1, max = 10_000} = {}) => {
  if (typeof value !== 'string') fail('INVALID_FIELD', `${path} must be a string`, path);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    fail('INVALID_FIELD', `${path} length must be ${min}..${max}`, path);
  }
  return normalized;
};

const sha = (value, path) => {
  const normalized = text(value, path, {min: 64, max: 64}).toLowerCase();
  if (!SHA.test(normalized)) fail('INVALID_FIELD', `${path} must be lowercase SHA-256 hex`, path);
  return normalized;
};

const exactKeys = (value, allowed, path) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail('UNSUPPORTED_FIELD', `${path}.${key} is not supported`, `${path}.${key}`);
  }
};

const noSecrets = (value, path = '$') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => noSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && /Bearer\s+[A-Za-z0-9._~+\/-]+/i.test(value)) {
      fail('SECRET_SHAPED_VALUE', `${path} contains a bearer-shaped value`, path);
    }
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (SECRET_KEY.test(key)) fail('SECRET_SHAPED_FIELD', `${nextPath} is forbidden`, nextPath);
    noSecrets(item, nextPath);
  }
};

const exactStableEqual = (left, right) => stableStringifyV1(left) === stableStringifyV1(right);

const bindingIntegrityPayload = (binding) => ({
  schemaVersion: binding.schemaVersion,
  bindingId: binding.bindingId,
  status: binding.status,
  inputManifestDigest: binding.inputManifestDigest,
  projectName: binding.projectName,
  compositionId: binding.compositionId,
  brief: binding.brief,
  ...(binding.designNotes !== undefined ? {designNotes: binding.designNotes} : {}),
  audio: binding.audio,
  expectedDurationSeconds: binding.expectedDurationSeconds,
  expectedOutputProfile: binding.expectedOutputProfile,
  runtimeEvidence: binding.runtimeEvidence,
  evidenceRefs: binding.evidenceRefs,
});

export const computeMacPreMaterializedBindingDigestV1 = (binding) => sha256CanonicalJsonV1(bindingIntegrityPayload(binding));

const expectedDurationSeconds = (request) => {
  let totalMs = 0;
  for (let index = 0; index < request.shots.length; index += 1) {
    const value = request.shots[index].durationMs;
    if (!Number.isInteger(value) || value <= 0) {
      fail(
        'PREMATERIALIZATION_DURATION_REQUIRED',
        `$.shots[${index}].durationMs is required for the Mac render_existing compatibility path`,
        `$.shots[${index}].durationMs`,
      );
    }
    totalMs += value;
  }
  const seconds = totalMs / 1000;
  if (seconds < 1 || seconds > 900) {
    fail('MAC_SCHEMA_UNSUPPORTED', 'canonical shot duration is outside Mac /v1/render 1..900 seconds', '$.shots');
  }
  return seconds;
};

const validateMacOutputProfile = (profile) => {
  object(profile, '$.outputProfile');
  if (!Number.isInteger(profile.width) || profile.width < 320 || profile.width > 7680) {
    fail('MAC_SCHEMA_UNSUPPORTED', '$.outputProfile.width is outside Mac /v1/render 320..7680', '$.outputProfile.width');
  }
  if (!Number.isInteger(profile.height) || profile.height < 240 || profile.height > 4320) {
    fail('MAC_SCHEMA_UNSUPPORTED', '$.outputProfile.height is outside Mac /v1/render 240..4320', '$.outputProfile.height');
  }
  if (!Number.isInteger(profile.fps) || profile.fps < 1 || profile.fps > 120) {
    fail('MAC_SCHEMA_UNSUPPORTED', '$.outputProfile.fps must be an integer inside Mac /v1/render 1..120', '$.outputProfile.fps');
  }
};

export const validateMacPreMaterializedBindingV1 = (binding) => {
  const value = object(binding, '$binding');
  exactKeys(value, new Set([
    'schemaVersion',
    'bindingId',
    'status',
    'inputManifestDigest',
    'projectName',
    'compositionId',
    'brief',
    'designNotes',
    'audio',
    'expectedDurationSeconds',
    'expectedOutputProfile',
    'runtimeEvidence',
    'evidenceRefs',
    'integrityDigest',
  ]), '$binding');
  noSecrets(value, '$binding');
  assertNoForbiddenDomainFieldsV1(value, '$binding');

  if (value.schemaVersion !== SHARED_MEDIA_MAC_BINDING_V1) {
    fail('INVALID_BINDING', `binding schemaVersion must be ${SHARED_MEDIA_MAC_BINDING_V1}`, '$binding.schemaVersion');
  }
  if (value.status !== 'approved_pre_materialized') {
    fail('PREMATERIALIZATION_REQUIRED', 'binding must be explicitly approved_pre_materialized', '$binding.status');
  }
  const bindingId = text(value.bindingId, '$binding.bindingId', {max: 128});
  if (!SAFE_ID.test(bindingId)) fail('INVALID_BINDING', '$binding.bindingId contains unsupported characters', '$binding.bindingId');
  sha(value.inputManifestDigest, '$binding.inputManifestDigest');
  text(value.projectName, '$binding.projectName', {max: 100});
  text(value.compositionId, '$binding.compositionId', {max: 160});
  text(value.brief, '$binding.brief', {min: 20, max: 24_000});
  if (value.designNotes !== undefined) text(value.designNotes, '$binding.designNotes', {max: 6_000});
  if (typeof value.audio !== 'boolean') fail('INVALID_BINDING', '$binding.audio must be boolean', '$binding.audio');
  if (typeof value.expectedDurationSeconds !== 'number'
    || !Number.isFinite(value.expectedDurationSeconds)
    || value.expectedDurationSeconds < 1
    || value.expectedDurationSeconds > 900) {
    fail('INVALID_BINDING', '$binding.expectedDurationSeconds must be 1..900', '$binding.expectedDurationSeconds');
  }
  object(value.expectedOutputProfile, '$binding.expectedOutputProfile');

  const runtime = object(value.runtimeEvidence, '$binding.runtimeEvidence');
  exactKeys(runtime, new Set(['serverMjsSha256', 'openapiSha256']), '$binding.runtimeEvidence');
  if (sha(runtime.serverMjsSha256, '$binding.runtimeEvidence.serverMjsSha256') !== MAC_REMOTION_RUNTIME_SCHEMA_V1.serverMjsSha256) {
    fail('RUNTIME_EVIDENCE_MISMATCH', 'binding server.mjs identity does not match audited Mac runtime v1', '$binding.runtimeEvidence.serverMjsSha256');
  }
  if (sha(runtime.openapiSha256, '$binding.runtimeEvidence.openapiSha256') !== MAC_REMOTION_RUNTIME_SCHEMA_V1.openapiSha256) {
    fail('RUNTIME_EVIDENCE_MISMATCH', 'binding OpenAPI identity does not match audited Mac runtime v1', '$binding.runtimeEvidence.openapiSha256');
  }

  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length < 1 || value.evidenceRefs.length > 16) {
    fail('INVALID_BINDING', '$binding.evidenceRefs must contain 1..16 references', '$binding.evidenceRefs');
  }
  const refs = value.evidenceRefs.map((ref, index) => text(ref, `$binding.evidenceRefs[${index}]`, {max: 300}));
  if (new Set(refs).size !== refs.length) fail('INVALID_BINDING', '$binding.evidenceRefs must not contain duplicates', '$binding.evidenceRefs');

  const integrityDigest = sha(value.integrityDigest, '$binding.integrityDigest');
  const expectedIntegrity = computeMacPreMaterializedBindingDigestV1(value);
  if (integrityDigest !== expectedIntegrity) {
    fail('BINDING_INTEGRITY_MISMATCH', 'pre-materialized binding integrityDigest does not match its immutable fields', '$binding.integrityDigest');
  }
  return true;
};

export const createMacPreMaterializedBindingV1 = (input) => {
  const source = object(input, '$binding');
  const value = structuredClone(source);
  value.schemaVersion = SHARED_MEDIA_MAC_BINDING_V1;
  delete value.integrityDigest;
  value.integrityDigest = computeMacPreMaterializedBindingDigestV1(value);
  validateMacPreMaterializedBindingV1(value);
  return Object.freeze(value);
};

const normalizeOutputName = (requestId, override) => {
  if (override !== undefined && override !== null) {
    const normalized = text(override, '$execution.outputName', {max: 160});
    if (!SAFE_OUTPUT.test(normalized)) fail('INVALID_EXECUTION_INPUT', '$execution.outputName contains unsupported characters', '$execution.outputName');
    return normalized;
  }
  const safe = String(requestId).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'media-render';
  return `${safe}.mp4`;
};

export const createMacRenderExistingRequestV1 = ({request, binding, outputName} = {}) => {
  validateMediaRenderRequestV1(request);
  validateMacPreMaterializedBindingV1(binding);
  validateMacOutputProfile(request.outputProfile);

  const digest = computeMediaRenderInputManifestDigestV1(request);
  if (digest !== request.inputManifestDigest) {
    fail('MANIFEST_DIGEST_MISMATCH', 'canonical media request inputManifestDigest is invalid', '$.inputManifestDigest');
  }
  if (digest !== binding.inputManifestDigest) {
    fail(
      'PREMATERIALIZATION_REQUIRED',
      'pre-materialized Remotion binding does not match this canonical inputManifestDigest',
      '$binding.inputManifestDigest',
    );
  }
  if (!exactStableEqual(request.outputProfile, binding.expectedOutputProfile)) {
    fail('PREMATERIALIZATION_PROFILE_MISMATCH', 'pre-materialized output profile does not exactly match canonical request', '$binding.expectedOutputProfile');
  }
  const durationSeconds = expectedDurationSeconds(request);
  if (Math.abs(durationSeconds - binding.expectedDurationSeconds) > 0.000001) {
    fail('PREMATERIALIZATION_DURATION_MISMATCH', 'pre-materialized duration does not match canonical shot timing', '$binding.expectedDurationSeconds');
  }

  const transportRequest = {
    brief: binding.brief,
    projectName: binding.projectName,
    compositionId: binding.compositionId,
    mode: 'render_existing',
    width: request.outputProfile.width,
    height: request.outputProfile.height,
    fps: request.outputProfile.fps,
    durationSeconds,
    audio: binding.audio,
    outputName: normalizeOutputName(request.requestId, outputName),
  };
  if (binding.designNotes !== undefined) transportRequest.designNotes = binding.designNotes;
  // v1 intentionally omits projectDir so the audited Mac server keeps ownership of
  // its WORK_ROOT-safe project resolution instead of accepting a caller-selected path.
  return Object.freeze(transportRequest);
};

export const normalizeMacTransportSnapshotV1 = (snapshot) => {
  const value = object(snapshot, '$snapshot');
  noSecrets(value, '$snapshot');
  const jobId = text(value.id ?? value.jobId, '$snapshot.id', {max: 200});
  const transportStatus = text(value.status, '$snapshot.status', {max: 40}).toLowerCase();
  if (!MAC_STATUS.has(transportStatus)) {
    fail('UNKNOWN_TRANSPORT_STATUS', `unsupported Mac render status: ${transportStatus}`, '$snapshot.status');
  }
  return Object.freeze({
    schemaVersion: SHARED_MEDIA_MAC_TRANSPORT_RECEIPT_V1,
    runnerJobId: jobId,
    transportStatus,
    transportTerminal: MAC_TERMINAL.has(transportStatus),
    canonicalResultReady: false,
    canonicalEvidenceCollected: false,
    artifactInspectionPerformed: false,
    renderLogEvidenceCollected: false,
    technicalTransportOnly: true,
    consumerDomainDecisionInferred: false,
    consumerDomainMutationInferred: false,
    businessOutcomeInferred: false,
  });
};

const requireClient = (client) => {
  for (const method of ['submitRenderJob', 'getRenderJobStatus', 'cancelRenderJob']) {
    if (typeof client?.[method] !== 'function') fail('INVALID_CLIENT', `client.${method} must be a function`, '$client');
  }
  return client;
};

export const createSharedMediaMacTransportAdapterV1 = ({client} = {}) => {
  const runner = requireClient(client);
  return Object.freeze({
    buildRenderExistingRequest: (input) => createMacRenderExistingRequestV1(input),

    async submitPreMaterializedRender({request, binding, outputName} = {}) {
      const transportRequest = createMacRenderExistingRequestV1({request, binding, outputName});
      const snapshot = await runner.submitRenderJob(transportRequest);
      const normalized = normalizeMacTransportSnapshotV1(snapshot);
      return Object.freeze({
        ...normalized,
        requestId: request.requestId,
        inputManifestDigest: request.inputManifestDigest,
        bindingId: binding.bindingId,
        renderSubmissionPerformed: true,
        mode: 'render_existing',
      });
    },

    async getTransportStatus({runnerJobId} = {}) {
      const normalizedJobId = text(runnerJobId, '$runnerJobId', {max: 200});
      return normalizeMacTransportSnapshotV1(await runner.getRenderJobStatus(normalizedJobId));
    },

    async cancelTransportJob({runnerJobId} = {}) {
      const normalizedJobId = text(runnerJobId, '$runnerJobId', {max: 200});
      return normalizeMacTransportSnapshotV1(await runner.cancelRenderJob(normalizedJobId));
    },
  });
};
