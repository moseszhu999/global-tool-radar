import {createHash} from 'node:crypto';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const SENSITIVE_KEY = /(authorization|token|secret|password|cookie|api[-_]?key)/i;

const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitize(item)]));
  }
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
      .replace(/ACTION_TOKEN\s*=\s*[^\s]+/gi, 'ACTION_TOKEN=[REDACTED]');
  }
  return value;
};

const requiredObject = (value, field) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  return value;
};

const requiredClientMethod = (client, method) => {
  if (typeof client?.[method] !== 'function') throw new TypeError(`client.${method} must be a function`);
};

const timestamp = (now) => {
  const value = typeof now === 'function' ? now() : new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid timestamp');
  return date.toISOString();
};

const nonEmptyText = (value) => typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const findFinalVideoEvidence = ({result, statusSnapshot}) => {
  const candidates = [
    ['result.outputPath', result?.outputPath],
    ['result.videoPath', result?.videoPath],
    ['result.filePath', result?.filePath],
    ['result.output.path', result?.output?.path],
    ['statusSnapshot.outputPath', statusSnapshot?.outputPath],
    ['statusSnapshot.videoPath', statusSnapshot?.videoPath],
    ['statusSnapshot.filePath', statusSnapshot?.filePath],
    ['statusSnapshot.output.path', statusSnapshot?.output?.path],
  ];
  for (const [source, value] of candidates) {
    const locator = nonEmptyText(value);
    if (locator) return Object.freeze({source, locator});
  }
  return null;
};

const buildReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

export const runMacRemotionRender = async ({
  client,
  jobRequest,
  pollOptions,
  now,
} = {}) => {
  requiredObject(jobRequest, 'jobRequest');
  for (const method of ['checkHealth', 'submitRenderJob', 'pollRenderJob', 'getRenderResult', 'getRenderJobLog', 'getDownloadUrl']) {
    requiredClientMethod(client, method);
  }

  const startedAt = timestamp(now);
  const jobRequestDigest = digest(jobRequest);
  const health = sanitize(await client.checkHealth());
  if (health?.ok !== true) {
    return buildReceipt({
      schemaVersion: 'toolradar.mac-remotion-render-run.v1',
      status: 'RUNNER_HEALTH_BLOCKED',
      startedAt,
      finishedAt: timestamp(now),
      jobRequestDigest,
      health,
      jobId: null,
      terminalStatus: null,
      statusSnapshot: null,
      result: null,
      log: null,
      downloadUrl: null,
      finalVideoEvidence: null,
      realSubmissionPerformed: false,
      finalVideoClaimAllowed: false,
    });
  }

  const submission = sanitize(await client.submitRenderJob(jobRequest));
  const jobId = submission?.jobId ?? submission?.taskId ?? null;
  if (typeof jobId !== 'string' || jobId.trim() === '') throw new TypeError('runner submission did not return jobId or taskId');
  const normalizedJobId = jobId.trim();
  const statusSnapshot = sanitize(await client.pollRenderJob(normalizedJobId, pollOptions));
  const terminalStatus = String(statusSnapshot?.status ?? '').toLowerCase();

  let result = null;
  let log = null;
  let downloadUrl = null;
  let finalVideoEvidence = null;
  if (terminalStatus === 'completed') {
    result = sanitize(await client.getRenderResult(normalizedJobId));
    downloadUrl = client.getDownloadUrl(normalizedJobId);
    finalVideoEvidence = findFinalVideoEvidence({result, statusSnapshot});
  } else if (terminalStatus === 'failed') {
    log = sanitize(await client.getRenderJobLog(normalizedJobId));
  }

  const status = terminalStatus === 'completed'
    ? 'COMPLETED'
    : terminalStatus === 'failed'
      ? 'FAILED'
      : terminalStatus === 'cancelled'
        ? 'CANCELLED'
        : 'INVALID_TERMINAL_STATUS';

  return buildReceipt({
    schemaVersion: 'toolradar.mac-remotion-render-run.v1',
    status,
    startedAt,
    finishedAt: timestamp(now),
    jobRequestDigest,
    health,
    submission,
    jobId: normalizedJobId,
    terminalStatus,
    statusSnapshot,
    result,
    log,
    downloadUrl,
    finalVideoEvidence,
    realSubmissionPerformed: true,
    finalVideoClaimAllowed: terminalStatus === 'completed' && finalVideoEvidence !== null,
  });
};

export const validateMacRemotionRenderReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.mac-remotion-render-run.v1') throw new TypeError('unsupported render run receipt');
  const {receiptDigest, ...core} = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be a SHA-256 digest');
  if (digest(core) !== receiptDigest) throw new TypeError('receipt digest mismatch');
  if (receipt.status === 'COMPLETED') {
    if (receipt.terminalStatus !== 'completed') throw new TypeError('completed receipt boundary is invalid');
    const locator = nonEmptyText(receipt.finalVideoEvidence?.locator);
    if (!locator || nonEmptyText(receipt.finalVideoEvidence?.source) === null) {
      if (receipt.finalVideoClaimAllowed === true) throw new TypeError('final video claim requires runner-returned media evidence');
    } else if (receipt.finalVideoClaimAllowed !== true) {
      throw new TypeError('completed receipt with final video evidence must allow the final video claim');
    }
  }
  if (receipt.realSubmissionPerformed !== true && receipt.jobId !== null) throw new TypeError('blocked receipt must not contain a jobId');
  return true;
};
