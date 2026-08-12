import { createHash } from 'node:crypto';
import { projectMediaRenderResultForGroupService } from '../../shared-media-group-service-adapter/src/index.mjs';

export const SHARED_MEDIA_GROUP_CONTENT_LOOP_V1 = 'shared-media.group-content-loop.v1';
export const SHARED_MEDIA_GROUP_CONTENT_LOOP_ACTION = 'content_candidate_prepare';

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CODE = /^[a-z][a-z0-9._-]{0,95}$/;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:._@/-]{0,255}$/;
const REQUIRED_METRICS = Object.freeze([
  'outcome', 'human_minutes', 'cycle_time_ms', 'cost_usd',
  'error_count', 'reversal_count', 'human_takeover',
]);
const REVIEW_CHECKS = Object.freeze([
  'content_accuracy', 'rights_privacy_brand', 'visual_quality',
  'voice_caption_quality', 'channel_fit',
]);

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}
function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field: ${key}`);
}
function text(value, label, max = 4096) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) throw new TypeError(`${label} must be bounded non-empty text`);
  return value.trim();
}
function code(value, label) {
  const normalized = text(value, label, 96);
  if (!CODE.test(normalized)) throw new TypeError(`${label} must be a bounded code`);
  return normalized;
}
function ref(value, label, prefix = null) {
  const normalized = text(value, label, 256);
  if (/@[^/\s]+\.[A-Za-z]{2,}/.test(normalized)) throw new TypeError(`${label} must not contain email-like PII`);
  if (!SAFE_REF.test(normalized)) throw new TypeError(`${label} must be a safe reference`);
  if (prefix && !normalized.startsWith(prefix)) throw new TypeError(`${label} must start with ${prefix}`);
  return normalized;
}
function sha(value, label) {
  const normalized = text(value, label, 80).toLowerCase();
  if (!SHA256.test(normalized)) throw new TypeError(`${label} must be sha256:<64 lowercase hex>`);
  return normalized;
}
function instant(value, label) {
  const normalized = text(value, label, 80);
  if (!normalized.endsWith('Z') || !Number.isFinite(Date.parse(normalized))) throw new TypeError(`${label} must be an ISO-8601 UTC instant`);
  return new Date(normalized).toISOString();
}
function boundedIntOrNull(value, label, min, max) {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`${label} must be null or an integer between ${min} and ${max}`);
  return value;
}
function uniqueCodes(value, label, min = 0, max = 32) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new TypeError(`${label} must be a bounded array`);
  const normalized = value.map((item) => code(item, label));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${label} must not contain duplicates`);
  return Object.freeze([...normalized].sort());
}
function uniqueRefs(value, label, prefix, min = 1, max = 64) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new TypeError(`${label} must be a bounded reference array`);
  const normalized = value.map((item) => ref(item, label, prefix));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${label} must not contain duplicates`);
  return Object.freeze([...normalized].sort());
}
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function digest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeGroupBinding(input) {
  const binding = object(input, 'groupBinding');
  exactKeys(binding, new Set([
    'workEntryRef', 'workEntryDigest', 'autonomyPolicyRef', 'autonomyPolicyDigest',
    'actionCode', 'ownerDomain', 'autonomyLevel',
  ]), 'groupBinding');
  if (binding.actionCode !== SHARED_MEDIA_GROUP_CONTENT_LOOP_ACTION) throw new TypeError('groupBinding.actionCode mismatch');
  if (binding.ownerDomain !== 'shared-media') throw new TypeError('groupBinding.ownerDomain must be shared-media');
  if (!['L0', 'L1'].includes(binding.autonomyLevel)) throw new TypeError('groupBinding.autonomyLevel must be L0 or L1');
  return Object.freeze({
    workEntryRef: ref(binding.workEntryRef, 'groupBinding.workEntryRef', 'group:work-entry:'),
    workEntryDigest: sha(binding.workEntryDigest, 'groupBinding.workEntryDigest'),
    autonomyPolicyRef: ref(binding.autonomyPolicyRef, 'groupBinding.autonomyPolicyRef', 'group:autonomy-policy:'),
    autonomyPolicyDigest: sha(binding.autonomyPolicyDigest, 'groupBinding.autonomyPolicyDigest'),
    actionCode: SHARED_MEDIA_GROUP_CONTENT_LOOP_ACTION,
    ownerDomain: 'shared-media',
    autonomyLevel: binding.autonomyLevel,
  });
}

function normalizeIdea(input) {
  const idea = object(input, 'contentIdea');
  exactKeys(idea, new Set([
    'ideaRef', 'workspaceId', 'actorRef', 'audienceCodes', 'channelCodes',
    'targetDurationSeconds', 'sourceEvidenceRefs', 'blockerCodes',
  ]), 'contentIdea');
  return Object.freeze({
    ideaRef: ref(idea.ideaRef, 'contentIdea.ideaRef', 'shared-media:content-idea:'),
    workspaceId: ref(idea.workspaceId, 'contentIdea.workspaceId'),
    actorRef: ref(idea.actorRef, 'contentIdea.actorRef'),
    audienceCodes: uniqueCodes(idea.audienceCodes, 'contentIdea.audienceCodes', 0, 24),
    channelCodes: uniqueCodes(idea.channelCodes, 'contentIdea.channelCodes', 0, 16),
    targetDurationSeconds: boundedIntOrNull(idea.targetDurationSeconds, 'contentIdea.targetDurationSeconds', 5, 3600),
    sourceEvidenceRefs: uniqueRefs(idea.sourceEvidenceRefs, 'contentIdea.sourceEvidenceRefs', 'evidence:', 1, 64),
    blockerCodes: uniqueCodes(idea.blockerCodes, 'contentIdea.blockerCodes', 0, 32),
  });
}

function normalizeScript(input, idea, observedAt) {
  if (input == null) return null;
  const script = object(input, 'scriptDraft');
  exactKeys(script, new Set([
    'scriptRef', 'artifactDigest', 'workEvidenceRef', 'workEvidenceDigest', 'workspaceId', 'actorRef', 'observedAt',
  ]), 'scriptDraft');
  const normalized = Object.freeze({
    scriptRef: ref(script.scriptRef, 'scriptDraft.scriptRef', 'shared-media:script-draft:'),
    artifactDigest: sha(script.artifactDigest, 'scriptDraft.artifactDigest'),
    workEvidenceRef: ref(script.workEvidenceRef, 'scriptDraft.workEvidenceRef', 'evidence:'),
    workEvidenceDigest: sha(script.workEvidenceDigest, 'scriptDraft.workEvidenceDigest'),
    workspaceId: ref(script.workspaceId, 'scriptDraft.workspaceId'),
    actorRef: ref(script.actorRef, 'scriptDraft.actorRef'),
    observedAt: instant(script.observedAt, 'scriptDraft.observedAt'),
  });
  if (normalized.workspaceId !== idea.workspaceId) throw new TypeError('scriptDraft Workspace must match content idea Workspace');
  if (normalized.actorRef !== idea.actorRef) throw new TypeError('scriptDraft actor must match content idea actor');
  if (Date.parse(normalized.observedAt) > Date.parse(observedAt)) throw new TypeError('scriptDraft cannot be newer than observedAt');
  return normalized;
}

function normalizeRenderObservation(input, scriptDraft, observedAt) {
  if (input == null) return null;
  if (!scriptDraft) throw new TypeError('renderObservation requires scriptDraft evidence first');
  const render = object(input, 'renderObservation');
  exactKeys(render, new Set([
    'projectionRef', 'workItemRef', 'accessContext', 'result', 'sourceObservedAt', 'maxAgeSeconds',
  ]), 'renderObservation');
  return projectMediaRenderResultForGroupService({
    projectionRef: render.projectionRef,
    workItemRef: render.workItemRef,
    accessContext: render.accessContext,
    consumerDomain: 'pr-growth',
    result: render.result,
    sourceObservedAt: render.sourceObservedAt,
    observedAt,
    maxAgeSeconds: render.maxAgeSeconds ?? 900,
  });
}

function requirementGaps(idea) {
  const gaps = [];
  if (idea.audienceCodes.length === 0) gaps.push('audience_missing');
  if (idea.channelCodes.length === 0) gaps.push('channel_missing');
  if (!idea.targetDurationSeconds) gaps.push('target_duration_missing');
  return Object.freeze(gaps);
}

function deriveRoute(idea, gaps, scriptDraft, renderProjection) {
  if (idea.blockerCodes.length > 0) return { state: 'blocked', reasonCode: 'explicit_content_blocker_present', ownerReviewRequired: true };
  if (gaps.length > 0) return { state: 'needs_idea_clarification', reasonCode: 'content_idea_fields_missing', ownerReviewRequired: true };
  if (!scriptDraft) return { state: 'script_draft_planned', reasonCode: 'structured_content_idea_ready', ownerReviewRequired: false };
  if (!renderProjection) return { state: 'render_candidate_planned', reasonCode: 'script_draft_evidence_observed', ownerReviewRequired: false };
  if (renderProjection.workItem.freshness !== 'fresh') return { state: 'render_blocked', reasonCode: 'render_observation_stale', ownerReviewRequired: true };
  switch (renderProjection.workItem.status) {
    case 'pending':
    case 'in_progress':
      return { state: 'render_in_progress', reasonCode: renderProjection.workItem.reasonCode, ownerReviewRequired: false };
    case 'blocked':
      return { state: 'render_blocked', reasonCode: renderProjection.workItem.reasonCode, ownerReviewRequired: true };
    case 'cancelled':
      return { state: 'cancelled', reasonCode: renderProjection.workItem.reasonCode, ownerReviewRequired: true };
    case 'awaiting_human_review':
      return { state: 'prepublication_review_ready', reasonCode: 'technical_render_ready_for_human_review', ownerReviewRequired: true };
    default:
      throw new TypeError(`unsupported group render status: ${renderProjection.workItem.status}`);
  }
}

function prePublicationPack(route, idea, scriptDraft, renderProjection) {
  const ready = route.state === 'prepublication_review_ready';
  return Object.freeze({
    packStatus: ready ? 'review_ready' : 'not_ready',
    ideaRef: idea.ideaRef,
    scriptRef: scriptDraft?.scriptRef ?? null,
    scriptArtifactDigest: scriptDraft?.artifactDigest ?? null,
    renderWorkItemRef: renderProjection?.workItem?.workItemRef ?? null,
    renderWorkItemDigest: renderProjection?.workItem?.workItemDigest ?? null,
    renderArtifactEvidence: renderProjection?.workItem?.terminalEvidence ?? null,
    reviewChecklist: Object.freeze(REVIEW_CHECKS.map((checkId) => Object.freeze({ checkId, status: 'pending_human_review' }))),
    humanDecisionRequired: ready,
    humanReviewCompleted: false,
    approvalDecisionCreated: false,
    publicationAllowed: false,
    publicationPerformed: false,
    externalActionPerformed: false,
  });
}

export function buildSharedMediaGroupContentLoopV1(input = {}) {
  const root = object(input, 'input');
  exactKeys(root, new Set(['groupBinding', 'contentIdea', 'scriptDraft', 'renderObservation', 'observedAt']), 'input');
  const observedAt = instant(root.observedAt, 'observedAt');
  const groupBinding = normalizeGroupBinding(root.groupBinding);
  const contentIdea = normalizeIdea(root.contentIdea);
  const gaps = requirementGaps(contentIdea);
  const scriptDraft = normalizeScript(root.scriptDraft, contentIdea, observedAt);
  if ((gaps.length > 0 || contentIdea.blockerCodes.length > 0) && scriptDraft) throw new TypeError('scriptDraft is forbidden while content idea is incomplete or blocked');
  const renderProjection = normalizeRenderObservation(root.renderObservation, scriptDraft, observedAt);
  if ((gaps.length > 0 || contentIdea.blockerCodes.length > 0) && renderProjection) throw new TypeError('renderObservation is forbidden while content idea is incomplete or blocked');
  const route = deriveRoute(contentIdea, gaps, scriptDraft, renderProjection);
  const core = {
    schemaVersion: SHARED_MEDIA_GROUP_CONTENT_LOOP_V1,
    groupBinding,
    contentIdea,
    scriptEvidence: scriptDraft ? Object.freeze({
      scriptRef: scriptDraft.scriptRef,
      artifactDigest: scriptDraft.artifactDigest,
      workEvidenceRef: scriptDraft.workEvidenceRef,
      workEvidenceDigest: scriptDraft.workEvidenceDigest,
      observedAt: scriptDraft.observedAt,
      scriptTextCopiedIntoLoop: false,
    }) : null,
    renderEvidence: renderProjection ? Object.freeze({
      projectionRef: renderProjection.projectionRef,
      projectionDigest: renderProjection.projectionDigest,
      workItemRef: renderProjection.workItem.workItemRef,
      workItemDigest: renderProjection.workItem.workItemDigest,
      status: renderProjection.workItem.status,
      freshness: renderProjection.workItem.freshness,
      terminalEvidence: renderProjection.workItem.terminalEvidence,
      technicalResultOnly: true,
      humanDecisionInferred: false,
      publicationAllowed: false,
      publicationPerformed: false,
    }) : null,
    route: Object.freeze({
      ...route,
      requirementGapCodes: gaps,
      scriptObserved: Boolean(scriptDraft),
      renderObserved: Boolean(renderProjection),
    }),
    prePublicationPack: prePublicationPack(route, contentIdea, scriptDraft, renderProjection),
    businessEvalHandoff: Object.freeze({
      groupBusinessEvalCreated: false,
      measuredOutcomeRequired: true,
      requiredMetrics: REQUIRED_METRICS,
      suggestedDownstreamMetric: Object.freeze({ name: 'human_accepted_candidate_rate', unit: 'ratio', value: null, fabricated: false }),
      technicalEvidenceRefs: Object.freeze([
        ...(scriptDraft ? [scriptDraft.workEvidenceRef] : []),
        ...(renderProjection ? [`evidence:shared-media-work-item:${renderProjection.workItem.workItemDigest}`] : []),
      ]),
    }),
    boundaries: Object.freeze({
      contentIdeaEvidenceOnly: true,
      scriptTextCopiedIntoLoop: false,
      renderSubmittedByThisModule: false,
      renderTransportOwnedHere: false,
      humanReviewCompleted: false,
      approvalDecisionCreated: false,
      consumerDomainDecisionInferred: false,
      businessOutcomeInferred: false,
      publicationAllowed: false,
      publicationPerformed: false,
      externalActionPerformed: false,
      paymentPerformed: false,
      productionDeploymentPerformed: false,
    }),
    observedAt,
  };
  return deepFreeze({ ...core, loopDigest: digest(core) });
}
