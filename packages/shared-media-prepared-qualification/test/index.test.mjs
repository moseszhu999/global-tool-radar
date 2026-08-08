import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {compilePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {createPreparationExecutorV1} from '../../shared-media-preparation-executor/src/index.mjs';
import {
  createPreparedMediaQualifierV1,
  computePreparedQualificationDigestV1,
  validatePreparedQualificationReceiptV1,
} from '../src/index.mjs';

const bytes=(value)=>Buffer.from(value,'utf8');
const digest=(value)=>createHash('sha256').update(value).digest('hex');
const visual=bytes('qualification-visual');
const providedVoice=bytes('qualification-provided-voice');
const providedCaption=bytes('qualification-provided-caption');

const source=async(overrides={})=>{
  const request=createMediaRenderRequestV1({
    requestId:'qualification-001',purpose:'course.explainer',title:'Prepared qualification',language:'zh-CN',
    shots:[{shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'text',text:'第一段。'},visualAssetIds:['asset-1']}],
    visualAssets:[{assetId:'asset-1',kind:'image',locator:'media://asset-1.png',mediaType:'image/png',sha256:digest(visual)}],
    voice:{mode:'synthesize',provider:'shared-tts',voiceId:'zh-neutral'},
    captions:{mode:'auto',format:'burn-in',language:'zh-CN'},
    outputProfile:{profileId:'qualification',width:1280,height:720,fps:30,container:'mp4',videoCodec:'h264',audioCodec:'aac'},
    ...overrides,
  });
  const plan=compileCanonicalRenderPlanV1(request);
  const manifest=compilePreparationManifestV1(plan);
  const assetMap=new Map([
    ['asset-1',visual],
    ['voice-provided',providedVoice],
    ['caption-provided',providedCaption],
  ]);
  const executor=createPreparationExecutorV1({
    isPreparationAuthorized:async()=>true,
    resolveExactAsset:async({asset})=>({bytes:Buffer.from(assetMap.get(asset.assetId)),mediaType:asset.mediaType}),
    synthesizeNarrationSegment:async({segment})=>({bytes:bytes(`audio:${segment.segmentId}`),mediaType:'audio/wav'}),
    now:()=> '2026-08-09T00:00:00.000Z',
  });
  const prepared=await executor.execute({plan,manifest});
  return {request,plan,manifest,prepared};
};

const harness=({authorized=true,audioDuration=0.75,inspectOverride=null,now='2026-08-09T00:01:00.000Z'}={})=>{
  const calls={authorize:0,inspect:[]};
  const qualifier=createPreparedMediaQualifierV1({
    isQualificationAuthorized:async(input)=>{calls.authorize+=1; return typeof authorized==='function'?authorized(input):authorized;},
    inspectPreparedArtifact:async(input)=>{
      calls.inspect.push({role:input.role,artifact:structuredClone(input.artifact)});
      if(inspectOverride) return inspectOverride(input);
      if(input.role==='visual') return {kind:'image',width:1280,height:720};
      if(input.role==='voice-synthesized') return {kind:'audio',durationSeconds:audioDuration,codecName:'pcm_s16le',sampleRate:48000,channels:2};
      throw new Error('unexpected fake inspection role');
    },
    now:()=>now,
  });
  return {qualifier,calls};
};

const resign=(receipt)=>{receipt.qualificationDigest=computePreparedQualificationDigestV1(receipt);return receipt;};

test('image plus synthesized voice plus auto captions qualifies exact course-shaped prepared inputs',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier,calls}=harness();
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.equal(calls.authorize,1);
  assert.deepEqual(calls.inspect.map((x)=>x.role),['visual','voice-synthesized']);
  assert.equal(receipt.visualInspections.length,1);
  assert.equal(receipt.voiceTiming.length,1);
  assert.equal(receipt.captionQualification.mode,'auto');
  assert.equal(validatePreparedQualificationReceiptV1(receipt,{plan,manifest,preparedReceipt:prepared.receipt}),true);
});

test('qualification authorization denial occurs before media inspection',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier,calls}=harness({authorized:false});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/not authorized/);
  assert.equal(calls.authorize,1);
  assert.equal(calls.inspect.length,0);
});

test('qualification authorization receives exact source chain identities',async()=>{
  const {plan,manifest,prepared}=await source();
  let observed=null;
  const {qualifier}=harness({authorized:(input)=>{observed=input;return true;}});
  await qualifier.qualify({plan,manifest,prepared});
  assert.deepEqual(observed,{
    requestId:plan.requestId,inputManifestDigest:plan.inputManifestDigest,renderPlanDigest:plan.renderPlanDigest,
    preparationManifestDigest:manifest.preparationManifestDigest,preparedInputsDigest:prepared.receipt.preparedInputsDigest,
    action:'qualify_prepared_media',
  });
});

test('prepared payload SHA substitution fails before qualification authorization and inspection',async()=>{
  const {plan,manifest,prepared}=await source();
  const badPrepared={...prepared,getPayload:()=>bytes('substituted')};
  const {qualifier,calls}=harness();
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared:badPrepared}),/does not match prepared receipt/);
  assert.equal(calls.authorize,0);
  assert.equal(calls.inspect.length,0);
});

test('visual inspection must prove an image with positive dimensions',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({inspectOverride:(input)=>input.role==='visual'?{kind:'image',width:0,height:720}:{kind:'audio',durationSeconds:.5}});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/positive integer width\/height/);
});

test('visual inspection kind mismatch fails closed',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({inspectOverride:(input)=>input.role==='visual'?{kind:'video',width:1280,height:720}:{kind:'audio',durationSeconds:.5}});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/requires image inspection/);
});

test('video visual input is outside prepared qualification v1 subset',async()=>{
  const {plan,manifest,prepared}=await source({visualAssets:[{assetId:'asset-1',kind:'video',locator:'media://asset-1.mp4',mediaType:'video/mp4',sha256:digest(visual)}]});
  const {qualifier,calls}=harness();
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/static image visuals only/);
  assert.equal(calls.authorize,0);
});

test('synthesized audio exactly at target window qualifies without trailing silence',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({audioDuration:1.0});
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.equal(receipt.voiceTiming[0].actualDurationMsCeil,1000);
  assert.equal(receipt.voiceTiming[0].trailingSilenceMs,0);
});

test('short synthesized audio qualifies at original speed with trailing silence budget',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({audioDuration:.7492});
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.equal(receipt.voiceTiming[0].actualDurationMsCeil,750);
  assert.equal(receipt.voiceTiming[0].targetDurationMs,1000);
  assert.equal(receipt.voiceTiming[0].trailingSilenceMs,250);
  assert.equal(receipt.policy.timeStretchApplied,false);
  assert.equal(receipt.policy.trimApplied,false);
});

test('synthesized audio longer than target window fails closed',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({audioDuration:1.001});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/AUDIO_WINDOW_OVERRUN|exceeds target window/);
});

test('fractional duration just over target conservatively ceilings to the next millisecond and fails',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({audioDuration:1.0000001});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/exceeds target window/);
});

test('invalid zero or non-finite audio duration fails closed',async()=>{
  const {plan,manifest,prepared}=await source();
  for(const duration of [0,Number.NaN,Infinity]){
    const {qualifier}=harness({audioDuration:duration});
    await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/positive finite number/);
  }
});

test('audio sampleRate and channels must be positive integers when reported',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({inspectOverride:(input)=>input.role==='visual'?{kind:'image',width:1280,height:720}:{kind:'audio',durationSeconds:.5,sampleRate:0,channels:2}});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/sampleRate must be positive integer/);
});

test('inspector exceptions are sanitized',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({inspectOverride:()=>{throw new Error('Bearer inspector-secret');}});
  await assert.rejects(async()=>{
    try{await qualifier.qualify({plan,manifest,prepared});}
    catch(error){assert.equal(String(error.message).includes('inspector-secret'),false);throw error;}
  },/failed without exposing inspector details/);
});

test('auto caption qualification is bound to exact prepared cue count',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.deepEqual(receipt.captionQualification,{mode:'auto',format:'burn-in',cueCount:1,cuesBoundToExactTimeline:true,providedCaptionPayloadSupported:false});
});

test('none voice and captions require no audio inspection',async()=>{
  const {plan,manifest,prepared}=await source({
    shots:[{shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'none'},visualAssetIds:['asset-1']}],
    voice:{mode:'none'},captions:{mode:'none',format:'none'},
  });
  const {qualifier,calls}=harness();
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.deepEqual(calls.inspect.map((x)=>x.role),['visual']);
  assert.deepEqual(receipt.voiceTiming,[]);
  assert.deepEqual(receipt.captionQualification,{mode:'none',format:'none',cueCount:0,cuesBoundToExactTimeline:false,providedCaptionPayloadSupported:false});
});

test('provided whole-track voice is outside qualification v1 subset',async()=>{
  const audioAsset={assetId:'voice-provided',locator:'media://voice.wav',mediaType:'audio/wav',sha256:digest(providedVoice)};
  const {plan,manifest,prepared}=await source({voice:{mode:'provided',audioAsset}});
  const {qualifier,calls}=harness();
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/does not yet support provided whole-track voice/);
  assert.equal(calls.authorize,0);
});

test('provided caption payload is outside qualification v1 subset',async()=>{
  const captionAsset={assetId:'caption-provided',locator:'media://caption.srt',mediaType:'application/x-subrip',sha256:digest(providedCaption)};
  const {plan,manifest,prepared}=await source({captions:{mode:'provided',format:'srt',captionAsset}});
  const {qualifier,calls}=harness();
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/does not yet support provided caption payloads/);
  assert.equal(calls.authorize,0);
});

test('qualification digest tampering is rejected',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=structuredClone(await qualifier.qualify({plan,manifest,prepared}));
  receipt.policy.trimApplied=true;
  assert.throws(()=>validatePreparedQualificationReceiptV1(receipt),/audio policy|qualificationDigest mismatch/);
});

test('re-signed trailing silence inconsistency is rejected semantically',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({audioDuration:.75});
  const receipt=structuredClone(await qualifier.qualify({plan,manifest,prepared}));
  receipt.voiceTiming[0].trailingSilenceMs=10;
  resign(receipt);
  assert.throws(()=>validatePreparedQualificationReceiptV1(receipt),/window\/trailing silence mismatch/);
});

test('re-signed source identity substitution is rejected by exact prepared source gate',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=structuredClone(await qualifier.qualify({plan,manifest,prepared}));
  receipt.visualInspections[0].sha256='b'.repeat(64);
  resign(receipt);
  assert.equal(validatePreparedQualificationReceiptV1(receipt),true);
  assert.throws(()=>validatePreparedQualificationReceiptV1(receipt,{plan,manifest,preparedReceipt:prepared.receipt}),/does not match exact prepared artifact/);
});

test('re-signed synthesized playback timing substitution is rejected by exact source gate',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=structuredClone(await qualifier.qualify({plan,manifest,prepared}));
  receipt.voiceTiming[0].playbackStartMs=99;
  resign(receipt);
  assert.equal(validatePreparedQualificationReceiptV1(receipt),true);
  assert.throws(()=>validatePreparedQualificationReceiptV1(receipt,{plan,manifest,preparedReceipt:prepared.receipt}),/does not match exact prepared segment/);
});

test('qualification receipt is deeply frozen and does not authorize materialization or render',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  assert.equal(Object.isFrozen(receipt),true);
  assert.equal(Object.isFrozen(receipt.voiceTiming),true);
  assert.equal(receipt.materializationAuthorized,false);
  assert.equal(receipt.transportSelected,false);
  assert.equal(receipt.bindingCreated,false);
  assert.equal(receipt.renderAuthorized,false);
  assert.throws(()=>{receipt.policy.trimApplied=true;},TypeError);
});

test('invalid qualified timestamp fails closed',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness({now:'not-a-date'});
  await assert.rejects(()=>qualifier.qualify({plan,manifest,prepared}),/must be an ISO-compatible timestamp/);
});

test('constructor requires inspector and qualification authorizer',()=>{
  assert.throws(()=>createPreparedMediaQualifierV1({}),/must be a function/);
  assert.throws(()=>createPreparedMediaQualifierV1({inspectPreparedArtifact:()=>{}}),/must be a function/);
});

test('qualification output remains product-neutral',async()=>{
  const {plan,manifest,prepared}=await source();
  const {qualifier}=harness();
  const receipt=await qualifier.qualify({plan,manifest,prepared});
  const serialized=JSON.stringify(receipt);
  for(const forbidden of ['TrainingOS','ToolRadar','unitId','lessonId','studentId','teacherId','publicationAllowed','publicationPerformed','analyticsObserved','humanApproved']) assert.equal(serialized.includes(forbidden),false,forbidden);
});

test('qualification digest is deterministic for identical fixed observations and timestamp',async()=>{
  const {plan,manifest,prepared}=await source();
  const first=await harness().qualifier.qualify({plan,manifest,prepared});
  const second=await harness().qualifier.qualify({plan,manifest,prepared});
  assert.equal(first.qualificationDigest,second.qualificationDigest);
});
