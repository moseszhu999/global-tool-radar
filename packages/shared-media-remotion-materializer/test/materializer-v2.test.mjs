import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {compilePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {computePreparedInputsDigestV1, validatePreparedInputsReceiptV1} from '../../shared-media-preparation-executor/src/index.mjs';
import {computePreparedQualificationDigestV1, validatePreparedQualificationReceiptV1} from '../../shared-media-prepared-qualification/src/index.mjs';
import {
  materializeSharedMediaRemotionV2,
  validateSharedMediaRemotionMaterializationV2,
  verifySharedMediaRemotionMaterializationV2,
  verifyObservedRemotionMaterializationV2,
} from '../src/v2.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const expectCode = (fn, code) => assert.throws(fn, (error) => error?.code === code);

const makeSourceChain = ({voiceMode='synthesize', captionMode='auto', visualKind='image', durationMs=1000} = {}) => {
  const imageSha = sha('image-payload');
  const audioSha = sha('audio-payload');
  const request = createMediaRenderRequestV1({
    requestId:'fixture-course-video-01', purpose:'course.explainer', title:'Bounded fixture', language:'zh-CN',
    shots:[{shotId:'shot-1', order:1, durationMs, narration:{mode:'text', text:'这是一个确定性的测试片段。'}, visualAssetIds:['visual-1']}],
    visualAssets:[{assetId:'visual-1', kind:visualKind, locator:'fixture://visual-1', mediaType:visualKind==='video'?'video/mp4':'image/png', sha256:imageSha}],
    voice:voiceMode === 'synthesize' ? {mode:'synthesize', provider:'edge-tts', voiceId:'zh-CN-XiaoxiaoNeural', rate:1.12, locale:'zh-CN'} : {mode:'none'},
    captions:captionMode === 'auto' ? {mode:'auto', format:'burn-in', language:'zh-CN'} : {mode:'none', format:'none'},
    outputProfile:{profileId:'training-video-1080x1920-30', width:1080, height:1920, fps:30, container:'mp4'},
  });
  const plan = compileCanonicalRenderPlanV1(request);
  const manifest = compilePreparationManifestV1(plan);
  const narration = manifest.narrationSegments[0];
  const prepared = {
    schemaVersion:'shared-media.prepared-inputs.v1', requestId:plan.requestId, inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest, preparationManifestDigest:manifest.preparationManifestDigest, preparedAt:'2026-08-09T00:00:00.000Z',
    visualArtifacts:[{artifactId:'prepared-visual-1', role:'visual', sourceId:'visual-1', mediaType:request.visualAssets[0].mediaType, byteLength:13, sha256:imageSha}],
    voiceResult:voiceMode === 'synthesize' ? {mode:'synthesize', artifacts:[{artifactId:'prepared-voice-1', role:'voice-synthesized', sourceId:narration.segmentId, mediaType:'audio/wav', byteLength:17, sha256:audioSha, segmentId:narration.segmentId, sourceShotId:narration.shotId, targetStartMs:narration.startMs, targetDurationMs:narration.durationMs}]} : {mode:'none', artifacts:[]},
    captionResult:captionMode === 'auto' ? {mode:'auto', format:'burn-in', cues:[{cueId:`caption-${narration.segmentId}`, segmentId:narration.segmentId, shotId:narration.shotId, startMs:narration.startMs, endMs:narration.startMs+narration.durationMs, text:narration.text}], artifacts:[]} : {mode:'none', format:'none', cues:[], artifacts:[]},
    actions:{assetResolutionPerformed:true, voiceSynthesisPerformed:voiceMode==='synthesize', captionCompilationPerformed:captionMode==='auto'},
    preparedArtifactsProduced:true, transportSelected:false, bindingCreated:false, renderAuthorized:false, consumerDomainDecisionInferred:false, businessOutcomeInferred:false,
  };
  prepared.preparedInputsDigest = computePreparedInputsDigestV1(prepared);
  validatePreparedInputsReceiptV1(prepared,{plan,manifest});
  const qualification = {
    schemaVersion:'shared-media.prepared-qualification.v1', requestId:plan.requestId, inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest, preparationManifestDigest:manifest.preparationManifestDigest, preparedInputsDigest:prepared.preparedInputsDigest,
    qualifiedAt:'2026-08-09T00:00:01.000Z',
    visualInspections:[{artifactId:'prepared-visual-1', sha256:imageSha, mediaType:request.visualAssets[0].mediaType, kind:'image', width:1920, height:1080, qualified:true}],
    voiceTiming:voiceMode === 'synthesize' ? [{artifactId:'prepared-voice-1', sha256:audioSha, mediaType:'audio/wav', kind:'audio', actualDurationSeconds:0.2, actualDurationMsCeil:200, targetDurationMs:narration.durationMs, trailingSilenceMs:narration.durationMs-200, fitsWindow:true, segmentId:narration.segmentId, sourceShotId:narration.shotId, playbackStartMs:narration.startMs}] : [],
    captionQualification:{mode:captionMode, format:captionMode==='auto'?'burn-in':'none', cueCount:prepared.captionResult.cues.length, cuesBoundToExactTimeline:captionMode==='auto', providedCaptionPayloadSupported:false},
    policy:{timeStretchApplied:false, trimApplied:false, audioOverrunAllowed:false, shortAudioTrailingSilenceAllowed:true},
    qualificationPassed:true, materializationAuthorized:false, transportSelected:false, bindingCreated:false, renderAuthorized:false, consumerDomainDecisionInferred:false, businessOutcomeInferred:false,
  };
  qualification.qualificationDigest = computePreparedQualificationDigestV1(qualification);
  validatePreparedQualificationReceiptV1(qualification,{plan,manifest,preparedReceipt:prepared});
  return {request, plan, manifest, prepared, qualification};
};

test('materializes course-shaped prepared inputs into four deterministic project files', () => {
  const source = makeSourceChain();
  const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(candidate.schemaVersion, 'shared-media.remotion-materialization-candidate.v2');
  assert.equal(candidate.compositionId, 'SharedMediaRenderV2');
  assert.deepEqual(candidate.files.map((f)=>f.path).sort(), ['shared-media-materialization.json','src/index.ts','src/media-manifest.ts','src/root.tsx']);
  assert.equal(candidate.expectedTotalFrames, 30); assert.equal(candidate.expectedDurationSeconds, 1);
  assert.equal(candidate.preparedAssetManifest.length, 2); assert.equal(candidate.captionCues.length, 1); assert.equal(candidate.renderAuthorized, false);
  validateSharedMediaRemotionMaterializationV2(candidate);
});

test('same canonical source chain produces byte-identical candidate', () => {
  const source = makeSourceChain();
  const a = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  const b = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(a.candidateDigest, b.candidateDigest); assert.deepEqual(a.files, b.files);
});

test('candidate verifies against exact plan, manifest, prepared receipt and qualification', () => {
  const source = makeSourceChain();
  const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(verifySharedMediaRemotionMaterializationV2({candidate, plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}), true);
});

test('candidate re-signing does not make a modified root source authoritative', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}); const tampered = structuredClone(candidate);
  tampered.files.find((f)=>f.path==='src/root.tsx').content += '\n// tampered';
  expectCode(()=>validateSharedMediaRemotionMaterializationV2(tampered), 'CANDIDATE_INTEGRITY_MISMATCH');
});

test('exact verifier rejects a candidate from a different prepared source chain', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}); const changed = makeSourceChain({durationMs:2000});
  expectCode(()=>verifySharedMediaRemotionMaterializationV2({candidate, plan:changed.plan, manifest:changed.manifest, preparedReceipt:changed.prepared, qualificationReceipt:changed.qualification}), 'SOURCE_SEMANTICS_MISMATCH');
});

test('provided voice fails closed in v2', () => {
  const source = makeSourceChain({voiceMode:'none'});
  const changedRequest = createMediaRenderRequestV1({...source.request, voice:{mode:'provided', audioAsset:{assetId:'voice-1', locator:'fixture://voice', mediaType:'audio/wav', sha256:sha('provided')}}});
  const changedPlan = compileCanonicalRenderPlanV1(changedRequest); const changedManifest = compilePreparationManifestV1(changedPlan);
  expectCode(()=>materializeSharedMediaRemotionV2({plan:changedPlan, manifest:changedManifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}), 'SOURCE_IDENTITY_MISMATCH');
});

test('video visual is rejected by the v2 materializer subset', () => {
  const source = makeSourceChain({visualKind:'video'});
  expectCode(()=>materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}), 'MATERIALIZATION_SUBSET_UNSUPPORTED');
});

test('non-integer frame mapping fails closed', () => {
  const source = makeSourceChain({durationMs:333});
  expectCode(()=>materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}), 'NON_INTEGER_FRAME_MAPPING');
});

test('caption cue timing is mapped deterministically to frames', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.deepEqual(candidate.captionCues[0], {cueId:'caption-narration-shot-1', segmentId:'narration-shot-1', shotId:'shot-1', startMs:0, endMs:1000, text:'这是一个确定性的测试片段。', from:0, durationInFrames:30});
});

test('generated source uses staticFile for staged assets and has no product domain vocabulary', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}); const root = candidate.files.find((f)=>f.path==='src/root.tsx').content;
  assert.match(root, /staticFile\(/); assert.match(root, /<Img/); assert.match(root, /<Audio/); assert.doesNotMatch(root, /TrainingOS|ToolRadar|courseId|studentId|publicationAllowed/);
});

test('candidate remains pure and contains no authorization or transport operation', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(candidate.renderAuthorized, false); assert.equal(candidate.bindingCreated, false); assert.doesNotMatch(candidate.files.find((f)=>f.path==='src/root.tsx').content, /create_or_update|render_existing|Authorization|Bearer /);
});

test('observed generated files and prepared asset manifest must match exactly', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  const observedFiles = candidate.generatedFileManifest.map((x)=>({...x})); const observedAssets = candidate.preparedAssetManifest.map((x)=>({...x}));
  assert.equal(verifyObservedRemotionMaterializationV2({candidate, observedFiles, observedPreparedAssets:observedAssets}), true);
  const bad = structuredClone(observedAssets); bad[0].sha256 = sha('different');
  expectCode(()=>verifyObservedRemotionMaterializationV2({candidate, observedFiles, observedPreparedAssets:bad}), 'OBSERVED_ASSET_MANIFEST_MISMATCH');
});

test('unsupported prepared media type is rejected by exact source semantics', () => {
  const source = makeSourceChain(); const changed = structuredClone(source.prepared);
  changed.visualArtifacts[0].mediaType = 'application/octet-stream'; changed.preparedInputsDigest = computePreparedInputsDigestV1(changed);
  expectCode(()=>materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:changed, qualificationReceipt:source.qualification}), 'SOURCE_SEMANTICS_MISMATCH');
});

test('generated audio track uses exact prepared start and target window instead of segment naming conventions', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  const root = candidate.files.find((f)=>f.path==='src/root.tsx').content;
  assert.match(root, /const AUDIO = \[{"segmentId":"narration-shot-1","sourceShotId":"shot-1","src":"assets\/prepared-voice-1\.wav","from":0,"durationInFrames":30}\] as const;/);
  assert.doesNotMatch(root, /narration-\$\{shot\.shotId\}/);
});

test('none voice and none captions produce a visual-only prepared asset set', () => {
  const source = makeSourceChain({voiceMode:'none', captionMode:'none'}); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(candidate.preparedAssetManifest.length, 1); assert.equal(candidate.preparedAssetManifest[0].role, 'visual'); assert.equal(candidate.captionCues.length, 0);
});

test('candidate is deeply frozen', () => {
  const source = makeSourceChain(); const candidate = materializeSharedMediaRemotionV2({plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification});
  assert.equal(Object.isFrozen(candidate), true); assert.equal(Object.isFrozen(candidate.files), true); assert.equal(Object.isFrozen(candidate.files[0]), true);
});
