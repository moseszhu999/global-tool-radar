import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {
  SHARED_MEDIA_PREPARATION_MANIFEST_V1,
  compilePreparationManifestV1,
  computePreparationManifestDigestV1,
  validatePreparationManifestV1,
} from '../src/index.mjs';

const sha = (c) => c.repeat(64);
const request = (overrides = {}) => createMediaRenderRequestV1({
  requestId: 'prepare-course-001',
  purpose: 'course.explainer',
  title: 'Controller and RequestMapping',
  language: 'zh-CN',
  shots: [
    {shotId:'shot-1',order:1,durationMs:12000,narration:{mode:'text',text:'先看学习目标。'},visualAssetIds:['asset-1']},
    {shotId:'shot-2',order:2,durationMs:25000,narration:{mode:'text',text:'再看代码演示。'},visualAssetIds:['asset-2']},
  ],
  visualAssets:[
    {assetId:'asset-1',kind:'slide',locator:'media://inputs/slide.png',mediaType:'image/png',sha256:sha('a')},
    {assetId:'asset-2',kind:'code',locator:'media://inputs/code.png',mediaType:'image/png',sha256:sha('b')},
  ],
  voice:{mode:'synthesize',provider:'shared-tts',voiceId:'zh-neutral-01',locale:'zh-CN',rate:1},
  captions:{mode:'auto',format:'burn-in',language:'zh-CN'},
  outputProfile:{profileId:'course-1080p',width:1920,height:1080,fps:30,container:'mp4',videoCodec:'h264',audioCodec:'aac'},
  ...overrides,
});
const plan = (overrides = {}) => compileCanonicalRenderPlanV1(request(overrides));
const clone = (value) => structuredClone(value);
const resign = (manifest) => {
  manifest.preparationManifestDigest = computePreparationManifestDigestV1(manifest);
  return manifest;
};

test('course-shaped render plan compiles product-neutral preparation manifest', () => {
  const source = plan();
  const manifest = compilePreparationManifestV1(source);
  assert.equal(manifest.schemaVersion, SHARED_MEDIA_PREPARATION_MANIFEST_V1);
  assert.equal(manifest.requestId, source.requestId);
  assert.equal(manifest.inputManifestDigest, source.inputManifestDigest);
  assert.equal(manifest.renderPlanDigest, source.renderPlanDigest);
  assert.deepEqual(manifest.timeline, source.timeline);
  assert.deepEqual(manifest.outputProfile, source.outputProfile);
  assert.deepEqual(manifest.evidenceRequirements, source.evidenceRequirements);
  assert.match(manifest.preparationManifestDigest, /^[a-f0-9]{64}$/);
});

test('visual inputs preserve exact immutable identity and SHA requirements', () => {
  const manifest = compilePreparationManifestV1(plan());
  assert.deepEqual(manifest.visualInputs.map((item) => ({assetId:item.assetId,action:item.action,sha:item.expectedSha256})), [
    {assetId:'asset-1',action:'resolve_exact_visual_asset',sha:sha('a')},
    {assetId:'asset-2',action:'resolve_exact_visual_asset',sha:sha('b')},
  ]);
});

test('narration segments preserve shot timing and text', () => {
  const manifest = compilePreparationManifestV1(plan());
  assert.deepEqual(manifest.narrationSegments, [
    {segmentId:'narration-shot-1',shotId:'shot-1',startMs:0,durationMs:12000,text:'先看学习目标。'},
    {segmentId:'narration-shot-2',shotId:'shot-2',startMs:12000,durationMs:25000,text:'再看代码演示。'},
  ]);
});

test('synthesized voice becomes provider-neutral synthesis preparation without execution', () => {
  const manifest = compilePreparationManifestV1(plan());
  assert.deepEqual(manifest.voicePreparation, {
    mode:'synthesize',action:'synthesize_narration_segments',provider:'shared-tts',voiceId:'zh-neutral-01',locale:'zh-CN',rate:1,
    segmentIds:['narration-shot-1','narration-shot-2'],
  });
  assert.equal(manifest.providerSelected, false);
  assert.equal(manifest.providerExecutionPerformed, false);
});

test('auto captions become timeline-derived caption preparation without execution', () => {
  const manifest = compilePreparationManifestV1(plan());
  assert.deepEqual(manifest.captionPreparation, {mode:'auto',format:'burn-in',action:'generate_captions_from_timeline',language:'zh-CN'});
  assert.equal(manifest.preparedArtifactsProduced, false);
});

test('provided voice remains exact asset preparation', () => {
  const audioAsset={assetId:'voice-1',locator:'media://voice/voice.wav',mediaType:'audio/wav',sha256:sha('c')};
  const manifest=compilePreparationManifestV1(plan({voice:{mode:'provided',audioAsset}}));
  assert.deepEqual(manifest.voicePreparation,{mode:'provided',action:'resolve_exact_voice_asset',audioAsset});
  assert.deepEqual(manifest.narrationSegments.map((x)=>x.text),['先看学习目标。','再看代码演示。']);
});

test('provided captions remain exact caption asset preparation', () => {
  const captionAsset={assetId:'caption-1',locator:'media://captions/course.srt',mediaType:'application/x-subrip',sha256:sha('d')};
  const manifest=compilePreparationManifestV1(plan({captions:{mode:'provided',format:'srt',language:'zh-CN',captionAsset}}));
  assert.deepEqual(manifest.captionPreparation,{mode:'provided',format:'srt',action:'resolve_exact_caption_asset',language:'zh-CN',captionAsset});
});

test('none voice and captions produce no provider actions', () => {
  const source=request({
    shots:[
      {shotId:'shot-1',order:1,durationMs:12000,narration:{mode:'none'},visualAssetIds:['asset-1']},
      {shotId:'shot-2',order:2,durationMs:25000,narration:{mode:'none'},visualAssetIds:['asset-2']},
    ],
    voice:{mode:'none'},captions:{mode:'none',format:'none'},
  });
  const manifest=compilePreparationManifestV1(compileCanonicalRenderPlanV1(source));
  assert.deepEqual(manifest.narrationSegments,[]);
  assert.deepEqual(manifest.voicePreparation,{mode:'none',action:'none'});
  assert.deepEqual(manifest.captionPreparation,{mode:'none',format:'none',action:'none'});
});

test('same exact render plan produces deterministic preparation digest', () => {
  const source=plan();
  const first=compilePreparationManifestV1(source);
  const second=compilePreparationManifestV1(source);
  assert.equal(first.preparationManifestDigest,second.preparationManifestDigest);
  assert.deepEqual(first,second);
});

test('exact render plan tie-out passes for its own manifest', () => {
  const source=plan();
  const manifest=compilePreparationManifestV1(source);
  assert.equal(validatePreparationManifestV1(manifest,{plan:source}),true);
});

test('manifest from another render plan fails exact plan tie-out', () => {
  const first=compilePreparationManifestV1(plan());
  const other=plan({title:'Different explainer'});
  assert.throws(()=>validatePreparationManifestV1(first,{plan:other}),/does not match exact render plan/);
});

test('plain digest tampering is rejected', () => {
  const manifest=clone(compilePreparationManifestV1(plan()));
  manifest.outputProfile.width=1280;
  assert.throws(()=>validatePreparationManifestV1(manifest),/preparationManifestDigest mismatch/);
});

test('re-signed visual action tampering is rejected semantically', () => {
  const manifest=clone(compilePreparationManifestV1(plan()));
  manifest.visualInputs[0].action='skip_integrity_check';
  resign(manifest);
  assert.throws(()=>validatePreparationManifestV1(manifest),/visual input action mismatch/);
});

test('re-signed synthesis segment mismatch is rejected semantically', () => {
  const manifest=clone(compilePreparationManifestV1(plan()));
  manifest.voicePreparation.segmentIds=['narration-shot-2'];
  resign(manifest);
  assert.throws(()=>validatePreparationManifestV1(manifest),/segmentIds must exactly match narration segments/);
});

test('preparation manifest cannot claim provider, artifact, transport, binding or render execution', () => {
  const fields=['providerSelected','providerExecutionPerformed','preparedArtifactsProduced','transportSelected','bindingCreated','renderAuthorized','consumerDomainDecisionInferred','businessOutcomeInferred'];
  for(const field of fields){
    const manifest=clone(compilePreparationManifestV1(plan()));
    manifest[field]=true;
    resign(manifest);
    assert.throws(()=>validatePreparationManifestV1(manifest),/must remain false/);
  }
});

test('compiled preparation manifest is deeply frozen', () => {
  const manifest=compilePreparationManifestV1(plan());
  assert.equal(Object.isFrozen(manifest),true);
  assert.equal(Object.isFrozen(manifest.visualInputs),true);
  assert.equal(Object.isFrozen(manifest.voicePreparation),true);
  assert.throws(()=>{manifest.visualInputs[0].action='mutate';},TypeError);
});

test('preparation output remains product-neutral and contains no consumer approval truth', () => {
  const serialized=JSON.stringify(compilePreparationManifestV1(plan()));
  for(const forbidden of ['TrainingOS','ToolRadar','unitId','lessonId','studentId','teacherId','publicationAllowed','publicationPerformed','analyticsObserved','humanApproved']){
    assert.equal(serialized.includes(forbidden),false,forbidden);
  }
});

test('preparation compiler itself selects no concrete TTS, caption, Remotion or Mac transport implementation', () => {
  const manifest=compilePreparationManifestV1(plan());
  assert.equal(manifest.providerSelected,false);
  assert.equal(manifest.transportSelected,false);
  assert.equal(manifest.bindingCreated,false);
  assert.equal(manifest.renderAuthorized,false);
  assert.equal(JSON.stringify(manifest).includes('/v1/render'),false);
  assert.equal(JSON.stringify(manifest).includes('edge-tts'),false);
});
