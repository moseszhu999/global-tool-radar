import {createHash} from 'node:crypto';
import {validateVideoProject} from '../../video-project-lifecycle/src/index.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
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

const normalizeTimestamp = (value, field) => {
  const text = requiredText(value, field);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const hasSecretField = (value) => {
  if (Array.isArray(value)) return value.some(hasSecretField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => SECRET_KEY.test(key) || hasSecretField(item));
};

const requiredBoolean = (value, field) => {
  if (value !== true && value !== false) throw new TypeError(`${field} must be boolean`);
  return value;
};

const normalizeGate = (gate, field, requiredChecks) => {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) throw new TypeError(`${field} must be an object`);
  if (hasSecretField(gate)) throw new Error(`${field} must not contain secret fields`);
  const checks = {};
  for (const check of requiredChecks) checks[check] = requiredBoolean(gate.checks?.[check], `${field}.checks.${check}`);
  const evidenceDigest = requiredSha(gate.evidenceDigest, `${field}.evidenceDigest`);
  const evidenceType = requiredText(gate.evidenceType, `${field}.evidenceType`);
  const passed = Object.values(checks).every(Boolean);
  return Object.freeze({evidenceType, evidenceDigest, checks: Object.freeze(checks), passed});
};

export const ART_GATE_CHECKS = Object.freeze([
  'silhouetteReadable',
  'visualHierarchyClear',
  'originalityMaterial',
  'materialFinishSufficient',
  'worldConsistency',
  'phoneScaleReadable',
  'productTruthSafe',
]);

export const ANIMATIC_GATE_CHECKS = Object.freeze([
  'shotIntentClear',
  'timingBounded',
  'payoffTimingReviewed',
  'audioTimingReviewed',
  'loopPlanReviewed',
  'productTruthSafe',
]);

const buildReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

export const createVideoCreativePreflight = ({
  project,
  artGate,
  animaticGate,
  reviewer,
  reviewedAt = new Date().toISOString(),
} = {}) => {
  validateVideoProject(project);
  if (project.stage !== 'ASSETS_VERIFIED') throw new Error('creative preflight requires ASSETS_VERIFIED');
  if (project.status !== 'ACTIVE') throw new Error('creative preflight requires an ACTIVE project');
  if (project.nextEvent !== 'AUTHORIZE_RENDER') throw new Error('creative preflight requires AUTHORIZE_RENDER as the next lifecycle event');

  const normalizedArt = normalizeGate(artGate, 'artGate', ART_GATE_CHECKS);
  const normalizedAnimatic = normalizeGate(animaticGate, 'animaticGate', ANIMATIC_GATE_CHECKS);
  const passed = normalizedArt.passed && normalizedAnimatic.passed;

  return buildReceipt({
    schemaVersion: 'toolradar.video-creative-preflight.v1',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    reviewer: requiredText(reviewer, 'reviewer'),
    reviewedAt: normalizeTimestamp(reviewedAt, 'reviewedAt'),
    artGate: normalizedArt,
    animaticGate: normalizedAnimatic,
    status: passed ? 'CREATIVE_PREFLIGHT_PASSED' : 'CREATIVE_PREFLIGHT_BLOCKED',
    truthBoundary: passed ? 'creative_preflight_passed' : 'creative_preflight_blocked',
    renderAuthorizationInputAllowed: passed,
    humanCreativeApprovalClaimed: false,
    publicationAllowed: false,
    errors: Object.freeze([
      ...(normalizedArt.passed ? [] : ['art_gate_not_passed']),
      ...(normalizedAnimatic.passed ? [] : ['animatic_gate_not_passed']),
    ]),
  });
};

export const validateVideoCreativePreflight = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.video-creative-preflight.v1') throw new TypeError('unsupported creative preflight schema');
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be SHA-256');
  if (digest(core) !== receiptDigest) throw new Error('creative preflight receipt digest mismatch');
  requiredText(receipt.projectId, 'projectId');
  requiredSha(receipt.sourceProjectDigest, 'sourceProjectDigest');
  requiredText(receipt.reviewer, 'reviewer');
  normalizeTimestamp(receipt.reviewedAt, 'reviewedAt');
  const art = normalizeGate(receipt.artGate, 'artGate', ART_GATE_CHECKS);
  const animatic = normalizeGate(receipt.animaticGate, 'animaticGate', ANIMATIC_GATE_CHECKS);
  const expectedPass = art.passed && animatic.passed;

  if (expectedPass) {
    if (receipt.status !== 'CREATIVE_PREFLIGHT_PASSED' || receipt.truthBoundary !== 'creative_preflight_passed') {
      throw new Error('creative preflight pass boundary is invalid');
    }
    if (receipt.renderAuthorizationInputAllowed !== true) throw new Error('passed creative preflight must allow render authorization input');
    if (receipt.errors.length !== 0) throw new Error('passed creative preflight cannot retain errors');
  } else {
    if (receipt.status !== 'CREATIVE_PREFLIGHT_BLOCKED' || receipt.truthBoundary !== 'creative_preflight_blocked') {
      throw new Error('creative preflight block boundary is invalid');
    }
    if (receipt.renderAuthorizationInputAllowed !== false) throw new Error('blocked creative preflight cannot allow render authorization input');
  }

  if (receipt.humanCreativeApprovalClaimed !== false) throw new Error('creative preflight cannot claim human creative approval');
  if (receipt.publicationAllowed !== false) throw new Error('creative preflight cannot allow publication');
  return true;
};

export const assertCreativePreflightAllowsRenderAuthorization = ({project, receipt} = {}) => {
  validateVideoProject(project);
  validateVideoCreativePreflight(receipt);
  if (receipt.projectId !== project.projectId) throw new Error('creative preflight projectId mismatch');
  if (receipt.sourceProjectDigest !== project.projectDigest) throw new Error('creative preflight source project digest mismatch');
  if (receipt.status !== 'CREATIVE_PREFLIGHT_PASSED' || receipt.renderAuthorizationInputAllowed !== true) {
    throw new Error('creative preflight does not allow render authorization input');
  }
  return true;
};
