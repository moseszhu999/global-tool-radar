import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVideoProjectEvent,
  createVideoProject,
  importRenderedCandidateProject,
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

const currentExplainerEvidence = () => ({
  executionBackend: 'github_actions',
  exactSourceHead: 'a5ac58e0ea05c5d8d8ca6861e1001b044bde44e0',
  provenanceSnapshotDigest: 'b3a0f5c823af4be875510d27ebbd65dc6de9907463d1b9e10eea682397060991',
  finalVideoReceiptDigest: '56ff8a2f3f8738facb7e86c656159e7c149036abf324f82a48e82881e8359be5',
  finalVideoSha256: '1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598',
  outputPath: 'apps/remotion-video/out/toolradar-explainer-19s-production-polish-alpha-v2.mp4',
  renderProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 19.2},
  workflowRunId: '31304399179',
  sourceArtifactId: '9035504064',
  sourceArtifactDigest: 'cbb0a4b97201a3999b819486682d023d0d93061f1d97920c13a8c34fe51e4a3b',
});

const importedProjectFixture = () => importRenderedCandidateProject({
  projectId: 'video-project:toolradar-explainer-v2:imported',
  owner: 'video-operation',
  actor: 'video-operation-controller',
  occurredAt: '2026-08-09T09:30:00.000Z',
  sourceSignal: {
    id: 'toolradar-explainer-production-polish-alpha-v2',
    title: 'ToolRadar Explainer Production Polish Alpha v2',
    platform: 'internal-render',
    sourceUrl: null,
  },
  evidence: currentExplainerEvidence(),
});

test('creates an auditable discovered video project', () => {
  const project = baseProject();
  assert.equal(project.stage, 'DISCOVERED');
  assert.equal(project.status, 'ACTIVE');
  assert.equal(project.nextEvent, 'SELECT_CANDIDATE');
  assert.equal(validateVideoProject(project), true);
});

test('imports a verified externally rendered candidate without asserting skipped lifecycle history', () => {
  const project = importedProjectFixture();

  assert.equal(validateVideoProject(project), true);
  assert.equal(project.stage, 'RENDER_COMPLETED');
  assert.equal(project.status, 'ACTIVE');
  assert.equal(project.nextEvent, 'APPROVE_QUALITY');
  assert.equal(project.events.length, 1);
  assert.equal(project.events[0].type, 'IMPORT_RENDERED_CANDIDATE');
  assert.equal(project.artifacts.length, 1);
  assert.equal(project.artifacts[0].type, 'render_execution_evidence');
  assert.equal(project.artifacts[0].truthBoundary, 'post_render_execution_evidence_verified');
  assert.equal(project.artifacts[0].claims.renderExecutionVerified, true);
  assert.equal(project.artifacts[0].claims.originalRenderGateProven, false);
  assert.equal(project.artifacts[0].claims.historicalStagesProven, false);
  assert.equal(project.artifacts[0].claims.publicationAllowed, false);
  assert.equal(project.artifacts[0].claims.reviewBindingDigest, currentExplainerEvidence().provenanceSnapshotDigest);
});

test('keeps rendered-candidate import inaccessible through the public event API', () => {
  const discovered = createVideoProject({
    projectId: 'video-project:direct-import-bypass',
    owner: 'video-operation',
    createdAt: '2026-08-09T09:30:00.000Z',
    sourceSignal: {id: 'candidate:direct', title: 'Direct import attempt', platform: 'internal-render'},
  });
  const canonicalImport = importedProjectFixture();
  assert.throws(() => applyVideoProjectEvent(discovered, {
    eventId: 'direct-import-attempt',
    type: 'IMPORT_RENDERED_CANDIDATE',
    actor: 'bypass-attempt',
    occurredAt: '2026-08-09T09:31:00.000Z',
    reason: 'should never bypass the canonical import constructor',
    artifact: canonicalImport.artifacts[0],
  }), /unsupported event type: IMPORT_RENDERED_CANDIDATE/);
});

test('fails closed when imported render evidence lacks a valid provenance digest', () => {
  assert.throws(() => importRenderedCandidateProject({
    projectId: 'video-project:bad-import',
    owner: 'video-operation',
    actor: 'video-operation-controller',
    occurredAt: '2026-08-09T09:30:00.000Z',
    sourceSignal: {id: 'candidate:bad', title: 'Bad import', platform: 'internal-render'},
    evidence: {...currentExplainerEvidence(), provenanceSnapshotDigest: 'not-a-digest'},
  }), /provenanceSnapshotDigest must be SHA-256/);
});

test('fails closed for unsupported render backend or unbound GitHub artifact identity', () => {
  const input = {
    projectId: 'video-project:bad-backend',
    owner: 'video-operation',
    actor: 'video-operation-controller',
    occurredAt: '2026-08-09T09:30:00.000Z',
    sourceSignal: {id: 'candidate:bad-backend', title: 'Bad backend import', platform: 'internal-render'},
  };
  assert.throws(() => importRenderedCandidateProject({
    ...input,
    evidence: {...currentExplainerEvidence(), executionBackend: 'self_asserted_runner'},
  }), /executionBackend is unsupported/);
  assert.throws(() => importRenderedCandidateProject({
    ...input,
    evidence: {...currentExplainerEvidence(), sourceArtifactId: 'not-an-artifact-id'},
  }), /sourceArtifactId must be a numeric id/);
  assert.throws(() => importRenderedCandidateProject({
    ...input,
    evidence: {...currentExplainerEvidence(), exactSourceHead: 'f'.repeat(39)},
  }), /exactSourceHead must be a Git object id/);
});

test('rejects direct import events whose artifact digest is not bound to canonical evidence claims', () => {
  const canonical = importRenderedCandidateProject({
    projectId: 'video-project:canonical-import',
    owner: 'video-operation',
    actor: 'video-operation-controller',
    occurredAt: '2026-08-09T09:30:00.000Z',
    sourceSignal: {id: 'candidate:canonical', title: 'Canonical import', platform: 'internal-render'},
    evidence: currentExplainerEvidence(),
  });
  const canonicalArtifact = canonical.artifacts[0];

  assert.throws(() => applyVideoProjectEvent(baseProject(), {
    eventId: 'direct-forged-import',
    type: 'IMPORT_RENDERED_CANDIDATE',
    actor: 'untrusted-caller',
    occurredAt: '2026-08-09T09:31:00.000Z',
    artifact: {
      type: canonicalArtifact.type,
      schemaVersion: canonicalArtifact.schemaVersion,
      artifactId: canonicalArtifact.artifactId,
      digest: hash('f'),
      status: canonicalArtifact.status,
      truthBoundary: canonicalArtifact.truthBoundary,
      claims: canonicalArtifact.claims,
    },
  }), /rendered candidate import boundary is invalid/);
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
