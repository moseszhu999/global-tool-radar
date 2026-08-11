import {createHash} from 'node:crypto';

export const SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1 =
  'shared-media.aiexe-runtime-observation-evidence.v1';
export const AIEXE_P3_1_EXACT_HEAD = '28c7dd539a4a5f340a715a230bd05ce1c386d925';
export const AIEXE_RUNTIME_REPOSITORY = 'moseszhu999/ai_exe_os';
export const AIEXE_MCP_PROTOCOL_VERSION = '2025-11-25';

const ALLOWED_TOOLS = new Set(['media_get_job', 'media_get_artifact']);
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const HEX40 = /^[a-f0-9]{40}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const ATTEMPT_REF = /^provattempt_[a-f0-9]{24}$/;
const EXECUTION_REF = /^provexec_[a-f0-9]{24}$/;
const SECRET_KEY = /(authorization|bearer|token|secret|password|cookie|api[_-]?key|action_token|session)/i;
const SECRET_TEXT = /(?:Bearer\s+[A-Za-z0-9._~+\/-]+|sk-[A-Za-z0-9_-]{8,}|https?:\/\/[^\s]*@)/i;
const CONSUMER_TRUTH = /^(humanApproved|humanWatchedFullCandidate|socialPlatformBusinessFitApprovedByHuman|publicationAllowed|publicationPerformed|analyticsObserved)$/;

const plain = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
};
const requiredText = (value, label, max = 512) => {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) throw new TypeError(`${label} must be bounded non-empty text`);
  return value.trim();
};
const safeId = (value, label) => {
  const text = requiredText(value, label, 256);
  if (!SAFE_ID.test(text)) throw new TypeError(`${label} must be a safe identifier`);
  return text;
};
const sha = (value, label) => {
  const text = requiredText(value, label, 80);
  if (!SHA256.test(text)) throw new TypeError(`${label} must be a sha256: digest`);
  return text;
};
const instant = (value, label) => {
  const text = requiredText(value, label, 80);
  if (!text.includes('T') || !Number.isFinite(Date.parse(text))) throw new TypeError(`${label} must be an ISO-8601 instant`);
  return text;
};

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

export const aiexeDigest = (value) => `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;

const assertBoundedSafeJson = (value, label = 'value', depth = 0) => {
  if (depth > 24) throw new TypeError(`${label} exceeds maximum nesting depth`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 20000) throw new TypeError(`${label} contains oversized text`);
    if (SECRET_TEXT.test(value)) throw new TypeError(`${label} contains secret-shaped text`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new TypeError(`${label} contains too many array items`);
    value.forEach((item, index) => assertBoundedSafeJson(item, `${label}[${index}]`, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    if (Object.keys(value).length > 1000) throw new TypeError(`${label} contains too many fields`);
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) throw new TypeError(`${label}.${key} is secret-shaped and forbidden`);
      if (CONSUMER_TRUTH.test(key)) throw new TypeError(`${label}.${key} is consumer-domain truth and forbidden`);
      assertBoundedSafeJson(item, `${label}.${key}`, depth + 1);
    }
    return;
  }
  throw new TypeError(`${label} must be JSON-safe`);
};

const exactKeys = (object, allowed, label) => {
  for (const key of Object.keys(object)) if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field: ${key}`);
};

const assertTechnicalBoundary = (value, label) => {
  const object = plain(value, label);
  if (object.technicalResultOnly !== true
    || object.humanDecisionInferred !== false
    || object.consumerDomainDecisionInferred !== false
    || object.businessOutcomeInferred !== false) {
    throw new TypeError(`${label} does not preserve Shared Media technical truth boundary`);
  }
};

function normalizeRuntimeSource(value) {
  const source = plain(value, 'runtimeSource');
  exactKeys(source, new Set(['repository', 'exactHead', 'contractStatus', 'liveRuntimeInvoked']), 'runtimeSource');
  if (source.repository !== AIEXE_RUNTIME_REPOSITORY) throw new TypeError('runtimeSource.repository must bind exact AIEXE repository');
  if (!HEX40.test(source.exactHead) || source.exactHead !== AIEXE_P3_1_EXACT_HEAD) throw new TypeError('runtimeSource.exactHead must bind exact P3.1 head');
  if (source.contractStatus !== 'draft_exact_head_fixture') throw new TypeError('runtimeSource.contractStatus must remain draft_exact_head_fixture');
  if (source.liveRuntimeInvoked !== false) throw new TypeError('P4.1 fixture must not claim live AIEXE runtime invocation');
  return Object.freeze({...source});
}

function normalizeToolInvocation({toolName, toolArguments, mcpResult}) {
  const name = safeId(toolName, 'toolName');
  if (!ALLOWED_TOOLS.has(name)) throw new TypeError(`P4.1 permits only read-only Shared Media tools: ${name}`);
  const args = plain(toolArguments, 'toolArguments');
  exactKeys(args, new Set([name === 'media_get_job' ? 'jobId' : 'artifactId']), 'toolArguments');
  const idKey = name === 'media_get_job' ? 'jobId' : 'artifactId';
  requiredText(args[idKey], `toolArguments.${idKey}`, 256);
  const result = plain(mcpResult, 'mcpResult');
  assertBoundedSafeJson(result, 'mcpResult');
  const structured = plain(result.structuredContent, 'mcpResult.structuredContent');
  const payloadKey = name === 'media_get_job' ? 'job' : 'artifact';
  plain(structured[payloadKey], `mcpResult.structuredContent.${payloadKey}`);
  assertTechnicalBoundary(structured[payloadKey], `mcpResult.structuredContent.${payloadKey}`);
  if (!Array.isArray(result.content) || result.content.length < 1) throw new TypeError('mcpResult.content must contain MCP content');
  return Object.freeze({toolName: name, toolArguments: structuredClone(args), mcpResult: structuredClone(result)});
}

function normalizeReceipt(value, invocation) {
  const receipt = plain(value, 'providerExecutionReceipt');
  exactKeys(receipt, new Set([
    'schema','requestId','requestDigest','planDigest','providerId','providerContractId','providerManifestDigest',
    'protocolFamily','protocolVersion','protocolOperation','semanticOperationId','toolName','riskClass',
    'authorizationDecisionRef','authorizationEvidenceDigest','endpointRef','credentialRefs','networkPolicyRef',
    'startedAt','completedAt','outcome','providerRequestId','responseDigest','flags','executionRef','receiptDigest',
  ]), 'providerExecutionReceipt');
  if (receipt.schema !== 'provider.execution.receipt.v1') throw new TypeError('provider execution receipt schema mismatch');
  safeId(receipt.requestId, 'receipt.requestId');
  sha(receipt.requestDigest, 'receipt.requestDigest');
  sha(receipt.planDigest, 'receipt.planDigest');
  const providerId = safeId(receipt.providerId, 'receipt.providerId');
  if (receipt.providerContractId !== `prv.${providerId}`) throw new TypeError('receipt providerContractId mismatch');
  sha(receipt.providerManifestDigest, 'receipt.providerManifestDigest');
  if (receipt.protocolFamily !== 'mcp' || receipt.protocolVersion !== AIEXE_MCP_PROTOCOL_VERSION || receipt.protocolOperation !== 'tools/call') {
    throw new TypeError('receipt must be exact stable MCP tools/call');
  }
  if (receipt.toolName !== invocation.toolName) throw new TypeError('receipt toolName does not match Shared Media invocation');
  if (receipt.riskClass !== 'observe') throw new TypeError('P4.1 accepts observe risk only');
  safeId(receipt.semanticOperationId, 'receipt.semanticOperationId');
  safeId(receipt.authorizationDecisionRef, 'receipt.authorizationDecisionRef');
  sha(receipt.authorizationEvidenceDigest, 'receipt.authorizationEvidenceDigest');
  safeId(receipt.endpointRef, 'receipt.endpointRef');
  if (!Array.isArray(receipt.credentialRefs) || receipt.credentialRefs.length > 1) throw new TypeError('receipt credentialRefs are invalid');
  receipt.credentialRefs.forEach((ref) => safeId(ref, 'receipt.credentialRef'));
  safeId(receipt.networkPolicyRef, 'receipt.networkPolicyRef');
  instant(receipt.startedAt, 'receipt.startedAt');
  instant(receipt.completedAt, 'receipt.completedAt');
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt)) throw new TypeError('receipt timestamps are reversed');
  if (receipt.outcome !== 'success') throw new TypeError('P4.1 consumes successful observation receipt only');
  if (receipt.providerRequestId != null) requiredText(receipt.providerRequestId, 'receipt.providerRequestId', 300);
  const expectedResponseDigest = aiexeDigest(invocation.mcpResult);
  if (receipt.responseDigest !== expectedResponseDigest) throw new TypeError('receipt responseDigest does not match exact Shared Media MCP result');
  const flags = plain(receipt.flags, 'receipt.flags');
  exactKeys(flags, new Set(['authorizationEvaluated','humanGateDecisionCreated','credentialResolved','networkPerformed','externalActionPerformed','automaticRetryPerformed']), 'receipt.flags');
  if (flags.authorizationEvaluated !== true || flags.humanGateDecisionCreated !== false || flags.networkPerformed !== true
    || flags.externalActionPerformed !== false || flags.automaticRetryPerformed !== false || typeof flags.credentialResolved !== 'boolean') {
    throw new TypeError('receipt flags violate P2.3 observation boundary');
  }
  const suppliedDigest = sha(receipt.receiptDigest, 'receipt.receiptDigest');
  const core = {...receipt}; delete core.executionRef; delete core.receiptDigest;
  if (aiexeDigest(core) !== suppliedDigest) throw new TypeError('provider execution receipt digest mismatch');
  if (!EXECUTION_REF.test(receipt.executionRef) || receipt.executionRef !== `provexec_${suppliedDigest.slice(7,31)}`) {
    throw new TypeError('provider execution receipt executionRef mismatch');
  }
  assertBoundedSafeJson(receipt, 'providerExecutionReceipt');
  return Object.freeze(structuredClone(receipt));
}

function normalizeOutcome(value, receipt) {
  const outcome = plain(value, 'providerExecutionOutcome');
  exactKeys(outcome, new Set([
    'schema','attemptRef','attemptDigest','requestId','requestDigest','planDigest','providerId','providerContractId',
    'protocolFamily','protocolVersion','protocolOperation','semanticOperationId','riskClass','authorizationDecisionRef',
    'authorizationEvidenceDigest','endpointRef','credentialRefs','networkPolicyRef','startedAt','completedAt','outcome',
    'knownFailureKind','statusCode','providerRequestId','responseDigest','uncertainty','retry','outcomeDigest',
  ]), 'providerExecutionOutcome');
  if (outcome.schema !== 'provider.execution.outcome.v1') throw new TypeError('provider execution outcome schema mismatch');
  if (!ATTEMPT_REF.test(outcome.attemptRef)) throw new TypeError('outcome attemptRef is invalid');
  sha(outcome.attemptDigest, 'outcome.attemptDigest');
  if (outcome.attemptRef !== `provattempt_${outcome.attemptDigest.slice(7,31)}`) throw new TypeError('outcome attemptRef/digest mismatch');
  for (const key of ['requestId','requestDigest','planDigest','providerId','providerContractId','protocolFamily','protocolVersion','protocolOperation','semanticOperationId','riskClass','authorizationDecisionRef','authorizationEvidenceDigest','endpointRef','networkPolicyRef','providerRequestId','responseDigest']) {
    if ((outcome[key] ?? null) !== (receipt[key] ?? null)) throw new TypeError(`outcome ${key} does not match receipt`);
  }
  if (outcome.outcome !== 'success' || outcome.knownFailureKind !== null || outcome.uncertainty !== null) throw new TypeError('P4.1 outcome must be known success');
  if (outcome.statusCode !== null) throw new TypeError('MCP observation outcome statusCode must remain null');
  if (!Array.isArray(outcome.credentialRefs) || JSON.stringify(outcome.credentialRefs) !== JSON.stringify(receipt.credentialRefs)) throw new TypeError('outcome credentialRefs mismatch');
  instant(outcome.startedAt, 'outcome.startedAt');
  instant(outcome.completedAt, 'outcome.completedAt');
  const retry = plain(outcome.retry, 'outcome.retry');
  exactKeys(retry, new Set(['automaticRetryPerformed','reviewedRetryRequired','reviewedRetry','priorAttemptRef','idempotencyKeyDigest']), 'outcome.retry');
  if (retry.automaticRetryPerformed !== false || retry.reviewedRetryRequired !== false || retry.reviewedRetry !== false || retry.priorAttemptRef !== null) {
    throw new TypeError('P4.1 accepts initial successful attempt without retry');
  }
  sha(retry.idempotencyKeyDigest, 'outcome.retry.idempotencyKeyDigest');
  const supplied = sha(outcome.outcomeDigest, 'outcome.outcomeDigest');
  const core = {...outcome}; delete core.outcomeDigest;
  if (aiexeDigest(core) !== supplied) throw new TypeError('provider execution outcome digest mismatch');
  assertBoundedSafeJson(outcome, 'providerExecutionOutcome');
  return Object.freeze(structuredClone(outcome));
}

function normalizePersistentClaim(value, outcome) {
  const claim = plain(value, 'persistentClaim');
  const allowed = new Set([
    'id','workspaceId','schema','attemptRef','attemptDigest','attemptId','requestId','requestDigest','planDigest',
    'idempotencyKeyDigest','priorAttemptRef','reviewedRetry','claimSemanticKey','status','claimedAt','outcomeClass',
    'outcomeDigest','completedAt','recoveryReason','effectMayHaveOccurred','reviewedRetryRequired','_projectionVersion',
  ]);
  exactKeys(claim, allowed, 'persistentClaim');
  if (claim.schema !== 'provider.execution.claim.v1') throw new TypeError('persistent claim schema mismatch');
  if (claim.status !== 'success' || claim.outcomeClass !== 'success') throw new TypeError('P4.1 requires terminal successful persistent claim');
  if (claim.attemptRef !== outcome.attemptRef || claim.attemptDigest !== outcome.attemptDigest
    || claim.requestId !== outcome.requestId || claim.requestDigest !== outcome.requestDigest || claim.planDigest !== outcome.planDigest
    || claim.outcomeDigest !== outcome.outcomeDigest) throw new TypeError('persistent claim does not bind exact provider outcome');
  if (claim.id !== claim.attemptRef) throw new TypeError('persistent claim id must equal attemptRef');
  safeId(claim.workspaceId, 'persistentClaim.workspaceId');
  safeId(claim.attemptId, 'persistentClaim.attemptId');
  sha(claim.idempotencyKeyDigest, 'persistentClaim.idempotencyKeyDigest');
  if (claim.idempotencyKeyDigest !== outcome.retry.idempotencyKeyDigest) throw new TypeError('persistent claim idempotency digest mismatch');
  if (claim.reviewedRetry !== false || claim.priorAttemptRef !== null) throw new TypeError('P4.1 fixture accepts initial claim only');
  if (claim.claimSemanticKey !== `provider-initial-request:${claim.requestDigest}`) throw new TypeError('persistent initial claim semantic key mismatch');
  instant(claim.claimedAt, 'persistentClaim.claimedAt');
  instant(claim.completedAt, 'persistentClaim.completedAt');
  if (claim.recoveryReason !== null || claim.effectMayHaveOccurred !== false || claim.reviewedRetryRequired !== false) {
    throw new TypeError('successful persistent claim contains uncertainty/recovery state');
  }
  if (claim._projectionVersion != null && (!Number.isInteger(claim._projectionVersion) || claim._projectionVersion < 1)) throw new TypeError('persistent claim projection version is invalid');
  assertBoundedSafeJson(claim, 'persistentClaim');
  return Object.freeze(structuredClone(claim));
}

export function consumeAiexeSharedMediaObservationEvidenceV1({
  runtimeSource,
  toolName,
  toolArguments,
  mcpResult,
  providerExecutionReceipt,
  providerExecutionOutcome,
  persistentClaim,
} = {}) {
  const source = normalizeRuntimeSource(runtimeSource);
  const invocation = normalizeToolInvocation({toolName, toolArguments, mcpResult});
  const receipt = normalizeReceipt(providerExecutionReceipt, invocation);
  const outcome = normalizeOutcome(providerExecutionOutcome, receipt);
  const claim = normalizePersistentClaim(persistentClaim, outcome);

  if (claim.requestId !== receipt.requestId || claim.requestDigest !== receipt.requestDigest || claim.planDigest !== receipt.planDigest) {
    throw new TypeError('persistent claim does not bind exact provider receipt request/plan');
  }

  const core = {
    schemaVersion: SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1,
    runtimeSource: source,
    toolName: invocation.toolName,
    toolArgumentsDigest: aiexeDigest(invocation.toolArguments),
    sharedMediaResultDigest: receipt.responseDigest,
    requestId: receipt.requestId,
    requestDigest: receipt.requestDigest,
    planDigest: receipt.planDigest,
    providerId: receipt.providerId,
    providerContractId: receipt.providerContractId,
    providerManifestDigest: receipt.providerManifestDigest,
    attemptRef: outcome.attemptRef,
    attemptDigest: outcome.attemptDigest,
    executionRef: receipt.executionRef,
    receiptDigest: receipt.receiptDigest,
    outcomeDigest: outcome.outcomeDigest,
    persistentClaimStatus: claim.status,
    persistentClaimWorkspaceId: claim.workspaceId,
    observedAt: receipt.completedAt,
    boundaries: {
      technicalObservationOnly: true,
      sharedMediaToolReadOnly: true,
      runtimeEvidenceConsumedBySharedMedia: true,
      runtimeInvokedByThisPackage: false,
      liveRuntimeInvokedInFixture: false,
      generationSubmitted: false,
      cancellationPerformed: false,
      humanDecisionInferred: false,
      consumerDomainDecisionInferred: false,
      businessOutcomeInferred: false,
      publicationPerformed: false,
      externalActionPerformed: false,
    },
  };
  return Object.freeze({...core, evidenceDigest: aiexeDigest(core)});
}
