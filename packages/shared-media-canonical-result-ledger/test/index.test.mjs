import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {
  EXPECTED_MAC_REMOTION_SERVER_SHA256,
  buildSharedMediaProviderResponseFromCanonicalReceiptsV1,
  createCanonicalTerminalReceiptV1,
  readCanonicalTerminalReceiptV1,
  recoverCanonicalTerminalReceiptV1,
  validateMacCanonicalReceiptRolloutTargetV1,
  writeCanonicalTerminalReceiptSlotV1,
} from '../src/index.mjs';

const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

function request(overrides = {}) {
  return createMediaRenderRequestV1({
    requestId: 'render-request-ledger-001',
    purpose: 'group.demo',
    title: 'Canonical result ledger fixture',
    language: 'zh-CN',
    shots: [{
      shotId: 'shot-01', order: 1, durationMs: 1000,
      narration: {mode: 'none'}, visualAssetIds: [],
    }],
    visualAssets: [],
    voice: {mode: 'none'},
    captions: {mode: 'none', format: 'none'},
    outputProfile: {
      profileId: 'portrait', width: 1080, height: 1920, fps: 30,
      container: 'mp4', videoCodec: 'h264', audioCodec: 'aac',
    },
    ...overrides,
  });
}

function succeeded(req = request(), overrides = {}) {
  return {
    contractVersion: 'media.render.v1',
    messageType: 'result',
    requestId: req.requestId,
    jobId: 'job-ledger-001',
    status: 'succeeded',
    artifact: {
      artifactId: 'artifact-ledger-001',
      locator: 'media://outputs/final.mp4',
      mediaType: 'video/mp4',
      byteLength: 123456,
      sha256: B,
      durationSeconds: 1,
      width: 1080,
      height: 1920,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    },
    evidence: {
      contractVersion: 'media.render.v1',
      messageType: 'evidence',
      requestId: req.requestId,
      jobId: 'job-ledger-001',
      inputManifestDigest: req.inputManifestDigest,
      artifactSha256: B,
      mediaInspection: {
        tool: 'ffprobe',
        status: 'passed',
        inspectedAt: '2026-08-10T02:20:00Z',
        format: {container: 'mp4', durationSeconds: 1, sizeBytes: 123456},
        streams: [
          {index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30},
          {index: 1, type: 'audio', codecName: 'aac'},
        ],
      },
      renderLog: {sha256: C, byteLength: 1024},
      collectedAt: '2026-08-10T02:20:01Z',
    },
    error: null,
    ...overrides,
  };
}

function failed(req = request()) {
  return {
    contractVersion: 'media.render.v1',
    messageType: 'result',
    requestId: req.requestId,
    jobId: 'job-ledger-001',
    status: 'failed',
    evidence: {
      contractVersion: 'media.render.v1',
      messageType: 'evidence',
      requestId: req.requestId,
      jobId: 'job-ledger-001',
      inputManifestDigest: req.inputManifestDigest,
      renderLog: {sha256: C, byteLength: 1024},
      collectedAt: '2026-08-10T02:20:01Z',
    },
    error: {
      code: 'RENDER_PROCESS_FAILED',
      stage: 'render',
      message: 'render process exited non-zero',
      retryable: true,
    },
  };
}

function providerRequest() {
  return {
    schema: 'group.work-provider.request.v1',
    requestId: 'group-request-ledger-001',
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
      federationObservedAt: '2026-08-10T02:19:00Z',
    },
    requestedAt: '2026-08-10T02:20:05Z',
    readOnly: true,
    crossDomainAccessPregranted: false,
    persistencePerformed: false,
    externalActionPerformed: false,
  };
}

function receipt(result = succeeded(), persistedAt = '2026-08-10T02:20:10Z') {
  const req = request();
  return createCanonicalTerminalReceiptV1({request: req, result, persistedAt});
}

test('creates a deep-frozen succeeded canonical terminal receipt with fixed truth boundaries', () => {
  const req = request();
  const value = createCanonicalTerminalReceiptV1({
    request: req,
    result: succeeded(req),
    persistedAt: '2026-08-10T02:20:10Z',
  });
  assert.equal(value.schemaVersion, 'shared-media.canonical-terminal-receipt.v1');
  assert.equal(value.terminalStatus, 'succeeded');
  assert.equal(value.inputManifestDigest, req.inputManifestDigest);
  assert.match(value.resultDigest, /^[a-f0-9]{64}$/);
  assert.match(value.receiptDigest, /^[a-f0-9]{64}$/);
  assert.equal(value.technicalResultOnly, true);
  assert.equal(value.humanReviewCompleted, false);
  assert.equal(value.publicationAllowed, false);
  assert.equal(value.authorityGrantCreated, false);
  assert.equal(value.externalActionPerformed, false);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.canonicalResult), true);
  assert.equal(Object.isFrozen(value.canonicalResult.evidence), true);
});

test('persists canonical failed results without inventing artifact or publication success', () => {
  const req = request();
  const value = createCanonicalTerminalReceiptV1({
    request: req,
    result: failed(req),
    persistedAt: '2026-08-10T02:20:10Z',
  });
  assert.equal(value.terminalStatus, 'failed');
  assert.equal('artifact' in value.canonicalResult, false);
  assert.equal(value.canonicalResult.error.code, 'RENDER_PROCESS_FAILED');
  assert.equal(value.publicationPerformed, false);
});

test('rejects non-terminal transport-like or canonical queued results', () => {
  const req = request();
  assert.throws(() => createCanonicalTerminalReceiptV1({
    request: req,
    result: {
      contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId,
      jobId: 'job-ledger-001', status: 'queued', artifact: null, evidence: null, error: null,
    },
    persistedAt: '2026-08-10T02:20:10Z',
  }), /only terminal succeeded\/failed canonical results may be persisted/);
  assert.throws(() => createCanonicalTerminalReceiptV1({
    request: req,
    result: {requestId: req.requestId, jobId: 'job-ledger-001', status: 'completed'},
    persistedAt: '2026-08-10T02:20:10Z',
  }), /media\.render\.v1 result required|contractVersion/);
});

test('independently rejects secret-shaped material before durable persistence', () => {
  const req = request();
  const result = succeeded(req);
  result.artifact.locator = 'https://media.example/file.mp4?x-amz-signature=abc123';
  assert.throws(() => createCanonicalTerminalReceiptV1({
    request: req, result, persistedAt: '2026-08-10T02:20:10Z',
  }), /secret-shaped durable material/);
});

test('first write creates the slot and marks persistence required', () => {
  const req = request();
  const value = writeCanonicalTerminalReceiptSlotV1({
    request: req,
    result: succeeded(req),
    persistedAt: '2026-08-10T02:20:10Z',
  });
  assert.equal(value.schemaVersion, 'shared-media.canonical-result-slot.v1');
  assert.equal(value.writeDisposition, 'created');
  assert.equal(value.persistenceRequired, true);
  assert.equal(value.crossDomainWritePerformed, false);
});

test('identical terminal replay is idempotent even when the retry occurs later', () => {
  const req = request();
  const first = writeCanonicalTerminalReceiptSlotV1({
    request: req, result: succeeded(req), persistedAt: '2026-08-10T02:20:10Z',
  });
  const replay = writeCanonicalTerminalReceiptSlotV1({
    existingReceipt: first.canonicalResultReceipt,
    request: req,
    result: succeeded(req),
    persistedAt: '2026-08-10T02:25:00Z',
  });
  assert.equal(replay.writeDisposition, 'idempotent_replay');
  assert.equal(replay.persistenceRequired, false);
  assert.equal(replay.canonicalResultReceipt.persistedAt, '2026-08-10T02:20:10Z');
  assert.equal(replay.canonicalResultReceipt.receiptDigest, first.canonicalResultReceipt.receiptDigest);
});

test('same request/job identity with different canonical terminal content fails closed', () => {
  const req = request();
  const first = writeCanonicalTerminalReceiptSlotV1({
    request: req, result: succeeded(req), persistedAt: '2026-08-10T02:20:10Z',
  });
  const changed = succeeded(req);
  changed.artifact.artifactId = 'artifact-ledger-conflict';
  assert.throws(() => writeCanonicalTerminalReceiptSlotV1({
    existingReceipt: first.canonicalResultReceipt,
    request: req,
    result: changed,
    persistedAt: '2026-08-10T02:20:11Z',
  }), /CANONICAL_TERMINAL_RECEIPT_CONFLICT/);
});

test('startup recovery revalidates receipt digest, canonical result and truth boundaries', () => {
  const req = request();
  const original = createCanonicalTerminalReceiptV1({
    request: req, result: succeeded(req), persistedAt: '2026-08-10T02:20:10Z',
  });
  const recovered = recoverCanonicalTerminalReceiptV1({receipt: structuredClone(original), request: req});
  assert.equal(recovered.receiptDigest, original.receiptDigest);

  const tampered = structuredClone(original);
  tampered.canonicalResult.artifact.artifactId = 'tampered-artifact';
  assert.throws(() => recoverCanonicalTerminalReceiptV1({receipt: tampered, request: req}), /INTEGRITY_MISMATCH/);

  const widened = structuredClone(original);
  widened.publicationAllowed = true;
  assert.throws(() => recoverCanonicalTerminalReceiptV1({receipt: widened, request: req}), /INTEGRITY_MISMATCH|BOUNDARY_MISMATCH/);
});

test('read requires separate exact job authorization and exposes only the canonical receipt', async () => {
  const req = request();
  const stored = receipt(succeeded(req));
  let observed;
  const value = await readCanonicalTerminalReceiptV1({
    receipt: stored,
    request: req,
    jobId: 'job-ledger-001',
    isJobAuthorized: async (input) => { observed = input; return true; },
  });
  assert.deepEqual(observed, {
    requestId: req.requestId,
    inputManifestDigest: req.inputManifestDigest,
    jobId: 'job-ledger-001',
    action: 'read_canonical_terminal_receipt',
  });
  assert.equal(value.receiptDigest, stored.receiptDigest);
});

test('knowing a jobId never grants canonical receipt read authority', async () => {
  const req = request();
  const stored = receipt(succeeded(req));
  await assert.rejects(() => readCanonicalTerminalReceiptV1({
    receipt: stored,
    request: req,
    jobId: 'job-ledger-001',
    isJobAuthorized: async () => false,
  }), /CANONICAL_RECEIPT_READ_NOT_AUTHORIZED/);
  await assert.rejects(() => readCanonicalTerminalReceiptV1({
    receipt: stored,
    request: req,
    jobId: 'job-other',
    isJobAuthorized: async () => true,
  }), /CANONICAL_RECEIPT_JOB_ID_MISMATCH/);
});

test('authorized durable succeeded receipt feeds #114 provider response without locator/publication leakage', async () => {
  const req = request();
  const stored = receipt(succeeded(req));
  const response = await buildSharedMediaProviderResponseFromCanonicalReceiptsV1({
    providerRequest: providerRequest(),
    accessDecision: 'allowed',
    accessDecisionRef: 'shared-media:access-decision:ledger-001',
    availability: 'available',
    provenanceRefs: ['shared-media:canonical-receipt:ledger-001'],
    observedAt: '2026-08-10T02:21:00Z',
    receiptBindings: [{
      projectionRef: 'shared-media:group-service:ledger-001',
      workItemRef: 'shared-media:group-work-item:ledger-001',
      request: req,
      receipt: stored,
    }],
    isJobAuthorized: async () => true,
  });
  assert.equal(response.schema, 'group.work-provider.response.v1');
  assert.equal(response.workItems.length, 1);
  assert.equal(response.workItems[0].status, 'awaiting_human_review');
  assert.equal(response.workItems[0].publicationAllowed, false);
  assert.equal('locator' in response.workItems[0].terminalEvidence, false);
  assert.equal(response.externalActionPerformed, false);
});

test('durable failed receipt feeds blocked provider work rather than success', async () => {
  const req = request();
  const stored = receipt(failed(req));
  const response = await buildSharedMediaProviderResponseFromCanonicalReceiptsV1({
    providerRequest: providerRequest(),
    accessDecision: 'allowed',
    accessDecisionRef: 'shared-media:access-decision:ledger-failed',
    availability: 'available',
    provenanceRefs: ['shared-media:canonical-receipt:ledger-failed'],
    observedAt: '2026-08-10T02:21:00Z',
    receiptBindings: [{
      projectionRef: 'shared-media:group-service:ledger-failed',
      workItemRef: 'shared-media:group-work-item:ledger-failed',
      request: req,
      receipt: stored,
    }],
    isJobAuthorized: async () => true,
  });
  assert.equal(response.workItems[0].status, 'blocked');
  assert.equal(response.workItems[0].nextAction, 'inspect_render_failure');
  assert.equal(response.workItems[0].publicationAllowed, false);
});

test('denied/unknown provider access never reads or smuggles canonical receipts', async () => {
  let reads = 0;
  const response = await buildSharedMediaProviderResponseFromCanonicalReceiptsV1({
    providerRequest: providerRequest(),
    accessDecision: 'denied',
    accessDecisionRef: 'shared-media:access-decision:denied',
    availability: 'unknown',
    provenanceRefs: ['shared-media:access:denied'],
    observedAt: '2026-08-10T02:21:00Z',
    receiptBindings: [],
    isJobAuthorized: async () => { reads += 1; return true; },
  });
  assert.equal(reads, 0);
  assert.deepEqual(response.workItems, []);
  await assert.rejects(() => buildSharedMediaProviderResponseFromCanonicalReceiptsV1({
    providerRequest: providerRequest(),
    accessDecision: 'denied',
    accessDecisionRef: 'shared-media:access-decision:denied',
    availability: 'unknown',
    provenanceRefs: ['shared-media:access:denied'],
    observedAt: '2026-08-10T02:21:00Z',
    receiptBindings: [{projectionRef: 'x', workItemRef: 'y', request: request(), receipt: receipt()}],
    isJobAuthorized: async () => true,
  }), /NON_AVAILABLE_CANONICAL_RECEIPTS_FORBIDDEN/);
});

test('rollout target is exact-SHA gated and still authorizes no runtime mutation', () => {
  const target = validateMacCanonicalReceiptRolloutTargetV1({
    serverSha256: EXPECTED_MAC_REMOTION_SERVER_SHA256,
    gitRepositoryObserved: false,
  });
  assert.equal(target.backupRequired, true);
  assert.equal(target.nodeCheckRequired, true);
  assert.equal(target.alternatePortVerificationRequired, true);
  assert.equal(target.healthCheckRequired, true);
  assert.equal(target.rollbackRequired, true);
  assert.equal(target.renderSubmissionAuthorized, false);
  assert.equal(target.serviceRestartAuthorized, false);
  assert.equal(target.runtimeMutationAuthorized, false);
});

test('rollout fails closed if live runtime SHA or ownership assumptions change', () => {
  assert.throws(() => validateMacCanonicalReceiptRolloutTargetV1({
    serverSha256: 'a'.repeat(64), gitRepositoryObserved: false,
  }), /MAC_RUNTIME_EXACT_SHA_MISMATCH/);
  assert.throws(() => validateMacCanonicalReceiptRolloutTargetV1({
    serverSha256: EXPECTED_MAC_REMOTION_SERVER_SHA256, gitRepositoryObserved: true,
  }), /MAC_RUNTIME_OWNERSHIP_ASSUMPTION_CHANGED/);
});
