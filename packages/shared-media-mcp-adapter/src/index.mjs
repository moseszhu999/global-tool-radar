import {createHash, randomUUID} from 'node:crypto';

const SECRET_KEY = /(authorization|bearer|token|secret|password|cookie|api[_-]?key|action_token)/i;
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PARAM_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const clone = (value) => structuredClone(value);

const stableNormalize = (value) => {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableNormalize(value[key])]));
  }
  return value;
};

export const stableJson = (value) => JSON.stringify(stableNormalize(value));
export const sha256Json = (value) => createHash('sha256').update(stableJson(value)).digest('hex');

const assertNoSecrets = (value, field = 'value') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${field}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) throw new TypeError(`${field}.${key} is forbidden in MCP evidence`);
      assertNoSecrets(item, `${field}.${key}`);
    }
    return;
  }
  if (typeof value === 'string' && /Bearer\s+[A-Za-z0-9._~+\/-]+/i.test(value)) {
    throw new TypeError(`${field} contains a bearer credential`);
  }
};

const normalizeParameterRule = (name, input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`allowedParameters.${name} must be an object`);
  const type = requiredText(input.type, `allowedParameters.${name}.type`);
  if (!PARAM_TYPES.has(type)) throw new TypeError(`allowedParameters.${name}.type is unsupported`);
  const rule = {type, required: input.required === true};
  if (input.minimum !== undefined) {
    if (typeof input.minimum !== 'number' || !Number.isFinite(input.minimum)) throw new TypeError(`allowedParameters.${name}.minimum must be finite`);
    rule.minimum = input.minimum;
  }
  if (input.maximum !== undefined) {
    if (typeof input.maximum !== 'number' || !Number.isFinite(input.maximum)) throw new TypeError(`allowedParameters.${name}.maximum must be finite`);
    rule.maximum = input.maximum;
  }
  if (rule.minimum !== undefined && rule.maximum !== undefined && rule.minimum > rule.maximum) {
    throw new TypeError(`allowedParameters.${name} has minimum above maximum`);
  }
  if (input.maxLength !== undefined) {
    if (!Number.isInteger(input.maxLength) || input.maxLength <= 0) throw new TypeError(`allowedParameters.${name}.maxLength must be a positive integer`);
    rule.maxLength = input.maxLength;
  }
  if (input.enum !== undefined) {
    if (!Array.isArray(input.enum) || input.enum.length === 0) throw new TypeError(`allowedParameters.${name}.enum must be a non-empty array`);
    rule.enum = [...input.enum];
  }
  return Object.freeze(rule);
};

export const normalizeWorkflowManifest = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('workflow manifest must be an object');
  assertNoSecrets(input, 'workflow');
  const id = requiredText(input.id, 'workflow.id');
  if (!ID.test(id)) throw new TypeError('workflow.id has invalid characters');
  const version = requiredText(input.version, 'workflow.version');
  const digest = requiredText(input.digest, 'workflow.digest').toLowerCase();
  if (!SHA256.test(digest)) throw new TypeError('workflow.digest must be a SHA-256 hex digest');
  const purpose = requiredText(input.purpose, 'workflow.purpose');
  const outputTypes = Array.isArray(input.outputTypes) ? input.outputTypes.map((value, index) => requiredText(value, `workflow.outputTypes[${index}]`)) : [];
  if (outputTypes.length === 0) throw new TypeError('workflow.outputTypes must be non-empty');
  const allowedInput = input.allowedParameters ?? {};
  if (!allowedInput || typeof allowedInput !== 'object' || Array.isArray(allowedInput)) throw new TypeError('workflow.allowedParameters must be an object');
  const allowedParameters = Object.freeze(Object.fromEntries(Object.entries(allowedInput).map(([name, rule]) => {
    if (!ID.test(name) || /graph|workflowJson|customNodes?/i.test(name)) throw new TypeError(`workflow parameter ${name} is forbidden or invalid`);
    return [name, normalizeParameterRule(name, rule)];
  })));
  const requiredModels = Object.freeze((input.requiredModels ?? []).map((value, index) => requiredText(value, `workflow.requiredModels[${index}]`)));
  const requiredCustomNodes = Object.freeze((input.requiredCustomNodes ?? []).map((value, index) => requiredText(value, `workflow.requiredCustomNodes[${index}]`)));
  if (requiredCustomNodes.length > 0 && input.customNodesApproved !== true) {
    throw new TypeError('workflow with custom nodes must be explicitly approved before registration');
  }
  return Object.freeze({
    id,
    version,
    digest,
    purpose,
    outputTypes: Object.freeze(outputTypes),
    allowedParameters,
    requiredModels,
    requiredCustomNodes,
    customNodesApproved: requiredCustomNodes.length === 0 ? true : true,
    available: input.available !== false,
    commercialSafetyApproved: input.commercialSafetyApproved === true,
  });
};

const validateParameterValue = (name, value, rule) => {
  if (rule.type === 'string') {
    if (typeof value !== 'string') throw new TypeError(`parameters.${name} must be a string`);
    if (rule.maxLength !== undefined && value.length > rule.maxLength) throw new TypeError(`parameters.${name} exceeds maxLength`);
  } else if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') throw new TypeError(`parameters.${name} must be a boolean`);
  } else {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`parameters.${name} must be a finite number`);
    if (rule.type === 'integer' && !Number.isInteger(value)) throw new TypeError(`parameters.${name} must be an integer`);
    if (rule.minimum !== undefined && value < rule.minimum) throw new RangeError(`parameters.${name} is below minimum`);
    if (rule.maximum !== undefined && value > rule.maximum) throw new RangeError(`parameters.${name} is above maximum`);
  }
  if (rule.enum && !rule.enum.some((candidate) => Object.is(candidate, value))) throw new TypeError(`parameters.${name} is not an allowed enum value`);
  return value;
};

const normalizeParameters = (workflow, input) => {
  const params = input ?? {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('parameters must be an object');
  assertNoSecrets(params, 'parameters');
  for (const key of Object.keys(params)) {
    if (!(key in workflow.allowedParameters)) throw new TypeError(`parameters.${key} is not allowed by workflow ${workflow.id}`);
  }
  for (const [name, rule] of Object.entries(workflow.allowedParameters)) {
    if (rule.required && !(name in params)) throw new TypeError(`parameters.${name} is required`);
    if (name in params) validateParameterValue(name, params[name], rule);
  }
  return Object.freeze({...params});
};

const normalizeReferenceIds = (input) => {
  if (input === undefined) return Object.freeze([]);
  if (!Array.isArray(input)) throw new TypeError('referenceAssetIds must be an array');
  const values = input.map((value, index) => {
    const id = requiredText(value, `referenceAssetIds[${index}]`);
    if (!ID.test(id)) throw new TypeError(`referenceAssetIds[${index}] has invalid characters`);
    return id;
  });
  if (new Set(values).size !== values.length) throw new TypeError('referenceAssetIds must not contain duplicates');
  return Object.freeze(values);
};

const ensureBackendMethod = (backend, method) => {
  if (typeof backend?.[method] !== 'function') throw new TypeError(`backend.${method} must be a function`);
};

const safeBackendResult = (value, field) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} backend result must be an object`);
  assertNoSecrets(value, field);
  return clone(value);
};

export const createSharedMediaMcpController = ({workflows = [], backend} = {}) => {
  ensureBackendMethod(backend, 'generate');
  ensureBackendMethod(backend, 'getJob');
  ensureBackendMethod(backend, 'getArtifact');
  ensureBackendMethod(backend, 'cancelJob');
  const registry = new Map();
  for (const raw of workflows) {
    const workflow = normalizeWorkflowManifest(raw);
    if (registry.has(workflow.id)) throw new TypeError(`duplicate workflow.id: ${workflow.id}`);
    registry.set(workflow.id, workflow);
  }
  const sorted = () => [...registry.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone);
  const getWorkflow = (id) => {
    const normalized = requiredText(id, 'workflowId');
    const workflow = registry.get(normalized);
    if (!workflow) throw new RangeError(`unknown workflowId: ${normalized}`);
    return workflow;
  };

  return Object.freeze({
    listWorkflows: () => sorted(),
    getWorkflow: (workflowId) => clone(getWorkflow(workflowId)),
    generateAsset: async ({workflowId, purpose, parameters, referenceAssetIds, outputProfile} = {}) => {
      const workflow = getWorkflow(workflowId);
      if (!workflow.available) throw new RangeError(`workflow ${workflow.id} is unavailable`);
      const normalizedPurpose = requiredText(purpose, 'purpose');
      const normalizedParameters = normalizeParameters(workflow, parameters);
      const normalizedReferences = normalizeReferenceIds(referenceAssetIds);
      if (normalizedReferences.length > 0) {
        if (typeof backend.isReferenceAssetAuthorized !== 'function') throw new TypeError('reference assets require backend.isReferenceAssetAuthorized');
        for (const assetId of normalizedReferences) {
          if (await backend.isReferenceAssetAuthorized(assetId) !== true) throw new RangeError(`reference asset is not authorized: ${assetId}`);
        }
      }
      if (outputProfile !== undefined) assertNoSecrets(outputProfile, 'outputProfile');
      const requestId = randomUUID();
      const manifest = {
        schemaVersion: 'shared-media.mcp-generation-request.v1',
        requestId,
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        workflowDigest: workflow.digest,
        purpose: normalizedPurpose,
        parameters: normalizedParameters,
        referenceAssetIds: normalizedReferences,
        outputProfile: outputProfile ?? null,
      };
      const inputManifestDigest = sha256Json(manifest);
      const backendResult = safeBackendResult(await backend.generate({workflow: clone(workflow), request: clone(manifest), inputManifestDigest}), 'generate');
      return Object.freeze({
        ...backendResult,
        requestId,
        workflowId: workflow.id,
        workflowDigest: workflow.digest,
        inputManifestDigest,
        publicationPerformed: false,
        humanApproved: false,
        analyticsObserved: false,
      });
    },
    getJob: async (jobId) => safeBackendResult(await backend.getJob(requiredText(jobId, 'jobId')), 'getJob'),
    getArtifact: async (artifactId) => {
      const result = safeBackendResult(await backend.getArtifact(requiredText(artifactId, 'artifactId')), 'getArtifact');
      if (result.status === 'ready' || result.sha256 !== undefined) {
        if (typeof result.sha256 !== 'string' || !SHA256.test(result.sha256.toLowerCase())) throw new TypeError('ready artifact must include valid sha256');
      }
      return Object.freeze({...result, humanApproved: false, publicationPerformed: false, analyticsObserved: false});
    },
    cancelJob: async (jobId) => safeBackendResult(await backend.cancelJob(requiredText(jobId, 'jobId')), 'cancelJob'),
  });
};
