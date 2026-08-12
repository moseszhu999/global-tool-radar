import assert from 'node:assert/strict';
import test from 'node:test';
import { createMediaRenderRequestV1 } from '../../shared-media-render-contract/src/index.mjs';
import {
  SHARED_MEDIA_GROUP_CONTENT_LOOP_ACTION,
  SHARED_MEDIA_GROUP_CONTENT_LOOP_V1,
  buildSharedMediaGroupContentLoopV1,
} from '../src/index.mjs';

const SHA_A = `sha256:${'a'.repeat(64)}`;
const SHA_B = `sha256:${'b'.repeat(64)}`;
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);

function binding(overrides = {}) {
  return {
    workEntryRef: 'group:work-entry:content-001',
    workEntryDigest: SHA_A,
    autonomyPolicyRef: 'group:autonomy-policy:content-candidate-prepare',
    autonomyPolicyDigest: SHA_B,
    actionCode: SHARED_MEDIA_GROUP_CONTENT_LOOP_ACTION,
    ownerDomain: 'shared-media',
    autonomyLevel: 'L1',
    ...overrides,
  };
}

function idea(overrides = {}) {
  return {
    ideaRef: 'shared-media:content-idea:001',
    workspaceId: 'workspace-content-001',
    actorRef: 'actor-content-owner-001',
    audienceCodes: ['enterprise_buyer'],
    channelCodes: ['youtube'],
    targetDurationSeconds: 45,
    sourceEvidenceRefs: ['evidence:content-idea:001'],
    blockerCodes: [],
    ...overrides,
  };
}

function script(overrides = {}) {
  return {
    scriptRef: 'shared-media:script-draft:001',
    artifactDigest: SHA_A,
    workEvidenceRef: 'evidence:script-draft:001',
    workEvidenceDigest: SHA_B,
    workspaceId: 'workspace-content-001',
    actorRef: 'actor-content-owner-001',
    observedAt: '2026-08-12T01:00:00Z',
    ...overrides,
  };
}

function request() {
  return createMediaRenderRequestV1({
    requestId: 'request-w3c-001',
    purpose: 'group.content_candidate',
    title: 'W3C content candidate fixture',
    language: 'zh-CN',
    shots: [{ shotId: 'shot-01', order: 1, durationMs: 1000, narration: { mode: 'none' }, visualAssetIds: [] }],
    visualAssets: [],
    voice: { mode: 'none' },
    captions: { mode: 'none', format: 'none' },
    outputProfile: { profileId: 'portrait', width: 1080, height: 1920, fps: 30, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac' },
  });
}

function succeeded(req) {
  return {
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-w3c-001', status: 'succeeded',
    artifact: {
      artifactId: 'artifact-w3c-001', locator: 'media://outputs/candidate.mp4', mediaType: 'video/mp4', byteLength: 123456,
      sha256: HEX_B, durationSeconds: 1, width: 1080, height: 1920, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac',
    },
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: 'job-w3c-001',
      inputManifestDigest: req.inputManifestDigest, artifactSha256: HEX_B,
      mediaInspection: {
        tool: 'ffprobe', status: 'passed', inspectedAt: '2026-08-12T01:05:00.000Z',
        format: { durationSeconds: 1, sizeBytes: 123456 },
        streams: [
          { index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30 },
          { index: 1, type: 'audio', codecName: 'aac' },
        ],
      },
      renderLog: { sha256: HEX_C, byteLength: 1024 }, collectedAt: '2026-08-12T01:05:01.000Z',
    },
    error: null,
  };
}

function failed(req) {
  return {
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-w3c-002', status: 'failed', artifact: null,
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: 'job-w3c-002',
      inputManifestDigest: req.inputManifestDigest, artifactSha256: null, mediaInspection: null,
      renderLog: { sha256: HEX_C, byteLength: 512 }, collectedAt: '2026-08-12T01:05:01.000Z',
    },
    error: { code: 'RENDER_FAILED', stage: 'render', message: 'provider detail', retryable: true },
  };
}

function renderObservation(result, overrides = {}) {
  return {
    projectionRef: 'shared-media:group-service:w3c-001',
    workItemRef: 'shared-media:group-work-item:w3c-001',
    accessContext: {
      decisionRef: 'shared-media:access-decision:w3c-001',
      consumerOrganizationRef: 'group:organization:org-001',
      readAllowed: true,
      decidedAt: '2026-08-12T01:04:00Z',
    },
    result,
    sourceObservedAt: '2026-08-12T01:05:01Z',
    maxAgeSeconds: 900,
    ...overrides,
  };
}

function build(overrides = {}) {
  return buildSharedMediaGroupContentLoopV1({
    groupBinding: binding(),
    contentIdea: idea(),
    scriptDraft: null,
    renderObservation: null,
    observedAt: '2026-08-12T01:10:00Z',
    ...overrides,
  });
}

test('structured content idea routes to script draft planning only', () => {
  const result = build();
  assert.equal(result.schemaVersion, SHARED_MEDIA_GROUP_CONTENT_LOOP_V1);
  assert.equal(result.route.state, 'script_draft_planned');
  assert.equal(result.route.ownerReviewRequired, false);
  assert.equal(result.prePublicationPack.packStatus, 'not_ready');
  assert.equal(result.boundaries.renderSubmittedByThisModule, false);
  assert.equal(result.boundaries.publicationAllowed, false);
});

test('missing idea requirements route to clarification and forbid script evidence', () => {
  const incomplete = idea({ audienceCodes: [], channelCodes: [], targetDurationSeconds: null });
  const result = build({ contentIdea: incomplete });
  assert.equal(result.route.state, 'needs_idea_clarification');
  assert.deepEqual(result.route.requirementGapCodes, ['audience_missing', 'channel_missing', 'target_duration_missing']);
  assert.throws(() => build({ contentIdea: incomplete, scriptDraft: script() }), /scriptDraft is forbidden/);
});

test('explicit content blockers fail closed before script or render work', () => {
  const blocked = idea({ blockerCodes: ['rights_scope_unclear'] });
  const result = build({ contentIdea: blocked });
  assert.equal(result.route.state, 'blocked');
  assert.equal(result.route.ownerReviewRequired, true);
  assert.throws(() => build({ contentIdea: blocked, scriptDraft: script() }), /scriptDraft is forbidden/);
});

test('script evidence advances only to render candidate planning and copies no script text', () => {
  const result = build({ scriptDraft: script() });
  assert.equal(result.route.state, 'render_candidate_planned');
  assert.equal(result.scriptEvidence.scriptTextCopiedIntoLoop, false);
  assert.equal(result.prePublicationPack.scriptArtifactDigest, SHA_A);
  assert.equal(result.boundaries.scriptTextCopiedIntoLoop, false);
});

test('render observation cannot appear before script evidence', () => {
  const req = request();
  assert.throws(() => build({ renderObservation: renderObservation(succeeded(req)) }), /requires scriptDraft evidence first/);
});

test('queued and running renders stay in render-in-progress state without human approval', () => {
  const req = request();
  const queued = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null };
  const running = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-r', status: 'running', artifact: null, evidence: null, error: null };
  assert.equal(build({ scriptDraft: script(), renderObservation: renderObservation(queued) }).route.state, 'render_in_progress');
  const live = build({ scriptDraft: script(), renderObservation: renderObservation(running) });
  assert.equal(live.route.state, 'render_in_progress');
  assert.equal(live.prePublicationPack.humanReviewCompleted, false);
});

test('failed and cancelled renders remain blocked or cancelled and never publish', () => {
  const req = request();
  const failedResult = build({ scriptDraft: script(), renderObservation: renderObservation(failed(req)) });
  assert.equal(failedResult.route.state, 'render_blocked');
  assert.equal(failedResult.renderEvidence.terminalEvidence.errorCode, 'RENDER_FAILED');
  const cancelled = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-c', status: 'cancelled', artifact: null, evidence: null, error: null };
  const cancelledResult = build({ scriptDraft: script(), renderObservation: renderObservation(cancelled) });
  assert.equal(cancelledResult.route.state, 'cancelled');
  assert.equal(cancelledResult.boundaries.publicationPerformed, false);
});

test('successful render becomes pre-publication review ready but does not create approval', () => {
  const result = build({ scriptDraft: script(), renderObservation: renderObservation(succeeded(request())) });
  assert.equal(result.route.state, 'prepublication_review_ready');
  assert.equal(result.route.ownerReviewRequired, true);
  assert.equal(result.prePublicationPack.packStatus, 'review_ready');
  assert.equal(result.prePublicationPack.humanDecisionRequired, true);
  assert.equal(result.prePublicationPack.humanReviewCompleted, false);
  assert.equal(result.prePublicationPack.approvalDecisionCreated, false);
  assert.equal(result.prePublicationPack.publicationAllowed, false);
  assert.equal(result.prePublicationPack.publicationPerformed, false);
  assert.equal(result.prePublicationPack.renderArtifactEvidence.artifactSha256, HEX_B);
  assert.equal('locator' in result.prePublicationPack.renderArtifactEvidence, false);
  assert.deepEqual(result.prePublicationPack.reviewChecklist.map((item) => item.checkId), [
    'content_accuracy', 'rights_privacy_brand', 'visual_quality', 'voice_caption_quality', 'channel_fit',
  ]);
});

test('group provenance is fixed to Shared Media L0/L1 and refs reject PII', () => {
  assert.throws(() => build({ groupBinding: binding({ actionCode: 'publish_content' }) }), /actionCode mismatch/);
  assert.throws(() => build({ groupBinding: binding({ ownerDomain: 'pr-growth' }) }), /ownerDomain must be shared-media/);
  assert.throws(() => build({ groupBinding: binding({ autonomyLevel: 'L2' }) }), /autonomyLevel must be L0 or L1/);
  assert.throws(() => build({ contentIdea: idea({ ideaRef: 'shared-media:content-idea:user@example.com' }) }), /email-like PII/);
});

test('business-eval handoff is measured-only and loop digest is deterministic', () => {
  const first = build({ scriptDraft: script() });
  const second = build({ scriptDraft: script() });
  assert.equal(first.businessEvalHandoff.groupBusinessEvalCreated, false);
  assert.equal(first.businessEvalHandoff.measuredOutcomeRequired, true);
  assert.equal(first.businessEvalHandoff.suggestedDownstreamMetric.value, null);
  assert.equal(first.businessEvalHandoff.suggestedDownstreamMetric.fabricated, false);
  assert.equal(first.loopDigest, second.loopDigest);
  assert.match(first.loopDigest, /^sha256:[a-f0-9]{64}$/);
});
