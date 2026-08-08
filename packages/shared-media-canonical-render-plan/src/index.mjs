import {
  MEDIA_RENDER_V1,
  assertNoForbiddenDomainFieldsV1,
  sha256CanonicalJsonV1,
  stableStringifyV1,
  validateMediaRenderRequestV1,
} from '../../shared-media-render-contract/src/index.mjs';

export const SHARED_MEDIA_CANONICAL_RENDER_PLAN_V1 = 'shared-media.canonical-render-plan.v1';

const REQUEST_KEYS = new Set([
  'contractVersion','messageType','requestId','purpose','title','language','shots','visualAssets',
  'voice','captions','outputProfile','evidenceRequirements','inputManifestDigest',
]);
const SHOT_KEYS = new Set(['shotId','order','durationMs','narration','visualAssetIds']);
const NARRATION_KEYS = new Set(['mode','text']);
const VISUAL_ASSET_KEYS = new Set(['assetId','kind','locator','mediaType','sha256']);
const GENERIC_ASSET_KEYS = new Set(['assetId','locator','mediaType','sha256']);
const VOICE_KEYS = new Set(['mode','provider','voiceId','rate','audioAsset','locale']);
const CAPTION_KEYS = new Set(['mode','format','captionAsset','language']);
const PROFILE_KEYS = new Set(['profileId','width','height','fps','container','videoCodec','audioCodec']);
const EVIDENCE_KEYS = new Set(['requireMediaInspection','requireSha256','requireRenderLog','requireInputManifestDigest']);
const REQUIREMENT_KEYS = new Set([
  'visualAssetResolutionRequired','voiceSynthesisRequired','providedVoiceAssetRequired','captionGenerationRequired',
  'providedCaptionAssetRequired','timelineMaterializationRequired','canonicalEvidenceCollectionRequired',
]);

export class SharedMediaCanonicalRenderPlanError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaCanonicalRenderPlanError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaCanonicalRenderPlanError(code, message, {path});
};

const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_FIELD', `${path} must be an object`, path);
  return value;
};

const exactKeys = (value, allowed, path) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail('UNSUPPORTED_FIELD', `${path}.${key} is not supported by canonical render-plan v1`, `${path}.${key}`);
  }
};

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
};

const clone = (value) => structuredClone(value);

const validateGenericAssetShape = (asset, path) => {
  const value = object(asset, path);
  exactKeys(value, GENERIC_ASSET_KEYS, path);
};

const assertCurrentSemanticsOnly = (request) => {
  exactKeys(request, REQUEST_KEYS, '$');
  request.shots.forEach((shot, index) => {
    const path = `$.shots[${index}]`;
    exactKeys(object(shot, path), SHOT_KEYS, path);
    exactKeys(object(shot.narration, `${path}.narration`), NARRATION_KEYS, `${path}.narration`);
  });
  request.visualAssets.forEach((asset, index) => {
    exactKeys(object(asset, `$.visualAssets[${index}]`), VISUAL_ASSET_KEYS, `$.visualAssets[${index}]`);
  });
  exactKeys(object(request.voice, '$.voice'), VOICE_KEYS, '$.voice');
  if (request.voice.audioAsset !== undefined) validateGenericAssetShape(request.voice.audioAsset, '$.voice.audioAsset');
  exactKeys(object(request.captions, '$.captions'), CAPTION_KEYS, '$.captions');
  if (request.captions.captionAsset !== undefined) validateGenericAssetShape(request.captions.captionAsset, '$.captions.captionAsset');
  exactKeys(object(request.outputProfile, '$.outputProfile'), PROFILE_KEYS, '$.outputProfile');
  exactKeys(object(request.evidenceRequirements, '$.evidenceRequirements'), EVIDENCE_KEYS, '$.evidenceRequirements');
};

const normalizeTimeline = (request) => {
  let cursorMs = 0;
  const shots = request.shots.map((shot, index) => {
    const path = `$.shots[${index}].durationMs`;
    if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) {
      fail('DURATION_REQUIRED', `${path} must be a positive integer for canonical render-plan v1`, path);
    }
    if (!Number.isSafeInteger(cursorMs + shot.durationMs)) {
      fail('TIMELINE_OVERFLOW', 'canonical render timeline exceeds safe integer milliseconds', '$.shots');
    }
    const startMs = cursorMs;
    const endMs = startMs + shot.durationMs;
    cursorMs = endMs;
    return {
      shotId: shot.shotId,
      order: shot.order,
      startMs,
      durationMs: shot.durationMs,
      endMs,
      narration: clone(shot.narration),
      visualAssetIds: [...shot.visualAssetIds],
    };
  });
  return {totalDurationMs: cursorMs, shots};
};

const requirementsFor = (request) => ({
  visualAssetResolutionRequired: request.visualAssets.length > 0,
  voiceSynthesisRequired: request.voice.mode === 'synthesize',
  providedVoiceAssetRequired: request.voice.mode === 'provided',
  captionGenerationRequired: request.captions.mode === 'auto',
  providedCaptionAssetRequired: request.captions.mode === 'provided',
  timelineMaterializationRequired: true,
  canonicalEvidenceCollectionRequired: true,
});

const digestPayload = (plan) => ({
  schemaVersion: plan.schemaVersion,
  contractVersion: plan.contractVersion,
  requestId: plan.requestId,
  inputManifestDigest: plan.inputManifestDigest,
  purpose: plan.purpose,
  title: plan.title,
  language: plan.language,
  timeline: plan.timeline,
  visualAssets: plan.visualAssets,
  voice: plan.voice,
  captions: plan.captions,
  outputProfile: plan.outputProfile,
  evidenceRequirements: plan.evidenceRequirements,
  requirements: plan.requirements,
  transportSelected: plan.transportSelected,
  bindingCreated: plan.bindingCreated,
  renderAuthorized: plan.renderAuthorized,
  providerExecutionPerformed: plan.providerExecutionPerformed,
  consumerDomainDecisionInferred: plan.consumerDomainDecisionInferred,
  businessOutcomeInferred: plan.businessOutcomeInferred,
});

export const computeCanonicalRenderPlanDigestV1 = (plan) => sha256CanonicalJsonV1(digestPayload(plan));

const reconstructCanonicalRequestFromPlan = (plan) => ({
  contractVersion: MEDIA_RENDER_V1,
  messageType: 'request',
  requestId: plan.requestId,
  purpose: plan.purpose,
  ...(plan.title !== null ? {title: plan.title} : {}),
  language: plan.language,
  shots: plan.timeline.shots.map((shot) => ({
    shotId: shot.shotId,
    order: shot.order,
    durationMs: shot.durationMs,
    narration: clone(shot.narration),
    visualAssetIds: [...shot.visualAssetIds],
  })),
  visualAssets: clone(plan.visualAssets),
  voice: clone(plan.voice),
  captions: clone(plan.captions),
  outputProfile: clone(plan.outputProfile),
  evidenceRequirements: clone(plan.evidenceRequirements),
  inputManifestDigest: plan.inputManifestDigest,
});

export const compileCanonicalRenderPlanV1 = (request) => {
  validateMediaRenderRequestV1(request);
  assertNoForbiddenDomainFieldsV1(request, '$');
  assertCurrentSemanticsOnly(request);

  const plan = {
    schemaVersion: SHARED_MEDIA_CANONICAL_RENDER_PLAN_V1,
    contractVersion: MEDIA_RENDER_V1,
    requestId: request.requestId,
    inputManifestDigest: request.inputManifestDigest,
    purpose: request.purpose,
    title: request.title ?? null,
    language: request.language,
    timeline: normalizeTimeline(request),
    visualAssets: clone(request.visualAssets),
    voice: clone(request.voice),
    captions: clone(request.captions),
    outputProfile: clone(request.outputProfile),
    evidenceRequirements: clone(request.evidenceRequirements),
    requirements: requirementsFor(request),
    transportSelected: false,
    bindingCreated: false,
    renderAuthorized: false,
    providerExecutionPerformed: false,
    consumerDomainDecisionInferred: false,
    businessOutcomeInferred: false,
  };
  plan.renderPlanDigest = computeCanonicalRenderPlanDigestV1(plan);
  assertNoForbiddenDomainFieldsV1(plan, '$plan');
  validateCanonicalRenderPlanV1(plan);
  return deepFreeze(plan);
};

export const validateCanonicalRenderPlanV1 = (plan, {request = null} = {}) => {
  const value = object(plan, '$plan');
  exactKeys(value, new Set([
    'schemaVersion','contractVersion','requestId','inputManifestDigest','purpose','title','language','timeline',
    'visualAssets','voice','captions','outputProfile','evidenceRequirements','requirements','transportSelected',
    'bindingCreated','renderAuthorized','providerExecutionPerformed','consumerDomainDecisionInferred',
    'businessOutcomeInferred','renderPlanDigest',
  ]), '$plan');
  assertNoForbiddenDomainFieldsV1(value, '$plan');
  if (value.schemaVersion !== SHARED_MEDIA_CANONICAL_RENDER_PLAN_V1) fail('INVALID_PLAN', 'unexpected render-plan schemaVersion', '$plan.schemaVersion');
  if (value.contractVersion !== MEDIA_RENDER_V1) fail('INVALID_PLAN', 'render-plan contractVersion must be media.render.v1', '$plan.contractVersion');
  if (typeof value.requestId !== 'string' || value.requestId.length === 0) fail('INVALID_PLAN', 'requestId must be non-empty', '$plan.requestId');
  if (!/^[a-f0-9]{64}$/.test(value.inputManifestDigest ?? '')) fail('INVALID_PLAN', 'inputManifestDigest must be lowercase SHA-256', '$plan.inputManifestDigest');

  const timeline = object(value.timeline, '$plan.timeline');
  exactKeys(timeline, new Set(['totalDurationMs','shots']), '$plan.timeline');
  if (!Array.isArray(timeline.shots) || timeline.shots.length < 1) fail('INVALID_PLAN', 'timeline.shots must be non-empty', '$plan.timeline.shots');
  let cursorMs = 0;
  timeline.shots.forEach((shot, index) => {
    const path = `$plan.timeline.shots[${index}]`;
    exactKeys(object(shot, path), new Set(['shotId','order','startMs','durationMs','endMs','narration','visualAssetIds']), path);
    if (!Number.isInteger(shot.startMs) || shot.startMs !== cursorMs) fail('INVALID_PLAN', 'timeline shots must be contiguous from zero', `${path}.startMs`);
    if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) fail('INVALID_PLAN', 'timeline durationMs must be positive integer', `${path}.durationMs`);
    if (!Number.isInteger(shot.endMs) || shot.endMs !== shot.startMs + shot.durationMs) fail('INVALID_PLAN', 'timeline endMs mismatch', `${path}.endMs`);
    cursorMs = shot.endMs;
  });
  if (!Number.isInteger(timeline.totalDurationMs) || timeline.totalDurationMs !== cursorMs) fail('INVALID_PLAN', 'timeline totalDurationMs mismatch', '$plan.timeline.totalDurationMs');

  if (!Array.isArray(value.visualAssets)) fail('INVALID_PLAN', 'visualAssets must be an array', '$plan.visualAssets');
  value.visualAssets.forEach((asset, index) => exactKeys(object(asset, `$plan.visualAssets[${index}]`), VISUAL_ASSET_KEYS, `$plan.visualAssets[${index}]`));
  exactKeys(object(value.voice, '$plan.voice'), VOICE_KEYS, '$plan.voice');
  if (value.voice.audioAsset !== undefined) validateGenericAssetShape(value.voice.audioAsset, '$plan.voice.audioAsset');
  exactKeys(object(value.captions, '$plan.captions'), CAPTION_KEYS, '$plan.captions');
  if (value.captions.captionAsset !== undefined) validateGenericAssetShape(value.captions.captionAsset, '$plan.captions.captionAsset');
  exactKeys(object(value.outputProfile, '$plan.outputProfile'), PROFILE_KEYS, '$plan.outputProfile');
  exactKeys(object(value.evidenceRequirements, '$plan.evidenceRequirements'), EVIDENCE_KEYS, '$plan.evidenceRequirements');
  exactKeys(object(value.requirements, '$plan.requirements'), REQUIREMENT_KEYS, '$plan.requirements');

  const reconstructedRequest = reconstructCanonicalRequestFromPlan(value);
  try {
    validateMediaRenderRequestV1(reconstructedRequest);
    assertCurrentSemanticsOnly(reconstructedRequest);
  } catch (error) {
    fail('PLAN_SEMANTICS_MISMATCH', `render plan cannot reconstruct a valid canonical request: ${error.message}`, '$plan');
  }
  const expectedRequirements = requirementsFor(reconstructedRequest);
  if (stableStringifyV1(value.requirements) !== stableStringifyV1(expectedRequirements)) {
    fail('PLAN_SEMANTICS_MISMATCH', 'render plan requirements do not match preserved media semantics', '$plan.requirements');
  }

  for (const field of ['transportSelected','bindingCreated','renderAuthorized','providerExecutionPerformed','consumerDomainDecisionInferred','businessOutcomeInferred']) {
    if (value[field] !== false) fail('TRUTH_BOUNDARY', `${field} must remain false in a compiled render plan`, `$plan.${field}`);
  }
  if (!/^[a-f0-9]{64}$/.test(value.renderPlanDigest ?? '')) fail('INVALID_PLAN', 'renderPlanDigest must be lowercase SHA-256', '$plan.renderPlanDigest');
  if (computeCanonicalRenderPlanDigestV1(value) !== value.renderPlanDigest) fail('PLAN_INTEGRITY_MISMATCH', 'renderPlanDigest does not match plan semantics', '$plan.renderPlanDigest');

  if (request !== null) {
    validateMediaRenderRequestV1(request);
    assertCurrentSemanticsOnly(request);
    const expected = compileCanonicalRenderPlanV1(request);
    if (stableStringifyV1(value) !== stableStringifyV1(expected)) {
      fail('REQUEST_PLAN_MISMATCH', 'render plan does not match the exact canonical request', '$plan');
    }
  }
  return true;
};
