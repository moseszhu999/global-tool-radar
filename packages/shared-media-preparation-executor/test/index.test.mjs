import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {compilePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {
  createPreparationExecutorV1,
  computePreparedInputsDigestV1,
  validatePreparedInputsReceiptV1,
  verifyPreparedPayloadsV1,
} from '../src/index.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => Buffer.from(value, 'utf8');
const visual1 = bytes('visual-one-bytes');
const visual2 = bytes('visual-two-bytes');
const providedVoice = bytes('provided-voice-bytes');
const providedCaption = bytes('1\n00:00:00,000 --> 00:00:01,000\nCaption\n');

const baseRequestInput = (overrides = {}) => ({
  requestId:'prepare-exec-course-001',
  purpose:'course.explainer',
  title:'Preparation execution proof',
  language:'zh-CN',
  shots:[
    {shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'text',text:'第一段。'},visualAssetIds:['asset-1']},
    {shotId:'shot-2',order:2,durationMs:1000,narration:{mode:'text',text:'第二段。'},visualAssetIds:['asset-2']},
  ],
  visualAssets:[
    {assetId:'asset-1',kind:'image',locator:'media://asset-1.png',mediaType:'image/png',sha256:digest(visual1)},
    {assetId:'asset-2',kind:'image',locator:'media://asset-2.png',mediaType:'image/png',sha256:digest(visual2)},
  ],
  voice:{mode:'synthesize',provider:'shared-tts',voiceId:'zh-neutral-01',locale:'zh-CN',rate:1},
  captions:{mode:'auto',format:'burn-in',language:'zh-CN'},
  outputProfile:{profileId:'course-1080p',width:1920,height:1080,fps:30,container:'mp4',videoCodec:'h264',audioCodec:'aac'},
  ...overrides,
});

const source = (overrides = {}) => {
  const request=createMediaRenderRequestV1(baseRequestInput(overrides));
  const plan=compileCanonicalRenderPlanV1(request);
  const manifest=compilePreparationManifestV1(plan);
  return {request,plan,manifest};
};

const assetBytes = new Map([
  ['asset-1',visual1],
  ['asset-2',visual2],
  ['voice-provided',providedVoice],
  ['caption-provided',providedCaption],
]);

const harness = ({authorized=true, resolveOverride=null, synthOverride=null, now='2026-08-09T00:00:00.000Z'} = {}) => {
  const calls={authorize:0,resolve:[],synthesize:[]};
  const executor=createPreparationExecutorV1({
    isPreparationAuthorized:async (input)=>{calls.authorize+=1; return typeof authorized==='function'?authorized(input):authorized;},
    resolveExactAsset:async (input)=>{
      calls.resolve.push(structuredClone(input));
      if(resolveOverride) return resolveOverride(input);
      const id=input.asset.assetId;
      const payload=assetBytes.get(id);
      if(!payload) throw new Error('missing fake asset');
      return {bytes:Buffer.from(payload),mediaType:input.asset.mediaType};
    },
    synthesizeNarrationSegment:async (input)=>{
      calls.synthesize.push(structuredClone(input));
      if(synthOverride) return synthOverride(input);
      return {bytes:bytes(`wav:${input.segment.segmentId}:${input.segment.text}`),mediaType:'audio/wav'};
    },
    now:()=>now,
  });
  return {executor,calls};
};

test('authorized course-shaped preparation produces visual, synthesized voice and auto-caption prepared inputs', async () => {
  const {plan,manifest}=source();
  const {executor,calls}=harness();
  const result=await executor.execute({plan,manifest});
  assert.equal(calls.authorize,1);
  assert.equal(calls.resolve.length,2);
  assert.equal(calls.synthesize.length,2);
  assert.equal(result.receipt.visualArtifacts.length,2);
  assert.equal(result.receipt.voiceResult.mode,'synthesize');
  assert.equal(result.receipt.voiceResult.artifacts.length,2);
  assert.equal(result.receipt.captionResult.mode,'auto');
  assert.equal(result.receipt.captionResult.cues.length,2);
  assert.equal(validatePreparedInputsReceiptV1(result.receipt,{plan,manifest}),true);
  assert.equal(verifyPreparedPayloadsV1(result),true);
});

test('authorization denial occurs before resolver or synthesis operations', async () => {
  const {plan,manifest}=source();
  const {executor,calls}=harness({authorized:false});
  await assert.rejects(()=>executor.execute({plan,manifest}),/not authorized/);
  assert.equal(calls.authorize,1);
  assert.equal(calls.resolve.length,0);
  assert.equal(calls.synthesize.length,0);
});

test('authorization receives only exact source identities and bounded action', async () => {
  const {plan,manifest}=source();
  let observed=null;
  const {executor}=harness({authorized:(input)=>{observed=input; return true;}});
  await executor.execute({plan,manifest});
  assert.deepEqual(observed,{
    requestId:plan.requestId,
    inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest,
    preparationManifestDigest:manifest.preparationManifestDigest,
    action:'execute_preparation',
  });
});

test('wrong visual bytes fail SHA verification before later preparation stages', async () => {
  const {plan,manifest}=source();
  const {executor,calls}=harness({resolveOverride:(input)=>({bytes:bytes(`wrong:${input.asset.assetId}`),mediaType:input.asset.mediaType})});
  await assert.rejects(()=>executor.execute({plan,manifest}),/do not match expected source SHA-256/);
  assert.equal(calls.synthesize.length,0);
});

test('visual resolver media type mismatch fails closed', async () => {
  const {plan,manifest}=source();
  const {executor}=harness({resolveOverride:(input)=>({bytes:Buffer.from(assetBytes.get(input.asset.assetId)),mediaType:'application/octet-stream'})});
  await assert.rejects(()=>executor.execute({plan,manifest}),/differs from expected media type/);
});

test('empty resolved asset fails closed', async () => {
  const {plan,manifest}=source();
  const {executor}=harness({resolveOverride:(input)=>({bytes:Buffer.alloc(0),mediaType:input.asset.mediaType})});
  await assert.rejects(()=>executor.execute({plan,manifest}),/must not be empty|do not match expected source SHA-256/);
});

test('synthesis must return audio media type', async () => {
  const {plan,manifest}=source();
  const {executor}=harness({synthOverride:()=>({bytes:bytes('not-audio'),mediaType:'text/plain'})});
  await assert.rejects(()=>executor.execute({plan,manifest}),/must be audio/);
});

test('synthesized artifacts preserve exact segment and target timing identity', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.deepEqual(receipt.voiceResult.artifacts.map((artifact)=>({segmentId:artifact.segmentId,shot:artifact.sourceShotId,start:artifact.targetStartMs,duration:artifact.targetDurationMs})),[
    {segmentId:'narration-shot-1',shot:'shot-1',start:0,duration:1000},
    {segmentId:'narration-shot-2',shot:'shot-2',start:1000,duration:1000},
  ]);
});

test('auto caption cues are deterministic copies of exact narration timing', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.deepEqual(receipt.captionResult.cues,[
    {cueId:'caption-narration-shot-1',segmentId:'narration-shot-1',shotId:'shot-1',startMs:0,endMs:1000,text:'第一段。'},
    {cueId:'caption-narration-shot-2',segmentId:'narration-shot-2',shotId:'shot-2',startMs:1000,endMs:2000,text:'第二段。'},
  ]);
});

test('provided voice asset is resolved and exact SHA verified without synthesis', async () => {
  const audioAsset={assetId:'voice-provided',locator:'media://voice/provided.wav',mediaType:'audio/wav',sha256:digest(providedVoice)};
  const {plan,manifest}=source({voice:{mode:'provided',audioAsset}});
  const {executor,calls}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(calls.synthesize.length,0);
  assert.equal(receipt.voiceResult.mode,'provided');
  assert.equal(receipt.voiceResult.artifacts[0].sourceId,'voice-provided');
  assert.equal(receipt.voiceResult.artifacts[0].sha256,digest(providedVoice));
});

test('provided caption asset is resolved and exact SHA verified without auto cues', async () => {
  const captionAsset={assetId:'caption-provided',locator:'media://captions/provided.srt',mediaType:'application/x-subrip',sha256:digest(providedCaption)};
  const {plan,manifest}=source({captions:{mode:'provided',format:'srt',captionAsset}});
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(receipt.captionResult.mode,'provided');
  assert.equal(receipt.captionResult.cues.length,0);
  assert.equal(receipt.captionResult.artifacts[0].sourceId,'caption-provided');
});

test('none voice and captions perform no synthesis or caption compilation', async () => {
  const {plan,manifest}=source({
    shots:[
      {shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'none'},visualAssetIds:['asset-1']},
      {shotId:'shot-2',order:2,durationMs:1000,narration:{mode:'none'},visualAssetIds:['asset-2']},
    ],
    voice:{mode:'none'},captions:{mode:'none',format:'none'},
  });
  const {executor,calls}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(calls.synthesize.length,0);
  assert.deepEqual(receipt.voiceResult,{mode:'none',artifacts:[]});
  assert.deepEqual(receipt.captionResult,{mode:'none',format:'none',cues:[],artifacts:[]});
  assert.equal(receipt.actions.voiceSynthesisPerformed,false);
  assert.equal(receipt.actions.captionCompilationPerformed,false);
});

test('exact plan-manifest mismatch fails before authorization or provider operations', async () => {
  const first=source();
  const other=source({title:'Different preparation plan'});
  const {executor,calls}=harness();
  await assert.rejects(()=>executor.execute({plan:first.plan,manifest:other.manifest}),/does not match exact render plan/);
  assert.equal(calls.authorize,0);
  assert.equal(calls.resolve.length,0);
});

test('provider operation errors are sanitized rather than persisted or surfaced verbatim', async () => {
  const {plan,manifest}=source();
  const {executor}=harness({resolveOverride:()=>{throw new Error('Bearer top-secret-token');}});
  await assert.rejects(async()=>{
    try { await executor.execute({plan,manifest}); }
    catch(error){ assert.equal(String(error.message).includes('top-secret-token'),false); throw error; }
  },/failed without exposing provider details/);
});

test('getPayload returns defensive copies so caller mutation cannot alter stored prepared bytes', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const result=await executor.execute({plan,manifest});
  const id=result.receipt.visualArtifacts[0].artifactId;
  const first=result.getPayload(id);
  first[0]^=0xff;
  const second=result.getPayload(id);
  assert.equal(digest(second),result.receipt.visualArtifacts[0].sha256);
  assert.notEqual(first[0],second[0]);
});

test('payload verification rejects a getter that substitutes bytes', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const result=await executor.execute({plan,manifest});
  assert.throws(()=>verifyPreparedPayloadsV1({receipt:result.receipt,getPayload:()=>bytes('substituted')}),/does not match prepared receipt/);
});

test('prepared receipt digest tampering is rejected', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const result=await executor.execute({plan,manifest});
  const receipt=structuredClone(result.receipt);
  receipt.actions.voiceSynthesisPerformed=false;
  assert.throws(()=>validatePreparedInputsReceiptV1(receipt),/preparedInputsDigest mismatch/);
});

test('prepared receipt is deeply frozen and carries no raw bytes', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(Object.isFrozen(receipt),true);
  assert.equal(Object.isFrozen(receipt.visualArtifacts),true);
  assert.equal(JSON.stringify(receipt).includes('visual-one-bytes'),false);
  assert.throws(()=>{receipt.actions.assetResolutionPerformed=false;},TypeError);
});

test('invalid prepared timestamp fails without producing a receipt', async () => {
  const {plan,manifest}=source();
  const {executor}=harness({now:'not-a-date'});
  await assert.rejects(()=>executor.execute({plan,manifest}),/must be an ISO-compatible timestamp/);
});

test('prepared receipt keeps transport, binding, render and consumer-domain decisions false', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(receipt.transportSelected,false);
  assert.equal(receipt.bindingCreated,false);
  assert.equal(receipt.renderAuthorized,false);
  assert.equal(receipt.consumerDomainDecisionInferred,false);
  assert.equal(receipt.businessOutcomeInferred,false);
});

test('prepared receipt exact source validation rejects another render plan or manifest identity', async () => {
  const first=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan:first.plan,manifest:first.manifest});
  const other=source({title:'Other source'});
  assert.throws(()=>validatePreparedInputsReceiptV1(receipt,{plan:other.plan,manifest:other.manifest}),/identity does not match exact plan\/manifest/);
});

test('constructor requires explicit resolver, synthesizer and authorization operations', () => {
  assert.throws(()=>createPreparationExecutorV1({}),/must be a function/);
  assert.throws(()=>createPreparationExecutorV1({resolveExactAsset:()=>{}}),/must be a function/);
});

test('prepared executor output stays product-neutral and does not contain ToolRadar or TrainingOS truth', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  const serialized=JSON.stringify(receipt);
  for(const forbidden of ['ToolRadar','TrainingOS','unitId','lessonId','studentId','teacherId','publicationAllowed','publicationPerformed','analyticsObserved','humanApproved']) assert.equal(serialized.includes(forbidden),false,forbidden);
});

test('prepared inputs digest is deterministic for the same receipt content', async () => {
  const {plan,manifest}=source();
  const {executor}=harness();
  const {receipt}=await executor.execute({plan,manifest});
  assert.equal(computePreparedInputsDigestV1(receipt),receipt.preparedInputsDigest);
});
