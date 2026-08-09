import assert from 'node:assert/strict';
import test from 'node:test';
import { createMediaRenderRequestV1 } from '../../shared-media-render-contract/src/index.mjs';
import { projectMediaRenderResultForGroupService } from '../src/index.mjs';

const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

function request() {
  return createMediaRenderRequestV1({
    requestId: 'request-001',
    purpose: 'group.demo',
    title: 'Group service adapter fixture',
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
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-001', status: 'succeeded',
    artifact: {
      artifactId: 'artifact-001', locator: 'media://outputs/final.mp4', mediaType: 'video/mp4', byteLength: 123456,
      sha256: B, durationSeconds: 1, width: 1080, height: 1920, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac',
    },
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: 'job-001',
      inputManifestDigest: req.inputManifestDigest, artifactSha256: B,
      mediaInspection: {
        tool: 'ffprobe', status: 'passed', inspectedAt: '2026-08-10T00:00:00.000Z',
        format: { durationSeconds: 1, sizeBytes: 123456 },
        streams: [
          { index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30 },
          { index: 1, type: 'audio', codecName: 'aac' },
        ],
      },
      renderLog: { sha256: C, byteLength: 1024 }, collectedAt: '2026-08-10T00:00:01.000Z',
    },
    error: null,
  };
}

function failed(req) {
  return {
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-002', status: 'failed', artifact: null,
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: 'job-002',
      inputManifestDigest: req.inputManifestDigest, artifactSha256: null, mediaInspection: null,
      renderLog: { sha256: C, byteLength: 512 }, collectedAt: '2026-08-10T00:00:01.000Z',
    },
    error: { code: 'RENDER_FAILED', stage: 'render', message: 'private provider detail', retryable: true },
  };
}

function access(overrides = {}) {
  return {
    decisionRef: 'shared-media:access-decision:group-001',
    consumerOrganizationRef: 'group:organization:org-001',
    readAllowed: true,
    decidedAt: '2026-08-10T00:00:00Z',
    ...overrides,
  };
}

function project(result, overrides = {}) {
  return projectMediaRenderResultForGroupService({
    projectionRef: 'shared-media:group-service:projection-001',
    workItemRef: 'shared-media:group-work-item:item-001',
    accessContext: access(),
    consumerDomain: 'tradeos',
    result,
    sourceObservedAt: '2026-08-10T00:00:01Z',
    observedAt: '2026-08-10T00:05:00Z',
    maxAgeSeconds: 900,
    ...overrides,
  });
}

test('queued and running project as non-terminal monitor states', () => {
  const req = request();
  const queued = project({ contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null });
  const running = project({ contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-r', status: 'running', artifact: null, evidence: null, error: null });
  assert.equal(queued.workItem.status, 'pending');
  assert.equal(running.workItem.status, 'in_progress');
  assert.equal(queued.workItem.nextAction, 'monitor_render');
  assert.equal(running.workItem.requiredHumanDecision, false);
});

test('succeeded render becomes awaiting human review and never publication approval', () => {
  const view = project(succeeded(request()));
  assert.equal(view.workItem.status, 'awaiting_human_review');
  assert.equal(view.workItem.nextAction, 'review_rendered_candidate');
  assert.equal(view.workItem.requiredHumanDecision, true);
  assert.equal(view.publicationAllowed, false);
  assert.equal(view.publicationPerformed, false);
  assert.equal(view.humanReviewCompleted, false);
  assert.equal(view.consumerDomainDecisionInferred, false);
  assert.equal(view.workItem.terminalEvidence.artifactSha256, B);
  assert.equal('locator' in view.workItem.terminalEvidence, false);
});

test('failed render exposes bounded failure evidence without leaking provider message', () => {
  const view = project(failed(request()));
  assert.equal(view.workItem.status, 'blocked');
  assert.equal(view.workItem.nextAction, 'inspect_render_failure');
  assert.equal(view.workItem.terminalEvidence.errorCode, 'RENDER_FAILED');
  assert.equal(view.workItem.terminalEvidence.errorStage, 'render');
  assert.equal(view.workItem.terminalEvidence.retryable, true);
  assert.equal('message' in view.workItem.terminalEvidence, false);
});

test('cancelled render remains terminal without inventing review or publication state', () => {
  const req = request();
  const view = project({ contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-c', status: 'cancelled', artifact: null, evidence: null, error: null });
  assert.equal(view.workItem.status, 'cancelled');
  assert.equal(view.workItem.nextAction, 'none');
  assert.equal(view.workItem.terminalEvidence, null);
});

test('denied group access fails closed', () => {
  const req = request();
  const result = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null };
  assert.throws(() => project(result, { accessContext: access({ readAllowed: false }) }), /SHARED_MEDIA_GROUP_ACCESS_DENIED/);
});

test('stale source remains explicitly stale', () => {
  const req = request();
  const result = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null };
  const view = project(result, { observedAt: '2026-08-10T01:00:00Z', maxAgeSeconds: 900 });
  assert.equal(view.workItem.freshness, 'stale');
});

test('consumer domain and group refs are bounded', () => {
  const req = request();
  const result = { contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null };
  assert.throws(() => project(result, { consumerDomain: 'unknown-product' }), /consumerDomain is not allowed/);
  assert.throws(() => project(result, { projectionRef: 'shared-media:group-service:user@example.com' }), /PII/);
  assert.throws(() => project(result, { workItemRef: 'shared-media:group-work-item:token=secret' }), /secret-like/);
});

test('projection is immutable and digest-bound', () => {
  const view = project(succeeded(request()));
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.workItem), true);
  assert.match(view.projectionDigest, /^[a-f0-9]{64}$/);
  assert.match(view.workItem.workItemDigest, /^[a-f0-9]{64}$/);
});
