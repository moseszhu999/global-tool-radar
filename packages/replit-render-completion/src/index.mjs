import {createHash} from 'node:crypto';
import {validateMacRemotionRunnerRequest} from '../../mac-remotion-render-job-binding/src/index.mjs';
import {validateMacRemotionRenderReceipt} from '../../mac-remotion-render-orchestration/src/index.mjs';
import {validateFinalRenderReceipt} from '../../remotion-final-render-receipt/src/index.mjs';
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

const buildReceipt = (core) => Object.freeze({...core, receiptDigest: digest(core)});

const assertReadyProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'RENDER_AUTHORIZED') throw new Error('render completion requires RENDER_AUTHORIZED');
  if (project.status !== 'ACTIVE') throw new Error('render completion requires an ACTIVE project');
  if (project.nextEvent !== 'COMPLETE_RENDER') throw new Error('render completion requires COMPLETE_RENDER');
};

const latestGateArtifact = (project) => [...project.artifacts]
  .reverse()
  .find((artifact) => artifact.type === 'final_render_gate');

const validationError = (prefix, error) => `${prefix}:${error instanceof Error ? error.message : String(error)}`;

const completionEvidence = ({project, gateArtifact, runnerRequestEnvelope, runnerRunReceipt, finalVideoReceipt}) => ({
  schemaVersion: 'toolradar.render-completion-evidence.v1',
  projectId: project.projectId,
  sourceProjectDigest: project.projectDigest,
  gateDigest: gateArtifact.digest,
  renderIntentBindingDigest: gateArtifact.claims.renderIntentBindingDigest,
  runnerRequestEnvelopeDigest: runnerRequestEnvelope.envelopeDigest,
  runnerRequestDigest: runnerRequestEnvelope.requestDigest,
  runnerRunReceiptDigest: runnerRunReceipt.receiptDigest,
  jobId: runnerRunReceipt.jobId,
  finalVideoReceiptDigest: finalVideoReceipt.receiptDigest,
  finalVideoSha256: finalVideoReceipt.videoSha256,
  outputPath: finalVideoReceipt.videoPath,
  renderProfile: finalVideoReceipt.renderProfile,
});

const completionArtifact = (evidence, evidenceDigest) => ({
  type: 'mac_remotion_render_run',
  schemaVersion: evidence.schemaVersion,
  artifactId: `render-completion:${evidenceDigest}`,
  digest: evidenceDigest,
  status: 'COMPLETED',
  truthBoundary: 'runner_and_final_video_verified',
  claims: {
    realSubmissionPerformed: true,
    finalVideoClaimAllowed: true,
    jobId: evidence.jobId,
    jobRequestDigest: evidence.runnerRequestDigest,
    runnerRequestEnvelopeDigest: evidence.runnerRequestEnvelopeDigest,
    runnerRunReceiptDigest: evidence.runnerRunReceiptDigest,
    finalVideoReceiptDigest: evidence.finalVideoReceiptDigest,
    finalVideoSha256: evidence.finalVideoSha256,
    gateDigest: evidence.gateDigest,
    outputPath: evidence.outputPath,
    renderProfile: evidence.renderProfile,
  },
});

export const completeVideoProjectRender = ({
  project,
  runnerRequestEnvelope,
  runnerRunReceipt,
  finalVideoReceipt,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  assertReadyProject(project);
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = normalizeTimestamp(occurredAt);
  const gateArtifact = latestGateArtifact(project);
  const errors = [];

  if (!gateArtifact) errors.push('project_final_render_gate_missing');
  try {
    validateMacRemotionRunnerRequest(runnerRequestEnvelope);
  } catch (error) {
    errors.push(validationError('runner_request', error));
  }
  try {
    validateMacRemotionRenderReceipt(runnerRunReceipt);
  } catch (error) {
    errors.push(validationError('runner_run', error));
  }
  for (const error of validateFinalRenderReceipt(finalVideoReceipt)) errors.push(`final_video:${error}`);

  if (gateArtifact && runnerRequestEnvelope?.bindingDigest !== gateArtifact.claims?.renderIntentBindingDigest) {
    errors.push('runner_request_binding_does_not_match_project_gate');
  }
  if (runnerRunReceipt?.jobRequestDigest !== runnerRequestEnvelope?.requestDigest) {
    errors.push('runner_run_request_digest_mismatch');
  }
  if (runnerRunReceipt?.status !== 'COMPLETED'
    || runnerRunReceipt?.realSubmissionPerformed !== true
    || runnerRunReceipt?.finalVideoClaimAllowed !== true) {
    errors.push('runner_run_not_completed');
  }
  if (gateArtifact && finalVideoReceipt?.gateDigest !== gateArtifact.digest) {
    errors.push('final_video_gate_does_not_match_project');
  }
  if (gateArtifact?.claims?.outputPath && finalVideoReceipt?.videoPath !== gateArtifact.claims.outputPath) {
    errors.push('final_video_path_does_not_match_project_gate');
  }
  if (gateArtifact?.claims?.renderProfile
    && stableStringify(finalVideoReceipt?.renderProfile) !== stableStringify(gateArtifact.claims.renderProfile)) {
    errors.push('final_video_profile_does_not_match_project_gate');
  }

  if (errors.length > 0) {
    return buildReceipt({
      schemaVersion: 'toolradar.render-completion.v1',
      status: 'RENDER_COMPLETION_BLOCKED',
      truthBoundary: 'render_completion_evidence_blocked',
      projectId: project.projectId,
      sourceProjectDigest: project.projectDigest,
      errors: Object.freeze([...new Set(errors)]),
      evidence: null,
      evidenceDigest: null,
      projectUnchanged: true,
      appliedEvent: null,
      updatedProject: null,
      updatedProjectDigest: null,
      summary: summarizeVideoProject(project),
      nextLifecycleEvent: project.nextEvent,
      renderCompleted: false,
      m10ReviewPreparationAllowed: false,
      qualityApproved: false,
      publicationAllowed: false,
    });
  }

  const evidence = Object.freeze(completionEvidence({
    project,
    gateArtifact,
    runnerRequestEnvelope,
    runnerRunReceipt,
    finalVideoReceipt,
  }));
  const evidenceDigest = digest(evidence);
  const eventId = `replit-render-complete:${evidenceDigest.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'COMPLETE_RENDER',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: completionArtifact(evidence, evidenceDigest),
  });
  validateVideoProject(updatedProject);
  const summary = summarizeVideoProject(updatedProject);

  return buildReceipt({
    schemaVersion: 'toolradar.render-completion.v1',
    status: 'RENDER_COMPLETED',
    truthBoundary: 'video_project_render_completed',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    errors: [],
    evidence,
    evidenceDigest,
    projectUnchanged: false,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary,
    nextLifecycleEvent: updatedProject.nextEvent,
    renderCompleted: true,
    m10ReviewPreparationAllowed: true,
    qualityApproved: false,
    publicationAllowed: false,
  });
};

export const validateRenderCompletionReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.render-completion.v1') throw new TypeError('unsupported render completion receipt');
  const {receiptDigest, ...core} = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be SHA-256');
  if (digest(core) !== receiptDigest) throw new Error('render completion receipt digest mismatch');

  if (receipt.status === 'RENDER_COMPLETED') {
    if (receipt.renderCompleted !== true || receipt.m10ReviewPreparationAllowed !== true) {
      throw new Error('completed render receipt boundary is invalid');
    }
    if (receipt.qualityApproved !== false || receipt.publicationAllowed !== false) {
      throw new Error('render completion cannot approve quality or publication');
    }
    if (receipt.updatedProject?.stage !== 'RENDER_COMPLETED'
      || receipt.updatedProject?.status !== 'ACTIVE'
      || receipt.nextLifecycleEvent !== 'APPROVE_QUALITY') {
      throw new Error('completed render project lifecycle is invalid');
    }
    if (digest(receipt.evidence) !== receipt.evidenceDigest) throw new Error('render completion evidence digest mismatch');
    validateVideoProject(receipt.updatedProject);
  } else if (receipt.status === 'RENDER_COMPLETION_BLOCKED') {
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) {
      throw new Error('blocked render completion must not mutate the project');
    }
    if (receipt.renderCompleted !== false || receipt.m10ReviewPreparationAllowed !== false) {
      throw new Error('blocked render completion cannot allow M10 preparation');
    }
  } else {
    throw new RangeError(`unsupported render completion status: ${receipt.status}`);
  }
  return true;
};
