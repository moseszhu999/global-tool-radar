import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVideoProjectEvent,
  createVideoProject,
  summarizeVideoProject,
  validateVideoProject,
} from '../src/index.mjs';

const hash = (character) => character.repeat(64);
const baseProject = () => createVideoProject({
  projectId: 'video-project:replit-design:v1',
  owner: 'moseszhu999',
  createdAt: '2026-08-06T12:00:00Z',
  sourceSignal: {
    id: 'aw_NlbKzVyY',
    title: 'Introducing Replit Design',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=aw_NlbKzVyY',
  },
});

const event = (sequence, type, artifact = null, reason = null) => ({
  eventId: `event-${sequence}`,
  type,
  actor: 'operator@example.test',
  occurredAt: `2026-08-06T12:${String(sequence).padStart(2, '0')}:00Z`,
  reason,
  artifact,
});

const artifact = (type, character, overrides = {}) => ({
  type,
  schemaVersion: `toolradar.${type}.v1`,
  artifactId: `${type}:1`,
  digest: hash(character),
  status: null,
  truthBoundary: null,
  claims: {},
  ...overrides,
});

const advanceToRenderAuthorized = () => {
  let project = baseProject();
  project = applyVideoProjectEvent(project, event(1, 'SELECT_CANDIDATE', null, 'Matches the AI-tool editorial lane'));
  project = applyVideoProjectEvent(project, event(2, 'ATTACH_RESEARCH', artifact('topic_brief', 'a')));
  project = applyVideoProjectEvent(project, event(3, 'ATTACH_SCRIPT', artifact('production_case', 'b')));
  project = applyVideoProjectEvent(project, event(4, 'ATTACH_STORYBOARD', artifact('storyboard_package', 'c')));
  project = applyVideoProjectEvent(project, event(5, 'VERIFY_ASSETS', artifact('owned_media_preflight', 'd', {
    truthBoundary: 'owned_media_verified',
    claims: {finalRenderAllowed: true},
  })));
  return applyVideoProjectEvent(project, event(6, 'AUTHORIZE_RENDER', artifact('final_render_gate', 'e', {
    truthBoundary: 'render_execution_authorized',
    claims: {finalRenderAllowed: true},
  })));
};

test('creates an auditable discovered video project', () => {
  const project = baseProject();
  assert.equal(project.stage, 'DISCOVERED');
  assert.equal(project.status, 'ACTIVE');
  assert.equal(project.nextEvent, 'SELECT_CANDIDATE');
  assert.equal(validateVideoProject(project), true);
});

test('runs the complete lifecycle and marks feedback-ready work completed', () => {
  let project = advanceToRenderAuthorized();
  project = applyVideoProjectEvent(project, event(7, 'COMPLETE_RENDER', artifact('mac_remotion_render_run', 'f', {
    status: 'COMPLETED',
    claims: {realSubmissionPerformed: true, finalVideoClaimAllowed: true},
  })));
  project = applyVideoProjectEvent(project, event(8, 'APPROVE_QUALITY', artifact('final_render_quality_review', '1', {
    status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
    claims: {releasePreparationAllowed: true},
  })));
  project = applyVideoProjectEvent(project, event(9, 'PREPARE_RELEASE', artifact('platform_upload_handoff', '2', {
    status: 'READY_FOR_HUMAN_PLATFORM_UPLOAD',
  })));
  project = applyVideoProjectEvent(project, event(10, 'CONFIRM_PUBLICATION', artifact('bound_publication_receipt', '3', {
    status: 'PUBLICATION_CONFIRMED',
    claims: {publicationConfirmed: true, analyticsIntakeAllowed: true},
  })));
  project = applyVideoProjectEvent(project, event(11, 'ATTACH_FEEDBACK', artifact('bounded_feedback_summary', '4', {
    status: 'BOUNDED_FEEDBACK_SUMMARY_READY',
    claims: {feedbackSummaryReady: true},
  })));
  assert.equal(project.stage, 'FEEDBACK_READY');
  assert.equal(project.status, 'COMPLETED');
  assert.equal(project.nextEvent, null);
  assert.equal(project.events.length, 11);
  assert.equal(project.artifacts.length, 10);
  assert.equal(summarizeVideoProject(project).progressPercent, 100);
});

test('rejects skipped stages and false completion claims', () => {
  const project = baseProject();
  assert.throws(() => applyVideoProjectEvent(project, event(1, 'ATTACH_SCRIPT', artifact('production_case', 'a'))), /requires stage RESEARCH_READY/);

  const authorized = advanceToRenderAuthorized();
  assert.throws(() => applyVideoProjectEvent(authorized, event(7, 'COMPLETE_RENDER', artifact('mac_remotion_render_run', 'f', {
    status: 'FAILED',
    claims: {realSubmissionPerformed: true, finalVideoClaimAllowed: false},
  }))), /completion boundary/);
});

test('supports explicit blocking and resumption without changing the stage', () => {
  let project = baseProject();
  project = applyVideoProjectEvent(project, event(1, 'BLOCK_PROJECT', null, 'Waiting for source ownership confirmation'));
  assert.equal(project.status, 'BLOCKED');
  assert.equal(project.stage, 'DISCOVERED');
  assert.equal(project.nextEvent, 'RESUME_PROJECT');
  assert.throws(() => applyVideoProjectEvent(project, event(2, 'SELECT_CANDIDATE', null, 'select')), /only an active project/);
  project = applyVideoProjectEvent(project, event(3, 'RESUME_PROJECT', null, 'Ownership confirmed'));
  assert.equal(project.status, 'ACTIVE');
  assert.equal(project.nextEvent, 'SELECT_CANDIDATE');
});

test('makes exact event replay idempotent and conflicting replay fail closed', () => {
  const project = baseProject();
  const selection = event(1, 'SELECT_CANDIDATE', null, 'Strong evidence and audience fit');
  const selected = applyVideoProjectEvent(project, selection);
  assert.strictEqual(applyVideoProjectEvent(selected, selection), selected);
  assert.throws(() => applyVideoProjectEvent(selected, {...selection, reason: 'different'}), /replay payload mismatch/);
});

test('prevents cancelled work from advancing', () => {
  let project = baseProject();
  project = applyVideoProjectEvent(project, event(1, 'CANCEL_PROJECT', null, 'No longer aligned with strategy'));
  assert.equal(project.status, 'CANCELLED');
  assert.equal(project.nextEvent, null);
  assert.throws(() => applyVideoProjectEvent(project, event(2, 'SELECT_CANDIDATE', null, 'select')), /only an active project/);
});

test('detects project and event tampering', () => {
  let project = baseProject();
  project = applyVideoProjectEvent(project, event(1, 'SELECT_CANDIDATE', null, 'Strong fit'));
  assert.throws(() => validateVideoProject({...project, stage: 'PUBLISHED'}), /project digest mismatch/);
  const events = [{...project.events[0], actor: 'tampered'}, ...project.events.slice(1)];
  assert.throws(() => validateVideoProject({...project, events}), /project digest mismatch/);
});

test('rejects secret-bearing artifact claims', () => {
  let project = baseProject();
  project = applyVideoProjectEvent(project, event(1, 'SELECT_CANDIDATE', null, 'Strong fit'));
  assert.throws(() => applyVideoProjectEvent(project, event(2, 'ATTACH_RESEARCH', artifact('topic_brief', 'a', {
    claims: {actionToken: 'must-not-enter-ledger'},
  }))), /secret fields/);
});
