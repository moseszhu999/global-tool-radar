import assert from 'node:assert/strict';
import test from 'node:test';
import {runMacRemotionRender, validateMacRemotionRenderReceipt} from '../src/index.mjs';

const clock = () => {
  const values = ['2026-08-06T11:30:00.000Z', '2026-08-06T11:31:00.000Z'];
  return () => values.shift() ?? '2026-08-06T11:31:00.000Z';
};

const clientFixture = (overrides = {}) => ({
  checkHealth: async () => ({ok: true, service: 'mac-remotion-action'}),
  submitRenderJob: async () => ({jobId: 'job-123', status: 'queued'}),
  pollRenderJob: async () => ({jobId: 'job-123', status: 'completed'}),
  getRenderResult: async () => ({status: 'completed', outputPath: '/tmp/final.mp4'}),
  getRenderJobLog: async () => ({text: 'failed'}),
  getDownloadUrl: (jobId) => `https://runner.example.test/v1/jobs/${jobId}/download`,
  ...overrides,
});

test('runs health, submission, polling and completed-result handoff', async () => {
  const receipt = await runMacRemotionRender({
    client: clientFixture(),
    jobRequest: {compositionId: 'ToolRadarReplitPortrait'},
    now: clock(),
  });
  assert.equal(receipt.status, 'COMPLETED');
  assert.equal(receipt.jobId, 'job-123');
  assert.equal(receipt.realSubmissionPerformed, true);
  assert.equal(receipt.finalVideoClaimAllowed, true);
  assert.match(receipt.downloadUrl, /job-123\/download$/);
  assert.equal(validateMacRemotionRenderReceipt(receipt), true);
});

test('blocks before submission when runner health is not true', async () => {
  let submitted = false;
  const receipt = await runMacRemotionRender({
    client: clientFixture({
      checkHealth: async () => ({ok: false, error: 'offline'}),
      submitRenderJob: async () => { submitted = true; },
    }),
    jobRequest: {title: 'blocked'},
    now: clock(),
  });
  assert.equal(submitted, false);
  assert.equal(receipt.status, 'RUNNER_HEALTH_BLOCKED');
  assert.equal(receipt.jobId, null);
  assert.equal(receipt.realSubmissionPerformed, false);
  assert.equal(receipt.finalVideoClaimAllowed, false);
  assert.equal(validateMacRemotionRenderReceipt(receipt), true);
});

test('captures the real failure log without claiming a final video', async () => {
  const receipt = await runMacRemotionRender({
    client: clientFixture({
      pollRenderJob: async () => ({jobId: 'job-123', status: 'failed', error: 'render failed'}),
      getRenderJobLog: async () => ({text: 'ffmpeg exited 1'}),
    }),
    jobRequest: {title: 'failure'},
    now: clock(),
  });
  assert.equal(receipt.status, 'FAILED');
  assert.equal(receipt.finalVideoClaimAllowed, false);
  assert.deepEqual(receipt.log, {text: 'ffmpeg exited 1'});
  assert.equal(receipt.result, null);
});

test('accepts taskId from compatible runner responses', async () => {
  const receipt = await runMacRemotionRender({
    client: clientFixture({submitRenderJob: async () => ({taskId: 'task-7', status: 'queued'})}),
    jobRequest: {title: 'task id'},
    now: clock(),
  });
  assert.equal(receipt.jobId, 'task-7');
});

test('redacts secrets from health, submission, result and log evidence', async () => {
  const receipt = await runMacRemotionRender({
    client: clientFixture({
      checkHealth: async () => ({ok: true, token: 'secret'}),
      submitRenderJob: async () => ({jobId: 'job-123', authorization: 'Bearer hidden'}),
      getRenderResult: async () => ({outputPath: '/tmp/final.mp4', message: 'Bearer top-secret'}),
    }),
    jobRequest: {title: 'redaction'},
    now: clock(),
  });
  assert.equal(receipt.health.token, '[REDACTED]');
  assert.equal(receipt.submission.authorization, '[REDACTED]');
  assert.equal(receipt.result.message, 'Bearer [REDACTED]');
  assert.equal(JSON.stringify(receipt).includes('top-secret'), false);
});

test('receipt digest is deterministic for identical evidence', async () => {
  const first = await runMacRemotionRender({client: clientFixture(), jobRequest: {title: 'same'}, now: clock()});
  const second = await runMacRemotionRender({client: clientFixture(), jobRequest: {title: 'same'}, now: clock()});
  assert.equal(first.receiptDigest, second.receiptDigest);
});
