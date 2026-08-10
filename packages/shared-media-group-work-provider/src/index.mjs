import { projectMediaRenderResultForGroupService } from '../../shared-media-group-service-adapter/src/index.mjs';

export const GROUP_WORK_PROVIDER_REQUEST_SCHEMA = 'group.work-provider.request.v1';
export const GROUP_WORK_PROVIDER_RESPONSE_SCHEMA = 'group.work-provider.response.v1';
export const SHARED_MEDIA_WORK_ITEM_SCHEMA = 'shared-media.group-work-item.v1';

const REQUEST_FIELDS = new Set([
  'schema',
  'requestId',
  'provider',
  'consumerDomain',
  'consumerOrganizationRef',
  'purpose',
  'requestedSourceSchemas',
  'correlation',
  'requestedAt',
  'readOnly',
  'crossDomainAccessPregranted',
  'persistencePerformed',
  'externalActionPerformed',
]);
const CORRELATION_FIELDS = new Set([
  'subjectLinkRef',
  'organizationLinkRef',
  'roleContextLinkRef',
  'federationStatus',
  'federationFreshness',
  'federationObservedAt',
]);
const INPUT_FIELDS = new Set([
  'request',
  'accessDecision',
  'accessDecisionRef',
  'availability',
  'sourceObservedAt',
  'observedAt',
  'provenanceRefs',
  'renderResults',
  'maxAgeSeconds',
]);
const RESULT_FIELDS = new Set(['projectionRef', 'workItemRef', 'result', 'sourceObservedAt']);
const ACCESS = new Set(['allowed', 'denied', 'unknown']);
const AVAILABILITY = new Set(['available', 'unavailable', 'unknown']);

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function exact(value, fields, label) {
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) throw new TypeError(`${label} contains unknown field: ${key}`);
  }
}

function text(value, label, max = 240) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new TypeError(`${label} must be a bounded non-empty string`);
  if (/@[^/\s]+\.[A-Za-z]{2,}/.test(normalized)) throw new TypeError(`${label} must not contain email-like PII`);
  if (/bearer|password|secret|token=|api[_-]?key|cookie|session=/i.test(normalized)) throw new TypeError(`${label} must not contain secret-like material`);
  return normalized;
}

function timestamp(value, label) {
  const normalized = text(value, label, 40);
  const time = Date.parse(normalized);
  if (!Number.isFinite(time)) throw new TypeError(`${label} must be an ISO-8601 timestamp`);
  return { text: normalized, time };
}

function bool(value, expected, label) {
  if (value !== expected) throw new TypeError(`${label} must be ${expected}`);
  return expected;
}

function stringArray(value, label, { min = 0, max = 32 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new TypeError(`${label} must be an array of ${min}..${max} items`);
  }
  const values = value.map((item) => text(item, label));
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must not contain duplicates`);
  return Object.freeze(values);
}

function positiveInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`${label} must be an integer in ${min}..${max}`);
  return value;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) freezeDeep(nested);
  return value;
}

function normalizeRequest(value) {
  const input = object(value, 'request');
  exact(input, REQUEST_FIELDS, 'request');
  if (input.schema !== GROUP_WORK_PROVIDER_REQUEST_SCHEMA) throw new TypeError('request.schema must be group.work-provider.request.v1');
  if (input.provider !== 'shared-media') throw new TypeError('request.provider must be shared-media');
  if (input.consumerDomain !== 'tradeos') throw new TypeError('request.consumerDomain must be tradeos');
  if (input.purpose !== 'work_inbox') throw new TypeError('request.purpose must be work_inbox');
  bool(input.readOnly, true, 'request.readOnly');
  bool(input.crossDomainAccessPregranted, false, 'request.crossDomainAccessPregranted');
  bool(input.persistencePerformed, false, 'request.persistencePerformed');
  bool(input.externalActionPerformed, false, 'request.externalActionPerformed');

  const consumerOrganizationRef = text(input.consumerOrganizationRef, 'request.consumerOrganizationRef');
  if (!consumerOrganizationRef.startsWith('group:organization:')) {
    throw new TypeError('request.consumerOrganizationRef must be a group organization ref');
  }

  const schemas = stringArray(input.requestedSourceSchemas, 'request.requestedSourceSchemas', { min: 1, max: 4 });
  if (schemas.length !== 1 || schemas[0] !== SHARED_MEDIA_WORK_ITEM_SCHEMA) {
    throw new TypeError('request.requestedSourceSchemas must contain only the Shared Media work-item schema');
  }

  const correlation = object(input.correlation, 'request.correlation');
  exact(correlation, CORRELATION_FIELDS, 'request.correlation');
  if (correlation.federationStatus !== 'valid') throw new Error('GROUP_PROVIDER_FEDERATION_NOT_VALID');
  if (correlation.federationFreshness !== 'fresh') throw new Error('GROUP_PROVIDER_FEDERATION_STALE');
  const federationObservedAt = timestamp(correlation.federationObservedAt, 'request.correlation.federationObservedAt');
  const requestedAt = timestamp(input.requestedAt, 'request.requestedAt');
  if (federationObservedAt.time > requestedAt.time) throw new TypeError('federation observation must not be after request time');

  return freezeDeep({
    schema: GROUP_WORK_PROVIDER_REQUEST_SCHEMA,
    requestId: text(input.requestId, 'request.requestId'),
    provider: 'shared-media',
    consumerDomain: 'tradeos',
    consumerOrganizationRef,
    purpose: 'work_inbox',
    requestedSourceSchemas: schemas,
    correlation: {
      subjectLinkRef: text(correlation.subjectLinkRef, 'request.correlation.subjectLinkRef'),
      organizationLinkRef: text(correlation.organizationLinkRef, 'request.correlation.organizationLinkRef'),
      ...(correlation.roleContextLinkRef ? { roleContextLinkRef: text(correlation.roleContextLinkRef, 'request.correlation.roleContextLinkRef') } : {}),
      federationStatus: 'valid',
      federationFreshness: 'fresh',
      federationObservedAt: federationObservedAt.text,
    },
    requestedAt: requestedAt.text,
    readOnly: true,
    crossDomainAccessPregranted: false,
    persistencePerformed: false,
    externalActionPerformed: false,
  });
}

function normalizeDecision(value, label, allowed) {
  if (!allowed.has(value)) throw new TypeError(`${label} is invalid`);
  return value;
}

export function buildSharedMediaGroupWorkProviderResponse(input) {
  const raw = object(input, 'provider input');
  exact(raw, INPUT_FIELDS, 'provider input');
  const request = normalizeRequest(raw.request);
  const accessDecision = normalizeDecision(raw.accessDecision, 'accessDecision', ACCESS);
  const availability = normalizeDecision(raw.availability, 'availability', AVAILABILITY);
  const observedAt = timestamp(raw.observedAt, 'observedAt');
  const sourceObservedAt = timestamp(raw.sourceObservedAt, 'sourceObservedAt');
  if (sourceObservedAt.time > observedAt.time) throw new TypeError('sourceObservedAt must not be after observedAt');
  if (observedAt.time < Date.parse(request.requestedAt)) throw new TypeError('provider observedAt must not be before request.requestedAt');
  const provenanceRefs = stringArray(raw.provenanceRefs, 'provenanceRefs', { min: 1, max: 32 });
  const maxAgeSeconds = positiveInteger(raw.maxAgeSeconds ?? 900, 'maxAgeSeconds', 30, 86400);
  const freshness = (observedAt.time - sourceObservedAt.time) / 1000 <= maxAgeSeconds ? 'fresh' : 'stale';
  const renderResults = raw.renderResults ?? [];
  if (!Array.isArray(renderResults) || renderResults.length > 50) throw new TypeError('renderResults must be an array of at most 50 items');

  let accessDecisionRef;
  if (accessDecision !== 'unknown') {
    accessDecisionRef = text(raw.accessDecisionRef, 'accessDecisionRef');
    if (!accessDecisionRef.startsWith('shared-media:access-decision:')) {
      throw new TypeError('accessDecisionRef must be a Shared Media access-decision ref');
    }
  } else if (raw.accessDecisionRef !== undefined) {
    throw new TypeError('unknown access decision must not claim an accessDecisionRef');
  }

  if (accessDecision !== 'allowed' || availability !== 'available') {
    if (renderResults.length !== 0) throw new Error('GROUP_PROVIDER_NON_AVAILABLE_RESULTS_FORBIDDEN');
    return freezeDeep({
      schema: GROUP_WORK_PROVIDER_RESPONSE_SCHEMA,
      requestId: request.requestId,
      provider: 'shared-media',
      consumerOrganizationRef: request.consumerOrganizationRef,
      accessDecision,
      ...(accessDecisionRef ? { accessDecisionRef } : {}),
      availability,
      freshness,
      sourceObservedAt: sourceObservedAt.text,
      observedAt: observedAt.text,
      ...(availability === 'available' ? { sourceSchema: SHARED_MEDIA_WORK_ITEM_SCHEMA } : {}),
      workItems: [],
      provenanceRefs,
      readOnly: true,
      providerTruthOwnedExternally: true,
      persistencePerformed: false,
      crossDomainWritePerformed: false,
      authorityGrantCreated: false,
      executionAuthorized: false,
      externalActionPerformed: false,
    });
  }

  const workItems = renderResults.map((item, index) => {
    const entry = object(item, `renderResults[${index}]`);
    exact(entry, RESULT_FIELDS, `renderResults[${index}]`);
    const itemSourceObservedAt = timestamp(entry.sourceObservedAt, `renderResults[${index}].sourceObservedAt`);
    if (itemSourceObservedAt.time > observedAt.time) throw new TypeError('render result source observation must not be after observedAt');
    return projectMediaRenderResultForGroupService({
      projectionRef: text(entry.projectionRef, `renderResults[${index}].projectionRef`),
      workItemRef: text(entry.workItemRef, `renderResults[${index}].workItemRef`),
      accessContext: {
        decisionRef: accessDecisionRef,
        consumerOrganizationRef: request.consumerOrganizationRef,
        readAllowed: true,
        decidedAt: observedAt.text,
      },
      consumerDomain: 'tradeos',
      result: entry.result,
      sourceObservedAt: itemSourceObservedAt.text,
      observedAt: observedAt.text,
      maxAgeSeconds,
    }).workItem;
  });

  return freezeDeep({
    schema: GROUP_WORK_PROVIDER_RESPONSE_SCHEMA,
    requestId: request.requestId,
    provider: 'shared-media',
    consumerOrganizationRef: request.consumerOrganizationRef,
    accessDecision: 'allowed',
    accessDecisionRef,
    availability: 'available',
    freshness,
    sourceObservedAt: sourceObservedAt.text,
    observedAt: observedAt.text,
    sourceSchema: SHARED_MEDIA_WORK_ITEM_SCHEMA,
    workItems,
    provenanceRefs,
    readOnly: true,
    providerTruthOwnedExternally: true,
    persistencePerformed: false,
    crossDomainWritePerformed: false,
    authorityGrantCreated: false,
    executionAuthorized: false,
    externalActionPerformed: false,
  });
}
