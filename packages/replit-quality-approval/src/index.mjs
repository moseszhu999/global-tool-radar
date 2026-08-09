import {createHash} from 'node:crypto';
import {
  createQualityReviewPack,
  validateQualityDecisionEnvelope,
} from '../../final-video-quality-review-pack/src/index.mjs';
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

const normalizeTimestamp = (value, field = 'occurredAt') => {
  const date = new Date(requiredText(value, field));
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const buildReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

const assertReadyProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'RENDER_COMPLETED') throw new Error('quality review requires RENDER_COMPLETED');
  if (project.status !== 'ACTIVE') throw new Error('quality review requires an ACTIVE project');
  if (project.nextEvent !== 'APPROVE_QUALITY') throw new Error('quality review requires APPROVE_QUALITY');
};

const latestRenderCompletionArtifact = (project) => [...project.artifacts]
  .reverse()
  .find((artifact) => ['mac_remotion_render_run', 'render_execution_evidence'].includes(artifact.type)
    && artifact.status === 'COMPLETED');

const completionBinding = (completion) => {
  const claims = completion?.claims ?? {};
  return {
    finalVideoReceiptDigest: claims.finalVideoReceiptDigest,
    finalVideoSha256: claims.finalVideoSha256,
    outputPath: claims.outputPath,
    reviewBindingDigest: claims.gateDigest ?? claims.reviewBindingDigest,
    renderProfile: claims.renderProfile,
  };
};

const qualityArtifact = (envelope) => ({
  type: 'final_render_quality_review',
  schemaVersion: envelope.officialReview.schemaVersion,
  artifactId: `final-render-quality-review:${envelope.officialReview.reviewSha256}`,
  digest: envelope.officialReview.reviewSha256,
  status: envelope.officialReview.status,
  truthBoundary: 'human_quality_approved_for_release_preparation',
  claims: {
    releasePreparationAllowed: true,
    finalVideoSha256: envelope.finalVideoSha256,
    finalVideoReceiptDigest: envelope.finalVideoReceiptDigest,
    reviewPackDigest: envelope.reviewPackDigest,
    qualityDecisionEnvelopeDigest: envelope.digest,
    reviewer: envelope.officialReview.reviewer,
    reviewedAt: envelope.officialReview.reviewedAt,
  },
});

export const prepareQualityReviewPackFromProject = ({
  project,
  createdAt = new Date().toISOString(),
  reviewerInstructionsVersion = '2026-08-09',
} = {}) => {
  assertReadyProject(project);
  const completion = latestRenderCompletionArtifact(project);
  if (!completion) throw new Error('render completion artifact is missing');
  const binding = completionBinding(completion);
  return createQualityReviewPack({
    projectId: project.projectId,
    finalVideoReceiptDigest: binding.finalVideoReceiptDigest,
    finalVideoSha256: binding.finalVideoSha256,
    finalVideoPath: binding.outputPath,
    renderCommandManifestSha256: binding.reviewBindingDigest,
    expectedProfile: binding.renderProfile,
    reviewerInstructionsVersion,
    createdAt: normalizeTimestamp(createdAt, 'createdAt'),
  });
};

export const applyProjectQualityDecision = ({
  project,
  reviewPack,
  qualityDecisionEnvelope,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  assertReadyProject(project);
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = normalizeTimestamp(occurredAt);
  const completion = latestRenderCompletionArtifact(project);
  const binding = completionBinding(completion);
  const errors = [];

  if (!completion) errors.push('render_completion_artifact_missing');
  try {
    validateQualityDecisionEnvelope(qualityDecisionEnvelope, reviewPack);
  } catch (error) {
    errors.push(`quality_decision:${error instanceof Error ? error.message : String(error)}`);
  }

  if (reviewPack?.projectId !== project.projectId) errors.push('review_pack_project_mismatch');
  if (completion && reviewPack?.finalVideo?.receiptDigest !== binding.finalVideoReceiptDigest) {
    errors.push('review_pack_final_video_receipt_mismatch');
  }
  if (completion && reviewPack?.finalVideo?.sha256 !== binding.finalVideoSha256) {
    errors.push('review_pack_final_video_sha256_mismatch');
  }
  if (completion && reviewPack?.finalVideo?.renderCommandManifestSha256 !== binding.reviewBindingDigest) {
    errors.push('review_pack_render_manifest_mismatch');
  }
  const officialReview = qualityDecisionEnvelope?.officialReview;
  if (officialReview?.outputSha256 !== binding.finalVideoSha256) {
    errors.push('official_review_final_video_sha256_mismatch');
  }
  if (officialReview?.renderCommandManifestSha256 !== binding.reviewBindingDigest) {
    errors.push('official_review_render_manifest_mismatch');
  }
  if (officialReview?.status !== 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION'
    || officialReview?.releasePreparationAllowed !== true) {
    errors.push('official_quality_review_not_approved');
  }
  if (officialReview?.publicationAllowed !== false) errors.push('quality_review_cannot_authorize_publication');

  if (errors.length > 0) {
    return buildReceipt({
      schemaVersion: 'toolradar.quality-approval.v1',
      status: 'QUALITY_APPROVAL_BLOCKED',
      truthBoundary: 'quality_approval_evidence_blocked',
      projectId: project.projectId,
      sourceProjectDigest: project.projectDigest,
      reviewPackDigest: reviewPack?.digest ?? null,
      qualityDecisionEnvelopeDigest: qualityDecisionEnvelope?.digest ?? null,
      officialReview: officialReview ?? null,
      errors: Object.freeze([...new Set(errors)]),
      projectUnchanged: true,
      appliedEvent: null,
      updatedProject: null,
      updatedProjectDigest: null,
      summary: summarizeVideoProject(project),
      nextLifecycleEvent: project.nextEvent,
      releasePreparationAllowed: false,
      publicationAllowed: false,
    });
  }

  const eventId = `replit-quality-approve:${officialReview.reviewSha256.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'APPROVE_QUALITY',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: qualityArtifact(qualityDecisionEnvelope),
  });
  validateVideoProject(updatedProject);
  const summary = summarizeVideoProject(updatedProject);

  return buildReceipt({
    schemaVersion: 'toolradar.quality-approval.v1',
    status: 'QUALITY_APPROVED',
    truthBoundary: 'video_project_quality_approved',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    reviewPackDigest: reviewPack.digest,
    qualityDecisionEnvelopeDigest: qualityDecisionEnvelope.digest,
    officialReview,
    errors: [],
    projectUnchanged: false,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary,
    nextLifecycleEvent: updatedProject.nextEvent,
    releasePreparationAllowed: true,
    publicationAllowed: false,
  });
};

export const validateQualityApprovalReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.quality-approval.v1') throw new TypeError('unsupported quality approval receipt');
  const {receiptDigest, ...core} = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be SHA-256');
  if (digest(core) !== receiptDigest) throw new Error('quality approval receipt digest mismatch');

  if (receipt.status === 'QUALITY_APPROVED') {
    if (receipt.officialReview?.schemaVersion !== 'toolradar.final-render-quality-review.v1'
      || receipt.officialReview?.status !== 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION') {
      throw new Error('quality approval must contain the official approved M10 review');
    }
    if (receipt.updatedProject?.stage !== 'QUALITY_APPROVED'
      || receipt.updatedProject?.status !== 'ACTIVE'
      || receipt.nextLifecycleEvent !== 'PREPARE_RELEASE') {
      throw new Error('quality-approved project lifecycle is invalid');
    }
    if (receipt.releasePreparationAllowed !== true || receipt.publicationAllowed !== false) {
      throw new Error('quality approval release boundary is invalid');
    }
    validateVideoProject(receipt.updatedProject);
  } else if (receipt.status === 'QUALITY_APPROVAL_BLOCKED') {
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) {
      throw new Error('blocked quality approval must not mutate the project');
    }
    if (receipt.releasePreparationAllowed !== false || receipt.publicationAllowed !== false) {
      throw new Error('blocked quality approval cannot allow release or publication');
    }
  } else {
    throw new RangeError(`unsupported quality approval status: ${receipt.status}`);
  }
  return true;
};
