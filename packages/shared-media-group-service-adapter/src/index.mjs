import { createHash } from 'node:crypto';
import { validateMediaRenderResultV1 } from '../../shared-media-render-contract/src/index.mjs';

export const SHARED_MEDIA_GROUP_SERVICE_STATUS_SCHEMA = 'shared-media.group-service-status.v1';
export const SHARED_MEDIA_GROUP_WORK_ITEM_SCHEMA = 'shared-media.group-work-item.v1';

const INPUT_FIELDS = new Set([
  'projectionRef',
  'workItemRef',
  'accessContext',
  'consumerDomain',
  'result',
  'sourceObservedAt',
  'observedAt',
  'maxAgeSeconds',
]);

const ACCESS_FIELDS = new Set([
  'decisionRef',
  'consumerOrganizationRef',
  'readAllowed',
  'decidedAt',
]);

const CONSUMER_DOMAINS = new Set(['tradeos', 'trainingos', 'pr-growth', 'aiexe', 'other']);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertExactFields(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unknown field: ${key}`);
  }
}

function assertString(value, label, { min = 1, max = 240 } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw new TypeError(`${label} must be a bounded string`);
  }
  return value;
}

function assertSafeRef(value, label, prefix) {
  const text = assertString(value, label, { min: 3, max: 220 });
  if (!text.startsWith(prefix)) throw new TypeError(`${label} must start with ${prefix}`);
  if (/@[^/\s]+\.[A-Za-z]{2,}/.test(text)) throw new TypeError(`${label} must not contain email-like PII`);
  if (/bearer|password|secret|token=|api[_-]?key/i.test(text)) throw new TypeError(`${label} must not contain secret-like material`);
  if (!/^[A-Za-z0-9][A-Za-z0-9:._@/-]*$/.test(text)) throw new TypeError(`${label} has invalid characters`);
  return text;
}

function assertTimestamp(value, label) {
  const text = assertString(value, label, { min: 20, max: 40 });
  const time = Date.parse(text);
  if (!Number.isFinite(time) || !text.endsWith('Z')) throw new TypeError(`${label} must be an ISO-8601 UTC timestamp`);
  return { text, time };
}

function assertBoundedInteger(value, label, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${label} must be an integer in ${min}..${max}`);
  }
  return value;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(sortObject(value))).digest('hex');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeAccessContext(input, observedAt) {
  assertObject(input, 'accessContext');
  assertExactFields(input, ACCESS_FIELDS, 'accessContext');
  const decisionRef = assertSafeRef(input.decisionRef, 'accessContext.decisionRef', 'shared-media:access-decision:');
  const consumerOrganizationRef = assertSafeRef(input.consumerOrganizationRef, 'accessContext.consumerOrganizationRef', 'group:organization:');
  const decidedAt = assertTimestamp(input.decidedAt, 'accessContext.decidedAt');
  if (decidedAt.time > observedAt.time) throw new TypeError('accessContext.decidedAt must not be after observedAt');
  if (typeof input.readAllowed !== 'boolean') throw new TypeError('accessContext.readAllowed must be boolean');
  if (!input.readAllowed) throw new Error('SHARED_MEDIA_GROUP_ACCESS_DENIED');
  return { decisionRef, consumerOrganizationRef, decidedAt: decidedAt.text };
}

function mapRenderState(result) {
  switch (result.status) {
    case 'queued':
      return { status: 'pending', requiredHumanDecision: false, nextAction: 'monitor_render', reasonCode: 'render_queued' };
    case 'running':
      return { status: 'in_progress', requiredHumanDecision: false, nextAction: 'monitor_render', reasonCode: 'render_running' };
    case 'succeeded':
      return { status: 'awaiting_human_review', requiredHumanDecision: true, nextAction: 'review_rendered_candidate', reasonCode: 'technical_render_succeeded' };
    case 'failed':
      return { status: 'blocked', requiredHumanDecision: false, nextAction: 'inspect_render_failure', reasonCode: 'technical_render_failed' };
    case 'cancelled':
      return { status: 'cancelled', requiredHumanDecision: false, nextAction: 'none', reasonCode: 'render_cancelled' };
    default:
      throw new TypeError(`unsupported render status: ${result.status}`);
  }
}

function terminalEvidence(result) {
  if (result.status === 'succeeded') {
    return {
      artifactId: result.artifact.artifactId,
      artifactSha256: result.artifact.sha256,
      mediaType: result.artifact.mediaType,
      byteLength: result.artifact.byteLength,
      renderLogSha256: result.evidence.renderLog.sha256,
      collectedAt: result.evidence.collectedAt,
    };
  }
  if (result.status === 'failed') {
    return {
      errorCode: result.error.code,
      errorStage: result.error.stage,
      retryable: result.error.retryable,
      renderLogSha256: result.evidence.renderLog.sha256,
      collectedAt: result.evidence.collectedAt,
    };
  }
  return null;
}

export function projectMediaRenderResultForGroupService(input) {
  assertObject(input, 'group service input');
  assertExactFields(input, INPUT_FIELDS, 'group service input');

  const observedAt = assertTimestamp(input.observedAt, 'observedAt');
  const sourceObservedAt = assertTimestamp(input.sourceObservedAt, 'sourceObservedAt');
  if (sourceObservedAt.time > observedAt.time) throw new TypeError('sourceObservedAt must not be after observedAt');
  const maxAgeSeconds = assertBoundedInteger(input.maxAgeSeconds ?? 900, 'maxAgeSeconds', { min: 30, max: 86400 });
  const freshness = (observedAt.time - sourceObservedAt.time) / 1000 <= maxAgeSeconds ? 'fresh' : 'stale';
  const access = normalizeAccessContext(input.accessContext, observedAt);

  const consumerDomain = assertString(input.consumerDomain, 'consumerDomain', { max: 32 });
  if (!CONSUMER_DOMAINS.has(consumerDomain)) throw new TypeError('consumerDomain is not allowed');

  validateMediaRenderResultV1(input.result);
  const state = mapRenderState(input.result);
  const evidence = terminalEvidence(input.result);

  const workItemUnsigned = {
    schema: SHARED_MEDIA_GROUP_WORK_ITEM_SCHEMA,
    workItemRef: assertSafeRef(input.workItemRef, 'workItemRef', 'shared-media:group-work-item:'),
    domain: 'shared-media',
    consumerDomain,
    consumerOrganizationRef: access.consumerOrganizationRef,
    requestId: input.result.requestId,
    jobId: input.result.jobId,
    renderStatus: input.result.status,
    status: state.status,
    reasonCode: state.reasonCode,
    freshness,
    sourceObservedAt: sourceObservedAt.text,
    observedAt: observedAt.text,
    requiredHumanDecision: state.requiredHumanDecision,
    nextAction: state.nextAction,
    terminalEvidence: evidence,
    readOnly: true,
    technicalResultOnly: true,
    humanReviewCompleted: false,
    humanDecisionInferred: false,
    consumerDomainDecisionInferred: false,
    publicationAllowed: false,
    publicationPerformed: false,
    externalActionPerformed: false,
  };

  const workItem = deepFreeze({ ...workItemUnsigned, workItemDigest: digest(workItemUnsigned) });
  const projectionUnsigned = {
    schema: SHARED_MEDIA_GROUP_SERVICE_STATUS_SCHEMA,
    projectionRef: assertSafeRef(input.projectionRef, 'projectionRef', 'shared-media:group-service:'),
    accessDecisionRef: access.decisionRef,
    workItem,
    readOnly: true,
    technicalResultOnly: true,
    humanReviewCompleted: false,
    humanDecisionInferred: false,
    consumerDomainDecisionInferred: false,
    publicationAllowed: false,
    publicationPerformed: false,
    externalActionPerformed: false,
  };

  return deepFreeze({ ...projectionUnsigned, projectionDigest: digest(projectionUnsigned) });
}
