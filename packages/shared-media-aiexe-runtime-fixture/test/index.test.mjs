import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedMediaMcpController} from '../../shared-media-mcp-adapter/src/index.mjs';
import {
  AIEXE_MCP_PROTOCOL_VERSION,
  AIEXE_P3_1_EXACT_HEAD,
  AIEXE_RUNTIME_REPOSITORY,
  SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1,
  aiexeDigest,
  consumeAiexeSharedMediaObservationEvidenceV1,
} from '../src/index.mjs';

const runtimeSource = Object.freeze({
  repository: AIEXE_RUNTIME_REPOSITORY,
  exactHead: AIEXE_P3_1_EXACT_HEAD,
  contractStatus: 'draft_exact_head_fixture',
  liveRuntimeInvoked: false,
});

const backend = Object.freeze({
  async generate() { throw new Error('generation is outside P4.1 observation fixture'); },
  async getJob(jobId) {
    return {jobId, status: 'succeeded', requestId: 'media-request-1', inputManifestDigest: 'a'.repeat(64)};
  },
  async getArtifact(artifactId) {
    return {artifactId, status: 'ready', mimeType: 'video/mp4', sha256: 'b'.repeat(64), sizeBytes: 4096};
  },
  async cancelJob() { throw new Error('cancellation is outside P4.1 observation fixture'); },
});

const controller = createSharedMediaMcpController({workflows: [], backend});

const mcpEnvelope = (structuredContent) => Object.freeze({
  content: Object.freeze([{type: 'text', text: JSON.stringify(structuredContent)}]),
  structuredContent: Object.freeze(structuredContent),
});

async function artifactInvocation() {
  const artifact = await controller.getArtifact('artifact-fixture-1');
  return {
    toolName: 'media_get_artifact',
    toolArguments: {artifactId: 'artifact-fixture-1'},
    mcpResult: mcpEnvelope({artifact}),
  };
}

async function jobInvocation() {
  const job = await controller.getJob('job-fixture-1');
  return {
    toolName: 'media_get_job',
    toolArguments: {jobId: 'job-fixture-1'},
    mcpResult: mcpEnvelope({job}),
  };
}

function executionEvidence(invocation, overrides = {}) {
  const requestDigest = aiexeDigest({fixture: 'request', tool: invocation.toolName});
  const planDigest = aiexeDigest({fixture: 'plan', requestDigest});
  const attemptDigest = aiexeDigest({fixture: 'attempt', requestDigest, planDigest});
  const attemptRef = `provattempt_${attemptDigest.slice(7,31)}`;
  const idempotencyKeyDigest = aiexeDigest('idem.shared-media-p4.1');
  const receiptCore = {
    schema: 'provider.execution.receipt.v1',
    requestId: 'req-shared-media-observe-1',
    requestDigest,
    planDigest,
    providerId: 'shared-media-mcp',
    providerContractId: 'prv.shared-media-mcp',
    providerManifestDigest: aiexeDigest({fixture: 'manifest'}),
    protocolFamily: 'mcp',
    protocolVersion: AIEXE_MCP_PROTOCOL_VERSION,
    protocolOperation: 'tools/call',
    semanticOperationId: invocation.toolName === 'media_get_artifact' ? 'inspect-artifact' : 'inspect-job',
    toolName: invocation.toolName,
    riskClass: 'observe',
    authorizationDecisionRef: 'execauth_shared-media-p4',
    authorizationEvidenceDigest: aiexeDigest({fixture: 'authorization'}),
    endpointRef: 'endpoint.shared-media-local',
    credentialRefs: [],
    networkPolicyRef: 'network.loopback-shared-media',
    startedAt: '2026-08-11T16:30:00.100Z',
    completedAt: '2026-08-11T16:30:00.200Z',
    outcome: 'success',
    providerRequestId: 'mcp-request-shared-media-p4',
    responseDigest: aiexeDigest(invocation.mcpResult),
    flags: {
      authorizationEvaluated: true,
      humanGateDecisionCreated: false,
      credentialResolved: false,
      networkPerformed: true,
      externalActionPerformed: false,
      automaticRetryPerformed: false,
    },
  };
  const receiptDigest = aiexeDigest(receiptCore);
  const receipt = {
    ...receiptCore,
    executionRef: `provexec_${receiptDigest.slice(7,31)}`,
    receiptDigest,
  };

  const outcomeCore = {
    schema: 'provider.execution.outcome.v1',
    attemptRef,
    attemptDigest,
    requestId: receipt.requestId,
    requestDigest: receipt.requestDigest,
    planDigest: receipt.planDigest,
    providerId: receipt.providerId,
    providerContractId: receipt.providerContractId,
    protocolFamily: receipt.protocolFamily,
    protocolVersion: receipt.protocolVersion,
    protocolOperation: receipt.protocolOperation,
    semanticOperationId: receipt.semanticOperationId,
    riskClass: receipt.riskClass,
    authorizationDecisionRef: receipt.authorizationDecisionRef,
    authorizationEvidenceDigest: receipt.authorizationEvidenceDigest,
    endpointRef: receipt.endpointRef,
    credentialRefs: receipt.credentialRefs,
    networkPolicyRef: receipt.networkPolicyRef,
    startedAt: '2026-08-11T16:30:00.000Z',
    completedAt: '2026-08-11T16:30:00.300Z',
    outcome: 'success',
    knownFailureKind: null,
    statusCode: null,
    providerRequestId: receipt.providerRequestId,
    responseDigest: receipt.responseDigest,
    uncertainty: null,
    retry: {
      automaticRetryPerformed: false,
      reviewedRetryRequired: false,
      reviewedRetry: false,
      priorAttemptRef: null,
      idempotencyKeyDigest,
    },
  };
  const outcome = {...outcomeCore, outcomeDigest: aiexeDigest(outcomeCore)};
  const claim = {
    id: attemptRef,
    workspaceId: 'workspace.shared-media-fixture',
    schema: 'provider.execution.claim.v1',
    attemptRef,
    attemptDigest,
    attemptId: 'attempt-shared-media-p4',
    requestId: receipt.requestId,
    requestDigest: receipt.requestDigest,
    planDigest: receipt.planDigest,
    idempotencyKeyDigest,
    priorAttemptRef: null,
    reviewedRetry: false,
    claimSemanticKey: `provider-initial-request:${receipt.requestDigest}`,
    status: 'success',
    claimedAt: '2026-08-11T16:29:59.900Z',
    outcomeClass: 'success',
    outcomeDigest: outcome.outcomeDigest,
    completedAt: outcome.completedAt,
    recoveryReason: null,
    effectMayHaveOccurred: false,
    reviewedRetryRequired: false,
    _projectionVersion: 2,
  };

  return {
    runtimeSource,
    ...invocation,
    providerExecutionReceipt: receipt,
    providerExecutionOutcome: outcome,
    persistentClaim: claim,
    ...overrides,
  };
}

const recomputeReceipt = (receipt) => {
  const core = {...receipt}; delete core.executionRef; delete core.receiptDigest;
  const receiptDigest = aiexeDigest(core);
  return {...core, executionRef: `provexec_${receiptDigest.slice(7,31)}`, receiptDigest};
};

const recomputeOutcome = (outcome) => {
  const core = {...outcome}; delete core.outcomeDigest;
  return {...core, outcomeDigest: aiexeDigest(core)};
};

test('consumes exact AIEXE P3.1 evidence for current Shared Media media_get_artifact technical result', async () => {
  const invocation = await artifactInvocation();
  const evidence = consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence(invocation));
  assert.equal(evidence.schemaVersion, SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1);
  assert.equal(evidence.toolName, 'media_get_artifact');
  assert.equal(evidence.sharedMediaResultDigest, aiexeDigest(invocation.mcpResult));
  assert.equal(evidence.persistentClaimStatus, 'success');
  assert.equal(evidence.boundaries.runtimeEvidenceConsumedBySharedMedia, true);
  assert.equal(evidence.boundaries.runtimeInvokedByThisPackage, false);
  assert.equal(evidence.boundaries.liveRuntimeInvokedInFixture, false);
  assert.equal(evidence.boundaries.externalActionPerformed, false);
});

test('consumes exact AIEXE P3.1 evidence for current Shared Media media_get_job technical result', async () => {
  const invocation = await jobInvocation();
  const evidence = consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence(invocation));
  assert.equal(evidence.toolName, 'media_get_job');
  assert.equal(evidence.boundaries.sharedMediaToolReadOnly, true);
  assert.equal(evidence.boundaries.generationSubmitted, false);
  assert.equal(evidence.boundaries.cancellationPerformed, false);
});

test('rejects generation and cancellation tools instead of widening AIEXE observe authority', async () => {
  const invocation = await artifactInvocation();
  for (const toolName of ['media_generate_asset', 'media_cancel_job', 'media_list_workflows']) {
    assert.throws(
      () => consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence({...invocation, toolName})),
      /permits only read-only Shared Media tools/,
    );
  }
});

test('runtime source is pinned to exact AIEXE P3.1 draft head and cannot claim live invocation', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  for (const runtimeSource of [
    {...base.runtimeSource, exactHead: '0'.repeat(40)},
    {...base.runtimeSource, contractStatus: 'production'},
    {...base.runtimeSource, liveRuntimeInvoked: true},
    {...base.runtimeSource, repository: 'other/runtime'},
  ]) {
    assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, runtimeSource}), /runtimeSource/);
  }
});

test('receipt responseDigest must bind the exact Shared Media MCP result bytes semantically', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  const changedResult = structuredClone(invocation.mcpResult);
  changedResult.structuredContent.artifact.sizeBytes = 8192;
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({...base, mcpResult: changedResult}),
    /responseDigest does not match/,
  );
});

test('tampered AIEXE receipt digest or executionRef fails closed', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: {...base.providerExecutionReceipt, receiptDigest: aiexeDigest('tampered')}}),
    /receipt digest mismatch/,
  );
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: {...base.providerExecutionReceipt, executionRef: 'provexec_000000000000000000000000'}}),
    /executionRef mismatch/,
  );
});

test('protocol tool and semantic-risk drift cannot become Shared Media observation evidence', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  for (const patch of [
    {protocolVersion: '2026-07-28'},
    {protocolOperation: 'resources/read'},
    {toolName: 'media_get_job'},
    {riskClass: 'draft'},
  ]) {
    const receipt = recomputeReceipt({...base.providerExecutionReceipt, ...patch});
    assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: receipt}), /stable MCP|toolName|observe risk/);
  }
});

test('provider execution outcome must be digest-valid and exactly linked to receipt', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionOutcome: {...base.providerExecutionOutcome, outcomeDigest: aiexeDigest('wrong')}}),
    /outcome digest mismatch/,
  );
  const drift = recomputeOutcome({...base.providerExecutionOutcome, requestDigest: aiexeDigest('different-request')});
  assert.throws(
    () => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionOutcome: drift}),
    /does not match receipt/,
  );
});

test('uncertain recovery or non-success persistent claim cannot be promoted into Shared Media technical observation truth', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  for (const patch of [
    {status: 'uncertain', outcomeClass: 'uncertain', effectMayHaveOccurred: true, reviewedRetryRequired: true},
    {status: 'recovery_required', outcomeClass: 'uncertain', recoveryReason: 'PROCESS_RESTART_WITH_UNFINISHED_PROVIDER_CLAIM', effectMayHaveOccurred: true, reviewedRetryRequired: true},
    {status: 'known_failure', outcomeClass: 'known_failure'},
  ]) {
    assert.throws(
      () => consumeAiexeSharedMediaObservationEvidenceV1({...base, persistentClaim: {...base.persistentClaim, ...patch}}),
      /terminal successful persistent claim/,
    );
  }
});

test('secret-shaped or consumer-domain truth in Shared Media MCP results is rejected', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  for (const artifactPatch of [
    {authorization: 'Bearer should-never-cross'},
    {publicationPerformed: true},
    {nested: {api_key: 'secret-value'}},
  ]) {
    const mcpResult = structuredClone(invocation.mcpResult);
    Object.assign(mcpResult.structuredContent.artifact, artifactPatch);
    assert.throws(
      () => consumeAiexeSharedMediaObservationEvidenceV1({...base, mcpResult}),
      /secret-shaped|consumer-domain truth/,
    );
  }
});

test('external-action or automatic-retry claims are rejected even with recomputed receipt digest', async () => {
  const invocation = await artifactInvocation();
  const base = executionEvidence(invocation);
  for (const flags of [
    {...base.providerExecutionReceipt.flags, externalActionPerformed: true},
    {...base.providerExecutionReceipt.flags, automaticRetryPerformed: true},
  ]) {
    const receipt = recomputeReceipt({...base.providerExecutionReceipt, flags});
    assert.throws(
      () => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: receipt}),
      /flags violate/,
    );
  }
});

test('consumer evidence is deterministic for exact artifacts and changes when exact tool arguments change', async () => {
  const invocation = await artifactInvocation();
  const first = consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence(invocation));
  const second = consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence(invocation));
  assert.equal(first.evidenceDigest, second.evidenceDigest);

  const changed = {...invocation, toolArguments: {artifactId: 'artifact-fixture-2'}};
  const changedEvidence = consumeAiexeSharedMediaObservationEvidenceV1(executionEvidence(changed));
  assert.notEqual(first.toolArgumentsDigest, changedEvidence.toolArgumentsDigest);
  assert.notEqual(first.evidenceDigest, changedEvidence.evidenceDigest);
});
