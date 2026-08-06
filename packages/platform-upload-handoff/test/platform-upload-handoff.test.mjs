import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlatformUploadHandoff,
  validatePlatformUploadHandoff,
} from '../src/index.mjs';

const approvedReview = {
  status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
  releasePreparationAllowed: true,
  reviewSha256: 'c'.repeat(64),
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

test('creates a human-only platform upload handoff from the official M10 review', () => {
  const result = buildPlatformUploadHandoff(baseInput);
  assert.equal(validatePlatformUploadHandoff(result), true);
  assert.equal(result.status, 'READY_FOR_HUMAN_PLATFORM_UPLOAD');
  assert.equal(result.platform, 'bilibili');
  assert.equal(result.qualityReviewDigest, approvedReview.reviewSha256);
  assert.equal(result.platformLoginRequired, true);
  assert.equal(result.humanAuthorizationRequired, true);
  assert.equal(result.platformLoginPerformed, false);
  assert.equal(result.uploadPerformed, false);
  assert.equal(result.publishActionPerformed, false);
  assert.equal(result.publicationAllowed, false);
  assert.match(result.handoffDigest, /^[a-f0-9]{64}$/);
});

test('retains compatibility with the legacy reviewDigest field', () => {
  const result = buildPlatformUploadHandoff({
    ...baseInput,
    qualityReview: {
      status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
      releasePreparationAllowed: true,
      reviewDigest: 'd'.repeat(64),
    },
  });
  assert.equal(result.qualityReviewDigest, 'd'.repeat(64));
  assert.equal(validatePlatformUploadHandoff(result), true);
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

test('rejects a tampered upload handoff', () => {
  const handoff = buildPlatformUploadHandoff(baseInput);
  assert.throws(
    () => validatePlatformUploadHandoff({...handoff, metadata: {...handoff.metadata, title: 'tampered'}}),
    /digest mismatch/,
  );
});
