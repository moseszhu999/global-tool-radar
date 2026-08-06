import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMacRemotionRenderJob, validateMacRemotionRenderJobBinding} from '../src/index.mjs';

const gate = (overrides = {}) => ({
  version: 1,
  finalRenderAllowed: true,
  truthBoundary: 'render_execution_authorized',
  gateDigest: 'a'.repeat(64),
  outputPath: 'out/toolradar-replit-final.mp4',
  renderProfile: {width: 1080, height: 1920, durationSeconds: 89, fps: 30},
  assets: [
    {role: 'footageA', actualSizeBytes: 10, actualSha256: 'b'.repeat(64)},
    {role: 'footageB', actualSizeBytes: 20, actualSha256: 'c'.repeat(64)},
    {role: 'narration', actualSizeBytes: 30, actualSha256: 'd'.repeat(64)},
  ],
  ...overrides,
});

test('builds an exact gate-bound runner job request', () => {
  const binding = buildMacRemotionRenderJob({gate: gate()});
  assert.equal(binding.finalRenderAllowed, true);
  assert.equal(binding.jobRequest.compositionId, 'ToolRadarReplitPortrait');
  assert.equal(binding.jobRequest.inputProps.finalRenderGateDigest, 'a'.repeat(64));
  assert.equal(binding.jobRequest.evidence.assetDigests.length, 3);
  assert.equal(validateMacRemotionRenderJobBinding(binding), true);
});

test('blocks a runner job when the final render gate is not authorized', () => {
  const binding = buildMacRemotionRenderJob({gate: gate({finalRenderAllowed: false})});
  assert.equal(binding.finalRenderAllowed, false);
  assert.equal(binding.jobRequest, null);
  assert.deepEqual(binding.errors, ['render_gate_not_allowed']);
  assert.equal(validateMacRemotionRenderJobBinding(binding), true);
});

test('blocks incomplete asset evidence', () => {
  const binding = buildMacRemotionRenderJob({gate: gate({assets: gate().assets.slice(0, 2)})});
  assert.equal(binding.jobRequest, null);
  assert.ok(binding.errors.includes('render_gate_assets_invalid'));
});

test('binding digest changes when the authorized output path changes', () => {
  const first = buildMacRemotionRenderJob({gate: gate()});
  const second = buildMacRemotionRenderJob({gate: gate({outputPath: 'out/other.mp4'})});
  assert.notEqual(first.bindingDigest, second.bindingDigest);
});

test('validator rejects a tampered runner request', () => {
  const binding = buildMacRemotionRenderJob({gate: gate()});
  const tampered = {...binding, jobRequest: {...binding.jobRequest, outputPath: 'out/tampered.mp4'}};
  assert.throws(() => validateMacRemotionRenderJobBinding(tampered), /binding digest mismatch/);
});
