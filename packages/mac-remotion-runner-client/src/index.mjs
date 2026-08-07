const DEFAULT_OPERATIONS = Object.freeze({
  checkHealth: Object.freeze({method: 'GET', path: '/health', auth: false}),
  submitRenderJob: Object.freeze({method: 'POST', path: '/v1/render', auth: true}),
  getRenderJobStatus: Object.freeze({method: 'GET', path: '/v1/jobs/{jobId}', auth: true}),
  getRenderJobLog: Object.freeze({method: 'GET', path: '/v1/jobs/{jobId}/log', auth: true}),
  getRenderResult: Object.freeze({method: 'GET', path: '/v1/jobs/{jobId}', auth: true}),
  cancelRenderJob: Object.freeze({method: 'POST', path: '/v1/jobs/{jobId}/cancel', auth: true}),
});

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const redact = (value, secrets = []) => {
  let text = String(value ?? '');
  for (const secret of secrets.filter(Boolean)) text = text.split(secret).join('[REDACTED]');
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/ACTION_TOKEN\s*=\s*[^\s]+/gi, 'ACTION_TOKEN=[REDACTED]');
};

const normalizeBaseUrl = (value, {allowInsecureLocalhost = true} = {}) => {
  const url = new URL(requiredText(value, 'baseUrl'));
  const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(allowInsecureLocalhost && local && url.protocol === 'http:')) {
    throw new TypeError('baseUrl must use HTTPS except for explicit localhost development');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const normalizeOperations = (overrides = {}) => Object.freeze(Object.fromEntries(
  Object.entries(DEFAULT_OPERATIONS).map(([operationId, defaults]) => {
    const operation = {...defaults, ...(overrides[operationId] ?? {})};
    const method = requiredText(operation.method, `operations.${operationId}.method`).toUpperCase();
    const path = requiredText(operation.path, `operations.${operationId}.path`);
    if (!path.startsWith('/')) throw new TypeError(`operations.${operationId}.path must start with /`);
    return [operationId, Object.freeze({method, path, auth: operation.auth !== false})];
  }),
));

const substitutePath = (template, params = {}) => template.replace(/\{([^}]+)\}/g, (_, key) => {
  const value = requiredText(params[key], `pathParams.${key}`);
  return encodeURIComponent(value);
});

const parseResponse = async (response) => {
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return {message: text}; }
};

export class MacRemotionRunnerError extends Error {
  constructor(message, {operationId, status = null, details = null} = {}) {
    super(message);
    this.name = 'MacRemotionRunnerError';
    this.operationId = operationId ?? null;
    this.status = status;
    this.details = details;
  }
}

export const createMacRemotionRunnerClient = ({
  baseUrl,
  token,
  fetchImpl = globalThis.fetch,
  operations,
  timeoutMs = 30_000,
  allowInsecureLocalhost = true,
} = {}) => {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, {allowInsecureLocalhost});
  const normalizedToken = token === undefined || token === null ? null : requiredText(token, 'token');
  const operationMap = normalizeOperations(operations);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer');

  const request = async (operationId, {pathParams, body, signal} = {}) => {
    const operation = operationMap[operationId];
    if (!operation) throw new TypeError(`unsupported operationId: ${operationId}`);
    if (operation.auth && !normalizedToken) throw new MacRemotionRunnerError('runner authentication token is required', {operationId});

    const path = substitutePath(operation.path, pathParams);
    const controller = signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(new Error('runner request timeout')), timeoutMs) : null;
    const headers = {'accept': 'application/json'};
    if (operation.auth) headers.authorization = `Bearer ${normalizedToken}`;
    if (body !== undefined) headers['content-type'] = 'application/json';

    try {
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        method: operation.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ?? controller.signal,
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        const rawMessage = payload?.error ?? payload?.message ?? `HTTP ${response.status}`;
        throw new MacRemotionRunnerError(redact(rawMessage, [normalizedToken]), {
          operationId,
          status: response.status,
          details: payload,
        });
      }
      return payload;
    } catch (error) {
      if (error instanceof MacRemotionRunnerError) throw error;
      const message = error?.name === 'AbortError'
        ? 'runner request timed out'
        : redact(error?.message ?? error, [normalizedToken]);
      throw new MacRemotionRunnerError(message, {operationId});
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  const getJobId = (value) => requiredText(value, 'jobId');

  return Object.freeze({
    baseUrl: normalizedBaseUrl,
    operationIds: Object.freeze(Object.keys(operationMap)),
    checkHealth: () => request('checkHealth'),
    submitRenderJob: (job) => {
      if (!job || typeof job !== 'object' || Array.isArray(job)) throw new TypeError('job must be an object');
      return request('submitRenderJob', {body: job});
    },
    getRenderJobStatus: (jobId) => request('getRenderJobStatus', {pathParams: {jobId: getJobId(jobId)}}),
    getRenderJobLog: (jobId) => request('getRenderJobLog', {pathParams: {jobId: getJobId(jobId)}}),
    getRenderResult: (jobId) => request('getRenderResult', {pathParams: {jobId: getJobId(jobId)}}),
    cancelRenderJob: (jobId) => request('cancelRenderJob', {pathParams: {jobId: getJobId(jobId)}}),
    getDownloadUrl: (jobId) => `${normalizedBaseUrl}/v1/jobs/${encodeURIComponent(getJobId(jobId))}/download`,
    pollRenderJob: async (jobId, {
      intervalMs = 2_000,
      maxAttempts = 300,
      sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
      onStatus,
    } = {}) => {
      if (!Number.isInteger(intervalMs) || intervalMs < 0) throw new TypeError('intervalMs must be a non-negative integer');
      if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) throw new TypeError('maxAttempts must be a positive integer');
      const normalizedJobId = getJobId(jobId);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const snapshot = await request('getRenderJobStatus', {pathParams: {jobId: normalizedJobId}});
        const status = String(snapshot?.status ?? '').toLowerCase();
        if (typeof onStatus === 'function') await onStatus(Object.freeze({attempt, status, snapshot}));
        if (TERMINAL_STATUSES.has(status)) return snapshot;
        if (attempt < maxAttempts) await sleep(intervalMs);
      }
      throw new MacRemotionRunnerError(`render job did not reach a terminal status after ${maxAttempts} attempts`, {
        operationId: 'getRenderJobStatus',
      });
    },
  });
};

export {DEFAULT_OPERATIONS, TERMINAL_STATUSES};
