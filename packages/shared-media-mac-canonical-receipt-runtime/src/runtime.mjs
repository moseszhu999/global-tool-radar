import {createHash} from 'node:crypto';

export const SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1 = 'shared-media.canonical-terminal-receipt.v1';

const SHA256 = /^[a-f0-9]{64}$/;
const SECRET_KEY = /^(?:authorization|token|secret|password|cookie|api[-_]?key|x-amz-signature|signature|sig)$/i;
const SECRET_TEXT = /(?:bearer\s+|(?:token|secret|password|api[_-]?key|cookie|session)\s*[:=]|[?&#](?:token|secret|password|api[_-]?key|x-amz-signature|signature|sig)=)/i;
const RECEIPT_FIELDS = new Set([
  'schemaVersion','requestId','jobId','inputManifestDigest','terminalStatus','resultDigest',
  'collectedAt','persistedAt','canonicalResult','technicalResultOnly','humanReviewCompleted',
  'humanDecisionInferred','consumerDomainDecisionInferred','publicationAllowed',
  'publicationPerformed','authorityGrantCreated','externalActionPerformed','receiptDigest',
]);

const stableStringify = (value) => Array.isArray(value)
  ? `[${value.map(stableStringify).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
    : JSON.stringify(value);

const sha256Json = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const clone = (value) => structuredClone(value);
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
const text = (value, label, max = 240) => {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new TypeError(`${label} must be bounded non-empty text`);
  if (SECRET_TEXT.test(normalized)) throw new TypeError(`${label} contains secret-shaped material`);
  return normalized;
};
const timestamp = (value, label) => {
  const normalized = text(value, label, 80);
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${label} must be an ISO-compatible timestamp`);
  return normalized;
};
const sha = (value, label) => {
  const normalized = text(value, label, 64).toLowerCase();
  if (!SHA256.test(normalized)) throw new TypeError(`${label} must be SHA-256`);
  return normalized;
};
const assertNoSecretMaterial = (value, path = '$canonicalResult') => {
  if (typeof value === 'string') {
    if (SECRET_TEXT.test(value)) throw new TypeError(`${path} contains secret-shaped material`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretMaterial(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new TypeError(`${path}.${key} is a secret-shaped field`);
    assertNoSecretMaterial(nested, `${path}.${key}`);
  }
};

export function createCanonicalReceiptRuntimeV1({validateMediaRenderResultV1} = {}) {
  if (typeof validateMediaRenderResultV1 !== 'function') {
    throw new TypeError('validateMediaRenderResultV1 must be a function');
  }

  const validateReceipt = (value, {jobId = null} = {}) => {
    const receipt = object(value, 'canonicalResultReceipt');
    for (const key of Object.keys(receipt)) {
      if (!RECEIPT_FIELDS.has(key)) throw new TypeError(`canonicalResultReceipt contains unknown field: ${key}`);
    }
    for (const key of RECEIPT_FIELDS) {
      if (!(key in receipt)) throw new TypeError(`canonicalResultReceipt.${key} is required`);
    }
    if (receipt.schemaVersion !== SHARED_MEDIA_CANONICAL_TERMINAL_RECEIPT_V1) {
      throw new TypeError('canonicalResultReceipt schema unsupported');
    }

    const normalizedJobId = text(receipt.jobId, 'canonicalResultReceipt.jobId');
    if (jobId !== null && normalizedJobId !== text(jobId, 'job.id')) {
      throw new Error('CANONICAL_RECEIPT_JOB_ID_MISMATCH');
    }
    const requestId = text(receipt.requestId, 'canonicalResultReceipt.requestId');
    const inputManifestDigest = sha(receipt.inputManifestDigest, 'canonicalResultReceipt.inputManifestDigest');
    const resultDigest = sha(receipt.resultDigest, 'canonicalResultReceipt.resultDigest');
    const receiptDigest = sha(receipt.receiptDigest, 'canonicalResultReceipt.receiptDigest');
    const collectedAt = timestamp(receipt.collectedAt, 'canonicalResultReceipt.collectedAt');
    const persistedAt = timestamp(receipt.persistedAt, 'canonicalResultReceipt.persistedAt');
    if (Date.parse(persistedAt) < Date.parse(collectedAt)) {
      throw new TypeError('canonicalResultReceipt.persistedAt must not precede collectedAt');
    }
    if (!['succeeded', 'failed'].includes(receipt.terminalStatus)) {
      throw new TypeError('canonicalResultReceipt.terminalStatus must be succeeded or failed');
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

    const result = clone(object(receipt.canonicalResult, 'canonicalResultReceipt.canonicalResult'));
    assertNoSecretMaterial(result);
    validateMediaRenderResultV1(result);
    if (!['succeeded', 'failed'].includes(result.status) || result.status !== receipt.terminalStatus) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_STATUS_MISMATCH');
    }
    if (result.requestId !== requestId || result.jobId !== normalizedJobId) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_IDENTITY_MISMATCH');
    }
    if (result?.evidence?.inputManifestDigest !== inputManifestDigest) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_MANIFEST_MISMATCH');
    }
    if (result?.evidence?.collectedAt !== collectedAt) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_COLLECTED_AT_MISMATCH');
    }
    if (sha256Json(result) !== resultDigest) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_RESULT_DIGEST_MISMATCH');
    }

    const core = {
      schemaVersion: receipt.schemaVersion,
      requestId,
      jobId: normalizedJobId,
      inputManifestDigest,
      terminalStatus: receipt.terminalStatus,
      resultDigest,
      collectedAt,
      persistedAt,
      canonicalResult: result,
      technicalResultOnly: true,
      humanReviewCompleted: false,
      humanDecisionInferred: false,
      consumerDomainDecisionInferred: false,
      publicationAllowed: false,
      publicationPerformed: false,
      authorityGrantCreated: false,
      externalActionPerformed: false,
    };
    if (sha256Json(core) !== receiptDigest) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_INTEGRITY_MISMATCH');
    }
    return deepFreeze({...core, receiptDigest});
  };

  const writeReceipt = ({existingReceipt = null, incomingReceipt, jobId} = {}) => {
    const next = validateReceipt(incomingReceipt, {jobId});
    if (existingReceipt === null || existingReceipt === undefined) {
      return deepFreeze({writeDisposition: 'created', canonicalResultReceipt: next});
    }
    const current = validateReceipt(existingReceipt, {jobId});
    if (current.requestId !== next.requestId
      || current.jobId !== next.jobId
      || current.inputManifestDigest !== next.inputManifestDigest
      || current.terminalStatus !== next.terminalStatus
      || current.resultDigest !== next.resultDigest) {
      throw new Error('CANONICAL_TERMINAL_RECEIPT_CONFLICT');
    }
    return deepFreeze({writeDisposition: 'idempotent_replay', canonicalResultReceipt: current});
  };

  return Object.freeze({
    validateReceipt,
    recoverReceipt({job} = {}) {
      object(job, 'job');
      if (job.canonicalResultReceipt === undefined || job.canonicalResultReceipt === null) return null;
      return validateReceipt(job.canonicalResultReceipt, {jobId: job.id});
    },
    writeReceipt,
  });
}
