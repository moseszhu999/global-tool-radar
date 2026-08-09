import {createHash} from 'node:crypto';

import {
  MEDIA_RENDER_V1,
  sha256CanonicalJsonV1,
  stableStringifyV1,
  validateMediaRenderRequestV1,
} from '../../shared-media-render-contract/src/index.mjs';
import {validateCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {validatePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {validatePreparedInputsReceiptV1} from '../../shared-media-preparation-executor/src/index.mjs';
import {validatePreparedQualificationReceiptV1} from '../../shared-media-prepared-qualification/src/index.mjs';

export const SHARED_MEDIA_REMOTION_MATERIALIZATION_V2 = 'shared-media.remotion-materialization-candidate.v2';
export const SHARED_MEDIA_REMOTION_MATERIALIZER_V2 = '2.0.0';
export const SHARED_MEDIA_REMOTION_COMPOSITION_ID_V2 = 'SharedMediaRenderV2';
export const REMOTION_REFERENCE_RUNTIME_V2 = Object.freeze({
  remotion: '4.0.506',
  '@remotion/cli': '4.0.506',
  react: '19.2.3',
  'react-dom': '19.2.3',
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SHA = /^[a-f0-9]{64}$/;
const MIME_EXT = Object.freeze({
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
});
const FILES = Object.freeze(['shared-media-materialization.json', 'src/index.ts', 'src/root.tsx', 'src/media-manifest.ts']);

export class SharedMediaRemotionMaterializerV2Error extends TypeError {
  constructor(code, message, {path = null} = {}) {
    super(message);
    this.name = 'SharedMediaRemotionMaterializerV2Error';
    this.code = code;
    this.path = path;
  }
}
const fail = (code, message, path = null) => { throw new SharedMediaRemotionMaterializerV2Error(code, message, {path}); };
const object = (v, p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail('INVALID_FIELD', `${p} must be an object`, p); return v; };
const text = (v, p, max = 1000) => { if (typeof v !== 'string' || v.trim() === '' || v.length > max) fail('INVALID_FIELD', `${p} must be bounded text`, p); return v.trim(); };
const clone = (v) => structuredClone(v);
const deepFreeze = (v) => { if (!v || typeof v !== 'object' || Object.isFrozen(v) || ArrayBuffer.isView(v)) return v; Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); return v; };
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const json = (v) => JSON.stringify(v, null, 2) + '\n';
const safePath = (id, mediaType) => {
  const safe = text(id, '$asset.artifactId', 240);
  if (!SAFE_ID.test(safe)) fail('UNSAFE_ARTIFACT_ID', 'artifactId cannot become a project path', '$asset.artifactId');
  const ext = MIME_EXT[mediaType];
  if (!ext) fail('MATERIALIZATION_SUBSET_UNSUPPORTED', `unsupported prepared media type: ${mediaType}`, '$asset.mediaType');
  return `assets/${safe}.${ext}`;
};
const fileRecord = (path, content) => ({path, sha256: sha256(content), byteLength: Buffer.byteLength(content)});
const manifestDigest = (records) => sha256(records.slice().sort((a,b)=>a.path.localeCompare(b.path)).map(r => `${r.path}\0${r.sha256}\0${r.byteLength}\n`).join(''));
const candidateDigestPayload = (c) => ({
  schemaVersion:c.schemaVersion, materializerVersion:c.materializerVersion, requestId:c.requestId,
  inputManifestDigest:c.inputManifestDigest, renderPlanDigest:c.renderPlanDigest, preparationManifestDigest:c.preparationManifestDigest,
  preparedInputsDigest:c.preparedInputsDigest, qualificationDigest:c.qualificationDigest, compositionId:c.compositionId,
  runtimeRequirements:c.runtimeRequirements, expectedOutputProfile:c.expectedOutputProfile, expectedTotalFrames:c.expectedTotalFrames,
  expectedDurationSeconds:c.expectedDurationSeconds, shotFrames:c.shotFrames, preparedAssetManifest:c.preparedAssetManifest,
  captionCues:c.captionCues, generatedFileManifest:c.generatedFileManifest, generatedFilesManifestSha256:c.generatedFilesManifestSha256,
  renderAuthorized:c.renderAuthorized, bindingCreated:c.bindingCreated, consumerDomainDecisionInferred:c.consumerDomainDecisionInferred,
  businessOutcomeInferred:c.businessOutcomeInferred,
});

const framePlan = (plan, fps) => {
  let cursor = 0;
  return plan.timeline.shots.map((shot, i) => {
    const n = shot.durationMs * fps;
    if (!Number.isInteger(n) || n % 1000 !== 0) fail('NON_INTEGER_FRAME_MAPPING', `shot ${shot.shotId} duration does not map to integer frames`, `$.timeline.shots[${i}].durationMs`);
    const frames = n / 1000;
    const out = {shotId:shot.shotId, order:shot.order, from:cursor, durationInFrames:frames, durationMs:shot.durationMs, visualAssetIds:[...shot.visualAssetIds]};
    cursor += frames;
    return out;
  });
};

const reconstructRequest = (plan) => ({
  contractVersion: plan.contractVersion, messageType: 'request', requestId: plan.requestId, purpose: plan.purpose,
  ...(plan.title !== null ? {title: plan.title} : {}), language: plan.language,
  shots: plan.timeline.shots.map(s => ({shotId:s.shotId, order:s.order, durationMs:s.durationMs, narration:s.narration, visualAssetIds:s.visualAssetIds})),
  visualAssets: plan.visualAssets, voice: plan.voice, captions: plan.captions, outputProfile: plan.outputProfile,
  evidenceRequirements: plan.evidenceRequirements, inputManifestDigest: plan.inputManifestDigest,
});

const validateSubset = ({plan, manifest, preparedReceipt, qualificationReceipt}) => {
  validateMediaRenderRequestV1(reconstructRequest(plan));
  if (!['synthesize','none'].includes(manifest.voicePreparation.mode)) fail('MATERIALIZATION_SUBSET_UNSUPPORTED', 'v2 supports synthesize or none voice only', '$manifest.voicePreparation.mode');
  if (!['auto','none'].includes(manifest.captionPreparation.mode)) fail('MATERIALIZATION_SUBSET_UNSUPPORTED', 'v2 supports auto or none captions only', '$manifest.captionPreparation.mode');
  for (const [i, input] of manifest.visualInputs.entries()) if (!input.mediaType.startsWith('image/')) fail('MATERIALIZATION_SUBSET_UNSUPPORTED', 'v2 supports static image visuals only', `$manifest.visualInputs[${i}].mediaType`);
  if (preparedReceipt.voiceResult.mode === 'synthesize') {
    for (const [i, a] of preparedReceipt.voiceResult.artifacts.entries()) if (!a.mediaType.startsWith('audio/')) fail('SOURCE_SEMANTICS_MISMATCH', 'synthesized voice artifact must be audio', `$prepared.voiceResult.artifacts[${i}]`);
  } else if (preparedReceipt.voiceResult.mode !== 'none') fail('MATERIALIZATION_SUBSET_UNSUPPORTED', 'provided voice is not supported in v2', '$prepared.voiceResult.mode');
  if (preparedReceipt.captionResult.mode === 'auto') {
    if (preparedReceipt.captionResult.artifacts.length !== 0 || preparedReceipt.captionResult.cues.length < 1) fail('SOURCE_SEMANTICS_MISMATCH', 'auto captions require cues and no caption artifact', '$prepared.captionResult');
  } else if (preparedReceipt.captionResult.mode !== 'none') fail('MATERIALIZATION_SUBSET_UNSUPPORTED', 'provided captions are not supported in v2', '$prepared.captionResult.mode');
  if (qualificationReceipt.captionQualification.cueCount !== preparedReceipt.captionResult.cues.length) fail('SOURCE_SEMANTICS_MISMATCH', 'qualification cue count differs from prepared cues', '$qualification.captionQualification.cueCount');
};

const deriveAssetManifest = ({preparedReceipt, plan}) => {
  const referenced = new Set(plan.timeline.shots.flatMap(s => s.visualAssetIds));
  const visual = preparedReceipt.visualArtifacts.filter(a => referenced.has(a.sourceId)).map(a => ({artifactId:a.artifactId, sourceId:a.sourceId, role:a.role, mediaType:a.mediaType, sha256:a.sha256, byteLength:a.byteLength, relativePath:safePath(a.artifactId, a.mediaType)}));
  const audio = preparedReceipt.voiceResult.artifacts.map(a => ({artifactId:a.artifactId, sourceId:a.sourceId, role:a.role, mediaType:a.mediaType, sha256:a.sha256, byteLength:a.byteLength, segmentId:a.segmentId, sourceShotId:a.sourceShotId, targetStartMs:a.targetStartMs, targetDurationMs:a.targetDurationMs, relativePath:safePath(a.artifactId, a.mediaType)}));
  return [...visual, ...audio];
};

const deriveCaptionCues = (preparedReceipt, fps) => preparedReceipt.captionResult.cues.map(c => {
  const from = Math.floor((c.startMs * fps) / 1000);
  const end = Math.ceil((c.endMs * fps) / 1000);
  if (end <= from) fail('INVALID_CAPTION_TIMING', `caption cue ${c.cueId} maps to zero frames`, '$prepared.captionResult.cues');
  return {cueId:c.cueId, segmentId:c.segmentId, shotId:c.shotId, startMs:c.startMs, endMs:c.endMs, text:c.text, from, durationInFrames:end-from};
});

const sourceMediaManifest = ({assets, captions}) => [
  'export const PREPARED_ASSETS = ', json(assets).trim(), ';\n',
  'export const CAPTION_CUES = ', json(captions).trim(), ';\n',
].join('');

const rootSource = ({profile, shots, assets, captions}) => {
  const assetBySource = Object.fromEntries(assets.filter(a=>a.role==='visual').map(a=>[a.sourceId,a.relativePath]));
  const audioBySegment = Object.fromEntries(assets.filter(a=>a.role==='voice-synthesized').map(a=>[a.segmentId,a.relativePath]));
  return [
    "import React from 'react';",
    "import {AbsoluteFill, Audio, Composition, Img, Sequence, staticFile} from 'remotion';",
    '',
    `const SHOTS = ${JSON.stringify(shots)} as const;`,
    `const VISUALS = ${JSON.stringify(assetBySource)} as const;`,
    `const AUDIO = ${JSON.stringify(audioBySegment)} as const;`,
    `const CAPTIONS = ${JSON.stringify(captions)} as const;`,
    '',
    'const ShotVisuals: React.FC<{shot: typeof SHOTS[number]}> = ({shot}) => (',
    '  <AbsoluteFill>',
    '    {shot.visualAssetIds.map((sourceId, index) => {',
    '      const src = VISUALS[sourceId as keyof typeof VISUALS];',
    '      return src ? <Img key={`${sourceId}-${index}`} src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover"}} /> : null;',
    '    })}',
    '  </AbsoluteFill>',
    ');',
    '',
    'const Captions: React.FC = () => (',
    '  <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", padding: 96, pointerEvents: "none"}}>',
    '    {CAPTIONS.map((cue) => (',
    '      <Sequence key={cue.cueId} from={cue.from} durationInFrames={cue.durationInFrames}>',
    '        <div style={{maxWidth: "84%", padding: "18px 26px", borderRadius: 16, background: "rgba(0,0,0,0.72)", color: "white", fontSize: 52, lineHeight: 1.15, textAlign: "center", fontFamily: "sans-serif"}}>{cue.text}</div>',
    '      </Sequence>',
    '    ))}',
    '  </AbsoluteFill>',
    ');',
    '',
    'const Timeline: React.FC = () => (',
    '  <AbsoluteFill>',
    '    {SHOTS.map((shot) => (',
    '      <Sequence key={shot.shotId} from={shot.from} durationInFrames={shot.durationInFrames}>',
    '        <ShotVisuals shot={shot} />',
    '      </Sequence>',
    '    ))}',
    '    {Object.entries(AUDIO).map(([segmentId, src]) => {',
    '      const shot = SHOTS.find((item) => `narration-${item.shotId}` === segmentId);',
    '      if (!shot) return null;',
    '      return <Sequence key={segmentId} from={shot.from} durationInFrames={shot.durationInFrames}><Audio src={staticFile(src)} volume={1} /></Sequence>;',
    '    })}',
    '    {CAPTIONS.length > 0 ? <Captions /> : null}',
    '  </AbsoluteFill>',
    ');',
    '',
    'export const SharedMediaRoot: React.FC = () => (',
    '  <Composition',
    `    id="${SHARED_MEDIA_REMOTION_COMPOSITION_ID_V2}"`,
    '    component={Timeline}',
    `    durationInFrames={${shots.reduce((n,s)=>n+s.durationInFrames,0)}}`,
    `    fps={${profile.fps}}`,
    `    width={${profile.width}}`,
    `    height={${profile.height}}`,
    '  />',
    ');',
    '',
  ].join('\n');
};

const indexSource = () => "import {registerRoot} from 'remotion';\nimport {SharedMediaRoot} from './root';\n\nregisterRoot(SharedMediaRoot);\n";

export const materializeSharedMediaRemotionV2 = ({plan, manifest, preparedReceipt, qualificationReceipt} = {}) => {
  validateCanonicalRenderPlanV1(plan);
  validatePreparationManifestV1(manifest, {plan});
  validatePreparedInputsReceiptV1(preparedReceipt, {plan, manifest});
  validatePreparedQualificationReceiptV1(qualificationReceipt, {plan, manifest, preparedReceipt});
  validateSubset({plan, manifest, preparedReceipt, qualificationReceipt});
  const profile = Object.freeze({...plan.outputProfile});
  if (!Number.isInteger(profile.fps) || profile.fps <= 0) fail('INVALID_PROFILE', 'output profile fps must be positive integer', '$plan.outputProfile.fps');
  const shots = framePlan(plan, profile.fps);
  const assets = deriveAssetManifest({preparedReceipt, plan});
  const expectedVisualSources = new Set(plan.timeline.shots.flatMap(s => s.visualAssetIds));
  const actualVisualSources = new Set(assets.filter(a=>a.role==='visual').map(a=>a.sourceId));
  for (const sourceId of expectedVisualSources) if (!actualVisualSources.has(sourceId)) fail('SOURCE_SEMANTICS_MISMATCH', `missing prepared visual artifact for ${sourceId}`, '$prepared.visualArtifacts');
  const captions = deriveCaptionCues(preparedReceipt, profile.fps);
  const files = [
    {path:'shared-media-materialization.json', content:''},
    {path:'src/index.ts', content:indexSource()},
    {path:'src/root.tsx', content:rootSource({profile, shots, assets, captions})},
    {path:'src/media-manifest.ts', content:sourceMediaManifest({assets, captions})},
  ];
  const marker = {
    schemaVersion:SHARED_MEDIA_REMOTION_MATERIALIZATION_V2,
    contractVersion:MEDIA_RENDER_V1,
    materializerVersion:SHARED_MEDIA_REMOTION_MATERIALIZER_V2,
    requestId:plan.requestId,
    inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest,
    preparationManifestDigest:manifest.preparationManifestDigest,
    preparedInputsDigest:preparedReceipt.preparedInputsDigest,
    qualificationDigest:qualificationReceipt.qualificationDigest,
    compositionId:SHARED_MEDIA_REMOTION_COMPOSITION_ID_V2,
    runtimeRequirements:REMOTION_REFERENCE_RUNTIME_V2,
    expectedOutputProfile:profile,
    expectedTotalFrames:shots.reduce((n,s)=>n+s.durationInFrames,0),
    expectedDurationSeconds:shots.reduce((n,s)=>n+s.durationMs,0)/1000,
    shotFrames:shots,
    preparedAssetManifest:assets,
    captionCues:captions,
    renderAuthorized:false,
    bindingCreated:false,
    consumerDomainDecisionInferred:false,
    businessOutcomeInferred:false,
  };
  files[0].content = json(marker);
  const generatedFileManifest = files.map(f=>fileRecord(f.path, f.content)).sort((a,b)=>a.path.localeCompare(b.path));
  const candidate = {
    schemaVersion:SHARED_MEDIA_REMOTION_MATERIALIZATION_V2,
    materializerVersion:SHARED_MEDIA_REMOTION_MATERIALIZER_V2,
    requestId:plan.requestId,
    inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest,
    preparationManifestDigest:manifest.preparationManifestDigest,
    preparedInputsDigest:preparedReceipt.preparedInputsDigest,
    qualificationDigest:qualificationReceipt.qualificationDigest,
    compositionId:SHARED_MEDIA_REMOTION_COMPOSITION_ID_V2,
    runtimeRequirements:REMOTION_REFERENCE_RUNTIME_V2,
    expectedOutputProfile:profile,
    expectedTotalFrames:marker.expectedTotalFrames,
    expectedDurationSeconds:marker.expectedDurationSeconds,
    shotFrames:shots,
    preparedAssetManifest:assets,
    captionCues:captions,
    files:files.map(f=>({path:f.path, content:f.content})),
    generatedFileManifest,
    generatedFilesManifestSha256:manifestDigest(generatedFileManifest),
    renderAuthorized:false,
    bindingCreated:false,
    consumerDomainDecisionInferred:false,
    businessOutcomeInferred:false,
  };
  candidate.candidateDigest = sha256CanonicalJsonV1(candidateDigestPayload(candidate));
  return deepFreeze(candidate);
};

export const validateSharedMediaRemotionMaterializationV2 = (candidate) => {
  const c = object(candidate, '$candidate');
  if (c.schemaVersion !== SHARED_MEDIA_REMOTION_MATERIALIZATION_V2) fail('INVALID_CANDIDATE', 'unexpected v2 schema', '$candidate.schemaVersion');
  if (!SHA.test(c.candidateDigest ?? '')) fail('INVALID_CANDIDATE', 'candidateDigest invalid', '$candidate.candidateDigest');
  if (c.renderAuthorized !== false || c.bindingCreated !== false || c.consumerDomainDecisionInferred !== false || c.businessOutcomeInferred !== false) fail('TRUTH_BOUNDARY', 'candidate contains forbidden authority truth', '$candidate');
  if (!Array.isArray(c.files) || c.files.length !== FILES.length) fail('INVALID_CANDIDATE', 'candidate must contain exactly four generated files', '$candidate.files');
  const paths = c.files.map(f=>f.path).sort();
  if (stableStringifyV1(paths)!==stableStringifyV1([...FILES].sort())) fail('INVALID_CANDIDATE', 'generated file set mismatch', '$candidate.files');
  const records = c.files.map(f=>fileRecord(f.path,f.content)).sort((a,b)=>a.path.localeCompare(b.path));
  if (stableStringifyV1(records)!==stableStringifyV1(c.generatedFileManifest)) fail('CANDIDATE_INTEGRITY_MISMATCH', 'generated file manifest mismatch', '$candidate.generatedFileManifest');
  if (manifestDigest(records)!==c.generatedFilesManifestSha256) fail('CANDIDATE_INTEGRITY_MISMATCH', 'generated files manifest digest mismatch', '$candidate.generatedFilesManifestSha256');
  if (sha256CanonicalJsonV1(candidateDigestPayload(c))!==c.candidateDigest) fail('CANDIDATE_INTEGRITY_MISMATCH', 'candidate digest mismatch', '$candidate.candidateDigest');
  return true;
};

export const verifySharedMediaRemotionMaterializationV2 = ({candidate, plan, manifest, preparedReceipt, qualificationReceipt} = {}) => {
  validateSharedMediaRemotionMaterializationV2(candidate);
  const expected = materializeSharedMediaRemotionV2({plan, manifest, preparedReceipt, qualificationReceipt});
  if (expected.candidateDigest !== candidate.candidateDigest) fail('SOURCE_SEMANTICS_MISMATCH', 'candidate does not match exact canonical source chain', '$candidate.candidateDigest');
  return true;
};

export const verifyObservedRemotionMaterializationV2 = ({candidate, observedFiles, observedPreparedAssets} = {}) => {
  validateSharedMediaRemotionMaterializationV2(candidate);
  if (!Array.isArray(observedFiles) || observedFiles.length !== candidate.files.length) fail('OBSERVED_FILE_MANIFEST_MISMATCH', 'observed generated file manifest must contain exactly candidate files', '$observedFiles');
  const expected = candidate.generatedFileManifest.slice().sort((a,b)=>a.path.localeCompare(b.path));
  const actual = observedFiles.slice().sort((a,b)=>a.path.localeCompare(b.path));
  if (stableStringifyV1(expected)!==stableStringifyV1(actual)) fail('OBSERVED_FILE_MANIFEST_MISMATCH', 'observed generated project files do not exactly match candidate', '$observedFiles');
  if (candidate.preparedAssetManifest.length > 0) {
    if (!Array.isArray(observedPreparedAssets) || observedPreparedAssets.length !== candidate.preparedAssetManifest.length) fail('OBSERVED_ASSET_MANIFEST_MISMATCH', 'observed prepared assets must exactly match candidate prepared asset manifest', '$observedPreparedAssets');
    const expectedAssets = candidate.preparedAssetManifest.slice().sort((a,b)=>a.artifactId.localeCompare(b.artifactId));
    const actualAssets = observedPreparedAssets.slice().sort((a,b)=>a.artifactId.localeCompare(b.artifactId));
    if (stableStringifyV1(expectedAssets)!==stableStringifyV1(actualAssets)) fail('OBSERVED_ASSET_MANIFEST_MISMATCH', 'observed prepared assets do not exactly match candidate source evidence', '$observedPreparedAssets');
  }
  return true;
};

export const MATERIALIZER_V2_GENERATED_FILES = FILES;
