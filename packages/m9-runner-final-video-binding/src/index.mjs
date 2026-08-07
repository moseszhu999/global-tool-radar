import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const SHA256 = /^[a-f0-9]{64}$/;
const nonEmptyText = (value) => typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const computeRunnerReceiptDigest = (receipt) => {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null;
  const {receiptDigest, ...core} = receipt;
  return digest(core);
};

export const validateRunnerFinalVideoBinding = ({runnerReceipt, expectedOutputPath}) => {
  const errors = [];
  const expected = nonEmptyText(expectedOutputPath);
  const source = nonEmptyText(runnerReceipt?.finalVideoEvidence?.source);
  const locator = nonEmptyText(runnerReceipt?.finalVideoEvidence?.locator);

  if (!runnerReceipt || typeof runnerReceipt !== 'object' || Array.isArray(runnerReceipt)) {
    errors.push('runner_receipt_invalid');
  } else {
    if (!SHA256.test(runnerReceipt.receiptDigest ?? '')) errors.push('runner_receipt_digest_invalid');
    else if (computeRunnerReceiptDigest(runnerReceipt) !== runnerReceipt.receiptDigest) errors.push('runner_receipt_digest_mismatch');
    if (runnerReceipt.status !== 'COMPLETED') errors.push('runner_render_not_completed');
    if (runnerReceipt.terminalStatus !== 'completed') errors.push('runner_terminal_status_not_completed');
    if (runnerReceipt.realSubmissionPerformed !== true) errors.push('runner_real_submission_not_proven');
    if (runnerReceipt.finalVideoClaimAllowed !== true) errors.push('runner_final_video_claim_not_allowed');
  }

  if (!source || !locator) errors.push('runner_final_video_evidence_missing');
  if (locator && /^[a-z][a-z0-9+.-]*:\/\//i.test(locator)) errors.push('runner_final_video_locator_not_local_path');
  if (!expected) errors.push('expected_output_path_missing');

  const resolvedLocator = locator && !/^[a-z][a-z0-9+.-]*:\/\//i.test(locator) ? resolve(locator) : null;
  const resolvedExpected = expected ? resolve(expected) : null;
  if (resolvedLocator && resolvedExpected && resolvedLocator !== resolvedExpected) errors.push('runner_final_video_path_mismatch');

  const bindingAllowed = errors.length === 0;
  const canonical = {
    schemaVersion: 'toolradar.m9-runner-final-video-binding.v1',
    runnerReceiptDigest: runnerReceipt?.receiptDigest ?? null,
    jobId: runnerReceipt?.jobId ?? null,
    evidenceSource: source,
    outputPath: resolvedLocator,
    expectedOutputPath: resolvedExpected,
    bindingAllowed,
    errors,
  };

  return Object.freeze({
    ...canonical,
    truthBoundary: bindingAllowed ? 'runner_final_video_path_bound' : 'runner_final_video_binding_blocked',
    bindingDigest: digest(canonical),
  });
};

export const computeRunnerFinalVideoBindingDigest = (binding) => digest({
  schemaVersion: binding?.schemaVersion ?? null,
  runnerReceiptDigest: binding?.runnerReceiptDigest ?? null,
  jobId: binding?.jobId ?? null,
  evidenceSource: binding?.evidenceSource ?? null,
  outputPath: binding?.outputPath ?? null,
  expectedOutputPath: binding?.expectedOutputPath ?? null,
  bindingAllowed: binding?.bindingAllowed === true,
  errors: Array.isArray(binding?.errors) ? binding.errors : null,
});
