import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildFinalRenderGate} from '../../remotion-final-render-gate/src/index.mjs';
import {
  buildFinalRenderReceipt,
  validateFinalRenderReceipt,
} from '../src/index.mjs';
import {parseFfprobeJson} from '../src/ffprobe.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');

const makeFixture = async ({allowed = true, video = 'real mp4 bytes'} = {}) => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-render-receipt-'));
  const roles = ['design_recording', 'build_limit_recording', 'voiceover'];
  const assets = [];
  for (const role of roles) {
    const path = join(dir, `${role}.${role === 'voiceover' ? 'wav' : 'mp4'}`);
    const content = Buffer.from(`${role}-owned-media`);
    await writeFile(path, content);
    assets.push({role, path, sizeBytes: content.length, sha256: digest(content), ready: true, verified: true});
  }
  const preflightPath = join(dir, 'preflight.json');
  await writeFile(preflightPath, JSON.stringify({version: 1, finalRenderAllowed: allowed, truthBoundary: allowed ? 'owned_media_verified' : 'preview_only', assets, receiptDigest: 'receipt-digest'}));
  const videoPath = join(dir, 'final.mp4');
  const gate = await buildFinalRenderGate({receiptPath: preflightPath, outputPath: videoPath});
  const gateReceiptPath = join(dir, 'gate.json');
  await writeFile(gateReceiptPath, JSON.stringify(gate));
  if (video !== null) await writeFile(videoPath, video);
  return {gateReceiptPath, videoPath, gate};
};

const validProbe = async () => ({width: 1080, height: 1920, durationSeconds: 89, fps: 30, codec: 'h264', audioCodec: 'aac'});

test('verifies only the exact gate-bound final video with matching media facts', async () => {
  const fixture = await makeFixture();
  const receipt = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(receipt.finalVideoVerified, true);
  assert.equal(receipt.gateDigestVerified, true);
  assert.equal(receipt.truthBoundary, 'final_video_file_verified');
  assert.deepEqual(receipt.errors, []);
  assert.match(receipt.videoSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateFinalRenderReceipt(receipt), []);
});

test('blocks a different video path even when its media facts match', async () => {
  const fixture = await makeFixture();
  const otherPath = `${fixture.videoPath}.other.mp4`;
  await writeFile(otherPath, 'different but plausible video');
  const receipt = await buildFinalRenderReceipt({gateReceiptPath: fixture.gateReceiptPath, videoPath: otherPath, probeVideo: validProbe});
  assert.equal(receipt.finalVideoVerified, false);
  assert.ok(receipt.errors.includes('video_path_not_bound_to_gate'));
  assert.ok(validateFinalRenderReceipt(receipt).includes('final_video_not_verified'));
});

test('blocks a mutated gate receipt', async () => {
  const fixture = await makeFixture();
  await writeFile(fixture.gateReceiptPath, JSON.stringify({...fixture.gate, outputPath: `${fixture.videoPath}.changed`}));
  const receipt = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(receipt.finalVideoVerified, false);
  assert.ok(receipt.errors.includes('render_gate_digest_mismatch'));
});

test('blocks missing, empty, unauthorized, or mismatched output', async () => {
  const unauthorized = await makeFixture({allowed: false});
  const unauthorizedReceipt = await buildFinalRenderReceipt({...unauthorized, probeVideo: validProbe});
  assert.ok(unauthorizedReceipt.errors.includes('render_gate_not_allowed'));

  const missing = await makeFixture({video: null});
  const missingReceipt = await buildFinalRenderReceipt({...missing, probeVideo: validProbe});
  assert.ok(missingReceipt.errors.includes('video_missing'));

  const empty = await makeFixture({video: ''});
  const emptyReceipt = await buildFinalRenderReceipt({...empty, probeVideo: validProbe});
  assert.ok(emptyReceipt.errors.includes('video_empty'));

  const mismatch = await makeFixture();
  const mismatchReceipt = await buildFinalRenderReceipt({
    ...mismatch,
    probeVideo: async () => ({width: 1920, height: 1080, durationSeconds: 70, fps: 25, codec: 'vp9', audioCodec: 'opus'}),
  });
  assert.deepEqual(mismatchReceipt.errors, [
    'unexpected_dimensions',
    'unexpected_duration',
    'unexpected_fps',
    'unexpected_video_codec',
    'unexpected_audio_codec',
  ]);
});

test('produces a deterministic receipt digest for identical evidence', async () => {
  const fixture = await makeFixture();
  const first = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  const second = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  assert.equal(first.receiptDigest, second.receiptDigest);
});

test('validator rejects tampered final video evidence', async () => {
  const fixture = await makeFixture();
  const receipt = await buildFinalRenderReceipt({...fixture, probeVideo: validProbe});
  const tamperedSha = {...receipt, videoSha256: 'f'.repeat(64)};
  assert.ok(validateFinalRenderReceipt(tamperedSha).includes('final_video_receipt_digest_mismatch'));
  const tamperedBoundary = {...receipt, truthBoundary: 'final_video_verification_blocked'};
  assert.ok(validateFinalRenderReceipt(tamperedBoundary).includes('final_video_truth_boundary_invalid'));
});

test('parses ffprobe JSON into normalized media facts', () => {
  const probe = parseFfprobeJson({
    streams: [
      {codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920, avg_frame_rate: '30/1'},
      {codec_type: 'audio', codec_name: 'aac'},
    ],
    format: {duration: '89.000000'},
  });
  assert.deepEqual(probe, {width: 1080, height: 1920, durationSeconds: 89, fps: 30, codec: 'h264', audioCodec: 'aac'});
});
