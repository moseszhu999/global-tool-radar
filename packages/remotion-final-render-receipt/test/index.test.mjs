import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildFinalRenderReceipt} from '../src/index.mjs';

const makeFixture = async ({allowed = true, video = 'real mp4 bytes'} = {}) => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-render-receipt-'));
  const gateReceiptPath = join(dir, 'gate.json');
  const videoPath = join(dir, 'final.mp4');
  await writeFile(gateReceiptPath, JSON.stringify({
    version: 1,
    finalRenderAllowed: allowed,
    truthBoundary: allowed ? 'render_execution_authorized' : 'render_execution_blocked',
    gateDigest: 'gate-digest-123',
  }));
  if (video !== null) await writeFile(videoPath, video);
  return {gateReceiptPath, videoPath};
};

const validProbe = async () => ({
  width: 1080,
  height: 1920,
  durationSeconds: 89,
  fps: 30,
  codec: 'h264',
  audioCodec: 'aac',
});

test('verifies a final video only when the render gate and media metadata match', async () => {
  const fixture = await makeFixture();
  const receipt = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(receipt.finalVideoVerified, true);
  assert.equal(receipt.truthBoundary, 'final_video_file_verified');
  assert.equal(receipt.errors.length, 0);
  assert.match(receipt.videoSha256, /^[a-f0-9]{64}$/);
});

test('blocks a video produced without an authorized render gate', async () => {
  const fixture = await makeFixture({allowed: false});
  const receipt = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(receipt.finalVideoVerified, false);
  assert.ok(receipt.errors.includes('render_gate_not_allowed'));
});

test('blocks missing, empty, or mismatched output files', async () => {
  const missing = await makeFixture({video: null});
  const missingReceipt = await buildFinalRenderReceipt({...missing, probeVideo: validProbe});
  assert.ok(missingReceipt.errors.includes('video_missing'));

  const empty = await makeFixture({video: ''});
  const emptyReceipt = await buildFinalRenderReceipt({...empty, probeVideo: validProbe});
  assert.ok(emptyReceipt.errors.includes('video_empty'));

  const mismatch = await makeFixture();
  const mismatchReceipt = await buildFinalRenderReceipt({
    ...mismatch,
    probeVideo: async () => ({width: 1920, height: 1080, durationSeconds: 70, fps: 25, codec: 'h264', audioCodec: ''}),
  });
  assert.deepEqual(mismatchReceipt.errors, [
    'unexpected_dimensions',
    'unexpected_duration',
    'unexpected_fps',
    'missing_audio_codec',
  ]);
});

test('produces a deterministic receipt digest for identical evidence', async () => {
  const fixture = await makeFixture();
  const first = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  const second = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(first.receiptDigest, second.receiptDigest);
});
