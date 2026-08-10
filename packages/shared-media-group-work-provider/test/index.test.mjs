import assert from 'node:assert/strict';
import test from 'node:test';
import { createMediaRenderRequestV1 } from '../../shared-media-render-contract/src/index.mjs';
import { buildSharedMediaGroupWorkProviderResponse } from '../src/index.mjs';

const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

function providerRequest(overrides = {}) {
  return {
    schema: 'group.work-provider.request.v1',
    requestId: 'group-request-001',
    provider: 'shared-media',
    consumerDomain: 'tradeos',
    consumerOrganizationRef: 'group:organization:org-001',
    purpose: 'work_inbox',
    requestedSourceSchemas: ['shared-media.group-work-item.v1'],
    correlation: {
      subjectLinkRef: 'group:subject-link:subject-001',
      organizationLinkRef: 'group:organization-link:org-001',
      federationStatus: 'valid',
      federationFreshness: 'fresh',
      federationObservedAt: '2026-08-10T01:00:00Z',
    },
    requestedAt: '2026-08-10T01:01:00Z',
    readOnly: true,
    crossDomainAccessPregranted: false,
    persistencePerformed: false,
    externalActionPerformed: false,
    ...overrides,
  };
}

function mediaRequest() {
  return createMediaRenderRequestV1({
    requestId: 'render-request-001',
    purpose: 'group.demo',
    title: 'Provider response fixture',
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
        tool: 'ffprobe', status: 'passed', inspectedAt: '2026-08-10T01:01:10Z',
        format: { durationSeconds: 1, sizeBytes: 123456 },
        streams: [
          { index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30 },
          { index: 1, type: 'audio', codecName: 'aac' },
        ],
      },
      renderLog: { sha256: C, byteLength: 1024 }, collectedAt: '2026-08-10T01:01:11Z',
    },
    error: null,
  };
}

function queued(req) {
  return {
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId,
    jobId: 'job-q', status: 'queued', artifact: null, evidence: null, error: null,
  };
}

function build(overrides = {}) {
  const req = mediaRequest();
  return buildSharedMediaGroupWorkProviderResponse({
    request: providerRequest(),
    accessDecision: 'allowed',
    accessDecisionRef: 'shared-media:access-decision:group-001',
    availability: 'available',
    sourceObservedAt: '2026-08-10T01:01:11Z',
    observedAt: '2026-08-10T01:02:00Z',
    provenanceRefs: ['shared-media:render-observation:job-001'],
    renderResults: [{
      projectionRef: 'shared-media:group-service:projection-001',
      workItemRef: 'shared-media:group-work-item:item-001',
      result: succeeded(req),
      sourceObservedAt: '2026-08-10T01:01:11Z',
    }],
    maxAgeSeconds: 900,
    ...overrides,
  });
}

test('allowed available canonical result becomes an exact group provider response', () => {
  const response = build();
  assert.equal(response.schema, 'group.work-provider.response.v1');
  assert.equal(response.provider, 'shared-media');
  assert.equal(response.consumerOrganizationRef, 'group:organization:org-001');
  assert.equal(response.accessDecision, 'allowed');
  assert.equal(response.availability, 'available');
  assert.equal(response.sourceSchema, 'shared-media.group-work-item.v1');
  assert.equal(response.workItems.length, 1);
  assert.equal(response.workItems[0].status, 'awaiting_human_review');
  assert.equal(response.workItems[0].requiredHumanDecision, true);
  assert.equal(response.workItems[0].publicationAllowed, false);
  assert.equal(response.workItems[0].publicationPerformed, false);
  assert.equal(response.readOnly, true);
  assert.equal(response.providerTruthOwnedExternally, true);
  assert.equal(response.crossDomainWritePerformed, false);
});

test('technical success never leaks locator or upgrades to publication approval', () => {
  const response = build();
  const item = response.workItems[0];
  assert.equal(item.reasonCode, 'technical_render_succeeded');
  assert.equal(item.nextAction, 'review_rendered_candidate');
  assert.equal(item.humanReviewCompleted, false);
  assert.equal(item.humanDecisionInferred, false);
  assert.equal(item.consumerDomainDecisionInferred, false);
  assert.equal('locator' in item.terminalEvidence, false);
  assert.equal(item.terminalEvidence.artifactSha256, B);
});

test('queued canonical result stays monitor-only work', () => {
  const req = mediaRequest();
  const response = build({
    sourceObservedAt: '2026-08-10T01:01:20Z',
    renderResults: [{
      projectionRef: 'shared-media:group-service:projection-q',
      workItemRef: 'shared-media:group-work-item:item-q',
      result: queued(req),
      sourceObservedAt: '2026-08-10T01:01:20Z',
    }],
  });
  assert.equal(response.workItems[0].status, 'pending');
  assert.equal(response.workItems[0].nextAction, 'monitor_render');
  assert.equal(response.workItems[0].requiredHumanDecision, false);
});

test('denied provider access returns no work items and no data success', () => {
  const response = build({
    accessDecision: 'denied',
    accessDecisionRef: 'shared-media:access-decision:denied-001',
    availability: 'unknown',
    renderResults: [],
  });
  assert.equal(response.accessDecision, 'denied');
  assert.equal(response.availability, 'unknown');
  assert.deepEqual(response.workItems, []);
  assert.equal('sourceSchema' in response, false);
});

test('unknown provider access cannot claim a decision receipt or work items', () => {
  const response = build({
    accessDecision: 'unknown',
    accessDecisionRef: undefined,
    availability: 'unknown',
    renderResults: [],
  });
  assert.equal(response.accessDecision, 'unknown');
  assert.equal('accessDecisionRef' in response, false);
  assert.deepEqual(response.workItems, []);
});

test('invalid or stale federation request fails before provider data projection', () => {
  assert.throws(() => build({
    request: providerRequest({ correlation: { ...providerRequest().correlation, federationStatus: 'revoked' } }),
  }), /GROUP_PROVIDER_FEDERATION_NOT_VALID/);
  assert.throws(() => build({
    request: providerRequest({ correlation: { ...providerRequest().correlation, federationFreshness: 'stale' } }),
  }), /GROUP_PROVIDER_FEDERATION_STALE/);
});

test('wrong provider, consumer, schema, or organization-shaped ref fails closed', () => {
  assert.throws(() => build({ request: providerRequest({ provider: 'trainingos' }) }), /provider must be shared-media/);
  assert.throws(() => build({ request: providerRequest({ consumerDomain: 'trainingos' }) }), /consumerDomain must be tradeos/);
  assert.throws(() => build({ request: providerRequest({ requestedSourceSchemas: ['trainingos.group-work-entry.work-item.v1'] }) }), /Shared Media work-item schema/);
  assert.throws(() => build({ request: providerRequest({ consumerOrganizationRef: 'tradeos:organization:org-001' }) }), /group organization ref/);
});

test('transport-completed lookalike is rejected because it is not canonical media.render.v1', () => {
  assert.throws(() => build({
    renderResults: [{
      projectionRef: 'shared-media:group-service:transport-only',
      workItemRef: 'shared-media:group-work-item:transport-only',
      result: { requestId: 'render-request-001', jobId: 'job-transport', status: 'completed' },
      sourceObservedAt: '2026-08-10T01:01:11Z',
    }],
  }), /media.render.v1 result required|status unsupported/);
});

test('non-available response cannot smuggle canonical render items', () => {
  assert.throws(() => build({ availability: 'unavailable' }), /GROUP_PROVIDER_NON_AVAILABLE_RESULTS_FORBIDDEN/);
});

test('provider response is immutable and preserves external-truth/no-authority boundaries', () => {
  const response = build();
  assert.equal(Object.isFrozen(response), true);
  assert.equal(Object.isFrozen(response.workItems), true);
  assert.equal(Object.isFrozen(response.workItems[0]), true);
  assert.equal(response.persistencePerformed, false);
  assert.equal(response.authorityGrantCreated, false);
  assert.equal(response.executionAuthorized, false);
  assert.equal(response.externalActionPerformed, false);
});
