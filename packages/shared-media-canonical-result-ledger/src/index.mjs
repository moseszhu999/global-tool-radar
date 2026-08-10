import {createHash} from 'node:crypto';

import {
  validateMediaRenderRequestV1,
  validateMediaRenderResultV1,
} from '../../shared-media-render-contract/src/index.mjs';
import {buildSharedMediaGroupWorkProviderResponse} from '../../shared-media-group-work-provider/src/index.mjs';

export const SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1 =
  'shared-media.canonical-terminal-receipt.v1';
export const SHARED_MEDIA_CANONICAL_RECEIPT_SLOT_V1 =
  'shared-media.canonical-result-slot.v1';
export const EXPECTED_MAC_REMOTION_SERVER_SHA256 =
  'bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f';

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,239}$/;
const SECRET_KEY = /^(?:authorization|token|secret|password|cookie|api[-_]?key|x-amz-signature|signature|sig)$/i;
const SECRET_TEXT = /(?:bearer\s+|(?:token|secret|password|api[_-]?key|cookie|session)\s*[:=]|[?&#](?:token|secret|password|api[_-]?key|x-amz-signature|signature|sig)=)/i;

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const sha256Json = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const object = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
};

const exact = (value, fields, label) => {
  for (const key of Object.keys(value)) if (!fields.has(key)) throw new TypeError(`${label} contains unknown field: ${key}`);
};

const text = (value, label, max = 240) => {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new TypeError(`${label} must be bounded non-empty text`);
  if (SECRET_TEXT.test(normalized)) throw new TypeError(`${label} must not contain secret-shaped material`);
  return normalized;
};

const safeRef = (value, label) => {
  const normalized = text(value, label);
  if (!SAFE_REF.test(normalized)) throw new TypeError(`${label} contains unsupported characters`);
  return normalized;
};

const timestamp = (value, label) => {
  const normalized = text(value, label, 80);
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${label} must be an ISO-compatible timestamp`);
  return normalized;
};

const requireSha = (value, label) => {
  const normalized = text(value, label, 64).toLowerCase();
  if (!SHA256.test(normalized)) throw new TypeError(`${label} must be SHA-256`);
  return normalized;
};

const assertNoDurableSecretMaterial = (value, path = '$canonicalResult') => {
  if (typeof value === 'string') {
    if (SECRET_TEXT.test(value)) throw new TypeError(`${path} contains secret-shaped durable material`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDurableSecretMaterial(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new TypeError(`${path}.${key} is a secret-shaped durable field`);
    assertNoDurableSecretMaterial(nested, `${path}.${key}`);
  }
};

const resultInputManifestDigest = (result) => {
  if (!result?.evidence || typeof result.evidence.inputManifestDigest !== 'string') {
    throw new TypeError('canonical result evidence.inputManifestDigest is required');
  }
  return result.evidence.inputManifestDigest;
};

const resultCollectedAt = (result) => {
  if (!result?.evidence || typeof result.evidence.collectedAt !== 'string') {
    throw new TypeError('canonical result evidence.collectedAt is required');
  }
  return timestamp(result.evidence.collectedAt, 'result.evidence.collectedAt');
};

const normalizeCanonicalResult = (request, result) => {
  validateMediaRenderRequestV1(request);
  validateMediaRenderResultV1(result, {request});
  if (!['succeeded', 'failed'].includes(result.status)) {
    throw new TypeError('only terminal succeeded/failed canonical results may be persisted');
  }
  if (result.requestId !== request.requestId) throw new Error('CANONICAL_RECEIPT_REQUEST_ID_MISMATCH');
  if (resultInputManifestDigest(result) !== request.inputManifestDigest) {
    throw new Error('CANONICAL_RECEIPT_INPUT_MANIFEST_MISMATCH');
  }
  const canonicalResult = structuredClone(result);
  assertNoDurableSecretMaterial(canonicalResult);
  return canonicalResult;
};

export function createCanonicalTerminalReceiptV1({request, result, persistedAt} = {}) {
  const canonicalResult = normalizeCanonicalResult(request, result);
  const requestId = safeRef(request.requestId, 'request.requestId');
  const jobId = safeRef(canonicalResult.jobId, 'result.jobId');
  const inputManifestDigest = requireSha(request.inputManifestDigest, 'request.inputManifestDigest');
  const collectedAt = resultCollectedAt(canonicalResult);
  const normalizedPersistedAt = timestamp(persistedAt, 'persistedAt');
  if (Date.parse(normalizedPersistedAt) < Date.parse(collectedAt)) {
    throw new TypeError('persistedAt must not be before evidence.collectedAt');
  }

  const resultDigest = sha256Json(canonicalResult);
  const core = {
    schemaVersion: SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1,
    requestId,
    jobId,
    inputManifestDigest,
    terminalStatus: canonicalResult.status,
    resultDigest,
    collectedAt,
    persistedAt: normalizedPersistedAt,
    canonicalResult,
    technicalResultOnly: true,
    humanReviewCompleted: false,
    humanDecisionInferred: false,
    consumerDomainDecisionInferred: false,
    publicationAllowed: false,
    publicationPerformed: false,
    authorityGrantCreated: false,
    externalActionPerformed: false,
  };
  return deepFreeze({...core, receiptDigest: sha256Json(core)});
}

function normalizeStoredReceipt(value, request) {
  const receipt = object(value, 'canonical terminal receipt');
  exact(receipt, new Set([
    'schemaVersion','requestId','jobId','inputManifestDigest','terminalStatus','resultDigest',
    'collectedAt','persistedAt','canonicalResult','technicalResultOnly','humanReviewCompleted',
    'humanDecisionInferred','consumerDomainDecisionInferred','publicationAllowed',
    'publicationPerformed','authorityGrantCreated','externalActionPerformed','receiptDigest',
  ]), 'canonical terminal receipt');
  if (receipt.schemaVersion !== SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1) {
    throw new TypeError('canonical terminal receipt schema unsupported');
  }
  const rebuilt = createCanonicalTerminalReceiptV1({
    request,
    result: receipt.canonicalResult,
    persistedAt: receipt.persistedAt,
  });
  if (receipt.requestId !== rebuilt.requestId
    || receipt.jobId !== rebuilt.jobId
    || receipt.inputManifestDigest !== rebuilt.inputManifestDigest
    || receipt.terminalStatus !== rebuilt.terminalStatus
    || receipt.resultDigest !== rebuilt.resultDigest
    || receipt.collectedAt !== rebuilt.collectedAt
    || receipt.receiptDigest !== rebuilt.receiptDigest) {
    throw new Error('CANONICAL_TERMINAL_RECEIPT_INTEGRITY_MISMATCH');
  }
  if (receipt.technicalResultOnly !== true
    || receipt.humanReviewCompleted !== false
    || receipt.humanDecisionInferred !== false
    || receipt.consumerDomainDecisionInferred !== false
    || receipt.publicationAllowed !== false
    || receipt.publicationPerformed !== false
    || receipt.authorityGrantCreated !== false
    || receipt.externalActionPerformed !== false) {
    throw new Error('CANONICAL_TERMINAL_RECEIPT_BOUNDARY_MISMATCH');
  }
  return rebuilt;
}

export function writeCanonicalTerminalReceiptSlotV1({existingReceipt = null, request, result, persistedAt} = {}) {
  const next = createCanonicalTerminalReceiptV1({request, result, persistedAt});
  if (existingReceipt === null || existingReceipt === undefined) {
    return deepFreeze({
      schemaVersion: SHARED_MEDIA_CANONICAL_RECEIPT_SLOT_V1,
      writeDisposition: 'created',
      canonicalResultReceipt: next,
      persistenceRequired: true,
      crossDomainWritePerformed: false,
    });
  }
  const current = normalizeStoredReceipt(existingReceipt, request);
  if (current.requestId !== next.requestId
    || current.jobId !== next.jobId
    || current.inputManifestDigest !== next.inputManifestDigest
    || current.terminalStatus !== next.terminalStatus
    || current.resultDigest !== next.resultDigest) {
    throw new Error('CANONICAL_TERMINAL_RECEIPT_CONFLICT');
  }
  return deepFreeze({
    schemaVersion: SHARED_MEDIA_CANONICAL_RECEIPT_SLOT_V1,
    writeDisposition: 'idempotent_replay',
    canonicalResultReceipt: current,
    persistenceRequired: false,
    crossDomainWritePerformed: false,
  });
}

export function recoverCanonicalTerminalReceiptV1({receipt, request} = {}) {
  return normalizeStoredReceipt(receipt, request);
}

export async function readCanonicalTerminalReceiptV1({receipt, request, jobId, isJobAuthorized} = {}) {
  if (typeof isJobAuthorized !== 'function') throw new TypeError('isJobAuthorized must be a function');
  const normalizedJobId = safeRef(jobId, 'jobId');
  const normalized = normalizeStoredReceipt(receipt, request);
  if (normalized.jobId !== normalizedJobId) throw new Error('CANONICAL_RECEIPT_JOB_ID_MISMATCH');
  const authorized = await isJobAuthorized(Object.freeze({
    requestId: normalized.requestId,
    inputManifestDigest: normalized.inputManifestDigest,
    jobId: normalized.jobId,
    action: 'read_canonical_terminal_receipt',
  }));
  if (authorized !== true) throw new Error('CANONICAL_RECEIPT_READ_NOT_AUTHORIZED');
  return normalized;
}

export async function buildSharedMediaProviderResponseFromCanonicalReceiptsV1({
  providerRequest,
  accessDecision,
  accessDecisionRef,
  availability,
  provenanceRefs,
  observedAt,
  maxAgeSeconds = 900,
  receiptBindings = [],
  isJobAuthorized,
} = {}) {
  if (!Array.isArray(receiptBindings) || receiptBindings.length > 50) {
    throw new TypeError('receiptBindings must be an array of at most 50 items');
  }
  if (accessDecision !== 'allowed' || availability !== 'available') {
    if (receiptBindings.length !== 0) throw new Error('NON_AVAILABLE_CANONICAL_RECEIPTS_FORBIDDEN');
    return buildSharedMediaGroupWorkProviderResponse({
      request: providerRequest,
      accessDecision,
      accessDecisionRef,
      availability,
      sourceObservedAt: observedAt,
      observedAt,
      provenanceRefs,
      renderResults: [],
      maxAgeSeconds,
    });
  }

  const renderResults = [];
  for (let index = 0; index < receiptBindings.length; index += 1) {
    const binding = object(receiptBindings[index], `receiptBindings[${index}]`);
    exact(binding, new Set(['projectionRef','workItemRef','request','receipt']), `receiptBindings[${index}]`);
    const receipt = await readCanonicalTerminalReceiptV1({
      receipt: binding.receipt,
      request: binding.request,
      jobId: binding.receipt?.jobId,
      isJobAuthorized,
    });
    renderResults.push({
      projectionRef: safeRef(binding.projectionRef, `receiptBindings[${index}].projectionRef`),
      workItemRef: safeRef(binding.workItemRef, `receiptBindings[${index}].workItemRef`),
      result: receipt.canonicalResult,
      sourceObservedAt: receipt.persistedAt,
    });
  }

  const sourceObservedAt = renderResults.length > 0
    ? renderResults.map((item) => item.sourceObservedAt).sort().at(-1)
    : observedAt;
  return buildSharedMediaGroupWorkProviderResponse({
    request: providerRequest,
    accessDecision,
    accessDecisionRef,
    availability,
    sourceObservedAt,
    observedAt,
    provenanceRefs,
    renderResults,
    maxAgeSeconds,
  });
}

export function validateMacCanonicalReceiptRolloutTargetV1({serverSha256, gitRepositoryObserved} = {}) {
  const sha = requireSha(serverSha256, 'serverSha256');
  if (sha !== EXPECTED_MAC_REMOTION_SERVER_SHA256) {
    throw new Error('MAC_RUNTIME_EXACT_SHA_MISMATCH');
  }
  if (gitRepositoryObserved !== false) {
    throw new Error('MAC_RUNTIME_OWNERSHIP_ASSUMPTION_CHANGED');
  }
  return deepFreeze({
    schemaVersion: 'shared-media.mac-canonical-receipt-rollout-target.v1',
    expectedServerSha256: EXPECTED_MAC_REMOTION_SERVER_SHA256,
    backupRequired: true,
    nodeCheckRequired: true,
    alternatePortVerificationRequired: true,
    healthCheckRequired: true,
    rollbackRequired: true,
    renderSubmissionAuthorized: false,
    serviceRestartAuthorized: false,
    runtimeMutationAuthorized: false,
  });
}
