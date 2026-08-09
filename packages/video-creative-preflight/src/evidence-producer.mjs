import {createHash} from 'node:crypto';

const SHA256 = /^[a-f0-9]{64}$/;
const ALLOWED_SOURCE_TYPES = new Set(['machine', 'reviewer_attestation', 'artifact_metadata']);
const SECRET_KEY = /(authorization|token|secret|password|cookie|api[-_]?key)/i;

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const requiredSha = (value, field) => {
  const text = requiredText(value, field).toLowerCase();
  if (!SHA256.test(text)) throw new TypeError(`${field} must be SHA-256`);
  return text;
};

const requiredBoolean = (value, field) => {
  if (value !== true && value !== false) throw new TypeError(`${field} must be boolean`);
  return value;
};

const hasSecretField = (value) => {
  if (Array.isArray(value)) return value.some(hasSecretField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => SECRET_KEY.test(key) || hasSecretField(item));
};

const normalizeChecks = (checks, field) => {
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) throw new TypeError(`${field} must be an object`);
  const output = {};
  for (const [name, evidence] of Object.entries(checks)) {
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new TypeError(`${field}.${name} must be an object`);
    if (hasSecretField(evidence)) throw new Error(`${field}.${name} must not contain secret fields`);
    output[name] = Object.freeze({
      result: requiredBoolean(evidence.result, `${field}.${name}.result`),
      sourceType: requiredText(evidence.sourceType, `${field}.${name}.sourceType`),
      sourceRef: requiredText(evidence.sourceRef, `${field}.${name}.sourceRef`),
    });
    if (!ALLOWED_SOURCE_TYPES.has(output[name].sourceType)) {
      throw new TypeError(`${field}.${name}.sourceType is unsupported`);
    }
  }
  return Object.freeze(output);
};

const normalizeArtifact = (artifact) => {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) throw new TypeError('artifact must be an object');
  if (hasSecretField(artifact)) throw new Error('artifact must not contain secret fields');
  return Object.freeze({
    artifactType: requiredText(artifact.artifactType, 'artifact.artifactType'),
    artifactDigest: requiredSha(artifact.artifactDigest, 'artifact.artifactDigest'),
    artifactRef: requiredText(artifact.artifactRef, 'artifact.artifactRef'),
  });
};

export const produceCreativeGateEvidence = ({gate, artifact, producer, producedAt = new Date().toISOString()} = {}) => {
  const normalizedArtifact = normalizeArtifact(artifact);
  const normalizedChecks = normalizeChecks(gate?.checks, 'gate.checks');
  const gateType = requiredText(gate?.gateType, 'gate.gateType');
  const producerId = requiredText(producer, 'producer');
  const date = new Date(producedAt);
  if (Number.isNaN(date.getTime())) throw new TypeError('producedAt must be a valid timestamp');

  const core = {
    schemaVersion: 'toolradar.video-creative-gate-evidence.v1',
    gateType,
    producer: producerId,
    producedAt: date.toISOString(),
    artifact: normalizedArtifact,
    checks: normalizedChecks,
    passed: Object.values(normalizedChecks).every((check) => check.result),
    humanCreativeApprovalClaimed: false,
    publicationAllowed: false,
  };
  return Object.freeze({...core, evidenceDigest: digest(core)});
};

export const validateCreativeGateEvidence = (evidence) => {
  if (evidence?.schemaVersion !== 'toolradar.video-creative-gate-evidence.v1') throw new TypeError('unsupported creative gate evidence schema');
  const {evidenceDigest, ...core} = evidence;
  if (!SHA256.test(evidenceDigest ?? '')) throw new TypeError('evidenceDigest must be SHA-256');
  if (digest(core) !== evidenceDigest) throw new Error('creative gate evidence digest mismatch');
  normalizeArtifact(evidence.artifact);
  const checks = normalizeChecks(evidence.checks, 'checks');
  const expectedPass = Object.values(checks).every((check) => check.result);
  if (evidence.passed !== expectedPass) throw new Error('creative gate evidence pass state mismatch');
  if (evidence.humanCreativeApprovalClaimed !== false) throw new Error('creative gate evidence cannot claim human creative approval');
  if (evidence.publicationAllowed !== false) throw new Error('creative gate evidence cannot allow publication');
  return true;
};
