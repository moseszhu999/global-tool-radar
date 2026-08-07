import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import test from 'node:test';
import {
  computeRunnerFinalVideoBindingDigest,
  validateRunnerFinalVideoBinding,
} from '../src/index.mjs';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const runnerReceipt = (overrides = {}) => {
  const core = {
    status: 'COMPLETED',
    terminalStatus: 'completed',
    jobId: 'job-001',
    statusSnapshot: {status: 'completed', outputPath: '/tmp/toolradar/final.mp4'},
    result: {status: 'completed', outputPath: '/tmp/toolradar/final.mp4'},
    log: null,
    downloadUrl: 'https://runner.example/v1/jobs/job-001/download',
    finalVideoEvidence: {source: 'result.outputPath', locator: '/tmp/toolradar/final.mp4'},
    realSubmissionPerformed: true,
    finalVideoClaimAllowed: true,
    ...overrides,
  };
  return {...core, receiptDigest: digest(core)};
};

test('allows only the exact runner-returned path expected by the render gate', () => {
  const binding = validateRunnerFinalVideoBinding({
    runnerReceipt: runnerReceipt(),
    expectedOutputPath: '/tmp/toolradar/final.mp4',
  });
  assert.equal(binding.bindingAllowed, true);
  assert.equal(binding.truthBoundary, 'runner_final_video_path_bound');
  assert.equal(binding.outputPath, resolve('/tmp/toolradar/final.mp4'));
  assert.deepEqual(binding.errors, []);
  assert.equal(computeRunnerFinalVideoBindingDigest(binding), binding.bindingDigest);
});

test('blocks completed status when the runner evidence points at a different file', () => {
  const receipt = runnerReceipt({
    finalVideoEvidence: {source: 'result.outputPath', locator: '/tmp/toolradar/other.mp4'},
  });
  const binding = validateRunnerFinalVideoBinding({
    runnerReceipt: receipt,
    expectedOutputPath: '/tmp/toolradar/final.mp4',
  });
  assert.equal(binding.bindingAllowed, false);
  assert.ok(binding.errors.includes('runner_final_video_path_mismatch'));
});

test('blocks a completed receipt with no concrete final-video evidence', () => {
  const receipt = runnerReceipt({finalVideoEvidence: null, finalVideoClaimAllowed: false});
  const binding = validateRunnerFinalVideoBinding({
    runnerReceipt: receipt,
    expectedOutputPath: '/tmp/toolradar/final.mp4',
  });
  assert.equal(binding.bindingAllowed, false);
  assert.ok(binding.errors.includes('runner_final_video_claim_not_allowed'));
  assert.ok(binding.errors.includes('runner_final_video_evidence_missing'));
});

test('blocks a tampered runner receipt even when all visible status fields look valid', () => {
  const receipt = runnerReceipt();
  const tampered = {...receipt, jobId: 'job-tampered'};
  const binding = validateRunnerFinalVideoBinding({
    runnerReceipt: tampered,
    expectedOutputPath: '/tmp/toolradar/final.mp4',
  });
  assert.equal(binding.bindingAllowed, false);
  assert.ok(binding.errors.includes('runner_receipt_digest_mismatch'));
});

test('blocks remote URLs because M9 final-video verification requires a local file path for hash and ffprobe', () => {
  const receipt = runnerReceipt({
    finalVideoEvidence: {source: 'result.outputPath', locator: 'https://runner.example/final.mp4'},
  });
  const binding = validateRunnerFinalVideoBinding({
    runnerReceipt: receipt,
    expectedOutputPath: '/tmp/toolradar/final.mp4',
  });
  assert.equal(binding.bindingAllowed, false);
  assert.ok(binding.errors.includes('runner_final_video_locator_not_local_path'));
});
