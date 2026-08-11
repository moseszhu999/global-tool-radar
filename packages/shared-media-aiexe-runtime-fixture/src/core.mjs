import {createHash} from 'node:crypto';

export const SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1 = 'shared-media.aiexe-runtime-observation-evidence.v1';
export const AIEXE_P3_1_EXACT_HEAD = '28c7dd539a4a5f340a715a230bd05ce1c386d925';
export const AIEXE_RUNTIME_REPOSITORY = 'moseszhu999/ai_exe_os';
export const AIEXE_MCP_PROTOCOL_VERSION = '2025-11-25';

const ALLOWED_TOOLS = new Set(['media_get_job', 'media_get_artifact']);
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const ATTEMPT_REF = /^provattempt_[a-f0-9]{24}$/;
const EXECUTION_REF = /^provexec_[a-f0-9]{24}$/;
const FORBIDDEN_SECRET_KEY = /^(authorization|bearer|token|secret|password|cookie|api[_-]?key|action_token|session|session_id)$/i;
const SECRET_TEXT = /(?:Bearer\s+[A-Za-z0-9._~+\/-]+|sk-[A-Za-z0-9_-]{8,}|https?:\/\/[^\s]*@)/i;
const CONSUMER_TRUTH = /^(humanApproved|humanWatchedFullCandidate|socialPlatformBusinessFitApprovedByHuman|publicationAllowed|publicationPerformed|analyticsObserved)$/;

const object = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
};
const text = (value, label, max = 512) => {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) throw new TypeError(`${label} must be bounded non-empty text`);
  return value.trim();
};
const id = (value, label) => {
  const normalized = text(value, label, 256);
  if (!SAFE_ID.test(normalized)) throw new TypeError(`${label} must be a safe identifier`);
  return normalized;
};
const digestValue = (value, label) => {
  const normalized = text(value, label, 80);
  if (!SHA256.test(normalized)) throw new TypeError(`${label} must be a sha256: digest`);
  return normalized;
};
const iso = (value, label) => {
  const normalized = text(value, label, 80);
  if (!normalized.includes('T') || !Number.isFinite(Date.parse(normalized))) throw new TypeError(`${label} must be an ISO-8601 instant`);
  return normalized;
};
const exactKeys = (value, allowed, label) => {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field: ${key}`);
};

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
export const aiexeDigest = (value) => `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;

const assertSafeEvidence = (value, label = 'value', depth = 0) => {
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
    value.forEach((item, index) => assertSafeEvidence(item, `${label}[${index}]`, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    if (Object.keys(value).length > 1000) throw new TypeError(`${label} contains too many fields`);
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_SECRET_KEY.test(key)) throw new TypeError(`${label}.${key} is a raw secret/transport field and forbidden`);
      if (CONSUMER_TRUTH.test(key)) throw new TypeError(`${label}.${key} is consumer-domain truth and forbidden`);
      assertSafeEvidence(item, `${label}.${key}`, depth + 1);
    }
    return;
  }
  throw new TypeError(`${label} must be JSON-safe`);
};

const assertTechnicalBoundary = (payload, label) => {
  const value = object(payload, label);
  if (value.technicalResultOnly !== true || value.humanDecisionInferred !== false
    || value.consumerDomainDecisionInferred !== false || value.businessOutcomeInferred !== false) {
    throw new TypeError(`${label} does not preserve Shared Media technical truth boundary`);
  }
};

const normalizeRuntimeSource = (input) => {
  const source = object(input, 'runtimeSource');
  exactKeys(source, new Set(['repository','exactHead','contractStatus','liveRuntimeInvoked']), 'runtimeSource');
  if (source.repository !== AIEXE_RUNTIME_REPOSITORY) throw new TypeError('runtimeSource.repository must bind exact AIEXE repository');
  if (source.exactHead !== AIEXE_P3_1_EXACT_HEAD) throw new TypeError('runtimeSource.exactHead must bind exact P3.1 head');
  if (source.contractStatus !== 'draft_exact_head_fixture') throw new TypeError('runtimeSource.contractStatus must remain draft_exact_head_fixture');
  if (source.liveRuntimeInvoked !== false) throw new TypeError('runtimeSource.liveRuntimeInvoked must remain false');
  return Object.freeze({...source});
};

const normalizeInvocation = ({toolName, toolArguments, mcpResult}) => {
  const name = id(toolName, 'toolName');
  if (!ALLOWED_TOOLS.has(name)) throw new TypeError(`P4.1 permits only read-only Shared Media tools: ${name}`);
  const args = object(toolArguments, 'toolArguments');
  const argumentKey = name === 'media_get_job' ? 'jobId' : 'artifactId';
  exactKeys(args, new Set([argumentKey]), 'toolArguments');
  text(args[argumentKey], `toolArguments.${argumentKey}`, 256);
  const result = object(mcpResult, 'mcpResult');
  assertSafeEvidence(result, 'mcpResult');
  if (!Array.isArray(result.content) || result.content.length < 1) throw new TypeError('mcpResult.content must contain MCP content');
  const structured = object(result.structuredContent, 'mcpResult.structuredContent');
  const payloadKey = name === 'media_get_job' ? 'job' : 'artifact';
  const payload = object(structured[payloadKey], `mcpResult.structuredContent.${payloadKey}`);
  assertTechnicalBoundary(payload, `mcpResult.structuredContent.${payloadKey}`);
  return Object.freeze({toolName: name, toolArguments: structuredClone(args), mcpResult: structuredClone(result)});
};

const normalizeReceipt = (input, invocation) => {
  const receipt = object(input, 'providerExecutionReceipt');
  exactKeys(receipt, new Set([
    'schema','requestId','requestDigest','planDigest','providerId','providerContractId','providerManifestDigest',
    'protocolFamily','protocolVersion','protocolOperation','semanticOperationId','toolName','riskClass',
    'authorizationDecisionRef','authorizationEvidenceDigest','endpointRef','credentialRefs','networkPolicyRef',
    'startedAt','completedAt','outcome','providerRequestId','responseDigest','flags','executionRef','receiptDigest',
  ]), 'providerExecutionReceipt');
  if (receipt.schema !== 'provider.execution.receipt.v1') throw new TypeError('provider execution receipt schema mismatch');
  id(receipt.requestId, 'receipt.requestId');
  digestValue(receipt.requestDigest, 'receipt.requestDigest');
  digestValue(receipt.planDigest, 'receipt.planDigest');
  const providerId = id(receipt.providerId, 'receipt.providerId');
  if (receipt.providerContractId !== `prv.${providerId}`) throw new TypeError('receipt providerContractId mismatch');
  digestValue(receipt.providerManifestDigest, 'receipt.providerManifestDigest');
  if (receipt.protocolFamily !== 'mcp' || receipt.protocolVersion !== AIEXE_MCP_PROTOCOL_VERSION || receipt.protocolOperation !== 'tools/call') {
    throw new TypeError('receipt must be exact stable MCP tools/call');
  }
  if (receipt.toolName !== invocation.toolName) throw new TypeError('receipt toolName does not match Shared Media invocation');
  if (receipt.riskClass !== 'observe') throw new TypeError('P4.1 accepts observe risk only');
  id(receipt.semanticOperationId, 'receipt.semanticOperationId');
  id(receipt.authorizationDecisionRef, 'receipt.authorizationDecisionRef');
  digestValue(receipt.authorizationEvidenceDigest, 'receipt.authorizationEvidenceDigest');
  id(receipt.endpointRef, 'receipt.endpointRef');
  id(receipt.networkPolicyRef, 'receipt.networkPolicyRef');
  if (!Array.isArray(receipt.credentialRefs) || receipt.credentialRefs.length > 1) throw new TypeError('receipt credentialRefs are invalid');
  receipt.credentialRefs.forEach((ref) => id(ref, 'receipt.credentialRef'));
  iso(receipt.startedAt, 'receipt.startedAt');
  iso(receipt.completedAt, 'receipt.completedAt');
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt)) throw new TypeError('receipt timestamps are reversed');
  if (receipt.outcome !== 'success') throw new TypeError('P4.1 consumes successful observation receipt only');
  if (receipt.providerRequestId != null) text(receipt.providerRequestId, 'receipt.providerRequestId', 300);
  if (receipt.responseDigest !== aiexeDigest(invocation.mcpResult)) throw new TypeError('receipt responseDigest does not match exact Shared Media MCP result');
  const flags = object(receipt.flags, 'receipt.flags');
  exactKeys(flags, new Set(['authorizationEvaluated','humanGateDecisionCreated','credentialResolved','networkPerformed','externalActionPerformed','automaticRetryPerformed']), 'receipt.flags');
  if (flags.authorizationEvaluated !== true || flags.humanGateDecisionCreated !== false || flags.networkPerformed !== true
    || flags.externalActionPerformed !== false || flags.automaticRetryPerformed !== false || typeof flags.credentialResolved !== 'boolean') {
    throw new TypeError('receipt flags violate P2.3 observation boundary');
  }
  const receiptDigest = digestValue(receipt.receiptDigest, 'receipt.receiptDigest');
  const core = {...receipt}; delete core.executionRef; delete core.receiptDigest;
  if (aiexeDigest(core) !== receiptDigest) throw new TypeError('provider execution receipt digest mismatch');
  if (!EXECUTION_REF.test(receipt.executionRef) || receipt.executionRef !== `provexec_${receiptDigest.slice(7,31)}`) throw new TypeError('provider execution receipt executionRef mismatch');
  assertSafeEvidence(receipt, 'providerExecutionReceipt');
  return Object.freeze(structuredClone(receipt));
};

const normalizeOutcome = (input, receipt) => {
  const outcome = object(input, 'providerExecutionOutcome');
  exactKeys(outcome, new Set([
    'schema','attemptRef','attemptDigest','requestId','requestDigest','planDigest','providerId','providerContractId',
    'protocolFamily','protocolVersion','protocolOperation','semanticOperationId','riskClass','authorizationDecisionRef',
    'authorizationEvidenceDigest','endpointRef','credentialRefs','networkPolicyRef','startedAt','completedAt','outcome',
    'knownFailureKind','statusCode','providerRequestId','responseDigest','uncertainty','retry','outcomeDigest',
  ]), 'providerExecutionOutcome');
  if (outcome.schema !== 'provider.execution.outcome.v1') throw new TypeError('provider execution outcome schema mismatch');
  digestValue(outcome.attemptDigest, 'outcome.attemptDigest');
  if (!ATTEMPT_REF.test(outcome.attemptRef) || outcome.attemptRef !== `provattempt_${outcome.attemptDigest.slice(7,31)}`) throw new TypeError('outcome attemptRef/digest mismatch');
  const linked = ['requestId','requestDigest','planDigest','providerId','providerContractId','protocolFamily','protocolVersion','protocolOperation','semanticOperationId','riskClass','authorizationDecisionRef','authorizationEvidenceDigest','endpointRef','networkPolicyRef','providerRequestId','responseDigest'];
  for (const key of linked) if ((outcome[key] ?? null) !== (receipt[key] ?? null)) throw new TypeError(`outcome ${key} does not match receipt`);
  if (!Array.isArray(outcome.credentialRefs) || JSON.stringify(outcome.credentialRefs) !== JSON.stringify(receipt.credentialRefs)) throw new TypeError('outcome credentialRefs mismatch');
  if (outcome.outcome !== 'success' || outcome.knownFailureKind !== null || outcome.uncertainty !== null || outcome.statusCode !== null) throw new TypeError('P4.1 outcome must be known MCP success');
  iso(outcome.startedAt, 'outcome.startedAt');
  iso(outcome.completedAt, 'outcome.completedAt');
  const retry = object(outcome.retry, 'outcome.retry');
  exactKeys(retry, new Set(['automaticRetryPerformed','reviewedRetryRequired','reviewedRetry','priorAttemptRef','idempotencyKeyDigest']), 'outcome.retry');
  if (retry.automaticRetryPerformed !== false || retry.reviewedRetryRequired !== false || retry.reviewedRetry !== false || retry.priorAttemptRef !== null) throw new TypeError('P4.1 accepts initial successful attempt without retry');
  digestValue(retry.idempotencyKeyDigest, 'outcome.retry.idempotencyKeyDigest');
  const outcomeDigest = digestValue(outcome.outcomeDigest, 'outcome.outcomeDigest');
  const core = {...outcome}; delete core.outcomeDigest;
  if (aiexeDigest(core) !== outcomeDigest) throw new TypeError('provider execution outcome digest mismatch');
  assertSafeEvidence(outcome, 'providerExecutionOutcome');
  return Object.freeze(structuredClone(outcome));
};

const normalizeClaim = (input, outcome) => {
  const claim = object(input, 'persistentClaim');
  exactKeys(claim, new Set([
    'id','workspaceId','schema','attemptRef','attemptDigest','attemptId','requestId','requestDigest','planDigest','idempotencyKeyDigest',
    'priorAttemptRef','reviewedRetry','claimSemanticKey','status','claimedAt','outcomeClass','outcomeDigest','completedAt','recoveryReason',
    'effectMayHaveOccurred','reviewedRetryRequired','_projectionVersion',
  ]), 'persistentClaim');
  if (claim.schema !== 'provider.execution.claim.v1') throw new TypeError('persistent claim schema mismatch');
  if (claim.status !== 'success' || claim.outcomeClass !== 'success') throw new TypeError('P4.1 requires terminal successful persistent claim');
  if (claim.id !== claim.attemptRef || claim.attemptRef !== outcome.attemptRef || claim.attemptDigest !== outcome.attemptDigest
    || claim.requestId !== outcome.requestId || claim.requestDigest !== outcome.requestDigest || claim.planDigest !== outcome.planDigest
    || claim.outcomeDigest !== outcome.outcomeDigest) throw new TypeError('persistent claim does not bind exact provider outcome');
  id(claim.workspaceId, 'persistentClaim.workspaceId');
  id(claim.attemptId, 'persistentClaim.attemptId');
  digestValue(claim.idempotencyKeyDigest, 'persistentClaim.idempotencyKeyDigest');
  if (claim.idempotencyKeyDigest !== outcome.retry.idempotencyKeyDigest) throw new TypeError('persistent claim idempotency digest mismatch');
  if (claim.reviewedRetry !== false || claim.priorAttemptRef !== null) throw new TypeError('P4.1 fixture accepts initial claim only');
  if (claim.claimSemanticKey !== `provider-initial-request:${claim.requestDigest}`) throw new TypeError('persistent initial claim semantic key mismatch');
  iso(claim.claimedAt, 'persistentClaim.claimedAt');
  iso(claim.completedAt, 'persistentClaim.completedAt');
  if (claim.recoveryReason !== null || claim.effectMayHaveOccurred !== false || claim.reviewedRetryRequired !== false) throw new TypeError('successful persistent claim contains uncertainty/recovery state');
  if (claim._projectionVersion != null && (!Number.isInteger(claim._projectionVersion) || claim._projectionVersion < 1)) throw new TypeError('persistent claim projection version is invalid');
  assertSafeEvidence(claim, 'persistentClaim');
  return Object.freeze(structuredClone(claim));
};

export function consumeAiexeSharedMediaObservationEvidenceCoreV1(input = {}) {
  const runtimeSource = normalizeRuntimeSource(input.runtimeSource);
  const invocation = normalizeInvocation(input);
  const receipt = normalizeReceipt(input.providerExecutionReceipt, invocation);
  const outcome = normalizeOutcome(input.providerExecutionOutcome, receipt);
  const claim = normalizeClaim(input.persistentClaim, outcome);
  if (claim.requestId !== receipt.requestId || claim.requestDigest !== receipt.requestDigest || claim.planDigest !== receipt.planDigest) throw new TypeError('persistent claim does not bind exact provider receipt request/plan');

  const core = {
    schemaVersion: SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1,
    runtimeSource,
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
