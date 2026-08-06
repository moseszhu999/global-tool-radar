import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPlatformUploadHandoff} from '../../platform-upload-handoff/src/index.mjs';
import {
  bindPlatformPublicationReceipt,
  validateBoundPublicationReceipt,
} from '../src/index.mjs';

const sha = 'a'.repeat(64);
const handoff = buildPlatformUploadHandoff({
  qualityReview: {
    status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
    releasePreparationAllowed: true,
    reviewSha256: 'b'.repeat(64),
  },
  platform: 'bilibili',
  asset: {
    path: 'out/final.mp4',
    sha256: sha,
    durationSeconds: 89,
    width: 1080,
    height: 1920,
  },
  metadata: {
    title: 'ToolRadar Replit Design 实测',
    description: '真实人工发布回执绑定测试。',
    coverPath: 'covers/bilibili.png',
    tags: ['AI工具', 'Replit'],
  },
});

function validReceipt() {
  return {
    platform: 'bilibili',
    uploadHandoffDigest: handoff.handoffDigest,
    finalVideoSha256: sha,
    platformVideoId: 'BV1REAL12345',
    publicUrl: 'https://www.bilibili.com/video/BV1REAL12345',
    publishedAt: '2026-08-05T14:00:00.000Z',
    capturedAt: '2026-08-05T14:05:00.000Z',
    operator: 'authorized-human-operator',
    operatorConfirmedPublication: true,
    platformLoginPerformed: true,
    uploadPerformed: true,
    publishActionPerformed: true,
  };
}

test('confirms and validates a source-bound real publication receipt', () => {
  const result = bindPlatformPublicationReceipt({uploadHandoff: handoff, publicationReceipt: validReceipt()});
  assert.equal(validateBoundPublicationReceipt(result), true);
  assert.equal(result.status, 'PUBLICATION_CONFIRMED');
  assert.equal(result.publicationConfirmed, true);
  assert.equal(result.analyticsIntakeAllowed, true);
  assert.equal(result.platformApiVerified, false);
  assert.equal(result.metricsObserved, false);
  assert.match(result.receiptDigest, /^[a-f0-9]{64}$/);
});

test('blocks a receipt that does not bind to the exact upload handoff', () => {
  const receipt = validReceipt();
  receipt.uploadHandoffDigest = 'different-handoff';
  const result = bindPlatformPublicationReceipt({uploadHandoff: handoff, publicationReceipt: receipt});
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.publicationConfirmed, false);
  assert.ok(result.reasons.includes('upload handoff digest mismatch'));
});

test('blocks an unconfirmed or incomplete publication action', () => {
  const receipt = validReceipt();
  receipt.operatorConfirmedPublication = false;
  receipt.publishActionPerformed = false;
  const result = bindPlatformPublicationReceipt({uploadHandoff: handoff, publicationReceipt: receipt});
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.analyticsIntakeAllowed, false);
  assert.ok(result.reasons.includes('human publication confirmation is required'));
  assert.ok(result.reasons.includes('publish action was not confirmed'));
});

test('blocks a receipt captured before publication', () => {
  const receipt = validReceipt();
  receipt.capturedAt = '2026-08-05T13:59:59.000Z';
  const result = bindPlatformPublicationReceipt({uploadHandoff: handoff, publicationReceipt: receipt});
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasons.includes('capture timestamp precedes publication timestamp'));
});

test('blocks an invalid or tampered upload handoff', () => {
  const tampered = structuredClone(handoff);
  tampered.metadata.title = 'tampered';
  const result = bindPlatformPublicationReceipt({uploadHandoff: tampered, publicationReceipt: validReceipt()});
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.reasons, ['upload handoff is not ready or valid']);
});

test('rejects a tampered bound receipt', () => {
  const result = bindPlatformPublicationReceipt({uploadHandoff: handoff, publicationReceipt: validReceipt()});
  assert.throws(
    () => validateBoundPublicationReceipt({...result, publicUrl: 'https://example.com/tampered'}),
    /digest mismatch/,
  );
});
