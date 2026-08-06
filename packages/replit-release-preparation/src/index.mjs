import {createHash} from 'node:crypto';
import {
  buildPlatformUploadHandoff,
  validatePlatformUploadHandoff,
} from '../../platform-upload-handoff/src/index.mjs';
import {
  applyVideoProjectEvent,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';

const PLATFORMS = Object.freeze(['douyin', 'bilibili']);
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

const requiredSha256 = (value, field) => {
  const normalized = requiredText(value, field).toLowerCase();
  if (!SHA256.test(normalized)) throw new TypeError(`${field} must be SHA-256`);
  return normalized;
};

const normalizeTimestamp = (value, field) => {
  const date = new Date(requiredText(value, field));
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const assertReadyProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'QUALITY_APPROVED') throw new Error('release preparation requires QUALITY_APPROVED');
  if (project.status !== 'ACTIVE') throw new Error('release preparation requires an ACTIVE project');
  if (project.nextEvent !== 'PREPARE_RELEASE') throw new Error('release preparation requires PREPARE_RELEASE');
};

const latestArtifact = (project, type, status) => [...project.artifacts]
  .reverse()
  .find((artifact) => artifact.type === type && (!status || artifact.status === status));

const assertPackage = (releasePreparation) => {
  if (releasePreparation?.schemaVersion !== 'toolradar.release-preparation.v1') {
    throw new TypeError('unsupported release preparation schema');
  }
  const {packageDigest, ...core} = releasePreparation;
  if (!SHA256.test(packageDigest ?? '') || digest(core) !== packageDigest) {
    throw new Error('release preparation digest mismatch');
  }
  if (releasePreparation.releasePackageReady !== true || releasePreparation.publicationAllowed !== false) {
    throw new Error('release preparation boundary is invalid');
  }
  if (!Array.isArray(releasePreparation.platformHandoffs)
    || releasePreparation.platformHandoffs.length !== PLATFORMS.length) {
    throw new Error('release preparation platform handoffs are incomplete');
  }
  const platforms = releasePreparation.platformHandoffs.map((handoff) => {
    validatePlatformUploadHandoff(handoff);
    return handoff.platform;
  });
  if (platforms.join(',') !== PLATFORMS.join(',')) throw new Error('release preparation platforms are invalid');
  return true;
};

export const createReleasePreparation = ({
  project,
  productionCase,
  coverPaths,
  operator,
  preparedAt = new Date().toISOString(),
} = {}) => {
  assertReadyProject(project);
  const normalizedOperator = requiredText(operator, 'operator');
  const normalizedPreparedAt = normalizeTimestamp(preparedAt, 'preparedAt');
  const qualityArtifact = latestArtifact(
    project,
    'final_render_quality_review',
    'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
  );
  const renderArtifact = latestArtifact(project, 'mac_remotion_render_run', 'COMPLETED');
  if (!qualityArtifact) throw new Error('quality approval artifact is missing');
  if (!renderArtifact) throw new Error('render completion artifact is missing');
  if (qualityArtifact.claims?.releasePreparationAllowed !== true) {
    throw new Error('quality approval does not allow release preparation');
  }

  const qualityVideoSha256 = requiredSha256(
    qualityArtifact.claims?.finalVideoSha256,
    'qualityArtifact.claims.finalVideoSha256',
  );
  const renderVideoSha256 = requiredSha256(
    renderArtifact.claims?.finalVideoSha256,
    'renderArtifact.claims.finalVideoSha256',
  );
  if (qualityVideoSha256 !== renderVideoSha256) throw new Error('quality and render video digests differ');

  const qualityVideoReceiptDigest = requiredSha256(
    qualityArtifact.claims?.finalVideoReceiptDigest,
    'qualityArtifact.claims.finalVideoReceiptDigest',
  );
  const renderVideoReceiptDigest = requiredSha256(
    renderArtifact.claims?.finalVideoReceiptDigest,
    'renderArtifact.claims.finalVideoReceiptDigest',
  );
  if (qualityVideoReceiptDigest !== renderVideoReceiptDigest) {
    throw new Error('quality and render receipt digests differ');
  }

  const profile = renderArtifact.claims?.renderProfile ?? {};
  const finalVideo = {
    path: requiredText(renderArtifact.claims?.outputPath, 'renderArtifact.claims.outputPath'),
    sha256: renderVideoSha256,
    receiptDigest: renderVideoReceiptDigest,
    width: Number(profile.width),
    height: Number(profile.height),
    fps: Number(profile.fps),
    durationSeconds: Number(profile.durationSeconds),
  };
  if (finalVideo.width !== 1080 || finalVideo.height !== 1920 || finalVideo.fps !== 30) {
    throw new Error('final video profile mismatch');
  }
  if (!Number.isFinite(finalVideo.durationSeconds) || finalVideo.durationSeconds <= 0) {
    throw new Error('final video duration is invalid');
  }

  const platformHandoffs = PLATFORMS.map((platform) => {
    const copy = productionCase?.script?.platformCopy?.[platform];
    if (!copy || typeof copy !== 'object') throw new Error(`${platform} platform copy is missing`);
    const coverPath = requiredText(coverPaths?.[platform], `coverPaths.${platform}`);
    const handoff = buildPlatformUploadHandoff({
      qualityReview: {
        status: qualityArtifact.status,
        releasePreparationAllowed: true,
        reviewSha256: qualityArtifact.digest,
      },
      platform,
      asset: {
        path: finalVideo.path,
        sha256: finalVideo.sha256,
        durationSeconds: finalVideo.durationSeconds,
        width: finalVideo.width,
        height: finalVideo.height,
      },
      metadata: {
        title: copy.title,
        description: copy.description,
        tags: copy.tags,
        coverPath,
      },
    });
    if (handoff.status !== 'READY_FOR_HUMAN_PLATFORM_UPLOAD') {
      throw new Error(`${platform} upload handoff is blocked: ${handoff.reasons?.join(', ') || 'unknown'}`);
    }
    validatePlatformUploadHandoff(handoff);
    return handoff;
  });

  const core = {
    schemaVersion: 'toolradar.release-preparation.v1',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    productionCaseId: requiredText(productionCase?.caseId, 'productionCase.caseId'),
    operator: normalizedOperator,
    preparedAt: normalizedPreparedAt,
    qualityReviewDigest: qualityArtifact.digest,
    finalVideo,
    platformHandoffs,
    releasePackageReady: true,
    publicationAllowed: false,
    truthBoundary: 'douyin_bilibili_upload_handoffs_prepared_human_publication_required',
  };
  return Object.freeze({...core, packageDigest: digest(core)});
};

export const validateReleasePreparation = (releasePreparation) => {
  try {
    return assertPackage(releasePreparation);
  } catch {
    return false;
  }
};

const releaseArtifact = (releasePreparation) => ({
  type: 'platform_upload_handoff',
  schemaVersion: releasePreparation.schemaVersion,
  artifactId: `release-preparation:${releasePreparation.packageDigest}`,
  digest: releasePreparation.packageDigest,
  status: 'READY_FOR_HUMAN_PLATFORM_UPLOAD',
  truthBoundary: 'human_platform_upload_handoffs_prepared',
  claims: {
    releasePackageReady: true,
    publicationAllowed: false,
    qualityReviewDigest: releasePreparation.qualityReviewDigest,
    finalVideoSha256: releasePreparation.finalVideo.sha256,
    finalVideoReceiptDigest: releasePreparation.finalVideo.receiptDigest,
    platforms: releasePreparation.platformHandoffs.map((handoff) => handoff.platform),
    uploadHandoffDigests: Object.fromEntries(
      releasePreparation.platformHandoffs.map((handoff) => [handoff.platform, handoff.handoffDigest]),
    ),
    platformLoginPerformed: false,
    uploadPerformed: false,
    publishActionPerformed: false,
  },
});

export const applyReleasePreparationToProject = ({
  project,
  releasePreparation,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  assertReadyProject(project);
  if (!assertPackage(releasePreparation)) throw new Error('release preparation is invalid');
  if (releasePreparation.projectId !== project.projectId) throw new Error('release preparation project mismatch');
  if (releasePreparation.sourceProjectDigest !== project.projectDigest) {
    throw new Error('release preparation source project mismatch');
  }
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = normalizeTimestamp(occurredAt, 'occurredAt');
  const eventId = `replit-release-prepare:${releasePreparation.packageDigest.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'PREPARE_RELEASE',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: releaseArtifact(releasePreparation),
  });
  validateVideoProject(updatedProject);

  const core = {
    schemaVersion: 'toolradar.release-preparation-receipt.v1',
    status: 'RELEASE_READY',
    truthBoundary: 'video_project_release_handoffs_prepared',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    releasePreparation,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary: summarizeVideoProject(updatedProject),
    nextLifecycleEvent: updatedProject.nextEvent,
    releaseReady: true,
    platformLoginPerformed: false,
    uploadPerformed: false,
    publishActionPerformed: false,
    publicationAllowed: false,
  };
  return Object.freeze({...core, receiptDigest: digest(core)});
};

export const validateReleasePreparationReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.release-preparation-receipt.v1') {
    throw new TypeError('unsupported release preparation receipt');
  }
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '') || digest(core) !== receiptDigest) {
    throw new Error('release preparation receipt digest mismatch');
  }
  assertPackage(receipt.releasePreparation);
  if (receipt.status !== 'RELEASE_READY'
    || receipt.updatedProject?.stage !== 'RELEASE_READY'
    || receipt.updatedProject?.status !== 'ACTIVE'
    || receipt.nextLifecycleEvent !== 'CONFIRM_PUBLICATION') {
    throw new Error('release-ready lifecycle boundary is invalid');
  }
  if (receipt.releaseReady !== true
    || receipt.platformLoginPerformed !== false
    || receipt.uploadPerformed !== false
    || receipt.publishActionPerformed !== false
    || receipt.publicationAllowed !== false) {
    throw new Error('release-ready human boundary is invalid');
  }
  validateVideoProject(receipt.updatedProject);
  return true;
};
