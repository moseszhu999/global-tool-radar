import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDeepSeekAdvisoryPrompt,
  createDeepSeekAdvisoryReceipt,
  probeSharedMacRunner,
  validateDeepSeekAdvisoryReceipt,
  validateSharedMacRunnerReceipt,
} from '../src/index.mjs';

const jsonResponse = (value, {ok = true, status = 200} = {}) => ({
  ok,
  status,
  json: async () => structuredClone(value),
});

const openapi = {
  openapi: '3.1.0',
  paths: {
    '/health': {get: {operationId: 'health'}},
    '/execute': {post: {operationId: 'execute', requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/ExecuteRequest'}}}}}},
    '/download': {post: {operationId: 'download', requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/DownloadRequest'}}}}}},
  },
};

const fetchImpl = async (url) => {
  if (url.endsWith('/health')) return jsonResponse({ok: true, service: 'MacRunner', version: '1.0.0'});
  if (url.endsWith('/openapi.json')) return jsonResponse(openapi);
  throw new Error(`unexpected URL ${url}`);
};

test('probes the shared MacRunner contract without executing an action', async () => {
  const receipt = await probeSharedMacRunner({
    fetchImpl,
    observedAt: '2026-08-07T00:00:00.000Z',
  });
  assert.equal(validateSharedMacRunnerReceipt(receipt), true);
  assert.equal(receipt.service, 'MacRunner');
  assert.equal(receipt.operations.length, 3);
  assert.equal(receipt.capabilities.executeContractObserved, true);
  assert.equal(receipt.capabilities.remotionExecutionObserved, false);
  assert.equal(receipt.truthBoundary, 'contract_discovery_only_no_execute_download_render_or_inference');
});

test('fails closed when a required shared operation is absent', async () => {
  const broken = structuredClone(openapi);
  delete broken.paths['/execute'];
  await assert.rejects(() => probeSharedMacRunner({
    observedAt: '2026-08-07T00:00:00.000Z',
    fetchImpl: async (url) => url.endsWith('/health') ? jsonResponse({ok: true}) : jsonResponse(broken),
  }), /missing POST \/execute/);
});

test('requires HTTPS for non-local shared MacRunner endpoints', async () => {
  await assert.rejects(() => probeSharedMacRunner({
    baseUrl: 'http://macrunner.example.com:8765',
    observedAt: '2026-08-07T00:00:00.000Z',
    fetchImpl,
  }), /must use HTTPS/);
});

test('rejects a tampered MacRunner contract receipt', async () => {
  const receipt = await probeSharedMacRunner({fetchImpl, observedAt: '2026-08-07T00:00:00.000Z'});
  assert.throws(() => validateSharedMacRunnerReceipt({...receipt, service: 'OtherRunner'}), /digest mismatch/);
});

test('builds an exact-head-bound advisory-only DeepSeek prompt', () => {
  const prompt = buildDeepSeekAdvisoryPrompt({
    exactHead: 'a'.repeat(40),
    profile: 'closure-operator-pack',
  });
  assert.match(prompt, /advisory-only local reviewer/);
  assert.match(prompt, /a{40}/);
  assert.match(prompt, /must never be treated as execution evidence/);
});

test('hashes local DeepSeek output without persisting its claims', () => {
  const receipt = createDeepSeekAdvisoryReceipt({
    exactHead: 'b'.repeat(40),
    profile: 'closure-operator-pack',
    model: 'deepseek-local',
    output: '{"verdict":"PASS","findings":[]}',
    startedAt: '2026-08-07T00:00:00.000Z',
    completedAt: '2026-08-07T00:00:01.000Z',
  });
  assert.equal(validateDeepSeekAdvisoryReceipt(receipt), true);
  assert.equal(receipt.advisoryOnly, true);
  assert.equal(receipt.acceptedAsExecutionEvidence, false);
  assert.equal('output' in receipt, false);
  assert.equal('verdict' in receipt, false);
});

test('rejects tampered or truth-promoting DeepSeek receipts', () => {
  const receipt = createDeepSeekAdvisoryReceipt({
    exactHead: 'c'.repeat(40),
    profile: 'm9-render-readiness',
    model: 'deepseek-local',
    output: 'advisory',
    startedAt: '2026-08-07T00:00:00.000Z',
    completedAt: '2026-08-07T00:00:01.000Z',
  });
  assert.throws(() => validateDeepSeekAdvisoryReceipt({...receipt, acceptedAsExecutionEvidence: true}), /digest mismatch/);
});
