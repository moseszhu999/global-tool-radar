import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalRenderQualityReview, REQUIRED_CHECKS } from '../src/index.mjs';

const receipt = {
  status: 'READY_FOR_M10_REVIEW',
  outputSha256: 'a'.repeat(64),
  renderCommandManifestSha256: 'b'.repeat(64)
};

function allChecks(status = 'PASS') {
  return Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, { status, note: status === 'PASS' ? '' : 'manual review is still required' }]));
}

test('approves release preparation only after every check and explicit reviewer approval', () => {
  const result = createFinalRenderQualityReview({
    renderEvidenceReceipt: receipt,
    checks: allChecks(),
    reviewer: 'human-reviewer',
    reviewedAt: '2026-08-05T11:00:00Z',
    reviewerApproved: true
  });

  assert.equal(result.status, 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION');
  assert.equal(result.releasePreparationAllowed, true);
  assert.equal(result.platformLoginPerformed, false);
  assert.equal(result.uploadPerformed, false);
  assert.equal(result.publicationAllowed, false);
  assert.equal(result.reviewSha256.length, 64);
});

test('blocks when a quality check fails', () => {
  const checks = allChecks();
  checks.audioVideoSync = { status: 'FAIL', note: 'voice leads picture at 00:18' };
  const result = createFinalRenderQualityReview({
    renderEvidenceReceipt: receipt,
    checks,
    reviewer: 'human-reviewer',
    reviewedAt: '2026-08-05T11:00:00Z',
    reviewerApproved: true
  });

  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.failedChecks, ['audioVideoSync']);
  assert.equal(result.releasePreparationAllowed, false);
  assert.equal(result.publicationAllowed, false);
});

test('blocks unreviewed checks or missing human approval', () => {
  const checks = allChecks();
  checks.privacyAndRights = { status: 'NOT_REVIEWED', note: 'rights confirmation is still pending' };
  const result = createFinalRenderQualityReview({
    renderEvidenceReceipt: receipt,
    checks,
    reviewer: 'human-reviewer',
    reviewedAt: '2026-08-05T11:00:00Z',
    reviewerApproved: false
  });

  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.pendingChecks, ['privacyAndRights']);
  assert.equal(result.releasePreparationAllowed, false);
});

test('blocks before a real final-render evidence receipt exists', () => {
  const result = createFinalRenderQualityReview({
    renderEvidenceReceipt: { status: 'BLOCKED' },
    checks: allChecks()
  });

  assert.deepEqual(result, {
    schemaVersion: 'toolradar.final-render-quality-review.v1',
    status: 'BLOCKED',
    reason: 'render evidence receipt is not ready for M10 review',
    publicationAllowed: false,
    humanApprovalRequired: true
  });
});
