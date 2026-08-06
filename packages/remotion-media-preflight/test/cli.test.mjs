import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const fixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-preflight-cli-'));
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

const run = ({design, limit, voice, output, verified = true}) => spawnSync(
  process.execPath,
  ['src/cli.mjs'],
  {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      REMOTION_DESIGN_RECORDING: design,
      REMOTION_BUILD_LIMIT_RECORDING: limit,
      REMOTION_VOICEOVER: voice,
      REMOTION_DESIGN_RECORDING_VERIFIED: String(verified),
      REMOTION_BUILD_LIMIT_RECORDING_VERIFIED: String(verified),
      REMOTION_VOICEOVER_VERIFIED: String(verified),
      REMOTION_PREFLIGHT_OUTPUT: output,
    },
  },
);

test('CLI writes an auditable receipt and exits zero only when final render is allowed', async () => {
  const {dir, design, limit, voice} = await fixture();
  const output = join(dir, 'receipt.json');
  const result = run({design, limit, voice, output});
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const receipt = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(summary.finalRenderAllowed, true);
  assert.equal(summary.truthBoundary, 'owned_media_verified');
  assert.equal(summary.receiptDigest, receipt.receiptDigest);
  assert.deepEqual(summary.blockedAssets, []);
});

test('CLI preserves preview-only truth boundary and exits two when human verification is absent', async () => {
  const {dir, design, limit, voice} = await fixture();
  const output = join(dir, 'blocked.json');
  const result = run({design, limit, voice, output, verified: false});
  assert.equal(result.status, 2, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.finalRenderAllowed, false);
  assert.equal(summary.truthBoundary, 'preview_only');
  assert.equal(summary.blockedAssets.length, 3);
  assert.equal(summary.blockedAssets.every((asset) => asset.errors.includes('human_verification_missing')), true);
});

test('CLI fails closed when required media paths are not configured', () => {
  const result = spawnSync(process.execPath, ['src/cli.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {...process.env, REMOTION_DESIGN_RECORDING: ''},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing_environment:REMOTION_DESIGN_RECORDING/);
});
