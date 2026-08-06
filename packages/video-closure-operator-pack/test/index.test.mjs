import assert from 'node:assert/strict';
import test from 'node:test';
import {buildVideoClosureOperatorPack, validateVideoClosureOperatorPack} from '../src/index.mjs';

const ledger = (stage = 'STORYBOARD_READY', status = 'BLOCKED') => ({
  project: {
    schemaVersion: 'toolradar.video-project.v1',
    projectId: 'video-project:aw_nlbkzvyy:v1',
    projectDigest: 'a'.repeat(64),
    stage,
    status,
  },
});

const build = (stage, status) => buildVideoClosureOperatorPack({
  projectLedger: ledger(stage, status),
  operator: 'operator@example',
  generatedAt: '2026-08-07T00:00:00.000Z',
});

test('builds a deterministic M9-first human closure pack from the blocked project', () => {
  const pack = build('STORYBOARD_READY', 'BLOCKED');
  assert.equal(validateVideoClosureOperatorPack(pack), true);
  assert.equal(pack.nextHumanAction, 'M9_CAPTURE_AND_VERIFY_OWNED_MEDIA');
  assert.equal(pack.status, 'HUMAN_ACTION_REQUIRED');
  assert.deepEqual(pack.checkpoints.map((item) => item.milestone), ['M9', 'M10', 'M11', 'M12']);
  assert.equal(pack.checkpoints[0].requiredInputs.length, 3);
});

test('maps every downstream project stage to the correct next human action', () => {
  const cases = [
    ['RENDER_COMPLETED', 'ACTIVE', 'M10_COMPLETE_HUMAN_QUALITY_REVIEW'],
    ['RELEASE_READY', 'ACTIVE', 'M11_HUMAN_LOGIN_UPLOAD_AND_PUBLISH'],
    ['PUBLISHED', 'ACTIVE', 'M12_CAPTURE_TWO_PLATFORM_UI_OBSERVATIONS'],
    ['FEEDBACK_READY', 'COMPLETED', 'CLOSED'],
  ];
  for (const [stage, status, expected] of cases) {
    const pack = build(stage, status);
    assert.equal(pack.nextHumanAction, expected);
    assert.equal(validateVideoClosureOperatorPack(pack), true);
  }
});

test('never claims real media, render, quality, publication, API verification or metrics', () => {
  const pack = build('STORYBOARD_READY', 'BLOCKED');
  assert.deepEqual(new Set(Object.values(pack.truthBoundary)), new Set([false]));
  assert.equal(pack.blankReceipts.finalMp4Sha256, null);
  assert.equal(pack.blankReceipts.platformContentId, null);
  assert.equal(pack.blankReceipts.publicHttpsUrl, null);
});

test('requires M12 observations to be chronological and cumulative by contract', () => {
  const pack = build('PUBLISHED', 'ACTIVE');
  const m12 = pack.checkpoints.find((item) => item.milestone === 'M12');
  assert.ok(m12.seriesRules.includes('at least two observations'));
  assert.ok(m12.seriesRules.includes('timestamps strictly increase'));
  assert.ok(m12.seriesRules.includes('cumulative metrics never decrease'));
  assert.equal(m12.causalClaimsAllowed, false);
  assert.equal(m12.automaticRecommendationsAllowed, false);
});

test('rejects unsupported project stages and malformed project digests', () => {
  assert.throws(() => buildVideoClosureOperatorPack({
    projectLedger: ledger('SCRIPT_READY', 'ACTIVE'),
    operator: 'operator@example',
    generatedAt: '2026-08-07T00:00:00.000Z',
  }), /unsupported video project stage/);
  assert.throws(() => buildVideoClosureOperatorPack({
    projectLedger: {...ledger(), project: {...ledger().project, projectDigest: 'bad'}},
    operator: 'operator@example',
    generatedAt: '2026-08-07T00:00:00.000Z',
  }), /project digest is invalid/);
});

test('rejects tampered packs and nonblank human receipts', () => {
  const pack = build('STORYBOARD_READY', 'BLOCKED');
  assert.throws(() => validateVideoClosureOperatorPack({...pack, nextHumanAction: 'CLOSED'}), /digest mismatch/);
  assert.throws(() => validateVideoClosureOperatorPack({
    ...pack,
    blankReceipts: {...pack.blankReceipts, publicationConfirmed: true},
  }), /digest mismatch|must be blank/);
});
