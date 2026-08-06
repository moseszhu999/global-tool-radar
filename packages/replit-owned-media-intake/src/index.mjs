import {createHash} from 'node:crypto';
import {buildRemotionMediaPreflight} from '../../remotion-media-preflight/src/index.mjs';
import {
  applyVideoProjectEvent,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const normalizeTimestamp = (value) => {
  const date = new Date(requiredText(value, 'occurredAt'));
  if (Number.isNaN(date.getTime())) throw new TypeError('occurredAt must be a valid timestamp');
  return date.toISOString();
};

const nextMillisecond = (timestamp) => new Date(new Date(timestamp).getTime() + 1).toISOString();

const buildReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

const assertReadyProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'STORYBOARD_READY') throw new Error('owned media intake requires STORYBOARD_READY');
  if (project.status !== 'BLOCKED') throw new Error('owned media intake requires a BLOCKED project');
  if (project.nextEvent !== 'RESUME_PROJECT') throw new Error('owned media intake requires RESUME_PROJECT');
};

const preflightArtifact = (preflight) => ({
  type: 'owned_media_preflight',
  schemaVersion: 'toolradar.remotion-media-preflight.v1',
  artifactId: `owned-media-preflight:${preflight.receiptDigest}`,
  digest: preflight.receiptDigest,
  status: 'READY_FOR_FINAL_RENDER',
  truthBoundary: 'owned_media_verified',
  claims: {
    finalRenderAllowed: true,
    readyForFinalRender: true,
    assetCount: preflight.assets.length,
    assets: preflight.assets.map(({role, sizeBytes, sha256}) => ({role, sizeBytes, sha256})),
  },
});

export const intakeOwnedMediaIntoVideoProject = async ({
  project,
  media,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  assertReadyProject(project);
  const normalizedActor = requiredText(actor, 'actor');
  const resumeAt = normalizeTimestamp(occurredAt);
  const verifyAt = nextMillisecond(resumeAt);
  const sourceProjectDigest = project.projectDigest;
  const preflight = await buildRemotionMediaPreflight(media ?? {});

  if (!preflight.finalRenderAllowed) {
    return buildReceipt({
      schemaVersion: 'toolradar.owned-media-intake.v1',
      status: 'MEDIA_PREFLIGHT_BLOCKED',
      truthBoundary: 'owned_media_not_verified',
      projectId: project.projectId,
      sourceProjectDigest,
      preflight,
      projectUnchanged: true,
      appliedEvents: [],
      updatedProject: null,
      updatedProjectDigest: null,
      summary: summarizeVideoProject(project),
      nextAction: 'PROVIDE_AND_VERIFY_OWNED_MEDIA',
      renderExecutionAllowed: false,
    });
  }

  const suffix = preflight.receiptDigest.slice(0, 20);
  const resumeEventId = `replit-owned-media-resume:${suffix}`;
  const verifyEventId = `replit-owned-media-verify:${suffix}`;
  const resumed = applyVideoProjectEvent(project, {
    eventId: resumeEventId,
    type: 'RESUME_PROJECT',
    actor: normalizedActor,
    occurredAt: resumeAt,
    reason: 'All required owned media files exist and passed explicit human verification.',
  });
  const updatedProject = applyVideoProjectEvent(resumed, {
    eventId: verifyEventId,
    type: 'VERIFY_ASSETS',
    actor: normalizedActor,
    occurredAt: verifyAt,
    artifact: preflightArtifact(preflight),
  });
  validateVideoProject(updatedProject);
  const summary = summarizeVideoProject(updatedProject);

  return buildReceipt({
    schemaVersion: 'toolradar.owned-media-intake.v1',
    status: 'ASSETS_VERIFIED',
    truthBoundary: 'video_project_assets_verified',
    projectId: project.projectId,
    sourceProjectDigest,
    preflight,
    projectUnchanged: false,
    appliedEvents: [resumeEventId, verifyEventId],
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary,
    nextAction: updatedProject.nextEvent,
    renderExecutionAllowed: false,
  });
};

export const validateOwnedMediaIntakeReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.owned-media-intake.v1') throw new TypeError('unsupported owned media intake receipt');
  const {receiptDigest, ...core} = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be SHA-256');
  if (digest(core) !== receiptDigest) throw new Error('owned media intake receipt digest mismatch');

  if (receipt.status === 'MEDIA_PREFLIGHT_BLOCKED') {
    if (receipt.preflight?.finalRenderAllowed !== false) throw new Error('blocked intake requires blocked preflight');
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) throw new Error('blocked intake must not change the project');
    if (receipt.renderExecutionAllowed !== false) throw new Error('blocked intake cannot authorize rendering');
  } else if (receipt.status === 'ASSETS_VERIFIED') {
    if (receipt.preflight?.truthBoundary !== 'owned_media_verified' || receipt.preflight?.finalRenderAllowed !== true) {
      throw new Error('verified intake requires owned-media verification');
    }
    if (receipt.projectUnchanged !== false || receipt.updatedProject?.stage !== 'ASSETS_VERIFIED') {
      throw new Error('verified intake must advance the project to ASSETS_VERIFIED');
    }
    if (receipt.updatedProject?.status !== 'ACTIVE' || receipt.nextAction !== 'AUTHORIZE_RENDER') {
      throw new Error('verified intake lifecycle boundary is invalid');
    }
    if (receipt.renderExecutionAllowed !== false) throw new Error('asset verification alone cannot authorize rendering');
    validateVideoProject(receipt.updatedProject);
  } else {
    throw new RangeError(`unsupported intake status: ${receipt.status}`);
  }
  return true;
};
