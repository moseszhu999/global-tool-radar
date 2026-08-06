import {createHash} from 'node:crypto';

const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const REQUIRED_OPERATIONS = Object.freeze([
  Object.freeze({path: '/health', method: 'get'}),
  Object.freeze({path: '/execute', method: 'post'}),
  Object.freeze({path: '/download', method: 'post'}),
]);

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

const normalizeBaseUrl = (value) => {
  const url = new URL(requiredText(value, 'baseUrl'));
  const localhost = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(localhost && url.protocol === 'http:')) {
    throw new TypeError('baseUrl must use HTTPS except for localhost MacRunner');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const responseJson = async (response, label) => {
  if (!response?.ok) throw new Error(`${label} returned HTTP ${response?.status ?? 'unknown'}`);
  const value = await response.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must return a JSON object`);
  return value;
};

const fetchWithTimeout = async (fetchImpl, url, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('MacRunner probe timeout')), timeoutMs);
  try {
    return await fetchImpl(url, {
      method: 'GET',
      headers: {accept: 'application/json'},
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const operationSummary = (openapi) => REQUIRED_OPERATIONS.map(({path, method}) => {
  const operation = openapi.paths?.[path]?.[method];
  if (!operation || typeof operation !== 'object') throw new Error(`MacRunner OpenAPI is missing ${method.toUpperCase()} ${path}`);
  return {
    path,
    method: method.toUpperCase(),
    operationId: typeof operation.operationId === 'string' && operation.operationId.trim()
      ? operation.operationId.trim()
      : null,
    requestSchemaRef: typeof operation.requestBody?.content?.['application/json']?.schema?.$ref === 'string'
      ? operation.requestBody.content['application/json'].schema.$ref
      : null,
  };
});

const probeCore = (receipt) => ({
  schemaVersion: receipt.schemaVersion,
  service: receipt.service,
  observedAt: receipt.observedAt,
  baseOrigin: receipt.baseOrigin,
  health: receipt.health,
  openapiVersion: receipt.openapiVersion,
  operations: receipt.operations,
  capabilities: receipt.capabilities,
  truthBoundary: receipt.truthBoundary,
});

export async function probeSharedMacRunner({
  baseUrl = 'http://127.0.0.1:8765',
  fetchImpl = globalThis.fetch,
  timeoutMs = 5_000,
  observedAt = new Date().toISOString(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer');
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const observed = new Date(requiredText(observedAt, 'observedAt'));
  if (Number.isNaN(observed.getTime())) throw new TypeError('observedAt must be an ISO timestamp');

  const health = await responseJson(
    await fetchWithTimeout(fetchImpl, `${normalizedBaseUrl}/health`, timeoutMs),
    'MacRunner health',
  );
  const openapi = await responseJson(
    await fetchWithTimeout(fetchImpl, `${normalizedBaseUrl}/openapi.json`, timeoutMs),
    'MacRunner OpenAPI',
  );
  if (typeof openapi.openapi !== 'string' || !openapi.openapi.trim()) throw new Error('MacRunner OpenAPI version is missing');

  const operations = operationSummary(openapi);
  const core = {
    schemaVersion: 'toolradar.shared-macrunner-contract-receipt.v1',
    service: 'MacRunner',
    observedAt: observed.toISOString(),
    baseOrigin: new URL(normalizedBaseUrl).origin,
    health: {
      reachable: true,
      ok: health.ok === true || ['ok', 'healthy'].includes(String(health.status ?? '').toLowerCase()),
      service: typeof health.service === 'string' ? health.service : null,
      version: typeof health.version === 'string' ? health.version : null,
    },
    openapiVersion: openapi.openapi,
    operations,
    capabilities: {
      executeContractObserved: true,
      downloadContractObserved: true,
      remotionExecutionObserved: false,
      localDeepSeekObserved: false,
    },
    truthBoundary: 'contract_discovery_only_no_execute_download_render_or_inference',
  };
  return Object.freeze({...core, receiptDigest: digest(core)});
}

export function validateSharedMacRunnerReceipt(receipt) {
  if (receipt?.schemaVersion !== 'toolradar.shared-macrunner-contract-receipt.v1') {
    throw new TypeError('unsupported shared MacRunner receipt schema');
  }
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '') || digest(core) !== receiptDigest) throw new Error('shared MacRunner receipt digest mismatch');
  if (receipt.service !== 'MacRunner') throw new Error('shared MacRunner service identity mismatch');
  if (receipt.health?.reachable !== true) throw new Error('shared MacRunner was not reachable');
  const operationKeys = new Set((receipt.operations ?? []).map((item) => `${item.method} ${item.path}`));
  for (const operation of REQUIRED_OPERATIONS) {
    const key = `${operation.method.toUpperCase()} ${operation.path}`;
    if (!operationKeys.has(key)) throw new Error(`shared MacRunner receipt missing ${key}`);
  }
  if (receipt.capabilities?.executeContractObserved !== true
      || receipt.capabilities?.downloadContractObserved !== true
      || receipt.capabilities?.remotionExecutionObserved !== false
      || receipt.capabilities?.localDeepSeekObserved !== false
      || receipt.truthBoundary !== 'contract_discovery_only_no_execute_download_render_or_inference') {
    throw new Error('shared MacRunner receipt truth boundary is invalid');
  }
  return true;
}

export function buildDeepSeekAdvisoryPrompt({exactHead, profile} = {}) {
  const head = requiredText(exactHead, 'exactHead');
  if (!GIT_SHA.test(head)) throw new TypeError('exactHead must be a lowercase 40-character commit SHA');
  const boundedProfile = requiredText(profile, 'profile');
  return [
    'You are an advisory-only local reviewer for ToolRadar.',
    `Exact Git head: ${head}`,
    `Validation profile: ${boundedProfile}`,
    'Review only for contradictions in these boundaries:',
    '- no claim that real recordings, voiceover, final MP4, human approval, publication, platform API verification, or metrics exist;',
    '- M9 real media and render evidence precede M10 human review;',
    '- M10 approval permits release preparation only;',
    '- M11 login, authorization, CAPTCHA, upload, preview, and publish remain human-only;',
    '- M12 uses at least two chronological non-decreasing platform-UI observations;',
    'Return concise JSON with keys verdict and findings.',
    'Your output is advisory only and must never be treated as execution evidence or a formal decision.',
  ].join('\n');
}

const advisoryCore = (receipt) => ({
  schemaVersion: receipt.schemaVersion,
  exactHead: receipt.exactHead,
  profile: receipt.profile,
  model: receipt.model,
  startedAt: receipt.startedAt,
  completedAt: receipt.completedAt,
  outputSha256: receipt.outputSha256,
  outputBytes: receipt.outputBytes,
  advisoryOnly: receipt.advisoryOnly,
  acceptedAsExecutionEvidence: receipt.acceptedAsExecutionEvidence,
  formalDecisionPerformed: receipt.formalDecisionPerformed,
  truthBoundary: receipt.truthBoundary,
});

export function createDeepSeekAdvisoryReceipt({
  exactHead,
  profile,
  model,
  output,
  startedAt,
  completedAt,
} = {}) {
  const head = requiredText(exactHead, 'exactHead');
  if (!GIT_SHA.test(head)) throw new TypeError('exactHead must be a lowercase 40-character commit SHA');
  const text = requiredText(output, 'output');
  const start = new Date(requiredText(startedAt, 'startedAt'));
  const complete = new Date(requiredText(completedAt, 'completedAt'));
  if (Number.isNaN(start.getTime()) || Number.isNaN(complete.getTime()) || complete < start) {
    throw new TypeError('DeepSeek advisory timestamps are invalid');
  }
  const core = {
    schemaVersion: 'toolradar.local-deepseek-advisory-receipt.v1',
    exactHead: head,
    profile: requiredText(profile, 'profile'),
    model: requiredText(model, 'model'),
    startedAt: start.toISOString(),
    completedAt: complete.toISOString(),
    outputSha256: createHash('sha256').update(text).digest('hex'),
    outputBytes: Buffer.byteLength(text),
    advisoryOnly: true,
    acceptedAsExecutionEvidence: false,
    formalDecisionPerformed: false,
    truthBoundary: 'local_model_advisory_only_output_not_persisted_in_receipt',
  };
  return Object.freeze({...core, receiptDigest: digest(core)});
}

export function validateDeepSeekAdvisoryReceipt(receipt) {
  if (receipt?.schemaVersion !== 'toolradar.local-deepseek-advisory-receipt.v1') throw new TypeError('unsupported DeepSeek advisory receipt schema');
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '') || digest(core) !== receiptDigest) throw new Error('DeepSeek advisory receipt digest mismatch');
  if (!GIT_SHA.test(receipt.exactHead ?? '') || !SHA256.test(receipt.outputSha256 ?? '')) throw new Error('DeepSeek advisory receipt digest field is invalid');
  if (receipt.advisoryOnly !== true
      || receipt.acceptedAsExecutionEvidence !== false
      || receipt.formalDecisionPerformed !== false
      || receipt.truthBoundary !== 'local_model_advisory_only_output_not_persisted_in_receipt') {
    throw new Error('DeepSeek advisory truth boundary is invalid');
  }
  if ('output' in receipt || 'findings' in receipt || 'verdict' in receipt) throw new Error('DeepSeek advisory receipt must not persist model output');
  return true;
}

export {REQUIRED_OPERATIONS};
