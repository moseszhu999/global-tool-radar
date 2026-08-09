import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createQualityReviewPack,
  officialQualityCheckMap,
  qualityReviewCheckIds,
  recordQualityDecision,
  validateQualityDecisionEnvelope,
} from '../src/index.mjs';

const digestA = 'a'.repeat(64);
const digestB = 'b'.repeat(64);
const digestC = 'c'.repeat(64);
const base = {
  projectId: 'video-project:aw_nlbkzvyy:v1',
  finalVideoReceiptDigest: digestA,
  finalVideoSha256: digestB,
  finalVideoPath: 'apps/remotion-video/out/replit-design-final.mp4',
  renderCommandManifestSha256: digestC,
  expectedProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 89},
  createdAt: '2026-08-06T13:00:00.000Z',
};

const socialNative = {
  ...base,
  projectId: 'video-project:toolradar-social-native:v1',
  finalVideoPath: 'apps/remotion-video/out/toolradar-explainer-19s-production-polish-alpha-v2.mp4',
  expectedProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 19.2},
  createdAt: '2026-08-09T08:50:59.000Z',
};

const allDecisions = (verdict = 'PASS') => qualityReviewCheckIds.map((id) => ({
  id,
  verdict,
  note: verdict === 'PASS' ? undefined : `${id} requires a manual correction`,
}));

test('creates a fail-closed ten-check task pack without a parallel approval truth', () => {
  const pack = createQualityReviewPack(base);
  assert.equal(pack.schemaVersion, 'toolradar.final-video-quality-review-pack.v1');
  assert.equal(pack.truthBoundary, 'granular_human_review_tasks_prepared');
  assert.equal(pack.checks.length, 10);
  assert.deepEqual(pack.checks.map((item) => item.id), qualityReviewCheckIds);
  assert.deepEqual(pack.checks[0].allowedVerdicts, ['PASS', 'FAIL', 'NOT_REVIEWED']);
  assert.equal(pack.officialReviewSchema, 'toolradar.final-render-quality-review.v1');
  assert.equal(pack.officialReviewCreated, false);
  assert.equal(pack.publicationAllowed, false);
  assert.equal('releaseAllowed' in pack, false);
  assert.match(pack.digest, /^[a-f0-9]{64}$/u);
});

test('keeps the legacy 89-second vertical profile valid', () => {
  const pack = createQualityReviewPack(base);
  assert.equal(pack.finalVideo.expectedProfile.durationSeconds, 89);
});

test('accepts the current 19.2-second social-native vertical profile', () => {
  const pack = createQualityReviewPack(socialNative);
  assert.equal(pack.finalVideo.expectedProfile.durationSeconds, 19.2);
  assert.equal(pack.finalVideo.expectedProfile.width, 1080);
  assert.equal(pack.finalVideo.expectedProfile.height, 1920);
  assert.equal(pack.finalVideo.expectedProfile.fps, 30);
  assert.doesNotMatch(pack.checks.find((item) => item.id === 'owned_media_match').instruction, /两段|Replit/u);
});

test('identical evidence produces an identical pack digest', () => {
  assert.equal(createQualityReviewPack(base).digest, createQualityReviewPack(base).digest);
  assert.equal(createQualityReviewPack(socialNative).digest, createQualityReviewPack(socialNative).digest);
});

test('rejects out-of-bound render profiles and missing manifest evidence', () => {
  assert.throws(() => createQualityReviewPack({...base, expectedProfile: {...base.expectedProfile, fps: 24}}), /bounded/u);
  assert.throws(() => createQualityReviewPack({...base, expectedProfile: {...base.expectedProfile, width: 1920, height: 1080}}), /bounded/u);
  assert.throws(() => createQualityReviewPack({...base, expectedProfile: {...base.expectedProfile, durationSeconds: 4.9}}), /bounded/u);
  assert.throws(() => createQualityReviewPack({...base, expectedProfile: {...base.expectedProfile, durationSeconds: 180.1}}), /bounded/u);
  assert.throws(() => createQualityReviewPack({...base, renderCommandManifestSha256: null}), /renderCommandManifestSha256/u);
});

test('all PASS verdicts and explicit approval produce the official M10 review', () => {
  const pack = createQualityReviewPack(base);
  const envelope = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    reviewerApproved: true,
    decisions: allDecisions(),
  });
  assert.equal(validateQualityDecisionEnvelope(envelope, pack), true);
  assert.equal(envelope.schemaVersion, 'toolradar.final-video-quality-review-adapter.v1');
  assert.equal(envelope.officialReview.schemaVersion, 'toolradar.final-render-quality-review.v1');
  assert.equal(envelope.officialReview.status, 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION');
  assert.equal(envelope.officialReview.releasePreparationAllowed, true);
  assert.equal(envelope.officialReview.publicationAllowed, false);
  assert.equal(envelope.finalVideoSha256, digestB);
  assert.equal('releaseAllowed' in envelope, false);
});

test('the current social-native profile can reach the same official review adapter', () => {
  const pack = createQualityReviewPack(socialNative);
  const envelope = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-09T09:00:00.000Z',
    reviewerApproved: true,
    decisions: allDecisions(),
  });
  assert.equal(validateQualityDecisionEnvelope(envelope, pack), true);
  assert.equal(envelope.officialReview.status, 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION');
  assert.equal(envelope.publicationAllowed, false);
});

test('a granular visual failure maps into the official visual continuity failure', () => {
  const pack = createQualityReviewPack(base);
  const decisions = allDecisions();
  decisions.find((item) => item.id === 'visual_integrity').verdict = 'FAIL';
  decisions.find((item) => item.id === 'visual_integrity').note = 'black frame found at 00:18';
  const envelope = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    reviewerApproved: true,
    decisions,
  });
  assert.equal(envelope.officialReview.status, 'BLOCKED');
  assert.ok(envelope.officialReview.failedChecks.includes('visualContinuity'));
  assert.equal(envelope.officialReview.releasePreparationAllowed, false);
});

test('a missing granular verdict becomes NOT_REVIEWED and blocks the official privacy gate', () => {
  const pack = createQualityReviewPack(base);
  const decisions = allDecisions().filter((item) => item.id !== 'privacy_redaction');
  const envelope = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    reviewerApproved: true,
    decisions,
  });
  assert.equal(envelope.granularChecks.find((item) => item.id === 'privacy_redaction').verdict, 'NOT_REVIEWED');
  assert.ok(envelope.officialReview.pendingChecks.includes('privacyAndRights'));
  assert.equal(envelope.officialReview.status, 'BLOCKED');
});

test('all granular checks still remain blocked without explicit reviewer approval', () => {
  const envelope = recordQualityDecision(createQualityReviewPack(base), {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    reviewerApproved: false,
    decisions: allDecisions(),
  });
  assert.equal(envelope.officialReview.status, 'BLOCKED');
  assert.equal(envelope.officialReview.releasePreparationAllowed, false);
  assert.deepEqual(envelope.officialReview.failedChecks, []);
  assert.deepEqual(envelope.officialReview.pendingChecks, []);
});

test('all seven official checks have explicit granular mappings', () => {
  assert.deepEqual(Object.keys(officialQualityCheckMap), [
    'visualContinuity',
    'textLegibility',
    'audioClarity',
    'audioVideoSync',
    'brandAndClaimsAccuracy',
    'privacyAndRights',
    'platformSafeFraming',
  ]);
});

test('rejects a tampered decision envelope', () => {
  const pack = createQualityReviewPack(base);
  const envelope = recordQualityDecision(pack, {
    reviewer: 'Aaron',
    reviewedAt: '2026-08-06T13:30:00.000Z',
    reviewerApproved: true,
    decisions: allDecisions(),
  });
  const tampered = {...envelope, finalVideoSha256: 'd'.repeat(64)};
  assert.throws(() => validateQualityDecisionEnvelope(tampered, pack), /digest mismatch/u);
});
