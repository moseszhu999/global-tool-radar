import {sha256CanonicalJsonV1, stableStringifyV1} from '../../shared-media-render-contract/src/index.mjs';
import {validateCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {validatePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {
  validatePreparedInputsReceiptV1,
  verifyPreparedPayloadsV1,
} from '../../shared-media-preparation-executor/src/index.mjs';

export const SHARED_MEDIA_PREPARED_QUALIFICATION_V1 = 'shared-media.prepared-qualification.v1';

export class SharedMediaPreparedQualificationError extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaPreparedQualificationError';
    this.code = code;
    this.path = path;
  }
}

const fail = (code, message, path = null) => {
  throw new SharedMediaPreparedQualificationError(code, message, {path});
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
const clone = (value) => structuredClone(value);
const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
};
const SHA = /^[a-f0-9]{64}$/;

const requireOperation = (value, name) => {
  if (typeof value !== 'function') fail('OPERATION_REQUIRED', `${name} must be a function`, `$${name}`);
  return value;
};

const safeOperation = async (operation, input, name) => {
  try {
    return await operation(deepFreeze(clone(input)));
  } catch (error) {
    if (error instanceof SharedMediaPreparedQualificationError) throw error;
    fail('OPERATION_FAILED', `${name} failed without exposing inspector details`, `$${name}`);
  }
};

const canonicalTimestamp = (value) => {
  const timestamp = text(value, '$qualifiedAt', {max: 80});
  if (Number.isNaN(Date.parse(timestamp))) fail('INVALID_FIELD', '$qualifiedAt must be an ISO-compatible timestamp', '$qualifiedAt');
  return timestamp;
};

const ceilDurationMs = (durationSeconds) => {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    fail('INVALID_INSPECTION', 'audio durationSeconds must be a positive finite number', '$inspection.durationSeconds');
  }
  return Math.ceil((durationSeconds * 1000) - 1e-9);
};

const validateImageInspection = (result, artifact) => {
  const value = object(result, '$inspectPreparedArtifact.result');
  exactKeys(value, new Set(['kind','width','height']), '$inspectPreparedArtifact.result');
  if (value.kind !== 'image') fail('VISUAL_MEDIA_UNSUPPORTED_V1', 'prepared visual v1 requires image inspection', '$inspectPreparedArtifact.result.kind');
  if (!Number.isInteger(value.width) || value.width < 1 || !Number.isInteger(value.height) || value.height < 1) {
    fail('INVALID_INSPECTION', 'image inspection requires positive integer width/height', '$inspectPreparedArtifact.result');
  }
  if (!artifact.mediaType.startsWith('image/')) fail('VISUAL_MEDIA_UNSUPPORTED_V1', 'prepared visual v1 supports only image/* sources', '$artifact.mediaType');
  return {artifactId:artifact.artifactId, sha256:artifact.sha256, mediaType:artifact.mediaType, kind:'image', width:value.width, height:value.height, qualified:true};
};

const validateAudioInspection = (result, artifact, targetDurationMs) => {
  const value = object(result, '$inspectPreparedArtifact.result');
  exactKeys(value, new Set(['kind','durationSeconds','codecName','sampleRate','channels']), '$inspectPreparedArtifact.result');
  if (value.kind !== 'audio') fail('INVALID_INSPECTION', 'prepared voice inspection must be audio', '$inspectPreparedArtifact.result.kind');
  if (!artifact.mediaType.startsWith('audio/')) fail('MEDIA_TYPE_MISMATCH', 'prepared voice artifact must have audio/* media type', '$artifact.mediaType');
  const actualDurationMsCeil = ceilDurationMs(value.durationSeconds);
  if (actualDurationMsCeil > targetDurationMs) {
    fail('AUDIO_WINDOW_OVERRUN', `prepared audio duration ${actualDurationMsCeil}ms exceeds target window ${targetDurationMs}ms`, '$inspectPreparedArtifact.result.durationSeconds');
  }
  const codecName = value.codecName === undefined ? null : text(value.codecName, '$inspectPreparedArtifact.result.codecName', {max:80});
  if (value.sampleRate !== undefined && (!Number.isInteger(value.sampleRate) || value.sampleRate < 1)) fail('INVALID_INSPECTION', 'audio sampleRate must be positive integer', '$inspectPreparedArtifact.result.sampleRate');
  if (value.channels !== undefined && (!Number.isInteger(value.channels) || value.channels < 1)) fail('INVALID_INSPECTION', 'audio channels must be positive integer', '$inspectPreparedArtifact.result.channels');
  return {
    artifactId:artifact.artifactId,
    sha256:artifact.sha256,
    mediaType:artifact.mediaType,
    kind:'audio',
    actualDurationSeconds:value.durationSeconds,
    actualDurationMsCeil,
    targetDurationMs,
    trailingSilenceMs:targetDurationMs-actualDurationMsCeil,
    fitsWindow:true,
    ...(codecName ? {codecName} : {}),
    ...(value.sampleRate !== undefined ? {sampleRate:value.sampleRate} : {}),
    ...(value.channels !== undefined ? {channels:value.channels} : {}),
  };
};

const qualificationDigestPayload = (receipt) => ({
  schemaVersion:receipt.schemaVersion,
  requestId:receipt.requestId,
  inputManifestDigest:receipt.inputManifestDigest,
  renderPlanDigest:receipt.renderPlanDigest,
  preparationManifestDigest:receipt.preparationManifestDigest,
  preparedInputsDigest:receipt.preparedInputsDigest,
  qualifiedAt:receipt.qualifiedAt,
  visualInspections:receipt.visualInspections,
  voiceTiming:receipt.voiceTiming,
  captionQualification:receipt.captionQualification,
  policy:receipt.policy,
  qualificationPassed:receipt.qualificationPassed,
  materializationAuthorized:receipt.materializationAuthorized,
  transportSelected:receipt.transportSelected,
  bindingCreated:receipt.bindingCreated,
  renderAuthorized:receipt.renderAuthorized,
  consumerDomainDecisionInferred:receipt.consumerDomainDecisionInferred,
  businessOutcomeInferred:receipt.businessOutcomeInferred,
});

export const computePreparedQualificationDigestV1 = (receipt) => sha256CanonicalJsonV1(qualificationDigestPayload(receipt));

const expectedCaptionQualification = (preparedReceipt) => ({
  mode:preparedReceipt.captionResult.mode,
  format:preparedReceipt.captionResult.format,
  cueCount:preparedReceipt.captionResult.cues.length,
  cuesBoundToExactTimeline:preparedReceipt.captionResult.mode === 'auto',
  providedCaptionPayloadSupported:false,
});

export const validatePreparedQualificationReceiptV1 = (receipt, {plan=null, manifest=null, preparedReceipt=null} = {}) => {
  const value = object(receipt, '$qualification');
  exactKeys(value, new Set([
    'schemaVersion','requestId','inputManifestDigest','renderPlanDigest','preparationManifestDigest','preparedInputsDigest','qualifiedAt',
    'visualInspections','voiceTiming','captionQualification','policy','qualificationPassed','materializationAuthorized','transportSelected','bindingCreated',
    'renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred','qualificationDigest',
  ]), '$qualification');
  if (value.schemaVersion !== SHARED_MEDIA_PREPARED_QUALIFICATION_V1) fail('INVALID_QUALIFICATION', 'unexpected schemaVersion', '$qualification.schemaVersion');
  text(value.requestId, '$qualification.requestId', {max:200});
  for (const field of ['inputManifestDigest','renderPlanDigest','preparationManifestDigest','preparedInputsDigest','qualificationDigest']) {
    if (!SHA.test(value[field] ?? '')) fail('INVALID_QUALIFICATION', `${field} must be lowercase SHA-256`, `$qualification.${field}`);
  }
  canonicalTimestamp(value.qualifiedAt);
  if (!Array.isArray(value.visualInspections)) fail('INVALID_QUALIFICATION', 'visualInspections must be an array', '$qualification.visualInspections');
  value.visualInspections.forEach((inspection,index)=>{
    const path=`$qualification.visualInspections[${index}]`;
    exactKeys(object(inspection,path),new Set(['artifactId','sha256','mediaType','kind','width','height','qualified']),path);
    text(inspection.artifactId,`${path}.artifactId`,{max:200});
    if (!SHA.test(inspection.sha256 ?? '')) fail('INVALID_QUALIFICATION', `${path}.sha256 invalid`, `${path}.sha256`);
    if (inspection.kind!=='image'||inspection.qualified!==true||!Number.isInteger(inspection.width)||inspection.width<1||!Number.isInteger(inspection.height)||inspection.height<1) fail('INVALID_QUALIFICATION', 'visual inspection is not qualified image evidence', path);
  });
  if (!Array.isArray(value.voiceTiming)) fail('INVALID_QUALIFICATION', 'voiceTiming must be an array', '$qualification.voiceTiming');
  value.voiceTiming.forEach((timing,index)=>{
    const path=`$qualification.voiceTiming[${index}]`;
    exactKeys(object(timing,path),new Set(['artifactId','sha256','mediaType','kind','actualDurationSeconds','actualDurationMsCeil','targetDurationMs','trailingSilenceMs','fitsWindow','codecName','sampleRate','channels','segmentId','sourceShotId','playbackStartMs']),path);
    if (timing.kind!=='audio'||timing.fitsWindow!==true) fail('INVALID_QUALIFICATION', 'voice timing must be qualified audio', path);
    if (!Number.isInteger(timing.actualDurationMsCeil)||timing.actualDurationMsCeil<1||!Number.isInteger(timing.targetDurationMs)||timing.targetDurationMs<1) fail('INVALID_QUALIFICATION', 'voice timing duration metadata invalid', path);
    if (ceilDurationMs(timing.actualDurationSeconds)!==timing.actualDurationMsCeil) fail('QUALIFICATION_SEMANTICS_MISMATCH', 'actualDurationMsCeil does not match measured duration', `${path}.actualDurationMsCeil`);
    if (timing.actualDurationMsCeil>timing.targetDurationMs||timing.trailingSilenceMs!==timing.targetDurationMs-timing.actualDurationMsCeil) fail('QUALIFICATION_SEMANTICS_MISMATCH', 'voice timing window/trailing silence mismatch', path);
  });
  const captions=object(value.captionQualification,'$qualification.captionQualification');
  exactKeys(captions,new Set(['mode','format','cueCount','cuesBoundToExactTimeline','providedCaptionPayloadSupported']),'$qualification.captionQualification');
  if (!['none','auto'].includes(captions.mode)) fail('QUALIFICATION_SUBSET_UNSUPPORTED', 'prepared qualification v1 supports caption mode none or auto only', '$qualification.captionQualification.mode');
  if (!Number.isInteger(captions.cueCount)||captions.cueCount<0||captions.providedCaptionPayloadSupported!==false) fail('INVALID_QUALIFICATION', 'caption qualification metadata invalid', '$qualification.captionQualification');
  const policy=object(value.policy,'$qualification.policy');
  exactKeys(policy,new Set(['timeStretchApplied','trimApplied','audioOverrunAllowed','shortAudioTrailingSilenceAllowed']),'$qualification.policy');
  if (policy.timeStretchApplied!==false||policy.trimApplied!==false||policy.audioOverrunAllowed!==false||policy.shortAudioTrailingSilenceAllowed!==true) fail('TRUTH_BOUNDARY', 'prepared qualification v1 audio policy is immutable no-stretch/no-trim/fail-overrun', '$qualification.policy');
  if (value.qualificationPassed!==true) fail('INVALID_QUALIFICATION', 'qualificationPassed must be true for emitted receipt', '$qualification.qualificationPassed');
  for(const field of ['materializationAuthorized','transportSelected','bindingCreated','renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred']) if(value[field]!==false) fail('TRUTH_BOUNDARY', `${field} must remain false in qualification receipt`, `$qualification.${field}`);
  if(computePreparedQualificationDigestV1(value)!==value.qualificationDigest) fail('QUALIFICATION_INTEGRITY_MISMATCH','qualificationDigest mismatch','$qualification.qualificationDigest');

  const supplied=[plan,manifest,preparedReceipt].filter((item)=>item!==null).length;
  if(supplied!==0&&supplied!==3) fail('SOURCE_AUTHORITY_REQUIRED','plan, manifest and preparedReceipt must be supplied together for exact qualification validation','$qualification');
  if(supplied===3){
    validateCanonicalRenderPlanV1(plan);
    validatePreparationManifestV1(manifest,{plan});
    validatePreparedInputsReceiptV1(preparedReceipt,{plan,manifest});
    if(value.requestId!==plan.requestId||value.inputManifestDigest!==plan.inputManifestDigest||value.renderPlanDigest!==plan.renderPlanDigest||value.preparationManifestDigest!==manifest.preparationManifestDigest||value.preparedInputsDigest!==preparedReceipt.preparedInputsDigest) fail('SOURCE_IDENTITY_MISMATCH','qualification identity does not match exact source chain','$qualification');
    if(value.visualInspections.length!==preparedReceipt.visualArtifacts.length) fail('SOURCE_SEMANTICS_MISMATCH','visual inspection count differs from prepared receipt','$qualification.visualInspections');
    value.visualInspections.forEach((inspection,index)=>{
      const artifact=preparedReceipt.visualArtifacts[index];
      if(inspection.artifactId!==artifact.artifactId||inspection.sha256!==artifact.sha256||inspection.mediaType!==artifact.mediaType) fail('SOURCE_SEMANTICS_MISMATCH','visual inspection does not match exact prepared artifact',`$qualification.visualInspections[${index}]`);
    });
    if(preparedReceipt.voiceResult.mode==='synthesize'){
      if(value.voiceTiming.length!==preparedReceipt.voiceResult.artifacts.length) fail('SOURCE_SEMANTICS_MISMATCH','voice timing count differs from prepared synthesized artifacts','$qualification.voiceTiming');
      value.voiceTiming.forEach((timing,index)=>{
        const artifact=preparedReceipt.voiceResult.artifacts[index];
        if(timing.artifactId!==artifact.artifactId||timing.sha256!==artifact.sha256||timing.mediaType!==artifact.mediaType||timing.segmentId!==artifact.segmentId||timing.sourceShotId!==artifact.sourceShotId||timing.playbackStartMs!==artifact.targetStartMs||timing.targetDurationMs!==artifact.targetDurationMs) fail('SOURCE_SEMANTICS_MISMATCH','voice qualification does not match exact prepared segment',`$qualification.voiceTiming[${index}]`);
      });
    } else if(value.voiceTiming.length!==0){
      fail('SOURCE_SEMANTICS_MISMATCH','voiceTiming must be empty when exact prepared voice mode is none','$qualification.voiceTiming');
    }
    if(stableStringifyV1(value.captionQualification)!==stableStringifyV1(expectedCaptionQualification(preparedReceipt))) fail('SOURCE_SEMANTICS_MISMATCH','caption qualification does not match exact prepared caption result','$qualification.captionQualification');
  }
  return true;
};

export const createPreparedMediaQualifierV1 = ({inspectPreparedArtifact,isQualificationAuthorized,now=()=>new Date().toISOString()}={}) => {
  const inspect=requireOperation(inspectPreparedArtifact,'inspectPreparedArtifact');
  const authorize=requireOperation(isQualificationAuthorized,'isQualificationAuthorized');
  const clock=requireOperation(now,'now');
  return Object.freeze({
    async qualify({plan,manifest,prepared}={}){
      validateCanonicalRenderPlanV1(plan);
      validatePreparationManifestV1(manifest,{plan});
      const preparedReceipt=prepared?.receipt;
      const getPayload=prepared?.getPayload;
      validatePreparedInputsReceiptV1(preparedReceipt,{plan,manifest});
      verifyPreparedPayloadsV1({receipt:preparedReceipt,getPayload});
      if(manifest.voicePreparation.mode==='provided') fail('QUALIFICATION_SUBSET_UNSUPPORTED','prepared qualification v1 does not yet support provided whole-track voice','$manifest.voicePreparation.mode');
      if(manifest.captionPreparation.mode==='provided') fail('QUALIFICATION_SUBSET_UNSUPPORTED','prepared qualification v1 does not yet support provided caption payloads','$manifest.captionPreparation.mode');
      for(const input of manifest.visualInputs) if(!input.mediaType.startsWith('image/')) fail('VISUAL_MEDIA_UNSUPPORTED_V1','prepared qualification v1 supports static image visuals only','$manifest.visualInputs');
      const authorized=await safeOperation(authorize,{
        requestId:plan.requestId,inputManifestDigest:plan.inputManifestDigest,renderPlanDigest:plan.renderPlanDigest,
        preparationManifestDigest:manifest.preparationManifestDigest,preparedInputsDigest:preparedReceipt.preparedInputsDigest,
        action:'qualify_prepared_media',
      },'isQualificationAuthorized');
      if(authorized!==true) fail('QUALIFICATION_NOT_AUTHORIZED','prepared media qualification is not authorized','$prepared');

      const visualInspections=[];
      for(const artifact of preparedReceipt.visualArtifacts){
        const payload=getPayload(artifact.artifactId);
        const result=await safeOperation(inspect,{role:'visual',artifact:clone(artifact),bytes:Buffer.from(payload)},'inspectPreparedArtifact');
        visualInspections.push(validateImageInspection(result,artifact));
      }
      const voiceTiming=[];
      if(preparedReceipt.voiceResult.mode==='synthesize'){
        for(const artifact of preparedReceipt.voiceResult.artifacts){
          const payload=getPayload(artifact.artifactId);
          const inspected=await safeOperation(inspect,{role:'voice-synthesized',artifact:clone(artifact),bytes:Buffer.from(payload)},'inspectPreparedArtifact');
          voiceTiming.push({...validateAudioInspection(inspected,artifact,artifact.targetDurationMs),segmentId:artifact.segmentId,sourceShotId:artifact.sourceShotId,playbackStartMs:artifact.targetStartMs});
        }
      }
      const receipt={
        schemaVersion:SHARED_MEDIA_PREPARED_QUALIFICATION_V1,
        requestId:plan.requestId,
        inputManifestDigest:plan.inputManifestDigest,
        renderPlanDigest:plan.renderPlanDigest,
        preparationManifestDigest:manifest.preparationManifestDigest,
        preparedInputsDigest:preparedReceipt.preparedInputsDigest,
        qualifiedAt:canonicalTimestamp(await clock()),
        visualInspections,
        voiceTiming,
        captionQualification:expectedCaptionQualification(preparedReceipt),
        policy:{timeStretchApplied:false,trimApplied:false,audioOverrunAllowed:false,shortAudioTrailingSilenceAllowed:true},
        qualificationPassed:true,
        materializationAuthorized:false,
        transportSelected:false,
        bindingCreated:false,
        renderAuthorized:false,
        consumerDomainDecisionInferred:false,
        businessOutcomeInferred:false,
      };
      receipt.qualificationDigest=computePreparedQualificationDigestV1(receipt);
      validatePreparedQualificationReceiptV1(receipt,{plan,manifest,preparedReceipt});
      return deepFreeze(receipt);
    },
  });
};
