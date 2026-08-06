import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildRemotionMediaPreflight, writePreflightReceipt} from '../src/index.mjs';

const fixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-media-'));
  const design = join(dir, 'design.mp4');
  const limit = join(dir, 'limit.mov');
  const voice = join(dir, 'voice.wav');
  await Promise.all([
    writeFile(design, 'owned-design-recording'),
    writeFile(limit, 'owned-build-limit-recording'),
    writeFile(voice, 'owned-voiceover'),
  ]);
  return {dir, design, limit, voice};
};

test('permits final render only when all owned media exists and is human verified', async () => {
  const {design, limit, voice} = await fixture();
  const receipt = await buildRemotionMediaPreflight({
    designRecording: design,
    buildLimitRecording: limit,
    voiceover: voice,
    designRecordingVerified: true,
    buildLimitRecordingVerified: true,
    voiceoverVerified: true,
  });
  assert.equal(receipt.readyForFinalRender, true);
  assert.equal(receipt.finalRenderAllowed, true);
  assert.equal(receipt.truthBoundary, 'owned_media_verified');
  assert.equal(receipt.assets.every((asset) => asset.sha256?.length === 64), true);
});

test('missing human verification remains preview-only even when files exist', async () => {
  const {design, limit, voice} = await fixture();
  const receipt = await buildRemotionMediaPreflight({
    designRecording: design,
    buildLimitRecording: limit,
    voiceover: voice,
    designRecordingVerified: true,
    buildLimitRecordingVerified: false,
    voiceoverVerified: true,
  });
  assert.equal(receipt.finalRenderAllowed, false);
  assert.equal(receipt.truthBoundary, 'preview_only');
  assert.deepEqual(receipt.assets[1].errors, ['human_verification_missing']);
});

test('missing, empty, and unsupported files are rejected explicitly', async () => {
  const {dir, design, voice} = await fixture();
  const empty = join(dir, 'limit.mp4');
  await writeFile(empty, '');
  const receipt = await buildRemotionMediaPreflight({
    designRecording: design.replace('.mp4', '.exe'),
    buildLimitRecording: empty,
    voiceover: voice,
    designRecordingVerified: true,
    buildLimitRecordingVerified: true,
    voiceoverVerified: true,
  });
  assert.equal(receipt.finalRenderAllowed, false);
  assert.deepEqual(receipt.assets[0].errors, ['unsupported_extension:.exe', 'file_missing']);
  assert.deepEqual(receipt.assets[1].errors, ['empty_file']);
});

test('receipt digest is deterministic and receipt can be written for evidence', async () => {
  const {dir, design, limit, voice} = await fixture();
  const input = {
    designRecording: design,
    buildLimitRecording: limit,
    voiceover: voice,
    designRecordingVerified: true,
    buildLimitRecordingVerified: true,
    voiceoverVerified: true,
  };
  const first = await buildRemotionMediaPreflight(input);
  const second = await buildRemotionMediaPreflight(input);
  assert.equal(first.receiptDigest, second.receiptDigest);
  const output = join(dir, 'evidence', 'receipt.json');
  const written = await writePreflightReceipt({input, output});
  assert.equal(written.receiptDigest, first.receiptDigest);
});
