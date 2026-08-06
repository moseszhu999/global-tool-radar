import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createQualityReviewPack,
  qualityReviewCheckIds,
  recordQualityDecision,
} from '../../final-video-quality-review-pack/src/index.mjs';
import {
  applyVideoProjectEvent,
  createVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';
import {
  applyProjectQualityDecision,
  prepareQualityReviewPackFromProject,
  validateQualityApprovalReceipt,
} from '../src/index.mjs';

const sha = (character) => character.repeat(64);
const times = [
  '2026-08-06T10:00:00.000Z',
  '2026-08-06T10:01:00.000Z',
  '2026-08-06T10:02:00.000Z',
  '2026-08-06T10:03:00.000Z',
  '2026-08-06T10:04:00.000Z',
  '2026-08-06T10:05:00.000Z',
  '2026-08-06T10:06:00.000Z',
];

const artifact = (type, digest, overrides = {}) => ({
  type,
  schemaVersion: `test.${type}.v1`,
  artifactId: `${type}:${digest.slice(0, 8)}`,
  digest,
  status: 'READY',
  truthBoundary: 'test_boundary',
  claims: {},
  ...overrides,
});

const makeRenderCompletedProject = () => {
  let project = createVideoProject({
    projectId: 'video-project:quality-test:v1',
    sourceSignal: {id: 'signal:1', title: 'Quality test', platform: 'youtube'},
    owner: 'video-op',
    createdAt: '2026-08-06T09:59:00.000Z',
  });
  const events = [
    {type: 'SELECT_CANDIDATE'},
    {type: 'ATTACH_RESEARCH', artifact: artifact('topic_brief', sha('1'))},
    {type: 'ATTACH_SCRIPT', artifact: artifact('production_case', sha('2'))},
    {type: 'ATTACH_STORYBOARD', artifact: artifact('storyboard_package', sha('3'))},
    {type: 'VERIFY_ASSETS', artifact: artifact('owned_media_preflight', sha('4'), {
      truthBoundary: 'owned_media_verified',
      claims: {finalRenderAllowed: true},
    })},
    {type: 'AUTHORIZE_RENDER', artifact: artifact('final_render_gate', sha('5'), {
      truthBoundary: 'render_execution_authorized',
      claims: {finalRenderAllowed: true},
    })},
    {type: 'COMPLETE_RENDER', artifact: artifact('mac_remotion_render_run', sha('6'), {
      status: 'COMPLETED',
      truthBoundary: 'runner_and_final_video_verified',
      claims: {
        realSubmissionPerformed: true,
        finalVideoClaimAllowed: true,
        finalVideoReceiptDigest: sha('a'),
        finalVideoSha256: sha('b'),
        gateDigest: sha('c'),
        outputPath: 'out/final.mp4',
        renderProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 89},
      },
    })},
  ];
  events.forEach((event, index) => {
    project = applyVideoProjectEvent(project, {
      eventId: `event-${index + 1}`,
      actor: 'test-operator',
      occurredAt: times[index],
      ...event,
    });
  });
  return project;
};

const passDecisions = () => qualityReviewCheckIds.map((id) => ({id, verdict: 'PASS'}));

const approvedEnvelope = (pack) => recordQualityDecision(pack, {
  reviewer: 'human-reviewer',
  reviewedAt: '2026-08-06T11:00:00.000Z',
  reviewerApproved: true,
  decisions: passDecisions(),
});

test('prepares the ten-check pack directly from render-completion evidence', () => {
  const project = makeRenderCompletedProject();
  const pack = prepareQualityReviewPackFromProject({project, createdAt: '2026-08-06T10:30:00.000Z'});
  assert.equal(pack.projectId, project.projectId);
  assert.equal(pack.finalVideo.receiptDigest, sha('a'));
  assert.equal(pack.finalVideo.sha256, sha('b'));
  assert.equal(pack.finalVideo.renderCommandManifestSha256, sha('c'));
  assert.equal(pack.finalVideo.path, 'out/final.mp4');
  assert.equal(pack.checks.length, 10);
});

test('advances only the official approved M10 review to QUALITY_APPROVED', () => {
  const project = makeRenderCompletedProject();
  const pack = prepareQualityReviewPackFromProject({project, createdAt: '2026-08-06T10:30:00.000Z'});
  const receipt = applyProjectQualityDecision({
    project,
    reviewPack: pack,
    qualityDecisionEnvelope: approvedEnvelope(pack),
    actor: 'quality-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  assert.equal(validateQualityApprovalReceipt(receipt), true);
  assert.equal(receipt.status, 'QUALITY_APPROVED');
  assert.equal(receipt.updatedProject.stage, 'QUALITY_APPROVED');
  assert.equal(receipt.updatedProject.status, 'ACTIVE');
  assert.equal(receipt.updatedProject.nextEvent, 'PREPARE_RELEASE');
  assert.equal(receipt.updatedProject.events.length, 8);
  assert.equal(receipt.updatedProject.artifacts.length, 7);
  assert.equal(receipt.releasePreparationAllowed, true);
  assert.equal(receipt.publicationAllowed, false);
});

test('keeps the project unchanged when one granular check fails', () => {
  const project = makeRenderCompletedProject();
  const pack = prepareQualityReviewPackFromProject({project, createdAt: '2026-08-06T10:30:00.000Z'});
  const decisions = passDecisions();
  decisions[0] = {id: decisions[0].id, verdict: 'FAIL', note: 'black frame found during full playback'};
  const envelope = recordQualityDecision(pack, {
    reviewer: 'human-reviewer',
    reviewedAt: '2026-08-06T11:00:00.000Z',
    reviewerApproved: true,
    decisions,
  });
  const receipt = applyProjectQualityDecision({
    project,
    reviewPack: pack,
    qualityDecisionEnvelope: envelope,
    actor: 'quality-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  assert.equal(validateQualityApprovalReceipt(receipt), true);
  assert.equal(receipt.status, 'QUALITY_APPROVAL_BLOCKED');
  assert.ok(receipt.errors.includes('official_quality_review_not_approved'));
  assert.equal(receipt.projectUnchanged, true);
  assert.equal(receipt.releasePreparationAllowed, false);
});

test('blocks a valid review pack for a different final video digest', () => {
  const project = makeRenderCompletedProject();
  const pack = createQualityReviewPack({
    projectId: project.projectId,
    finalVideoReceiptDigest: sha('d'),
    finalVideoSha256: sha('e'),
    finalVideoPath: 'out/other.mp4',
    renderCommandManifestSha256: sha('f'),
    expectedProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 89},
    createdAt: '2026-08-06T10:30:00.000Z',
  });
  const receipt = applyProjectQualityDecision({
    project,
    reviewPack: pack,
    qualityDecisionEnvelope: approvedEnvelope(pack),
    actor: 'quality-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  assert.equal(receipt.status, 'QUALITY_APPROVAL_BLOCKED');
  assert.ok(receipt.errors.includes('review_pack_final_video_receipt_mismatch'));
  assert.ok(receipt.errors.includes('review_pack_final_video_sha256_mismatch'));
  assert.ok(receipt.errors.includes('review_pack_render_manifest_mismatch'));
});

test('rejects preparation before render completion', () => {
  const completed = makeRenderCompletedProject();
  const beforeCompletion = {...completed, stage: 'RENDER_AUTHORIZED', nextEvent: 'COMPLETE_RENDER'};
  assert.throws(() => prepareQualityReviewPackFromProject({project: beforeCompletion}), /project digest mismatch|requires RENDER_COMPLETED/);
});

test('rejects a tampered quality approval receipt', () => {
  const project = makeRenderCompletedProject();
  const pack = prepareQualityReviewPackFromProject({project, createdAt: '2026-08-06T10:30:00.000Z'});
  const receipt = applyProjectQualityDecision({
    project,
    reviewPack: pack,
    qualityDecisionEnvelope: approvedEnvelope(pack),
    actor: 'quality-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  const tampered = {...receipt, publicationAllowed: true};
  assert.throws(() => validateQualityApprovalReceipt(tampered), /digest mismatch/);
});
