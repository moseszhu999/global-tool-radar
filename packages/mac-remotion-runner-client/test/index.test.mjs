import assert from 'node:assert/strict';
import test from 'node:test';
import {createMacRemotionRunnerClient, DEFAULT_OPERATIONS, MacRemotionRunnerError} from '../src/index.mjs';

const jsonResponse = (payload, {status = 200} = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {get: () => 'application/json'},
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

test('health is unauthenticated while live render submission uses bearer auth', async () => {
  const calls = [];
  const client = createMacRemotionRunnerClient({
    baseUrl: 'https://runner.example.test/',
    token: 'secret-token',
    fetchImpl: async (url, init) => {
      calls.push({url, init});
      return jsonResponse(url.endsWith('/health') ? {ok: true} : {jobId: 'job-1', status: 'queued'});
    },
  });

  await client.checkHealth();
  await client.submitRenderJob({title: 'test'});

  assert.equal(calls[0].url, 'https://runner.example.test/health');
  assert.equal(calls[0].init.headers.authorization, undefined);
  assert.equal(calls[1].url, 'https://runner.example.test/v1/render');
  assert.equal(calls[1].init.headers.authorization, 'Bearer secret-token');
  assert.equal(calls[1].init.body, JSON.stringify({title: 'test'}));
});

test('default operations match the live RemotionActions route contract', () => {
  assert.deepEqual(DEFAULT_OPERATIONS, {
    checkHealth: {method: 'GET', path: '/health', auth: false},
    submitRenderJob: {method: 'POST', path: '/v1/render', auth: true},
    getRenderJobStatus: {method: 'GET', path: '/v1/jobs/{jobId}', auth: true},
    getRenderJobLog: {method: 'GET', path: '/v1/jobs/{jobId}/log', auth: true},
    getRenderResult: {method: 'GET', path: '/v1/jobs/{jobId}', auth: true},
    cancelRenderJob: {method: 'POST', path: '/v1/jobs/{jobId}/cancel', auth: true},
  });
});

test('uses the six stable operation IDs and aliases completed result to the status resource', async () => {
  const urls = [];
  const client = createMacRemotionRunnerClient({
    baseUrl: 'https://runner.example.test',
    token: 'token',
    fetchImpl: async (url) => { urls.push(url); return jsonResponse({status: 'completed'}); },
  });

  assert.deepEqual(client.operationIds, [
    'checkHealth',
    'submitRenderJob',
    'getRenderJobStatus',
    'getRenderJobLog',
    'getRenderResult',
    'cancelRenderJob',
  ]);
  await client.getRenderJobStatus('job with space');
  await client.getRenderJobLog('job with space');
  await client.getRenderResult('job with space');
  await client.cancelRenderJob('job with space');
  assert.deepEqual(urls, [
    'https://runner.example.test/v1/jobs/job%20with%20space',
    'https://runner.example.test/v1/jobs/job%20with%20space/log',
    'https://runner.example.test/v1/jobs/job%20with%20space',
    'https://runner.example.test/v1/jobs/job%20with%20space/cancel',
  ]);
  assert.equal(client.getDownloadUrl('job with space'), 'https://runner.example.test/v1/jobs/job%20with%20space/download');
});

test('polls until a terminal status without inventing completion', async () => {
  const statuses = ['queued', 'running', 'completed'];
  const observed = [];
  const client = createMacRemotionRunnerClient({
    baseUrl: 'http://127.0.0.1:3210',
    token: 'token',
    fetchImpl: async () => jsonResponse({status: statuses.shift(), jobId: 'job-1'}),
  });
  const result = await client.pollRenderJob('job-1', {
    intervalMs: 0,
    sleep: async () => {},
    onStatus: ({status}) => observed.push(status),
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(observed, ['queued', 'running', 'completed']);
});

test('redacts bearer secrets from runner errors', async () => {
  const token = 'very-secret-token';
  const client = createMacRemotionRunnerClient({
    baseUrl: 'https://runner.example.test',
    token,
    fetchImpl: async () => jsonResponse({error: `Authorization Bearer ${token} failed`}, {status: 401}),
  });
  await assert.rejects(
    () => client.getRenderJobStatus('job-1'),
    (error) => {
      assert.ok(error instanceof MacRemotionRunnerError);
      assert.equal(error.status, 401);
      assert.equal(error.message.includes(token), false);
      assert.match(error.message, /REDACTED/);
      return true;
    },
  );
});

test('fails closed when an authenticated operation has no token', async () => {
  const client = createMacRemotionRunnerClient({
    baseUrl: 'https://runner.example.test',
    fetchImpl: async () => jsonResponse({}),
  });
  await assert.rejects(() => client.submitRenderJob({title: 'test'}), /authentication token is required/);
});

test('rejects insecure non-local runner URLs', () => {
  assert.throws(
    () => createMacRemotionRunnerClient({baseUrl: 'http://runner.example.test', token: 'token', fetchImpl: async () => jsonResponse({})}),
    /must use HTTPS/,
  );
});
