import {sha256CanonicalJsonV1, stableStringifyV1} from '../../shared-media-render-contract/src/index.mjs';
import {validateCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';

export const SHARED_MEDIA_PREPARATION_MANIFEST_V1 = 'shared-media.preparation-manifest.v1';

export class SharedMediaPreparationManifestError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaPreparationManifestError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaPreparationManifestError(code, message, {path});
};
const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_FIELD', `${path} must be an object`, path);
  return value;
};
const exactKeys = (value, allowed, path) => {
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail('UNSUPPORTED_FIELD', `${path}.${key} is unsupported`, `${path}.${key}`);
};
const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
};
const clone = (value) => structuredClone(value);

const assetPreparation = (asset) => ({
  assetId: asset.assetId,
  kind: asset.kind,
  locator: asset.locator,
  mediaType: asset.mediaType,
  expectedSha256: asset.sha256,
  action: 'resolve_exact_visual_asset',
});

const narrationSegments = (plan) => plan.timeline.shots
  .filter((shot) => shot.narration.mode === 'text')
  .map((shot) => ({
    segmentId: `narration-${shot.shotId}`,
    shotId: shot.shotId,
    startMs: shot.startMs,
    durationMs: shot.durationMs,
    text: shot.narration.text,
  }));

const voicePreparation = (plan, segments) => {
  if (plan.voice.mode === 'none') return {mode: 'none', action: 'none'};
  if (plan.voice.mode === 'provided') {
    return {mode: 'provided', action: 'resolve_exact_voice_asset', audioAsset: clone(plan.voice.audioAsset)};
  }
  return {
    mode: 'synthesize',
    action: 'synthesize_narration_segments',
    provider: plan.voice.provider,
    voiceId: plan.voice.voiceId,
    ...(plan.voice.locale !== undefined ? {locale: plan.voice.locale} : {}),
    ...(plan.voice.rate !== undefined ? {rate: plan.voice.rate} : {}),
    segmentIds: segments.map((segment) => segment.segmentId),
  };
};

const captionPreparation = (plan) => {
  if (plan.captions.mode === 'none') return {mode: 'none', format: 'none', action: 'none'};
  if (plan.captions.mode === 'provided') {
    return {
      mode: 'provided',
      format: plan.captions.format,
      action: 'resolve_exact_caption_asset',
      ...(plan.captions.language !== undefined ? {language: plan.captions.language} : {}),
      captionAsset: clone(plan.captions.captionAsset),
    };
  }
  return {
    mode: 'auto',
    format: plan.captions.format,
    action: 'generate_captions_from_timeline',
    ...(plan.captions.language !== undefined ? {language: plan.captions.language} : {}),
  };
};

const digestPayload = (manifest) => ({
  schemaVersion: manifest.schemaVersion,
  requestId: manifest.requestId,
  inputManifestDigest: manifest.inputManifestDigest,
  renderPlanDigest: manifest.renderPlanDigest,
  visualInputs: manifest.visualInputs,
  narrationSegments: manifest.narrationSegments,
  voicePreparation: manifest.voicePreparation,
  captionPreparation: manifest.captionPreparation,
  timeline: manifest.timeline,
  outputProfile: manifest.outputProfile,
  evidenceRequirements: manifest.evidenceRequirements,
  providerSelected: manifest.providerSelected,
  providerExecutionPerformed: manifest.providerExecutionPerformed,
  preparedArtifactsProduced: manifest.preparedArtifactsProduced,
  transportSelected: manifest.transportSelected,
  bindingCreated: manifest.bindingCreated,
  renderAuthorized: manifest.renderAuthorized,
  consumerDomainDecisionInferred: manifest.consumerDomainDecisionInferred,
  businessOutcomeInferred: manifest.businessOutcomeInferred,
});

export const computePreparationManifestDigestV1 = (manifest) => sha256CanonicalJsonV1(digestPayload(manifest));

const buildPreparationManifest = (plan) => {
  const segments = narrationSegments(plan);
  const manifest = {
    schemaVersion: SHARED_MEDIA_PREPARATION_MANIFEST_V1,
    requestId: plan.requestId,
    inputManifestDigest: plan.inputManifestDigest,
    renderPlanDigest: plan.renderPlanDigest,
    visualInputs: plan.visualAssets.map(assetPreparation),
    narrationSegments: segments,
    voicePreparation: voicePreparation(plan, segments),
    captionPreparation: captionPreparation(plan),
    timeline: clone(plan.timeline),
    outputProfile: clone(plan.outputProfile),
    evidenceRequirements: clone(plan.evidenceRequirements),
    providerSelected: false,
    providerExecutionPerformed: false,
    preparedArtifactsProduced: false,
    transportSelected: false,
    bindingCreated: false,
    renderAuthorized: false,
    consumerDomainDecisionInferred: false,
    businessOutcomeInferred: false,
  };
  manifest.preparationManifestDigest = computePreparationManifestDigestV1(manifest);
  return manifest;
};

export const compilePreparationManifestV1 = (plan) => {
  validateCanonicalRenderPlanV1(plan);
  const manifest = buildPreparationManifest(plan);
  validatePreparationManifestV1(manifest);
  return deepFreeze(manifest);
};

export const validatePreparationManifestV1 = (manifest, {plan = null} = {}) => {
  const value = object(manifest, '$manifest');
  exactKeys(value, new Set([
    'schemaVersion','requestId','inputManifestDigest','renderPlanDigest','visualInputs','narrationSegments',
    'voicePreparation','captionPreparation','timeline','outputProfile','evidenceRequirements','providerSelected',
    'providerExecutionPerformed','preparedArtifactsProduced','transportSelected','bindingCreated','renderAuthorized',
    'consumerDomainDecisionInferred','businessOutcomeInferred','preparationManifestDigest',
  ]), '$manifest');
  if (value.schemaVersion !== SHARED_MEDIA_PREPARATION_MANIFEST_V1) fail('INVALID_MANIFEST', 'unexpected schemaVersion', '$manifest.schemaVersion');
  for (const [field, item] of [['inputManifestDigest', value.inputManifestDigest], ['renderPlanDigest', value.renderPlanDigest], ['preparationManifestDigest', value.preparationManifestDigest]]) {
    if (!/^[a-f0-9]{64}$/.test(item ?? '')) fail('INVALID_MANIFEST', `${field} must be lowercase SHA-256`, `$manifest.${field}`);
  }
  if (typeof value.requestId !== 'string' || value.requestId.length === 0) fail('INVALID_MANIFEST', 'requestId must be non-empty', '$manifest.requestId');

  if (!Array.isArray(value.visualInputs)) fail('INVALID_MANIFEST', 'visualInputs must be an array', '$manifest.visualInputs');
  const visualIds = new Set();
  value.visualInputs.forEach((asset, index) => {
    const path = `$manifest.visualInputs[${index}]`;
    exactKeys(object(asset, path), new Set(['assetId','kind','locator','mediaType','expectedSha256','action']), path);
    if (asset.action !== 'resolve_exact_visual_asset') fail('INVALID_MANIFEST', 'visual input action mismatch', `${path}.action`);
    if (!/^[a-f0-9]{64}$/.test(asset.expectedSha256 ?? '')) fail('INVALID_MANIFEST', 'visual expectedSha256 invalid', `${path}.expectedSha256`);
    if (visualIds.has(asset.assetId)) fail('INVALID_MANIFEST', 'duplicate visual assetId', `${path}.assetId`);
    visualIds.add(asset.assetId);
  });

  if (!Array.isArray(value.narrationSegments)) fail('INVALID_MANIFEST', 'narrationSegments must be an array', '$manifest.narrationSegments');
  const segmentIds = [];
  const seenSegments = new Set();
  value.narrationSegments.forEach((segment, index) => {
    const path = `$manifest.narrationSegments[${index}]`;
    exactKeys(object(segment, path), new Set(['segmentId','shotId','startMs','durationMs','text']), path);
    if (!Number.isInteger(segment.startMs) || segment.startMs < 0 || !Number.isInteger(segment.durationMs) || segment.durationMs <= 0) fail('INVALID_MANIFEST', 'narration segment timing invalid', path);
    if (typeof segment.text !== 'string' || segment.text.length === 0) fail('INVALID_MANIFEST', 'narration text required', `${path}.text`);
    if (seenSegments.has(segment.segmentId)) fail('INVALID_MANIFEST', 'duplicate narration segmentId', `${path}.segmentId`);
    seenSegments.add(segment.segmentId);
    segmentIds.push(segment.segmentId);
  });

  const voice = object(value.voicePreparation, '$manifest.voicePreparation');
  if (!['none','provided','synthesize'].includes(voice.mode)) fail('INVALID_MANIFEST', 'voicePreparation.mode unsupported', '$manifest.voicePreparation.mode');
  if (voice.mode === 'none') {
    exactKeys(voice, new Set(['mode','action']), '$manifest.voicePreparation');
    if (voice.action !== 'none') fail('INVALID_MANIFEST', 'none voice action mismatch', '$manifest.voicePreparation.action');
  } else if (voice.mode === 'provided') {
    exactKeys(voice, new Set(['mode','action','audioAsset']), '$manifest.voicePreparation');
    if (voice.action !== 'resolve_exact_voice_asset') fail('INVALID_MANIFEST', 'provided voice action mismatch', '$manifest.voicePreparation.action');
    object(voice.audioAsset, '$manifest.voicePreparation.audioAsset');
  } else {
    exactKeys(voice, new Set(['mode','action','provider','voiceId','locale','rate','segmentIds']), '$manifest.voicePreparation');
    if (voice.action !== 'synthesize_narration_segments') fail('INVALID_MANIFEST', 'synthesize voice action mismatch', '$manifest.voicePreparation.action');
    if (!Array.isArray(voice.segmentIds) || stableStringifyV1(voice.segmentIds) !== stableStringifyV1(segmentIds)) fail('INVALID_MANIFEST', 'voice segmentIds must exactly match narration segments', '$manifest.voicePreparation.segmentIds');
  }

  const captions = object(value.captionPreparation, '$manifest.captionPreparation');
  if (!['none','provided','auto'].includes(captions.mode)) fail('INVALID_MANIFEST', 'captionPreparation.mode unsupported', '$manifest.captionPreparation.mode');
  if (captions.mode === 'none') {
    exactKeys(captions, new Set(['mode','format','action']), '$manifest.captionPreparation');
    if (captions.action !== 'none' || captions.format !== 'none') fail('INVALID_MANIFEST', 'none captions mismatch', '$manifest.captionPreparation');
  } else if (captions.mode === 'provided') {
    exactKeys(captions, new Set(['mode','format','action','language','captionAsset']), '$manifest.captionPreparation');
    if (captions.action !== 'resolve_exact_caption_asset') fail('INVALID_MANIFEST', 'provided caption action mismatch', '$manifest.captionPreparation.action');
    object(captions.captionAsset, '$manifest.captionPreparation.captionAsset');
  } else {
    exactKeys(captions, new Set(['mode','format','action','language']), '$manifest.captionPreparation');
    if (captions.action !== 'generate_captions_from_timeline') fail('INVALID_MANIFEST', 'auto caption action mismatch', '$manifest.captionPreparation.action');
  }

  object(value.timeline, '$manifest.timeline');
  object(value.outputProfile, '$manifest.outputProfile');
  object(value.evidenceRequirements, '$manifest.evidenceRequirements');

  for (const field of ['providerSelected','providerExecutionPerformed','preparedArtifactsProduced','transportSelected','bindingCreated','renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred']) {
    if (value[field] !== false) fail('TRUTH_BOUNDARY', `${field} must remain false in preparation manifest`, `$manifest.${field}`);
  }
  if (computePreparationManifestDigestV1(value) !== value.preparationManifestDigest) fail('MANIFEST_INTEGRITY_MISMATCH', 'preparationManifestDigest mismatch', '$manifest.preparationManifestDigest');

  if (plan !== null) {
    validateCanonicalRenderPlanV1(plan);
    const expected = buildPreparationManifest(plan);
    if (stableStringifyV1(value) !== stableStringifyV1(expected)) fail('PLAN_MANIFEST_MISMATCH', 'preparation manifest does not match exact render plan', '$manifest');
  }
  return true;
};
