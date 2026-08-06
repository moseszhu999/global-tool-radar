import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildFinalRenderGate, computeFinalRenderGateDigest, validateFinalRenderGateReceipt} from '../src/index.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');

const fixture = async ({allowed = true, mutate = false} = {}) => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-render-gate-'));
  const roles = ['design_recording', 'build_limit_recording', 'voiceover'];
  const assets = [];
  for (const role of roles) {
    const path = join(dir, `${role}.${role === 'voiceover' ? 'wav' : 'mp4'}`);
    const content = Buffer.from(`${role}-owned-media`);
    await writeFile(path, content);
    assets.push({role, path, sizeBytes: content.length, sha256: digest(content), ready: true, verified: true});
  }
  const receiptPath = join(dir, 'receipt.json');
  await writeFile(receiptPath, JSON.stringify({version: 1, finalRenderAllowed: allowed, truthBoundary: allowed ? 'owned_media_verified' : 'preview_only', assets, receiptDigest: 'receipt-digest'}));
  if (mutate) await writeFile(assets[0].path, 'changed-after-preflight');
  return {receiptPath, outputPath: join(dir, 'final.mp4')};
};

test('authorizes an exact output path and media profile only for unchanged verified assets', async () => {
  const input = await fixture();
  const gate = await buildFinalRenderGate(input);
  assert.equal(gate.finalRenderAllowed, true);
  assert.equal(gate.truthBoundary, 'render_execution_authorized');
  assert.equal(gate.outputPath, input.outputPath);
  assert.equal(gate.renderProfile.width, 1080);
  assert.match(gate.command, new RegExp(`--output=${input.outputPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  assert.deepEqual(validateFinalRenderGateReceipt(gate), []);
});

test('blocks receipt that is not allowed', async () => {
  const input = await fixture({allowed: false});
  const gate = await buildFinalRenderGate(input);
  assert.equal(gate.finalRenderAllowed, false);
  assert.equal(gate.command, null);
  assert.ok(gate.errors.includes('preflight_not_allowed'));
  assert.ok(validateFinalRenderGateReceipt(gate).includes('render_gate_not_allowed'));
});

test('blocks media changed after preflight', async () => {
  const input = await fixture({mutate: true});
  const gate = await buildFinalRenderGate(input);
  assert.equal(gate.finalRenderAllowed, false);
  assert.equal(gate.command, null);
  assert.ok(gate.errors.some((error) => error.includes('digest_changed_after_preflight')));
});

test('detects mutation of an authorized gate receipt', async () => {
  const gate = await buildFinalRenderGate(await fixture());
  const mutated = {...gate, outputPath: `${gate.outputPath}.other`};
  assert.notEqual(computeFinalRenderGateDigest(mutated), gate.gateDigest);
  assert.ok(validateFinalRenderGateReceipt(mutated).includes('render_gate_digest_mismatch'));
});

test('gate digest is deterministic for unchanged inputs', async () => {
  const input = await fixture();
  const first = await buildFinalRenderGate(input);
  const second = await buildFinalRenderGate(input);
  assert.equal(first.gateDigest, second.gateDigest);
});
