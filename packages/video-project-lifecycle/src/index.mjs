import {createHash} from 'node:crypto';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const SHA256 = /^[a-f0-9]{64}$/;
const SECRET_KEY = /(authorization|token|secret|password|cookie|api[-_]?key)/i;

export const VIDEO_PROJECT_STAGES = Object.freeze([
  'DISCOVERED',
  'SELECTED',
  'RESEARCH_READY',
  'SCRIPT_READY',
  'STORYBOARD_READY',
  'ASSETS_VERIFIED',
  'RENDER_AUTHORIZED',
  'RENDER_COMPLETED',
  'QUALITY_APPROVED',
  'RELEASE_READY',
  'PUBLISHED',
  'FEEDBACK_READY',
]);

export const VIDEO_PROJECT_EVENTS = Object.freeze([
  'SELECT_CANDIDATE',
  'ATTACH_RESEARCH',
  'ATTACH_SCRIPT',
  'ATTACH_STORYBOARD',
  'VERIFY_ASSETS',
  'AUTHORIZE_RENDER',
  'COMPLETE_RENDER',
  'APPROVE_QUALITY',
  'PREPARE_RELEASE',
  'CONFIRM_PUBLICATION',
  'ATTACH_FEEDBACK',
  'BLOCK_PROJECT',
  'RESUME_PROJECT',
  'CANCEL_PROJECT',
]);

const STATUSES = new Set(['ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED']);
const ARTIFACT_TYPES = new Set([
  'topic_brief',
  'production_case',
  'storyboard_package',
  'owned_media_preflight',
  'final_render_gate',
  'mac_remotion_render_run',
  'final_render_quality_review',
  'platform_upload_handoff',
  'bound_publication_receipt',
  'bounded_feedback_summary',
]);

const TRANSITIONS = Object.freeze({
  SELECT_CANDIDATE: {from: 'DISCOVERED', to: 'SELECTED', artifactTypes: []},
  ATTACH_RESEARCH: {from: 'SELECTED', to: 'RESEARCH_READY', artifactTypes: ['topic_brief']},
  ATTACH_SCRIPT: {from: 'RESEARCH_READY', to: 'SCRIPT_READY', artifactTypes: ['production_case']},
  ATTACH_STORYBOARD: {from: 'SCRIPT_READY', to: 'STORYBOARD_READY', artifactTypes: ['storyboard_package']},
  VERIFY_ASSETS: {from: 'STORYBOARD_READY', to: 'ASSETS_VERIFIED', artifactTypes: ['owned_media_preflight']},
  AUTHORIZE_RENDER: {from: 'ASSETS_VERIFIED', to: 'RENDER_AUTHORIZED', artifactTypes: ['final_render_gate']},
  COMPLETE_RENDER: {from: 'RENDER_AUTHORIZED', to: 'RENDER_COMPLETED', artifactTypes: ['mac_remotion_render_run']},
  APPROVE_QUALITY: {from: 'RENDER_COMPLETED', to: 'QUALITY_APPROVED', artifactTypes: ['final_render_quality_review']},
  PREPARE_RELEASE: {from: 'QUALITY_APPROVED', to: 'RELEASE_READY', artifactTypes: ['platform_upload_handoff']},
  CONFIRM_PUBLICATION: {from: 'RELEASE_READY', to: 'PUBLISHED', artifactTypes: ['bound_publication_receipt']},
  ATTACH_FEEDBACK: {from: 'PUBLISHED', to: 'FEEDBACK_READY', artifactTypes: ['bounded_feedback_summary']},
});

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const optionalText = (value, field) => {
  if (value === null || value === undefined || value === '') return null;
  return requiredText(value, field);
};

const normalizeTimestamp = (value, field) => {
  const text = requiredText(value, field);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const hasSecretField = (value) => {
  if (Array.isArray(value)) return value.some(hasSecretField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => SECRET_KEY.test(key) || hasSecretField(item));
};

const freezeProject = (core) => Object.freeze({...core, projectDigest: digest(core)});

const normalizeSourceSignal = (sourceSignal) => {
  if (!sourceSignal || typeof sourceSignal !== 'object' || Array.isArray(sourceSignal)) {
    throw new TypeError('sourceSignal must be an object');
  }
  return Object.freeze({
    id: requiredText(sourceSignal.id, 'sourceSignal.id'),
    title: requiredText(sourceSignal.title, 'sourceSignal.title'),
    platform: optionalText(sourceSignal.platform, 'sourceSignal.platform'),
    sourceUrl: optionalText(sourceSignal.sourceUrl, 'sourceSignal.sourceUrl'),
  });
};

const normalizeArtifact = (artifact, eventType) => {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new TypeError(`${eventType}.artifact must be an object`);
  }
  const type = requiredText(artifact.type, `${eventType}.artifact.type`);
  if (!ARTIFACT_TYPES.has(type)) throw new RangeError(`unsupported artifact type: ${type}`);
  const artifactDigest = requiredText(artifact.digest, `${eventType}.artifact.digest`).toLowerCase();
  if (!SHA256.test(artifactDigest)) throw new TypeError(`${eventType}.artifact.digest must be SHA-256`);
  const claims = artifact.claims ?? {};
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) throw new TypeError(`${eventType}.artifact.claims must be an object`);
  if (hasSecretField(claims)) throw new Error('artifact claims must not contain secret fields');
  return Object.freeze({
    type,
    schemaVersion: optionalText(artifact.schemaVersion, `${eventType}.artifact.schemaVersion`),
    artifactId: optionalText(artifact.artifactId, `${eventType}.artifact.artifactId`),
    digest: artifactDigest,
    status: optionalText(artifact.status, `${eventType}.artifact.status`),
    truthBoundary: optionalText(artifact.truthBoundary, `${eventType}.artifact.truthBoundary`),
    claims: Object.freeze(structuredClone(claims)),
  });
};

const nextEventFor = (stage, status) => {
  if (status === 'BLOCKED') return 'RESUME_PROJECT';
  if (status === 'CANCELLED' || status === 'COMPLETED') return null;
  return Object.entries(TRANSITIONS).find(([, rule]) => rule.from === stage)?.[0] ?? null;
};

const assertArtifactBoundary = (eventType, artifact) => {
  const rule = TRANSITIONS[eventType];
  if (!rule.artifactTypes.includes(artifact.type)) {
    throw new Error(`${eventType} requires artifact type ${rule.artifactTypes.join(' or ')}`);
  }
  if (eventType === 'VERIFY_ASSETS') {
    if (artifact.truthBoundary !== 'owned_media_verified' || artifact.claims.finalRenderAllowed !== true) {
      throw new Error('asset verification boundary is invalid');
    }
  }
  if (eventType === 'AUTHORIZE_RENDER') {
    if (artifact.truthBoundary !== 'render_execution_authorized' || artifact.claims.finalRenderAllowed !== true) {
      throw new Error('render authorization boundary is invalid');
    }
  }
  if (eventType === 'COMPLETE_RENDER') {
    if (artifact.status !== 'COMPLETED'
      || artifact.claims.realSubmissionPerformed !== true
      || artifact.claims.finalVideoClaimAllowed !== true) {
      throw new Error('render completion boundary is invalid');
    }
  }
  if (eventType === 'APPROVE_QUALITY') {
    if (artifact.status !== 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION'
      || artifact.claims.releasePreparationAllowed !== true) {
      throw new Error('quality approval boundary is invalid');
    }
  }
  if (eventType === 'PREPARE_RELEASE' && artifact.status !== 'READY_FOR_HUMAN_PLATFORM_UPLOAD') {
    throw new Error('release preparation boundary is invalid');
  }
  if (eventType === 'CONFIRM_PUBLICATION') {
    if (artifact.status !== 'PUBLICATION_CONFIRMED'
      || artifact.claims.publicationConfirmed !== true
      || artifact.claims.analyticsIntakeAllowed !== true) {
      throw new Error('publication confirmation boundary is invalid');
    }
  }
  if (eventType === 'ATTACH_FEEDBACK') {
    if (artifact.status !== 'BOUNDED_FEEDBACK_SUMMARY_READY'
      || artifact.claims.feedbackSummaryReady !== true) {
      throw new Error('feedback boundary is invalid');
    }
  }
};

export const createVideoProject = ({
  projectId,
  sourceSignal,
  owner,
  createdAt = new Date().toISOString(),
} = {}) => {
  const normalizedCreatedAt = normalizeTimestamp(createdAt, 'createdAt');
  const core = {
    schemaVersion: 'toolradar.video-project.v1',
    projectId: requiredText(projectId, 'projectId'),
    owner: requiredText(owner, 'owner'),
    sourceSignal: normalizeSourceSignal(sourceSignal),
    stage: 'DISCOVERED',
    status: 'ACTIVE',
    blockedReason: null,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedCreatedAt,
    artifacts: Object.freeze([]),
    events: Object.freeze([]),
    nextEvent: 'SELECT_CANDIDATE',
  };
  return freezeProject(core);
};

export const validateVideoProject = (project) => {
  if (project?.schemaVersion !== 'toolradar.video-project.v1') throw new TypeError('unsupported video project schema');
  const {projectDigest, ...core} = project;
  if (!SHA256.test(projectDigest ?? '')) throw new TypeError('projectDigest must be SHA-256');
  if (digest(core) !== projectDigest) throw new TypeError('project digest mismatch');
  if (!VIDEO_PROJECT_STAGES.includes(project.stage)) throw new RangeError('video project stage is invalid');
  if (!STATUSES.has(project.status)) throw new RangeError('video project status is invalid');
  if (!Array.isArray(project.events) || !Array.isArray(project.artifacts)) throw new TypeError('events and artifacts must be arrays');
  if (project.status === 'BLOCKED' && !project.blockedReason) throw new Error('blocked project requires a reason');
  if (project.status !== 'BLOCKED' && project.blockedReason !== null) throw new Error('non-blocked project cannot retain a blocked reason');
  if (project.status === 'COMPLETED' && project.stage !== 'FEEDBACK_READY') throw new Error('completed project must be feedback ready');
  const eventIds = new Set();
  for (let index = 0; index < project.events.length; index += 1) {
    const event = project.events[index];
    if (event.sequence !== index + 1) throw new Error('event sequence is not contiguous');
    if (eventIds.has(event.eventId)) throw new Error('eventId values must be unique');
    eventIds.add(event.eventId);
    const {eventDigest, ...eventCore} = event;
    if (!SHA256.test(eventDigest ?? '') || digest(eventCore) !== eventDigest) throw new Error('event digest mismatch');
  }
  if (project.events.length > 0) {
    const last = project.events.at(-1);
    if (last.toStage !== project.stage || last.toStatus !== project.status) throw new Error('project state does not match the final event');
  }
  if (project.nextEvent !== nextEventFor(project.stage, project.status)) throw new Error('nextEvent does not match project state');
  return true;
};

const normalizeEventRequest = (event) => {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('event must be an object');
  const type = requiredText(event.type, 'event.type').toUpperCase();
  if (!VIDEO_PROJECT_EVENTS.includes(type)) throw new RangeError(`unsupported event type: ${type}`);
  const normalized = {
    eventId: requiredText(event.eventId, 'event.eventId'),
    type,
    actor: requiredText(event.actor, 'event.actor'),
    occurredAt: normalizeTimestamp(event.occurredAt ?? new Date().toISOString(), 'event.occurredAt'),
    reason: optionalText(event.reason, 'event.reason'),
    artifact: event.artifact ? normalizeArtifact(event.artifact, type) : null,
  };
  return Object.freeze({...normalized, requestDigest: digest(normalized)});
};

const appendEvent = (project, request, {toStage, toStatus, blockedReason, artifact}) => {
  const eventCore = {
    sequence: project.events.length + 1,
    eventId: request.eventId,
    requestDigest: request.requestDigest,
    type: request.type,
    actor: request.actor,
    occurredAt: request.occurredAt,
    reason: request.reason,
    artifactDigest: artifact?.digest ?? null,
    fromStage: project.stage,
    toStage,
    fromStatus: project.status,
    toStatus,
  };
  const eventRecord = Object.freeze({...eventCore, eventDigest: digest(eventCore)});
  const artifacts = artifact
    ? Object.freeze([...project.artifacts, Object.freeze({...artifact, attachedByEventId: request.eventId, attachedAt: request.occurredAt})])
    : project.artifacts;
  const core = {
    schemaVersion: project.schemaVersion,
    projectId: project.projectId,
    owner: project.owner,
    sourceSignal: project.sourceSignal,
    stage: toStage,
    status: toStatus,
    blockedReason,
    createdAt: project.createdAt,
    updatedAt: request.occurredAt,
    artifacts,
    events: Object.freeze([...project.events, eventRecord]),
    nextEvent: nextEventFor(toStage, toStatus),
  };
  return freezeProject(core);
};

export const applyVideoProjectEvent = (project, event) => {
  validateVideoProject(project);
  const request = normalizeEventRequest(event);
  const existing = project.events.find((item) => item.eventId === request.eventId);
  if (existing) {
    if (existing.requestDigest !== request.requestDigest) throw new Error('eventId replay payload mismatch');
    return project;
  }

  if (request.type === 'BLOCK_PROJECT') {
    if (project.status !== 'ACTIVE') throw new Error('only an active project can be blocked');
    if (!request.reason) throw new Error('BLOCK_PROJECT requires a reason');
    return appendEvent(project, request, {toStage: project.stage, toStatus: 'BLOCKED', blockedReason: request.reason, artifact: null});
  }
  if (request.type === 'RESUME_PROJECT') {
    if (project.status !== 'BLOCKED') throw new Error('only a blocked project can be resumed');
    return appendEvent(project, request, {toStage: project.stage, toStatus: 'ACTIVE', blockedReason: null, artifact: null});
  }
  if (request.type === 'CANCEL_PROJECT') {
    if (['COMPLETED', 'CANCELLED'].includes(project.status)) throw new Error('completed or cancelled project cannot be cancelled');
    if (!request.reason) throw new Error('CANCEL_PROJECT requires a reason');
    return appendEvent(project, request, {toStage: project.stage, toStatus: 'CANCELLED', blockedReason: null, artifact: null});
  }

  if (project.status !== 'ACTIVE') throw new Error('only an active project can advance');
  const rule = TRANSITIONS[request.type];
  if (!rule) throw new Error(`event ${request.type} is not a lifecycle transition`);
  if (project.stage !== rule.from) throw new Error(`${request.type} requires stage ${rule.from}`);
  if (rule.artifactTypes.length > 0) {
    if (!request.artifact) throw new Error(`${request.type} requires an artifact`);
    assertArtifactBoundary(request.type, request.artifact);
  } else if (request.artifact) {
    throw new Error(`${request.type} must not attach an artifact`);
  }
  if (request.type === 'SELECT_CANDIDATE' && !request.reason) throw new Error('SELECT_CANDIDATE requires an operator reason');

  const toStatus = rule.to === 'FEEDBACK_READY' ? 'COMPLETED' : 'ACTIVE';
  return appendEvent(project, request, {
    toStage: rule.to,
    toStatus,
    blockedReason: null,
    artifact: request.artifact,
  });
};

export const summarizeVideoProject = (project) => {
  validateVideoProject(project);
  const stageIndex = VIDEO_PROJECT_STAGES.indexOf(project.stage);
  return Object.freeze({
    projectId: project.projectId,
    title: project.sourceSignal.title,
    stage: project.stage,
    status: project.status,
    progressPercent: Math.round((stageIndex / (VIDEO_PROJECT_STAGES.length - 1)) * 100),
    nextEvent: project.nextEvent,
    blockedReason: project.blockedReason,
    artifactCount: project.artifacts.length,
    eventCount: project.events.length,
    updatedAt: project.updatedAt,
  });
};
