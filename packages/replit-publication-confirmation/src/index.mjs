import {createHash} from 'node:crypto';
import {
  bindPlatformPublicationReceipt,
  validateBoundPublicationReceipt,
} from '../../platform-publication-receipt-binding/src/index.mjs';
import {validatePlatformUploadHandoff} from '../../platform-upload-handoff/src/index.mjs';
import {validateReleasePreparation} from '../../replit-release-preparation/src/index.mjs';
import {
  applyVideoProjectEvent,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';

const PLATFORMS = new Set(['douyin', 'bilibili']);
const SHA256 = /^[a-f0-9]{64}$/;

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

const normalizeTimestamp = (value, field) => {
  const date = new Date(requiredText(value, field));
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const normalizePlatform = (value) => {
  const platform = requiredText(value, 'platform').toLowerCase();
  if (!PLATFORMS.has(platform)) throw new RangeError(`unsupported platform: ${platform}`);
  return platform;
};

const assertReleaseReadyProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'RELEASE_READY') throw new Error('publication confirmation requires RELEASE_READY');
  if (project.status !== 'ACTIVE') throw new Error('publication confirmation requires an ACTIVE project');
  if (project.nextEvent !== 'CONFIRM_PUBLICATION') {
    throw new Error('publication confirmation requires CONFIRM_PUBLICATION');
  }
};

const latestReleaseArtifact = (project) => [...project.artifacts]
  .reverse()
  .find((artifact) => artifact.type === 'platform_upload_handoff'
    && artifact.status === 'READY_FOR_HUMAN_PLATFORM_UPLOAD');

const selectHandoff = ({project, releasePreparation, platform}) => {
  assertReleaseReadyProject(project);
  if (!validateReleasePreparation(releasePreparation)) throw new Error('release preparation is invalid');
  if (releasePreparation.projectId !== project.projectId) throw new Error('release preparation project mismatch');
  const releaseArtifact = latestReleaseArtifact(project);
  if (!releaseArtifact) throw new Error('release preparation artifact is missing');
  if (releaseArtifact.digest !== releasePreparation.packageDigest) {
    throw new Error('release preparation artifact digest mismatch');
  }
  const handoff = releasePreparation.platformHandoffs.find((item) => item.platform === platform);
  if (!handoff) throw new Error(`${platform} upload handoff is missing`);
  validatePlatformUploadHandoff(handoff);
  if (releaseArtifact.claims?.uploadHandoffDigests?.[platform] !== handoff.handoffDigest) {
    throw new Error('project upload handoff digest mismatch');
  }
  if (releaseArtifact.claims?.finalVideoSha256 !== handoff.finalVideo.sha256) {
    throw new Error('project final video digest mismatch');
  }
  return {releaseArtifact, handoff};
};

const templateCore = (template) => ({
  schemaVersion: template.schemaVersion,
  projectId: template.projectId,
  sourceProjectDigest: template.sourceProjectDigest,
  releasePreparationPackageDigest: template.releasePreparationPackageDigest,
  platform: template.platform,
  uploadHandoffDigest: template.uploadHandoffDigest,
  finalVideoSha256: template.finalVideoSha256,
  preparedBy: template.preparedBy,
  preparedAt: template.preparedAt,
  publicationReceipt: template.publicationReceipt,
  requiredEvidence: template.requiredEvidence,
  truthBoundary: template.truthBoundary,
  publicationConfirmed: template.publicationConfirmed,
  analyticsIntakeAllowed: template.analyticsIntakeAllowed,
});

export const createPublicationConfirmationTemplate = ({
  project,
  releasePreparation,
  platform,
  preparedBy,
  preparedAt = new Date().toISOString(),
} = {}) => {
  const normalizedPlatform = normalizePlatform(platform);
  const {handoff} = selectHandoff({project, releasePreparation, platform: normalizedPlatform});
  const core = {
    schemaVersion: 'toolradar.publication-confirmation-template.v1',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    releasePreparationPackageDigest: releasePreparation.packageDigest,
    platform: normalizedPlatform,
    uploadHandoffDigest: handoff.handoffDigest,
    finalVideoSha256: handoff.finalVideo.sha256,
    preparedBy: requiredText(preparedBy, 'preparedBy'),
    preparedAt: normalizeTimestamp(preparedAt, 'preparedAt'),
    publicationReceipt: {
      platform: normalizedPlatform,
      uploadHandoffDigest: handoff.handoffDigest,
      finalVideoSha256: handoff.finalVideo.sha256,
      platformVideoId: null,
      publicUrl: null,
      publishedAt: null,
      capturedAt: null,
      operator: null,
      operatorConfirmedPublication: false,
      platformLoginPerformed: false,
      uploadPerformed: false,
      publishActionPerformed: false,
    },
    requiredEvidence: [
      'platformVideoId',
      'publicUrl',
      'publishedAt',
      'capturedAt',
      'operator',
      'operatorConfirmedPublication=true',
      'platformLoginPerformed=true',
      'uploadPerformed=true',
      'publishActionPerformed=true',
    ],
    truthBoundary: 'human_platform_publication_evidence_required',
    publicationConfirmed: false,
    analyticsIntakeAllowed: false,
  };
  return Object.freeze({...core, templateDigest: digest(core)});
};

export const validatePublicationConfirmationTemplate = (template) => {
  if (template?.schemaVersion !== 'toolradar.publication-confirmation-template.v1') {
    throw new TypeError('unsupported publication confirmation template');
  }
  if (!SHA256.test(template.templateDigest ?? '') || digest(templateCore(template)) !== template.templateDigest) {
    throw new Error('publication confirmation template digest mismatch');
  }
  normalizePlatform(template.platform);
  if (!SHA256.test(template.sourceProjectDigest ?? '')
    || !SHA256.test(template.releasePreparationPackageDigest ?? '')
    || !SHA256.test(template.uploadHandoffDigest ?? '')
    || !SHA256.test(template.finalVideoSha256 ?? '')) {
    throw new Error('publication confirmation template evidence digest is invalid');
  }
  if (template.publicationReceipt?.platform !== template.platform
    || template.publicationReceipt?.uploadHandoffDigest !== template.uploadHandoffDigest
    || template.publicationReceipt?.finalVideoSha256 !== template.finalVideoSha256) {
    throw new Error('publication confirmation template receipt binding is invalid');
  }
  if (template.publicationConfirmed !== false || template.analyticsIntakeAllowed !== false) {
    throw new Error('publication confirmation template cannot claim publication or analytics');
  }
  return true;
};

const publicationArtifact = (boundReceipt) => ({
  type: 'bound_publication_receipt',
  schemaVersion: boundReceipt.schema,
  artifactId: `bound-publication-receipt:${boundReceipt.receiptDigest}`,
  digest: boundReceipt.receiptDigest,
  status: 'PUBLICATION_CONFIRMED',
  truthBoundary: 'human_platform_publication_confirmed',
  claims: {
    publicationConfirmed: true,
    analyticsIntakeAllowed: true,
    platform: boundReceipt.platform,
    platformVideoId: boundReceipt.platformVideoId,
    publicUrl: boundReceipt.publicUrl,
    uploadHandoffDigest: boundReceipt.uploadHandoffDigest,
    finalVideoSha256: boundReceipt.finalVideoSha256,
    publishedAt: boundReceipt.publishedAt,
    capturedAt: boundReceipt.capturedAt,
    operator: boundReceipt.operator,
    platformApiVerified: false,
    metricsObserved: false,
  },
});

const buildConfirmationReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

export const confirmProjectPublication = ({
  project,
  releasePreparation,
  template,
  publicationReceipt,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = normalizeTimestamp(occurredAt, 'occurredAt');
  const errors = [];
  try {
    validatePublicationConfirmationTemplate(template);
  } catch (error) {
    errors.push(`template:${error instanceof Error ? error.message : String(error)}`);
  }

  let handoff = null;
  try {
    const selected = selectHandoff({project, releasePreparation, platform: normalizePlatform(template?.platform)});
    handoff = selected.handoff;
  } catch (error) {
    errors.push(`release_evidence:${error instanceof Error ? error.message : String(error)}`);
  }

  if (template?.projectId !== project?.projectId) errors.push('template_project_mismatch');
  if (template?.sourceProjectDigest !== project?.projectDigest) errors.push('template_source_project_mismatch');
  if (template?.releasePreparationPackageDigest !== releasePreparation?.packageDigest) {
    errors.push('template_release_preparation_mismatch');
  }
  if (handoff && template?.uploadHandoffDigest !== handoff.handoffDigest) {
    errors.push('template_upload_handoff_mismatch');
  }
  if (handoff && template?.finalVideoSha256 !== handoff.finalVideo.sha256) {
    errors.push('template_final_video_mismatch');
  }

  let boundPublicationReceipt = null;
  if (handoff) {
    try {
      boundPublicationReceipt = bindPlatformPublicationReceipt({
        uploadHandoff: handoff,
        publicationReceipt,
      });
      if (boundPublicationReceipt.status === 'PUBLICATION_CONFIRMED') {
        validateBoundPublicationReceipt(boundPublicationReceipt);
      } else {
        errors.push(...boundPublicationReceipt.reasons.map((reason) => `publication:${reason}`));
      }
    } catch (error) {
      errors.push(`publication:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (boundPublicationReceipt?.operator && boundPublicationReceipt.operator !== normalizedActor) {
    errors.push('publication_operator_actor_mismatch');
  }

  if (errors.length > 0) {
    return buildConfirmationReceipt({
      schemaVersion: 'toolradar.publication-confirmation.v1',
      status: 'PUBLICATION_CONFIRMATION_BLOCKED',
      truthBoundary: 'publication_evidence_blocked',
      projectId: project?.projectId ?? null,
      sourceProjectDigest: project?.projectDigest ?? null,
      templateDigest: template?.templateDigest ?? null,
      releasePreparationPackageDigest: releasePreparation?.packageDigest ?? null,
      platform: template?.platform ?? publicationReceipt?.platform ?? null,
      boundPublicationReceipt,
      errors: Object.freeze([...new Set(errors)]),
      projectUnchanged: true,
      appliedEvent: null,
      updatedProject: null,
      updatedProjectDigest: null,
      summary: project ? summarizeVideoProject(project) : null,
      nextLifecycleEvent: project?.nextEvent ?? null,
      publicationConfirmed: false,
      analyticsIntakeAllowed: false,
      platformApiVerified: false,
      metricsObserved: false,
    });
  }

  const eventId = `replit-publication-confirm:${boundPublicationReceipt.receiptDigest.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'CONFIRM_PUBLICATION',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: publicationArtifact(boundPublicationReceipt),
  });
  validateVideoProject(updatedProject);
  const summary = summarizeVideoProject(updatedProject);

  return buildConfirmationReceipt({
    schemaVersion: 'toolradar.publication-confirmation.v1',
    status: 'PUBLISHED',
    truthBoundary: 'video_project_human_publication_confirmed',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    templateDigest: template.templateDigest,
    releasePreparationPackageDigest: releasePreparation.packageDigest,
    platform: boundPublicationReceipt.platform,
    boundPublicationReceipt,
    errors: [],
    projectUnchanged: false,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary,
    nextLifecycleEvent: updatedProject.nextEvent,
    publicationConfirmed: true,
    analyticsIntakeAllowed: true,
    platformApiVerified: false,
    metricsObserved: false,
  });
};

export const validatePublicationConfirmationReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.publication-confirmation.v1') {
    throw new TypeError('unsupported publication confirmation receipt');
  }
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '') || digest(core) !== receiptDigest) {
    throw new Error('publication confirmation receipt digest mismatch');
  }
  if (receipt.status === 'PUBLISHED') {
    validateBoundPublicationReceipt(receipt.boundPublicationReceipt);
    if (receipt.updatedProject?.stage !== 'PUBLISHED'
      || receipt.updatedProject?.status !== 'ACTIVE'
      || receipt.nextLifecycleEvent !== 'ATTACH_FEEDBACK') {
      throw new Error('published project lifecycle boundary is invalid');
    }
    if (receipt.publicationConfirmed !== true
      || receipt.analyticsIntakeAllowed !== true
      || receipt.platformApiVerified !== false
      || receipt.metricsObserved !== false) {
      throw new Error('published truth boundary is invalid');
    }
    validateVideoProject(receipt.updatedProject);
  } else if (receipt.status === 'PUBLICATION_CONFIRMATION_BLOCKED') {
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) {
      throw new Error('blocked publication confirmation must not mutate the project');
    }
    if (receipt.publicationConfirmed !== false || receipt.analyticsIntakeAllowed !== false) {
      throw new Error('blocked publication confirmation cannot enable analytics');
    }
  } else {
    throw new RangeError(`unsupported publication confirmation status: ${receipt.status}`);
  }
  return true;
};
