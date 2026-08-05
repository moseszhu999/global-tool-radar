import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlatformUploadHandoff } from '../src/index.mjs';

const approvedReview = {
  status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
  releasePreparationAllowed: true,
  reviewDigest: 'review-digest-001',
};

const baseInput = {
  qualityReview: approvedReview,
  platform: 'bilibili',
  asset: {
    path: 'dist/final/toolradar-final.mp4',
    sha256: 'a'.repeat(64),
    durationSeconds: 58.2,
    width: 1920,
    height: 1080,
  },
  metadata: {
    title: 'ToolRadar 本周 AI 工具观察',
    description: '基于真实素材完成的 ToolRadar 视频。',
    coverPath: 'dist/final/toolradar-cover.png',
    tags: ['AI工具', '效率工具'],
  },
};

test('creates a human-only platform upload handoff from an approved quality review', () => {
  const result = buildPlatformUploadHandoff(baseInput);
  assert.equal(result.status, 'READY_FOR_HUMAN_PLATFORM_UPLOAD');
  assert.equal(result.platform, 'bilibili');
  assert.equal(result.platformLoginRequired, true);
  assert.equal(result.humanAuthorizationRequired, true);
  assert.equal(result.platformLoginPerformed, false);
  assert.equal(result.uploadPerformed, false);
  assert.equal(result.publishActionPerformed, false);
  assert.equal(result.publicationAllowed, false);
  assert.match(result.handoffDigest, /^[a-f0-9]{64}$/);
});

test('blocks when final quality review has not approved release preparation', () => {
  const result = buildPlatformUploadHandoff({
    ...baseInput,
    qualityReview: { status: 'QUALITY_REVIEW_REQUIRED', releasePreparationAllowed: false },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.uploadPerformed, false);
  assert.equal(result.publicationAllowed, false);
});

test('rejects unsupported platforms', () => {
  assert.throws(() => buildPlatformUploadHandoff({ ...baseInput, platform: 'unknown' }), /unsupported platform/);
});

test('blocks invalid output media facts', () => {
  const result = buildPlatformUploadHandoff({
    ...baseInput,
    asset: { ...baseInput.asset, durationSeconds: 0, width: 0 },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.reasons, ['invalid video dimensions', 'invalid video duration']);
});

test('produces a deterministic digest', () => {
  const first = buildPlatformUploadHandoff(baseInput);
  const second = buildPlatformUploadHandoff(structuredClone(baseInput));
  assert.equal(first.handoffDigest, second.handoffDigest);
});
