import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMacRemotionRenderIntent,
  materializeMacRemotionRunnerRequest,
  validateMacRemotionRenderIntent,
  validateMacRemotionRunnerRequest,
} from '../src/index.mjs';

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

test('builds a gate-bound render intent without guessing the runner API body', () => {
  const binding = buildMacRemotionRenderIntent({gate: gate()});
  assert.equal(binding.finalRenderAllowed, true);
  assert.equal(binding.renderIntent.compositionId, 'ToolRadarReplitPortrait');
  assert.equal(binding.renderIntent.evidence.gateDigest, 'a'.repeat(64));
  assert.equal(binding.renderIntent.evidence.assetDigests.length, 3);
  assert.equal(validateMacRemotionRenderIntent(binding), true);
  assert.equal('jobRequest' in binding, false);
});

test('blocks a render intent when the final render gate is not authorized', () => {
  const binding = buildMacRemotionRenderIntent({gate: gate({finalRenderAllowed: false})});
  assert.equal(binding.finalRenderAllowed, false);
  assert.equal(binding.renderIntent, null);
  assert.deepEqual(binding.errors, ['render_gate_not_allowed']);
  assert.equal(validateMacRemotionRenderIntent(binding), true);
});

test('blocks incomplete or invalid asset evidence', () => {
  const incomplete = buildMacRemotionRenderIntent({gate: gate({assets: gate().assets.slice(0, 2)})});
  assert.equal(incomplete.renderIntent, null);
  assert.ok(incomplete.errors.includes('render_gate_assets_invalid'));

  const invalid = buildMacRemotionRenderIntent({gate: gate({assets: [
    ...gate().assets.slice(0, 2),
    {...gate().assets[2], actualSha256: 'not-a-digest'},
  ]})});
  assert.ok(invalid.errors.includes('asset_2_digest_invalid'));
});

test('materializes the deployed runner request only through an explicit adapter', () => {
  const binding = buildMacRemotionRenderIntent({gate: gate()});
  const envelope = materializeMacRemotionRunnerRequest({
    binding,
    mapRequest: (intent) => ({
      compositionId: intent.compositionId,
      outputPath: intent.outputPath,
      inputProps: {finalRenderGateDigest: intent.evidence.gateDigest},
    }),
  });
  assert.equal(envelope.requestBody.compositionId, 'ToolRadarReplitPortrait');
  assert.equal(validateMacRemotionRunnerRequest(envelope), true);
});

test('rejects adapters that inject credentials into the request artifact', () => {
  const binding = buildMacRemotionRenderIntent({gate: gate()});
  assert.throws(() => materializeMacRemotionRunnerRequest({
    binding,
    mapRequest: () => ({compositionId: 'x', actionToken: 'secret'}),
  }), /secret fields/);
});

test('digests change on path changes and reject request tampering', () => {
  const first = buildMacRemotionRenderIntent({gate: gate()});
  const second = buildMacRemotionRenderIntent({gate: gate({outputPath: 'out/other.mp4'})});
  assert.notEqual(first.bindingDigest, second.bindingDigest);

  const envelope = materializeMacRemotionRunnerRequest({binding: first, mapRequest: (intent) => ({outputPath: intent.outputPath})});
  const tampered = {...envelope, requestBody: {outputPath: 'out/tampered.mp4'}};
  assert.throws(() => validateMacRemotionRunnerRequest(tampered), /digest mismatch/);
});
