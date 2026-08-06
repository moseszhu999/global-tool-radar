import assert from 'node:assert/strict';
import test from 'node:test';
import { createQualityReviewPack, qualityReviewCheckIds, recordQualityDecision } from '../src/index.mjs';

const digestA = 'a'.repeat(64);
const digestB = 'b'.repeat(64);
const base = {
  projectId: 'video-project:aw_nlbkzvyy:v1',
  finalVideoReceiptDigest: digestA,
  finalVideoSha256: digestB,
  finalVideoPath: 'apps/remotion-video/out/replit-design-final.mp4',
  expectedProfile: { width: 1080, height: 1920, fps: 30, durationSeconds: 89 },
  createdAt: '2026-08-06T13:00:00.000Z'
};

test('creates a fail-closed ten-check human review pack', () => {
  const pack = createQualityReviewPack(base);
  assert.equal(pack.schema, 'toolradar.final-video-quality-review-pack.v1');
  assert.equal(pack.checks.length, 10);
  assert.deepEqual(pack.checks.map((item) => item.id), qualityReviewCheckIds);
  assert.equal(pack.approval.qualityApproved, false);
  assert.equal(pack.approval.releaseAllowed, false);
  assert.match(pack.digest, /^[a-f0-9]{64}$/u);
});

test('identical evidence produces an identical pack digest', () => {
  assert.equal(createQualityReviewPack(base).digest, createQualityReviewPack(base).digest);
});

test('rejects non-canonical render profiles', () => {
  assert.throws(() => createQualityReviewPack({ ...base, expectedProfile: { ...base.expectedProfile, fps: 24 } }), /canonical/u);
});

test('all PASS verdicts produce a human approval receipt', () => {
  const pack = createQualityReviewPack(base);
  const receipt = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    decisions: qualityReviewCheckIds.map((id) => ({ id, verdict: 'PASS' }))
  });
  assert.equal(receipt.approval.qualityApproved, true);
  assert.equal(receipt.approval.releaseAllowed, true);
  assert.equal(receipt.approval.decision, 'APPROVE');
  assert.equal(receipt.finalVideoSha256, digestB);
});

test('one FAIL verdict blocks release', () => {
  const pack = createQualityReviewPack(base);
  const receipt = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    decisions: qualityReviewCheckIds.map((id, index) => ({ id, verdict: index === 0 ? 'FAIL' : 'PASS', note: index === 0 ? 'black frame found' : undefined }))
  });
  assert.equal(receipt.approval.qualityApproved, false);
  assert.equal(receipt.approval.releaseAllowed, false);
  assert.equal(receipt.approval.decision, 'REJECT');
});

test('missing a human verdict fails closed', () => {
  const pack = createQualityReviewPack(base);
  assert.throws(() => recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    decisions: qualityReviewCheckIds.slice(0, 9).map((id) => ({ id, verdict: 'PASS' }))
  }), /missing valid verdict/u);
});
