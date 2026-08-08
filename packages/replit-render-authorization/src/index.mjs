import {createHash} from 'node:crypto';
import {
  buildFinalRenderGate,
  validateFinalRenderGateReceipt,
} from '../../remotion-final-render-gate/src/index.mjs';
import {
  buildMacRemotionRenderIntent,
  validateMacRemotionRenderIntent,
} from '../../mac-remotion-render-job-binding/src/index.mjs';
import {
  applyVideoProjectEvent,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';
import {
  assertCreativePreflightAllowsRenderAuthorization,
  validateVideoCreativePreflight,
} from '../../video-creative-preflight/src/index.mjs';

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
  if (project.stage !== 'ASSETS_VERIFIED') throw new Error('render authorization requires ASSETS_VERIFIED');
  if (project.status !== 'ACTIVE') throw new Error('render authorization requires an ACTIVE project');
  if (project.nextEvent !== 'AUTHORIZE_RENDER') throw new Error('render authorization requires AUTHORIZE_RENDER');
};

const gateArtifact = (gate, renderIntent, creativePreflight) => ({
  type: 'final_render_gate',
  schemaVersion: 'toolradar.remotion-final-render-gate.v1',
  artifactId: `final-render-gate:${gate.gateDigest}`,
  digest: gate.gateDigest,
  status: 'READY_FOR_RENDER_EXECUTION',
  truthBoundary: 'render_execution_authorized',
  claims: {
    finalRenderAllowed: true,
    outputPath: gate.outputPath,
    renderProfile: gate.renderProfile,
    assetCount: gate.assets.length,
    renderIntentBindingDigest: renderIntent.bindingDigest,
    creativePreflightDigest: creativePreflight.receiptDigest,
    artGateEvidenceDigest: creativePreflight.artGate.evidenceDigest,
    animaticGateEvidenceDigest: creativePreflight.animaticGate.evidenceDigest,
  },
});

const creativeBlockedReceipt = ({project, sourceProjectDigest, creativePreflight, error}) => buildReceipt({
  schemaVersion: 'toolradar.render-authorization.v1',
  status: 'CREATIVE_PREFLIGHT_BLOCKED',
  truthBoundary: 'creative_preflight_required_before_render_authorization',
  projectId: project.projectId,
  sourceProjectDigest,
  creativePreflight: creativePreflight ?? null,
  creativePreflightDigest: creativePreflight?.receiptDigest ?? null,
  finalRenderGate: null,
  renderIntent: null,
  projectUnchanged: true,
  appliedEvent: null,
  updatedProject: null,
  updatedProjectDigest: null,
  summary: summarizeVideoProject(project),
  nextLifecycleEvent: project.nextEvent,
  nextAction: 'REPAIR_ART_OR_ANIMATIC_GATE',
  renderExecutionAllowed: false,
  runnerSubmissionReady: false,
  errors: [error instanceof Error ? error.message : String(error)],
});

export const authorizeReplitRender = async ({
  project,
  creativePreflight,
  preflightReceiptPath,
  actor,
  occurredAt = new Date().toISOString(),
  appDir = 'apps/remotion-video',
  outputPath = 'out/toolradar-replit-final.mp4',
  renderProfile,
  compositionId = 'ToolRadarReplitPortrait',
} = {}) => {
  assertReadyProject(project);
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = normalizeTimestamp(occurredAt);
  const sourceProjectDigest = project.projectDigest;

  try {
    assertCreativePreflightAllowsRenderAuthorization({project, receipt: creativePreflight});
  } catch (error) {
    return creativeBlockedReceipt({project, sourceProjectDigest, creativePreflight, error});
  }

  const finalRenderGate = await buildFinalRenderGate({
    receiptPath: requiredText(preflightReceiptPath, 'preflightReceiptPath'),
    appDir,
    outputPath,
    renderProfile,
  });
  const gateErrors = validateFinalRenderGateReceipt(finalRenderGate);

  if (gateErrors.length > 0) {
    return buildReceipt({
      schemaVersion: 'toolradar.render-authorization.v1',
      status: 'RENDER_GATE_BLOCKED',
      truthBoundary: 'render_execution_blocked',
      projectId: project.projectId,
      sourceProjectDigest,
      creativePreflight,
      creativePreflightDigest: creativePreflight.receiptDigest,
      finalRenderGate,
      renderIntent: null,
      projectUnchanged: true,
      appliedEvent: null,
      updatedProject: null,
      updatedProjectDigest: null,
      summary: summarizeVideoProject(project),
      nextLifecycleEvent: project.nextEvent,
      nextAction: 'REPAIR_MEDIA_OR_PREFLIGHT_EVIDENCE',
      renderExecutionAllowed: false,
      runnerSubmissionReady: false,
      errors: [...new Set([...(finalRenderGate.errors ?? []), ...gateErrors])],
    });
  }

  const renderIntent = buildMacRemotionRenderIntent({gate: finalRenderGate, compositionId});
  validateMacRemotionRenderIntent(renderIntent);
  if (renderIntent.finalRenderAllowed !== true) {
    return buildReceipt({
      schemaVersion: 'toolradar.render-authorization.v1',
      status: 'RENDER_INTENT_BLOCKED',
      truthBoundary: 'render_intent_blocked',
      projectId: project.projectId,
      sourceProjectDigest,
      creativePreflight,
      creativePreflightDigest: creativePreflight.receiptDigest,
      finalRenderGate,
      renderIntent,
      projectUnchanged: true,
      appliedEvent: null,
      updatedProject: null,
      updatedProjectDigest: null,
      summary: summarizeVideoProject(project),
      nextLifecycleEvent: project.nextEvent,
      nextAction: 'REPAIR_RENDER_INTENT_EVIDENCE',
      renderExecutionAllowed: false,
      runnerSubmissionReady: false,
      errors: renderIntent.errors,
    });
  }

  const eventId = `replit-render-authorize:${finalRenderGate.gateDigest.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'AUTHORIZE_RENDER',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: gateArtifact(finalRenderGate, renderIntent, creativePreflight),
  });
  validateVideoProject(updatedProject);
  const summary = summarizeVideoProject(updatedProject);

  return buildReceipt({
    schemaVersion: 'toolradar.render-authorization.v1',
    status: 'RENDER_AUTHORIZED',
    truthBoundary: 'video_project_render_authorized',
    projectId: project.projectId,
    sourceProjectDigest,
    creativePreflight,
    creativePreflightDigest: creativePreflight.receiptDigest,
    finalRenderGate,
    renderIntent,
    projectUnchanged: false,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary,
    nextLifecycleEvent: updatedProject.nextEvent,
    nextAction: 'MATERIALIZE_RUNNER_REQUEST_WITH_DEPLOYED_ADAPTER',
    renderExecutionAllowed: true,
    runnerSubmissionReady: false,
    errors: [],
  });
};

export const validateRenderAuthorizationReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.render-authorization.v1') throw new TypeError('unsupported render authorization receipt');
  const {receiptDigest, ...core} = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptDigest ?? '')) throw new TypeError('receiptDigest must be SHA-256');
  if (digest(core) !== receiptDigest) throw new Error('render authorization receipt digest mismatch');

  if (receipt.status === 'RENDER_AUTHORIZED') {
    validateVideoCreativePreflight(receipt.creativePreflight);
    if (receipt.creativePreflight.status !== 'CREATIVE_PREFLIGHT_PASSED') throw new Error('authorized receipt contains a blocked creative preflight');
    if (receipt.creativePreflightDigest !== receipt.creativePreflight.receiptDigest) throw new Error('creative preflight digest binding is invalid');
    if (receipt.creativePreflight.sourceProjectDigest !== receipt.sourceProjectDigest) throw new Error('creative preflight source project binding is invalid');
    if (validateFinalRenderGateReceipt(receipt.finalRenderGate).length > 0) throw new Error('authorized receipt contains an invalid final render gate');
    validateMacRemotionRenderIntent(receipt.renderIntent);
    if (receipt.renderIntent.finalRenderAllowed !== true) throw new Error('authorized receipt contains a blocked render intent');
    if (receipt.updatedProject?.stage !== 'RENDER_AUTHORIZED' || receipt.updatedProject?.status !== 'ACTIVE') {
      throw new Error('authorized project lifecycle boundary is invalid');
    }
    const latestGate = receipt.updatedProject.artifacts.at(-1);
    if (latestGate?.type !== 'final_render_gate' || latestGate.claims?.creativePreflightDigest !== receipt.creativePreflightDigest) {
      throw new Error('authorized project does not bind the creative preflight digest');
    }
    if (receipt.nextLifecycleEvent !== 'COMPLETE_RENDER') throw new Error('authorized project next event is invalid');
    if (receipt.renderExecutionAllowed !== true) throw new Error('authorized receipt must allow render execution');
    if (receipt.runnerSubmissionReady !== false) throw new Error('runner submission requires an explicit deployed adapter');
    validateVideoProject(receipt.updatedProject);
  } else if (receipt.status === 'CREATIVE_PREFLIGHT_BLOCKED') {
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) throw new Error('creative-preflight block must not change the project');
    if (receipt.finalRenderGate !== null || receipt.renderIntent !== null) throw new Error('creative-preflight block must stop before render gate construction');
    if (receipt.renderExecutionAllowed !== false || receipt.runnerSubmissionReady !== false) throw new Error('creative-preflight block cannot allow execution or submission');
  } else if (receipt.status === 'RENDER_GATE_BLOCKED' || receipt.status === 'RENDER_INTENT_BLOCKED') {
    validateVideoCreativePreflight(receipt.creativePreflight);
    if (receipt.creativePreflight.status !== 'CREATIVE_PREFLIGHT_PASSED') throw new Error('render/media block cannot carry a blocked creative preflight');
    if (receipt.projectUnchanged !== true || receipt.updatedProject !== null) throw new Error('blocked authorization must not change the project');
    if (receipt.renderExecutionAllowed !== false || receipt.runnerSubmissionReady !== false) {
      throw new Error('blocked authorization cannot allow execution or submission');
    }
  } else {
    throw new RangeError(`unsupported render authorization status: ${receipt.status}`);
  }
  return true;
};
