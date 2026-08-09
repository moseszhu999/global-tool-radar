import {createHash} from 'node:crypto';

import {sha256CanonicalJsonV1, stableStringifyV1} from '../../shared-media-render-contract/src/index.mjs';
import {validateCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {validatePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {validatePreparedInputsReceiptV1} from '../../shared-media-preparation-executor/src/index.mjs';
import {validatePreparedQualificationReceiptV1} from '../../shared-media-prepared-qualification/src/index.mjs';
import {verifySharedMediaRemotionMaterializationV2, validateSharedMediaRemotionMaterializationV2} from '../../shared-media-remotion-materializer/src/v2.mjs';
import {MAC_REMOTION_RUNTIME_SCHEMA_V1} from '../../shared-media-mac-compatibility/src/index.mjs';

export const SHARED_MEDIA_MAC_STAGING_V1 = 'shared-media.mac-pre-materialized-staging-candidate.v1';
export const SHARED_MEDIA_MAC_STAGING_VERSION_V1 = '1.0.0';

const SHA = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

export class SharedMediaMacStagingError extends TypeError {
  constructor(code, message, path = null) { super(message); this.name='SharedMediaMacStagingError'; this.code=code; this.path=path; }
}

const fail = (code, message, path = null) => { throw new SharedMediaMacStagingError(code, message, path); };
const safeId = (v, path) => { if (typeof v !== 'string' || !SAFE_ID.test(v)) fail('UNSAFE_IDENTIFIER', `${path} must be a safe identifier`, path); return v; };
const sha = (v, path) => { if (typeof v !== 'string' || !SHA.test(v)) fail('INVALID_SHA', `${path} must be lowercase SHA-256`, path); return v; };
const object = (v, path) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail('INVALID_FIELD', `${path} must be an object`, path); return v; };
const textSha = (v) => createHash('sha256').update(v).digest('hex');
const stagingDigestPayload = (v) => ({
  schemaVersion:v.schemaVersion, stagingVersion:v.stagingVersion, requestId:v.requestId,
  inputManifestDigest:v.inputManifestDigest, renderPlanDigest:v.renderPlanDigest,
  preparationManifestDigest:v.preparationManifestDigest, preparedInputsDigest:v.preparedInputsDigest,
  qualificationDigest:v.qualificationDigest, materializationCandidateDigest:v.materializationCandidateDigest,
  projectName:v.projectName, compositionId:v.compositionId, expectedDurationSeconds:v.expectedDurationSeconds,
  expectedOutputProfile:v.expectedOutputProfile, audio:v.audio, preparedAssetsToStage:v.preparedAssetsToStage,
  generatedFilesToStage:v.generatedFilesToStage, runtimeEvidence:v.runtimeEvidence, evidenceRefs:v.evidenceRefs,
  approvalRequired:v.approvalRequired, bindingCreated:v.bindingCreated, renderAuthorized:v.renderAuthorized,
  transportSubmissionAllowed:v.transportSubmissionAllowed,
});

const validateStagingCandidate = (candidate) => {
  const c = object(candidate, '$candidate');
  if (c.schemaVersion !== SHARED_MEDIA_MAC_STAGING_V1) fail('INVALID_CANDIDATE','unexpected staging schema','$candidate.schemaVersion');
  if (c.stagingVersion !== SHARED_MEDIA_MAC_STAGING_VERSION_V1) fail('INVALID_CANDIDATE','unexpected staging version','$candidate.stagingVersion');
  sha(c.stagingDigest, '$candidate.stagingDigest');
  sha(c.materializationCandidateDigest, '$candidate.materializationCandidateDigest');
  sha(c.inputManifestDigest, '$candidate.inputManifestDigest');
  sha(c.renderPlanDigest, '$candidate.renderPlanDigest');
  sha(c.preparationManifestDigest, '$candidate.preparationManifestDigest');
  sha(c.preparedInputsDigest, '$candidate.preparedInputsDigest');
  sha(c.qualificationDigest, '$candidate.qualificationDigest');
  safeId(c.projectName, '$candidate.projectName');
  safeId(c.compositionId, '$candidate.compositionId');
  if (typeof c.expectedDurationSeconds !== 'number' || c.expectedDurationSeconds < 1 || c.expectedDurationSeconds > 900) fail('INVALID_CANDIDATE','duration must be 1..900 seconds','$candidate.expectedDurationSeconds');
  if (typeof c.audio !== 'boolean') fail('INVALID_CANDIDATE','audio must be boolean','$candidate.audio');
  if (!Array.isArray(c.preparedAssetsToStage)) fail('INVALID_CANDIDATE','preparedAssetsToStage must be an array','$candidate.preparedAssetsToStage');
  if (!Array.isArray(c.generatedFilesToStage)) fail('INVALID_CANDIDATE','generatedFilesToStage must be an array','$candidate.generatedFilesToStage');
  if (!Array.isArray(c.evidenceRefs) || c.evidenceRefs.length < 4) fail('INVALID_CANDIDATE','evidenceRefs must contain source-chain references','$candidate.evidenceRefs');
  if (stableStringifyV1([...new Set(c.evidenceRefs)]) !== stableStringifyV1(c.evidenceRefs)) fail('INVALID_CANDIDATE','evidenceRefs must be unique','$candidate.evidenceRefs');
  if (c.approvalRequired !== true || c.bindingCreated !== false || c.renderAuthorized !== false || c.transportSubmissionAllowed !== false) fail('TRUTH_BOUNDARY','staging candidate cannot grant approval, binding or transport authorization','$candidate');
  const expectedDigest = sha256CanonicalJsonV1(stagingDigestPayload(c));
  if (c.stagingDigest !== expectedDigest) fail('STAGING_INTEGRITY_MISMATCH','stagingDigest does not match immutable staging fields','$candidate.stagingDigest');
  return true;
};

export const createSharedMediaMacStagingCandidateV1 = ({candidate, plan, manifest, preparedReceipt, qualificationReceipt} = {}) => {
  validateSharedMediaRemotionMaterializationV2(candidate);
  validateCanonicalRenderPlanV1(plan);
  validatePreparationManifestV1(manifest, {plan});
  validatePreparedInputsReceiptV1(preparedReceipt, {plan, manifest});
  validatePreparedQualificationReceiptV1(qualificationReceipt, {plan, manifest, preparedReceipt});
  verifySharedMediaRemotionMaterializationV2({candidate, plan, manifest, preparedReceipt, qualificationReceipt});

  const projectName = safeId(`shared-${plan.requestId}`.slice(0, 100), '$projectName');
  const preparedAssetsToStage = candidate.preparedAssetManifest.map((asset) => ({
    artifactId: asset.artifactId,
    sourceId: asset.sourceId,
    role: asset.role,
    mediaType: asset.mediaType,
    sha256: asset.sha256,
    byteLength: asset.byteLength,
    relativePath: `public/${asset.relativePath}`,
  }));
  const generatedFilesToStage = candidate.files.map((file) => ({
    path: file.path,
    sha256: textSha(file.content),
    byteLength: Buffer.byteLength(file.content),
    content: file.content,
  }));
  const runtimeEvidence = {
    serverMjsSha256: MAC_REMOTION_RUNTIME_SCHEMA_V1.serverMjsSha256,
    openapiSha256: MAC_REMOTION_RUNTIME_SCHEMA_V1.openapiSha256,
  };
  const evidenceRefs = [
    `materialization:${candidate.candidateDigest}`,
    `qualification:${qualificationReceipt.qualificationDigest}`,
    `prepared:${preparedReceipt.preparedInputsDigest}`,
    `plan:${plan.renderPlanDigest}`,
  ];
  const value = {
    schemaVersion: SHARED_MEDIA_MAC_STAGING_V1,
    stagingVersion: SHARED_MEDIA_MAC_STAGING_VERSION_V1,
    requestId: plan.requestId,
    inputManifestDigest: plan.inputManifestDigest,
    renderPlanDigest: plan.renderPlanDigest,
    preparationManifestDigest: manifest.preparationManifestDigest,
    preparedInputsDigest: preparedReceipt.preparedInputsDigest,
    qualificationDigest: qualificationReceipt.qualificationDigest,
    materializationCandidateDigest: candidate.candidateDigest,
    projectName,
    compositionId: candidate.compositionId,
    brief: `Shared Media render_existing staging for ${plan.requestId}`,
    expectedDurationSeconds: candidate.expectedDurationSeconds,
    expectedOutputProfile: candidate.expectedOutputProfile,
    audio: candidate.preparedAssetManifest.some((asset) => asset.role === 'voice-synthesized'),
    preparedAssetsToStage,
    generatedFilesToStage,
    runtimeEvidence,
    evidenceRefs,
    approvalRequired: true,
    bindingCreated: false,
    renderAuthorized: false,
    transportSubmissionAllowed: false,
  };
  value.stagingDigest = sha256CanonicalJsonV1(stagingDigestPayload(value));
  validateStagingCandidate(value);
  return Object.freeze(structuredClone(value));
};

export const validateSharedMediaMacStagingCandidateV1 = validateStagingCandidate;

export const verifySharedMediaMacStagingCandidateV1 = ({candidate, materializationCandidate, plan, manifest, preparedReceipt, qualificationReceipt} = {}) => {
  validateStagingCandidate(candidate);
  validateSharedMediaRemotionMaterializationV2(materializationCandidate);
  const expected = createSharedMediaMacStagingCandidateV1({candidate: materializationCandidate, plan, manifest, preparedReceipt, qualificationReceipt});
  if (expected.stagingDigest !== candidate.stagingDigest) fail('SOURCE_SEMANTICS_MISMATCH','staging candidate does not match exact source chain','$candidate.stagingDigest');
  return true;
};
