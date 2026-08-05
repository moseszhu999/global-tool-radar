import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createFinalRenderEvidenceReceipt } from '../src/index.mjs';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-render-'));
  const outputPath = join(dir, 'final.mp4');
  const bytes = Buffer.from('real-render-placeholder-for-contract-test');
  await writeFile(outputPath, bytes);
  return {
    outputPath,
    expectedSha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

test('accepts a locally verified render only for M10 review', async () => {
  const file = await fixture();
  const receipt = await createFinalRenderEvidenceReceipt({
    ...file,
    renderExecutionPerformed: true,
    renderCommandManifestId: 'render-command-manifest:test',
    durationSeconds: 58.4,
    width: 1080,
    height: 1920,
    audioSampleRateHz: 48000,
    renderedAt: '2026-08-05T09:00:00Z',
    rendererIdentity: 'local-human-operator',
  });

  assert.equal(receipt.status, 'READY_FOR_M10_REVIEW');
  assert.equal(receipt.qualityReviewAllowed, true);
  assert.equal(receipt.humanReviewRequired, true);
  assert.equal(receipt.publicationAllowed, false);
  assert.equal(receipt.platformUploadPerformed, false);
});

test('blocks when render execution is not confirmed', async () => {
  const file = await fixture();
  const receipt = await createFinalRenderEvidenceReceipt({
    ...file,
    renderExecutionPerformed: false,
    renderCommandManifestId: 'render-command-manifest:test',
    durationSeconds: 58,
    width: 1080,
    height: 1920,
    audioSampleRateHz: 48000,
  });
  assert.equal(receipt.status, 'BLOCKED');
  assert.equal(receipt.reason, 'render_not_confirmed');
});

test('blocks a digest mismatch and never authorizes publication', async () => {
  const file = await fixture();
  const receipt = await createFinalRenderEvidenceReceipt({
    ...file,
    expectedSha256: '0'.repeat(64),
    renderExecutionPerformed: true,
    renderCommandManifestId: 'render-command-manifest:test',
    durationSeconds: 58,
    width: 1080,
    height: 1920,
    audioSampleRateHz: 48000,
  });
  assert.equal(receipt.status, 'BLOCKED');
  assert.equal(receipt.reason, 'output_digest_mismatch');
  assert.equal(receipt.publicationAllowed, false);
  assert.equal(receipt.platformUploadPerformed, false);
});
