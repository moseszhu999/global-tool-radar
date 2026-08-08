import {createHash} from 'node:crypto';

import {sha256CanonicalJsonV1, stableStringifyV1} from '../../shared-media-render-contract/src/index.mjs';
import {validateCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {validatePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';

export const SHARED_MEDIA_PREPARED_INPUTS_V1 = 'shared-media.prepared-inputs.v1';

export class SharedMediaPreparationExecutorError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaPreparationExecutorError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaPreparationExecutorError(code, message, {path});
};
const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_FIELD', `${path} must be an object`, path);
  return value;
};
const text = (value, path, {max = 1000} = {}) => {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_FIELD', `${path} must be non-empty`, path);
  const normalized = value.trim();
  if (normalized.length > max) fail('INVALID_FIELD', `${path} is too long`, path);
  return normalized;
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
const SHA = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const bytes = (value, path) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  fail('INVALID_OPERATION_RESULT', `${path} must be bytes`, path);
};

const requireOperation = (value, name) => {
  if (typeof value !== 'function') fail('OPERATION_REQUIRED', `${name} must be a function`, `$${name}`);
  return value;
};

const safeOperation = async (operation, input, name) => {
  try {
    return await operation(deepFreeze(clone(input)));
  } catch (error) {
    if (error instanceof SharedMediaPreparationExecutorError) throw error;
    fail('OPERATION_FAILED', `${name} failed without exposing provider details`, `$${name}`);
  }
};

const canonicalTimestamp = (value) => {
  const timestamp = text(value, '$preparedAt', {max: 80});
  if (Number.isNaN(Date.parse(timestamp))) fail('INVALID_FIELD', '$preparedAt must be an ISO-compatible timestamp', '$preparedAt');
  return timestamp;
};

const artifactIdFor = (role, key) => `prepared-${role}-${sha256(`${role}\0${key}`).slice(0, 20)}`;

const artifactRecord = ({artifactId, role, sourceId, mediaType, payload, expectedSha256 = null, segment = null}) => {
  const snapshot = Buffer.from(payload);
  if (snapshot.byteLength < 1) fail('EMPTY_PREPARED_ARTIFACT', `${role} prepared bytes must not be empty`, '$preparedArtifact');
  const digest = sha256(snapshot);
  if (expectedSha256 !== null && digest !== expectedSha256) {
    fail('SOURCE_SHA_MISMATCH', `${role} prepared bytes do not match expected source SHA-256`, '$preparedArtifact.sha256');
  }
  const record = {
    artifactId,
    role,
    sourceId,
    mediaType,
    byteLength: snapshot.byteLength,
    sha256: digest,
    ...(segment ? {
      segmentId: segment.segmentId,
      sourceShotId: segment.shotId,
      targetStartMs: segment.startMs,
      targetDurationMs: segment.durationMs,
    } : {}),
  };
  return {record, snapshot};
};

const resolveResultBytes = (result, path, expectedMediaType = null) => {
  const value = object(result, path);
  exactKeys(value, new Set(['bytes','mediaType']), path);
  const snapshot = bytes(value.bytes, `${path}.bytes`);
  if (value.mediaType !== undefined) {
    const actual = text(value.mediaType, `${path}.mediaType`, {max: 160});
    if (expectedMediaType !== null && actual !== expectedMediaType) fail('MEDIA_TYPE_MISMATCH', `${path}.mediaType differs from expected media type`, `${path}.mediaType`);
  }
  return snapshot;
};

const synthesizedResult = (result, path) => {
  const value = object(result, path);
  exactKeys(value, new Set(['bytes','mediaType']), path);
  const payload = bytes(value.bytes, `${path}.bytes`);
  const mediaType = text(value.mediaType, `${path}.mediaType`, {max: 160});
  if (!mediaType.startsWith('audio/')) fail('MEDIA_TYPE_MISMATCH', `${path}.mediaType must be audio/*`, `${path}.mediaType`);
  return {payload, mediaType};
};

const validateArtifactRecord = (artifact, path) => {
  const value = object(artifact, path);
  exactKeys(value, new Set([
    'artifactId','role','sourceId','mediaType','byteLength','sha256','segmentId','sourceShotId','targetStartMs','targetDurationMs',
  ]), path);
  const artifactId = text(value.artifactId, `${path}.artifactId`, {max: 200});
  if (!SAFE_ID.test(artifactId)) fail('INVALID_RECEIPT', `${path}.artifactId contains unsupported characters`, `${path}.artifactId`);
  if (!['visual','voice-provided','voice-synthesized','caption-provided'].includes(value.role)) fail('INVALID_RECEIPT', `${path}.role unsupported`, `${path}.role`);
  text(value.sourceId, `${path}.sourceId`, {max: 240});
  text(value.mediaType, `${path}.mediaType`, {max: 160});
  if (!Number.isInteger(value.byteLength) || value.byteLength < 1) fail('INVALID_RECEIPT', `${path}.byteLength invalid`, `${path}.byteLength`);
  if (!SHA.test(value.sha256 ?? '')) fail('INVALID_RECEIPT', `${path}.sha256 invalid`, `${path}.sha256`);
  if (value.role === 'voice-synthesized') {
    text(value.segmentId, `${path}.segmentId`, {max: 240});
    text(value.sourceShotId, `${path}.sourceShotId`, {max: 240});
    if (!Number.isInteger(value.targetStartMs) || value.targetStartMs < 0) fail('INVALID_RECEIPT', `${path}.targetStartMs invalid`, `${path}.targetStartMs`);
    if (!Number.isInteger(value.targetDurationMs) || value.targetDurationMs <= 0) fail('INVALID_RECEIPT', `${path}.targetDurationMs invalid`, `${path}.targetDurationMs`);
  } else if (value.segmentId !== undefined || value.sourceShotId !== undefined || value.targetStartMs !== undefined || value.targetDurationMs !== undefined) {
    fail('INVALID_RECEIPT', `${path} non-synthesized artifact cannot carry segment timing`, path);
  }
  return true;
};

const receiptDigestPayload = (receipt) => ({
  schemaVersion: receipt.schemaVersion,
  requestId: receipt.requestId,
  inputManifestDigest: receipt.inputManifestDigest,
  renderPlanDigest: receipt.renderPlanDigest,
  preparationManifestDigest: receipt.preparationManifestDigest,
  preparedAt: receipt.preparedAt,
  visualArtifacts: receipt.visualArtifacts,
  voiceResult: receipt.voiceResult,
  captionResult: receipt.captionResult,
  actions: receipt.actions,
  preparedArtifactsProduced: receipt.preparedArtifactsProduced,
  transportSelected: receipt.transportSelected,
  bindingCreated: receipt.bindingCreated,
  renderAuthorized: receipt.renderAuthorized,
  consumerDomainDecisionInferred: receipt.consumerDomainDecisionInferred,
  businessOutcomeInferred: receipt.businessOutcomeInferred,
});

export const computePreparedInputsDigestV1 = (receipt) => sha256CanonicalJsonV1(receiptDigestPayload(receipt));

const captionCues = (manifest) => manifest.narrationSegments.map((segment) => ({
  cueId: `caption-${segment.segmentId}`,
  segmentId: segment.segmentId,
  shotId: segment.shotId,
  startMs: segment.startMs,
  endMs: segment.startMs + segment.durationMs,
  text: segment.text,
}));

const deriveReceiptFacts = ({visualArtifacts, voice, captions}) => {
  const assetResolutionPerformed = visualArtifacts.length > 0 || voice.mode === 'provided' || captions.mode === 'provided';
  const voiceSynthesisPerformed = voice.mode === 'synthesize' && voice.artifacts.length > 0;
  const captionCompilationPerformed = captions.mode === 'auto' && captions.cues.length > 0;
  const preparedArtifactCount = visualArtifacts.length + voice.artifacts.length + captions.artifacts.length;
  return {
    actions: {assetResolutionPerformed, voiceSynthesisPerformed, captionCompilationPerformed},
    preparedArtifactsProduced: preparedArtifactCount > 0 || captions.cues.length > 0,
  };
};

const assertExactSourceArtifact = (artifact, source, path) => {
  if (artifact.sourceId !== source.assetId || artifact.sha256 !== (source.expectedSha256 ?? source.sha256) || artifact.mediaType !== source.mediaType) {
    fail('SOURCE_SEMANTICS_MISMATCH', `${path} does not match exact preparation source identity`, path);
  }
};

export const validatePreparedInputsReceiptV1 = (receipt, {plan = null, manifest = null} = {}) => {
  const value = object(receipt, '$receipt');
  exactKeys(value, new Set([
    'schemaVersion','requestId','inputManifestDigest','renderPlanDigest','preparationManifestDigest','preparedAt',
    'visualArtifacts','voiceResult','captionResult','actions','preparedArtifactsProduced','transportSelected','bindingCreated',
    'renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred','preparedInputsDigest',
  ]), '$receipt');
  if (value.schemaVersion !== SHARED_MEDIA_PREPARED_INPUTS_V1) fail('INVALID_RECEIPT', 'unexpected schemaVersion', '$receipt.schemaVersion');
  text(value.requestId, '$receipt.requestId', {max: 200});
  for (const field of ['inputManifestDigest','renderPlanDigest','preparationManifestDigest','preparedInputsDigest']) {
    if (!SHA.test(value[field] ?? '')) fail('INVALID_RECEIPT', `${field} must be lowercase SHA-256`, `$receipt.${field}`);
  }
  canonicalTimestamp(value.preparedAt);
  if (!Array.isArray(value.visualArtifacts)) fail('INVALID_RECEIPT', 'visualArtifacts must be an array', '$receipt.visualArtifacts');
  value.visualArtifacts.forEach((artifact, index) => validateArtifactRecord(artifact, `$receipt.visualArtifacts[${index}]`));

  const voice = object(value.voiceResult, '$receipt.voiceResult');
  if (!['none','provided','synthesize'].includes(voice.mode)) fail('INVALID_RECEIPT', 'voiceResult.mode unsupported', '$receipt.voiceResult.mode');
  if (voice.mode === 'none') {
    exactKeys(voice, new Set(['mode','artifacts']), '$receipt.voiceResult');
    if (!Array.isArray(voice.artifacts) || voice.artifacts.length !== 0) fail('INVALID_RECEIPT', 'none voiceResult must contain zero artifacts', '$receipt.voiceResult.artifacts');
  } else {
    exactKeys(voice, new Set(['mode','artifacts']), '$receipt.voiceResult');
    if (!Array.isArray(voice.artifacts) || voice.artifacts.length < 1) fail('INVALID_RECEIPT', 'voiceResult artifacts required', '$receipt.voiceResult.artifacts');
    voice.artifacts.forEach((artifact, index) => validateArtifactRecord(artifact, `$receipt.voiceResult.artifacts[${index}]`));
    if (voice.mode === 'provided' && (voice.artifacts.length !== 1 || voice.artifacts[0].role !== 'voice-provided')) fail('INVALID_RECEIPT', 'provided voiceResult requires exactly one voice-provided artifact', '$receipt.voiceResult.artifacts');
    if (voice.mode === 'synthesize' && voice.artifacts.some((artifact) => artifact.role !== 'voice-synthesized')) fail('INVALID_RECEIPT', 'synthesize voiceResult role mismatch', '$receipt.voiceResult.artifacts');
  }

  const captions = object(value.captionResult, '$receipt.captionResult');
  if (!['none','provided','auto'].includes(captions.mode)) fail('INVALID_RECEIPT', 'captionResult.mode unsupported', '$receipt.captionResult.mode');
  if (captions.mode === 'none') {
    exactKeys(captions, new Set(['mode','format','cues','artifacts']), '$receipt.captionResult');
    if (captions.format !== 'none' || !Array.isArray(captions.cues) || captions.cues.length !== 0 || !Array.isArray(captions.artifacts) || captions.artifacts.length !== 0) fail('INVALID_RECEIPT', 'none captionResult must be empty', '$receipt.captionResult');
  } else if (captions.mode === 'provided') {
    exactKeys(captions, new Set(['mode','format','cues','artifacts']), '$receipt.captionResult');
    if (!Array.isArray(captions.cues) || captions.cues.length !== 0 || !Array.isArray(captions.artifacts) || captions.artifacts.length !== 1) fail('INVALID_RECEIPT', 'provided captionResult requires one artifact and no cues', '$receipt.captionResult');
    validateArtifactRecord(captions.artifacts[0], '$receipt.captionResult.artifacts[0]');
    if (captions.artifacts[0].role !== 'caption-provided') fail('INVALID_RECEIPT', 'provided caption artifact role mismatch', '$receipt.captionResult.artifacts[0].role');
  } else {
    exactKeys(captions, new Set(['mode','format','cues','artifacts']), '$receipt.captionResult');
    if (!Array.isArray(captions.artifacts) || captions.artifacts.length !== 0 || !Array.isArray(captions.cues) || captions.cues.length < 1) fail('INVALID_RECEIPT', 'auto captionResult requires cues and no artifact', '$receipt.captionResult');
    captions.cues.forEach((cue, index) => {
      const path = `$receipt.captionResult.cues[${index}]`;
      exactKeys(object(cue, path), new Set(['cueId','segmentId','shotId','startMs','endMs','text']), path);
      text(cue.cueId, `${path}.cueId`, {max: 260}); text(cue.segmentId, `${path}.segmentId`, {max: 240}); text(cue.shotId, `${path}.shotId`, {max: 240}); text(cue.text, `${path}.text`, {max: 10_000});
      if (!Number.isInteger(cue.startMs) || cue.startMs < 0 || !Number.isInteger(cue.endMs) || cue.endMs <= cue.startMs) fail('INVALID_RECEIPT', 'caption cue timing invalid', path);
    });
  }

  const actions = object(value.actions, '$receipt.actions');
  exactKeys(actions, new Set(['assetResolutionPerformed','voiceSynthesisPerformed','captionCompilationPerformed']), '$receipt.actions');
  for (const field of ['assetResolutionPerformed','voiceSynthesisPerformed','captionCompilationPerformed']) if (typeof actions[field] !== 'boolean') fail('INVALID_RECEIPT', `${field} must be boolean`, `$receipt.actions.${field}`);
  if (typeof value.preparedArtifactsProduced !== 'boolean') fail('INVALID_RECEIPT', 'preparedArtifactsProduced must be boolean', '$receipt.preparedArtifactsProduced');
  for (const field of ['transportSelected','bindingCreated','renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred']) {
    if (value[field] !== false) fail('TRUTH_BOUNDARY', `${field} must remain false in prepared inputs receipt`, `$receipt.${field}`);
  }

  // Preserve deterministic failure ordering: a non-resigned mutation is an integrity failure first.
  if (computePreparedInputsDigestV1(value) !== value.preparedInputsDigest) fail('RECEIPT_INTEGRITY_MISMATCH', 'preparedInputsDigest mismatch', '$receipt.preparedInputsDigest');

  const derivedFacts = deriveReceiptFacts({visualArtifacts:value.visualArtifacts, voice, captions});
  if (stableStringifyV1(actions) !== stableStringifyV1(derivedFacts.actions)) {
    fail('RECEIPT_SEMANTICS_MISMATCH', 'receipt action facts do not match prepared artifacts/cues', '$receipt.actions');
  }
  if (value.preparedArtifactsProduced !== derivedFacts.preparedArtifactsProduced) {
    fail('RECEIPT_SEMANTICS_MISMATCH', 'preparedArtifactsProduced does not match prepared artifacts/cues', '$receipt.preparedArtifactsProduced');
  }

  if ((plan === null) !== (manifest === null)) fail('SOURCE_AUTHORITY_REQUIRED', 'plan and manifest must be supplied together for exact source validation', '$receipt');
  if (plan !== null) {
    validateCanonicalRenderPlanV1(plan);
    validatePreparationManifestV1(manifest, {plan});
    if (value.requestId !== plan.requestId || value.inputManifestDigest !== plan.inputManifestDigest || value.renderPlanDigest !== plan.renderPlanDigest || value.preparationManifestDigest !== manifest.preparationManifestDigest) {
      fail('SOURCE_IDENTITY_MISMATCH', 'prepared receipt identity does not match exact plan/manifest', '$receipt');
    }
    if (value.visualArtifacts.length !== manifest.visualInputs.length) {
      fail('SOURCE_SEMANTICS_MISMATCH', 'visual artifact count does not match exact preparation manifest', '$receipt.visualArtifacts');
    }
    value.visualArtifacts.forEach((artifact, index) => assertExactSourceArtifact(artifact, manifest.visualInputs[index], `$receipt.visualArtifacts[${index}]`));

    if (voice.mode !== manifest.voicePreparation.mode) fail('SOURCE_SEMANTICS_MISMATCH', 'voiceResult mode does not match preparation manifest', '$receipt.voiceResult.mode');
    if (voice.mode === 'provided') {
      assertExactSourceArtifact(voice.artifacts[0], manifest.voicePreparation.audioAsset, '$receipt.voiceResult.artifacts[0]');
    } else if (voice.mode === 'synthesize') {
      if (voice.artifacts.length !== manifest.voicePreparation.segmentIds.length) fail('SOURCE_SEMANTICS_MISMATCH', 'synthesized voice artifact count does not match exact segment IDs', '$receipt.voiceResult.artifacts');
      voice.artifacts.forEach((artifact, index) => {
        const segmentId = manifest.voicePreparation.segmentIds[index];
        const segment = manifest.narrationSegments.find((item) => item.segmentId === segmentId);
        if (!segment || artifact.segmentId !== segmentId || artifact.sourceId !== segmentId || artifact.sourceShotId !== segment.shotId || artifact.targetStartMs !== segment.startMs || artifact.targetDurationMs !== segment.durationMs) {
          fail('SOURCE_SEMANTICS_MISMATCH', `synthesized voice artifact ${index} does not match exact narration segment`, `$receipt.voiceResult.artifacts[${index}]`);
        }
      });
    }

    if (captions.mode !== manifest.captionPreparation.mode || captions.format !== manifest.captionPreparation.format) fail('SOURCE_SEMANTICS_MISMATCH', 'captionResult mode/format does not match preparation manifest', '$receipt.captionResult');
    if (captions.mode === 'provided') {
      assertExactSourceArtifact(captions.artifacts[0], manifest.captionPreparation.captionAsset, '$receipt.captionResult.artifacts[0]');
    } else if (captions.mode === 'auto' && stableStringifyV1(captions.cues) !== stableStringifyV1(captionCues(manifest))) {
      fail('SOURCE_SEMANTICS_MISMATCH', 'auto caption cues do not match exact narration timeline', '$receipt.captionResult.cues');
    }
  }
  return true;
};

export const verifyPreparedPayloadsV1 = ({receipt, getPayload} = {}) => {
  validatePreparedInputsReceiptV1(receipt);
  const getter = requireOperation(getPayload, 'getPayload');
  const artifacts = [
    ...receipt.visualArtifacts,
    ...receipt.voiceResult.artifacts,
    ...receipt.captionResult.artifacts,
  ];
  const seen = new Set();
  for (const artifact of artifacts) {
    if (seen.has(artifact.artifactId)) fail('DUPLICATE_ARTIFACT_ID', 'prepared artifact IDs must be unique', '$receipt');
    seen.add(artifact.artifactId);
    const payload = bytes(getter(artifact.artifactId), `$payloads.${artifact.artifactId}`);
    if (payload.byteLength !== artifact.byteLength || sha256(payload) !== artifact.sha256) fail('PAYLOAD_INTEGRITY_MISMATCH', `payload ${artifact.artifactId} does not match prepared receipt`, `$payloads.${artifact.artifactId}`);
  }
  return true;
};

export const createPreparationExecutorV1 = ({
  resolveExactAsset,
  synthesizeNarrationSegment,
  isPreparationAuthorized,
  now = () => new Date().toISOString(),
} = {}) => {
  const resolveAsset = requireOperation(resolveExactAsset, 'resolveExactAsset');
  const synthesize = requireOperation(synthesizeNarrationSegment, 'synthesizeNarrationSegment');
  const authorize = requireOperation(isPreparationAuthorized, 'isPreparationAuthorized');
  const clock = requireOperation(now, 'now');

  return Object.freeze({
    async execute({plan, manifest} = {}) {
      validateCanonicalRenderPlanV1(plan);
      validatePreparationManifestV1(manifest, {plan});
      const authorized = await safeOperation(authorize, {
        requestId: plan.requestId,
        inputManifestDigest: plan.inputManifestDigest,
        renderPlanDigest: plan.renderPlanDigest,
        preparationManifestDigest: manifest.preparationManifestDigest,
        action: 'execute_preparation',
      }, 'isPreparationAuthorized');
      if (authorized !== true) fail('PREPARATION_NOT_AUTHORIZED', 'preparation execution is not authorized', '$manifest');

      const payloadStore = new Map();
      const visualArtifacts = [];
      for (const input of manifest.visualInputs) {
        const resolved = await safeOperation(resolveAsset, {
          role: 'visual',
          asset: {assetId: input.assetId, locator: input.locator, mediaType: input.mediaType, expectedSha256: input.expectedSha256},
        }, 'resolveExactAsset');
        const payload = resolveResultBytes(resolved, '$resolveExactAsset.result', input.mediaType);
        const artifactId = artifactIdFor('visual', input.assetId);
        const prepared = artifactRecord({artifactId, role:'visual', sourceId:input.assetId, mediaType:input.mediaType, payload, expectedSha256:input.expectedSha256});
        payloadStore.set(artifactId, prepared.snapshot);
        visualArtifacts.push(prepared.record);
      }

      const voiceArtifacts = [];
      if (manifest.voicePreparation.mode === 'provided') {
        const asset = manifest.voicePreparation.audioAsset;
        const resolved = await safeOperation(resolveAsset, {role:'voice-provided', asset:{...asset, expectedSha256:asset.sha256}}, 'resolveExactAsset');
        const payload = resolveResultBytes(resolved, '$resolveExactAsset.result', asset.mediaType);
        const artifactId = artifactIdFor('voice-provided', asset.assetId);
        const prepared = artifactRecord({artifactId, role:'voice-provided', sourceId:asset.assetId, mediaType:asset.mediaType, payload, expectedSha256:asset.sha256});
        payloadStore.set(artifactId, prepared.snapshot);
        voiceArtifacts.push(prepared.record);
      } else if (manifest.voicePreparation.mode === 'synthesize') {
        for (const segmentId of manifest.voicePreparation.segmentIds) {
          const segment = manifest.narrationSegments.find((item) => item.segmentId === segmentId);
          if (!segment) fail('SOURCE_SEMANTICS_MISMATCH', `voice segment ${segmentId} is missing from narrationSegments`, '$manifest.voicePreparation.segmentIds');
          const synthesized = synthesizedResult(await safeOperation(synthesize, {segment: clone(segment), voice: clone(manifest.voicePreparation)}, 'synthesizeNarrationSegment'), '$synthesizeNarrationSegment.result');
          const artifactId = artifactIdFor('voice-synthesized', segment.segmentId);
          const prepared = artifactRecord({artifactId, role:'voice-synthesized', sourceId:segment.segmentId, mediaType:synthesized.mediaType, payload:synthesized.payload, segment});
          payloadStore.set(artifactId, prepared.snapshot);
          voiceArtifacts.push(prepared.record);
        }
      }

      const captionArtifacts = [];
      let cues = [];
      if (manifest.captionPreparation.mode === 'provided') {
        const asset = manifest.captionPreparation.captionAsset;
        const resolved = await safeOperation(resolveAsset, {role:'caption-provided', asset:{...asset, expectedSha256:asset.sha256}}, 'resolveExactAsset');
        const payload = resolveResultBytes(resolved, '$resolveExactAsset.result', asset.mediaType);
        const artifactId = artifactIdFor('caption-provided', asset.assetId);
        const prepared = artifactRecord({artifactId, role:'caption-provided', sourceId:asset.assetId, mediaType:asset.mediaType, payload, expectedSha256:asset.sha256});
        payloadStore.set(artifactId, prepared.snapshot);
        captionArtifacts.push(prepared.record);
      } else if (manifest.captionPreparation.mode === 'auto') {
        cues = captionCues(manifest);
      }

      const voiceResult = {mode: manifest.voicePreparation.mode, artifacts: voiceArtifacts};
      const captionResult = {mode: manifest.captionPreparation.mode, format: manifest.captionPreparation.format ?? 'none', cues, artifacts: captionArtifacts};
      const facts = deriveReceiptFacts({visualArtifacts, voice:voiceResult, captions:captionResult});
      const preparedAt = canonicalTimestamp(await clock());
      const receipt = {
        schemaVersion: SHARED_MEDIA_PREPARED_INPUTS_V1,
        requestId: plan.requestId,
        inputManifestDigest: plan.inputManifestDigest,
        renderPlanDigest: plan.renderPlanDigest,
        preparationManifestDigest: manifest.preparationManifestDigest,
        preparedAt,
        visualArtifacts,
        voiceResult,
        captionResult,
        actions: facts.actions,
        preparedArtifactsProduced: facts.preparedArtifactsProduced,
        transportSelected: false,
        bindingCreated: false,
        renderAuthorized: false,
        consumerDomainDecisionInferred: false,
        businessOutcomeInferred: false,
      };
      receipt.preparedInputsDigest = computePreparedInputsDigestV1(receipt);
      validatePreparedInputsReceiptV1(receipt, {plan, manifest});
      const frozenReceipt = deepFreeze(receipt);
      const getPayload = (artifactId) => {
        const id = text(artifactId, '$artifactId', {max: 200});
        const payload = payloadStore.get(id);
        if (!payload) fail('UNKNOWN_PREPARED_ARTIFACT', `prepared artifact ${id} is not available`, '$artifactId');
        return Buffer.from(payload);
      };
      verifyPreparedPayloadsV1({receipt:frozenReceipt, getPayload});
      return Object.freeze({receipt: frozenReceipt, artifactIds: Object.freeze([...payloadStore.keys()]), getPayload});
    },
  });
};
