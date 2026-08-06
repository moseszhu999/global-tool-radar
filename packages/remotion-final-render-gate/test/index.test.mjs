import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildFinalRenderGate} from '../src/index.mjs';

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
  return receiptPath;
};

test('authorizes deterministic render command only for unchanged verified assets', async () => {
  const gate = await buildFinalRenderGate({receiptPath: await fixture()});
  assert.equal(gate.finalRenderAllowed, true);
  assert.equal(gate.truthBoundary, 'render_execution_authorized');
  assert.match(gate.command, /render:final/);
  assert.equal(gate.errors.length, 0);
});

test('blocks receipt that is not allowed', async () => {
  const gate = await buildFinalRenderGate({receiptPath: await fixture({allowed: false})});
  assert.equal(gate.finalRenderAllowed, false);
  assert.equal(gate.command, null);
  assert.ok(gate.errors.includes('preflight_not_allowed'));
});

test('blocks media changed after preflight', async () => {
  const gate = await buildFinalRenderGate({receiptPath: await fixture({mutate: true})});
  assert.equal(gate.finalRenderAllowed, false);
  assert.equal(gate.command, null);
  assert.ok(gate.errors.some((error) => error.includes('digest_changed_after_preflight')));
});

test('gate digest is deterministic for unchanged inputs', async () => {
  const receiptPath = await fixture();
  const first = await buildFinalRenderGate({receiptPath});
  const second = await buildFinalRenderGate({receiptPath});
  assert.equal(first.gateDigest, second.gateDigest);
});
