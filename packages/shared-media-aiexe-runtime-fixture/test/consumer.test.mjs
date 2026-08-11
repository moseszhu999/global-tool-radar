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
} from '../src/consumer.mjs';

const runtimeSource = Object.freeze({
  repository: AIEXE_RUNTIME_REPOSITORY,
  exactHead: AIEXE_P3_1_EXACT_HEAD,
  contractStatus: 'draft_exact_head_fixture',
  liveRuntimeInvoked: false,
});

const controller = createSharedMediaMcpController({
  workflows: [],
  backend: {
    async generate() { throw new Error('generation outside observation fixture'); },
    async cancelJob() { throw new Error('cancel outside observation fixture'); },
    async getJob(jobId) { return {jobId, status: 'succeeded', requestId: 'media-request-1'}; },
    async getArtifact(artifactId) { return {artifactId, status: 'ready', mimeType: 'video/mp4', sha256: 'b'.repeat(64), sizeBytes: 4096}; },
  },
});

const envelope = (structuredContent) => ({content: [{type: 'text', text: JSON.stringify(structuredContent)}], structuredContent});

async function invocation(toolName, value = 'fixture-1') {
  if (toolName === 'media_get_artifact') {
    const artifactId = `artifact-${value}`;
    return {toolName, toolArguments: {artifactId}, mcpResult: envelope({artifact: await controller.getArtifact(artifactId)})};
  }
  const jobId = `job-${value}`;
  return {toolName, toolArguments: {jobId}, mcpResult: envelope({job: await controller.getJob(jobId)})};
}

function fixture(inv) {
  const requestDigest = aiexeDigest({requestId: 'req-shared-media-p4', tool: inv.toolName, args: inv.toolArguments});
  const planDigest = aiexeDigest({plan: 'shared-media-p4', requestDigest});
  const attemptDigest = aiexeDigest({attempt: 'shared-media-p4', requestDigest, planDigest});
  const attemptRef = `provattempt_${attemptDigest.slice(7,31)}`;
  const idempotencyKeyDigest = aiexeDigest('idem.shared-media-p4');
  const receiptCore = {
    schema: 'provider.execution.receipt.v1',
    requestId: 'req-shared-media-p4', requestDigest, planDigest,
    providerId: 'shared-media-mcp', providerContractId: 'prv.shared-media-mcp', providerManifestDigest: aiexeDigest({manifest: 'shared-media'}),
    protocolFamily: 'mcp', protocolVersion: AIEXE_MCP_PROTOCOL_VERSION, protocolOperation: 'tools/call',
    semanticOperationId: inv.toolName === 'media_get_artifact' ? 'inspect-artifact' : 'inspect-job',
    toolName: inv.toolName, riskClass: 'observe',
    authorizationDecisionRef: 'execauth_shared-media-p4', authorizationEvidenceDigest: aiexeDigest({authorization: 'approved-ref-only'}),
    endpointRef: 'endpoint.shared-media-local', credentialRefs: [], networkPolicyRef: 'network.loopback-shared-media',
    startedAt: '2026-08-11T16:30:00.100Z', completedAt: '2026-08-11T16:30:00.200Z', outcome: 'success',
    providerRequestId: 'mcp-request-shared-media-p4', responseDigest: aiexeDigest(inv.mcpResult),
    flags: {authorizationEvaluated: true, humanGateDecisionCreated: false, credentialResolved: false, networkPerformed: true, externalActionPerformed: false, automaticRetryPerformed: false},
  };
  const receiptDigest = aiexeDigest(receiptCore);
  const providerExecutionReceipt = {...receiptCore, executionRef: `provexec_${receiptDigest.slice(7,31)}`, receiptDigest};

  const outcomeCore = {
    schema: 'provider.execution.outcome.v1', attemptRef, attemptDigest,
    requestId: receiptCore.requestId, requestDigest, planDigest,
    providerId: receiptCore.providerId, providerContractId: receiptCore.providerContractId,
    protocolFamily: 'mcp', protocolVersion: AIEXE_MCP_PROTOCOL_VERSION, protocolOperation: 'tools/call',
    semanticOperationId: receiptCore.semanticOperationId, riskClass: 'observe',
    authorizationDecisionRef: receiptCore.authorizationDecisionRef, authorizationEvidenceDigest: receiptCore.authorizationEvidenceDigest,
    endpointRef: receiptCore.endpointRef, credentialRefs: [], networkPolicyRef: receiptCore.networkPolicyRef,
    startedAt: '2026-08-11T16:30:00.000Z', completedAt: '2026-08-11T16:30:00.300Z', outcome: 'success',
    knownFailureKind: null, statusCode: null, providerRequestId: receiptCore.providerRequestId, responseDigest: receiptCore.responseDigest, uncertainty: null,
    retry: {automaticRetryPerformed: false, reviewedRetryRequired: false, reviewedRetry: false, priorAttemptRef: null, idempotencyKeyDigest},
  };
  const providerExecutionOutcome = {...outcomeCore, outcomeDigest: aiexeDigest(outcomeCore)};
  const persistentClaim = {
    id: attemptRef, workspaceId: 'workspace.shared-media-fixture', schema: 'provider.execution.claim.v1', attemptRef, attemptDigest,
    attemptId: 'attempt-shared-media-p4', requestId: receiptCore.requestId, requestDigest, planDigest, idempotencyKeyDigest,
    priorAttemptRef: null, reviewedRetry: false, claimSemanticKey: `provider-initial-request:${requestDigest}`,
    status: 'success', claimedAt: '2026-08-11T16:29:59.900Z', outcomeClass: 'success', outcomeDigest: providerExecutionOutcome.outcomeDigest,
    completedAt: outcomeCore.completedAt, recoveryReason: null, effectMayHaveOccurred: false, reviewedRetryRequired: false, _projectionVersion: 2,
  };
  return {runtimeSource, ...inv, providerExecutionReceipt, providerExecutionOutcome, persistentClaim};
}

const receiptWith = (receipt, patch) => {
  const core = {...receipt, ...patch}; delete core.executionRef; delete core.receiptDigest;
  const receiptDigest = aiexeDigest(core);
  return {...core, executionRef: `provexec_${receiptDigest.slice(7,31)}`, receiptDigest};
};
const outcomeWith = (outcome, patch) => {
  const core = {...outcome, ...patch}; delete core.outcomeDigest;
  return {...core, outcomeDigest: aiexeDigest(core)};
};

test('artifact observation consumes current Shared Media controller result plus exact AIEXE evidence', async () => {
  const input = fixture(await invocation('media_get_artifact'));
  const evidence = consumeAiexeSharedMediaObservationEvidenceV1(input);
  assert.equal(evidence.schemaVersion, SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1);
  assert.equal(evidence.sharedMediaResultDigest, aiexeDigest(input.mcpResult));
  assert.equal(evidence.persistentClaimStatus, 'success');
  assert.equal(evidence.boundaries.runtimeInvokedByThisPackage, false);
  assert.equal(evidence.boundaries.externalActionPerformed, false);
});

test('job observation consumes current Shared Media controller result without domain-truth inference', async () => {
  const evidence = consumeAiexeSharedMediaObservationEvidenceV1(fixture(await invocation('media_get_job')));
  assert.equal(evidence.toolName, 'media_get_job');
  assert.equal(evidence.boundaries.technicalObservationOnly, true);
  assert.equal(evidence.boundaries.humanDecisionInferred, false);
  assert.equal(evidence.boundaries.businessOutcomeInferred, false);
});

test('write-capable and out-of-scope MCP tools are rejected', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  for (const toolName of ['media_generate_asset','media_cancel_job','media_list_workflows']) {
    assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, toolName}), /permits only read-only Shared Media tools/);
  }
});

test('runtime source remains pinned to exact unmerged P3.1 fixture and cannot claim live runtime', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  for (const patch of [
    {exactHead: '0'.repeat(40)}, {repository: 'other/runtime'}, {contractStatus: 'production'}, {liveRuntimeInvoked: true},
  ]) assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, runtimeSource: {...runtimeSource, ...patch}}), /runtimeSource/);
});

test('receipt responseDigest must bind exact Shared Media MCP result', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  const mcpResult = structuredClone(base.mcpResult); mcpResult.structuredContent.artifact.sizeBytes = 9999;
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, mcpResult}), /responseDigest does not match/);
});

test('receipt digest executionRef protocol tool and observe-risk boundaries fail closed on drift', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: {...base.providerExecutionReceipt, receiptDigest: aiexeDigest('wrong')}}), /receipt digest mismatch/);
  for (const patch of [{protocolVersion: '2026-07-28'}, {protocolOperation: 'resources/read'}, {toolName: 'media_get_job'}, {riskClass: 'draft'}]) {
    assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: receiptWith(base.providerExecutionReceipt, patch)}), /stable MCP|toolName|observe risk/);
  }
});

test('AIEXE authorization evidence refs are allowed while raw authorization secrets remain forbidden', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  assert.doesNotThrow(() => consumeAiexeSharedMediaObservationEvidenceV1(base));
  const mcpResult = structuredClone(base.mcpResult); mcpResult.structuredContent.artifact.authorization = 'Bearer raw-secret';
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, mcpResult}), /raw secret\/transport field|secret-shaped text/);
});

test('outcome must be digest-valid and exactly linked to receipt', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionOutcome: {...base.providerExecutionOutcome, outcomeDigest: aiexeDigest('wrong')}}), /outcome digest mismatch/);
  const drift = outcomeWith(base.providerExecutionOutcome, {requestDigest: aiexeDigest('different')});
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionOutcome: drift}), /does not match receipt/);
});

test('uncertain recovery and known-failure claims cannot be promoted into observation truth', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  for (const patch of [
    {status: 'uncertain', outcomeClass: 'uncertain', effectMayHaveOccurred: true, reviewedRetryRequired: true},
    {status: 'recovery_required', outcomeClass: 'uncertain', recoveryReason: 'PROCESS_RESTART_WITH_UNFINISHED_PROVIDER_CLAIM', effectMayHaveOccurred: true, reviewedRetryRequired: true},
    {status: 'known_failure', outcomeClass: 'known_failure'},
  ]) assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, persistentClaim: {...base.persistentClaim, ...patch}}), /terminal successful persistent claim/);
});

test('consumer-domain truth from a media result remains forbidden', async () => {
  const base = fixture(await invocation('media_get_job'));
  const mcpResult = structuredClone(base.mcpResult); mcpResult.structuredContent.job.publicationPerformed = true;
  assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, mcpResult}), /consumer-domain truth/);
});

test('external-action and automatic-retry receipt claims are rejected even with valid recomputed digest', async () => {
  const base = fixture(await invocation('media_get_artifact'));
  for (const flags of [
    {...base.providerExecutionReceipt.flags, externalActionPerformed: true},
    {...base.providerExecutionReceipt.flags, automaticRetryPerformed: true},
  ]) assert.throws(() => consumeAiexeSharedMediaObservationEvidenceV1({...base, providerExecutionReceipt: receiptWith(base.providerExecutionReceipt, {flags})}), /flags violate/);
});

test('evidence is deterministic and changes for a different exact artifact observation', async () => {
  const firstInput = fixture(await invocation('media_get_artifact','one'));
  const same = consumeAiexeSharedMediaObservationEvidenceV1(firstInput);
  assert.equal(same.evidenceDigest, consumeAiexeSharedMediaObservationEvidenceV1(firstInput).evidenceDigest);
  const different = consumeAiexeSharedMediaObservationEvidenceV1(fixture(await invocation('media_get_artifact','two')));
  assert.notEqual(same.toolArgumentsDigest, different.toolArgumentsDigest);
  assert.notEqual(same.sharedMediaResultDigest, different.sharedMediaResultDigest);
  assert.notEqual(same.evidenceDigest, different.evidenceDigest);
});
