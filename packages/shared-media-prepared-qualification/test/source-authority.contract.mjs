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
const visual=bytes('authority-visual');

const build=async()=>{
  const request=createMediaRenderRequestV1({
    requestId:'qualification-authority-001',purpose:'infra.smoke',title:'Qualification authority boundary',language:'en',
    shots:[{shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'text',text:'Authority.'},visualAssetIds:['asset-1']}],
    visualAssets:[{assetId:'asset-1',kind:'image',locator:'media://asset-1.png',mediaType:'image/png',sha256:digest(visual)}],
    voice:{mode:'synthesize',provider:'shared-tts',voiceId:'neutral-1'},
    captions:{mode:'auto',format:'burn-in'},
    outputProfile:{profileId:'authority',width:640,height:480,fps:30,container:'mp4'},
  });
  const plan=compileCanonicalRenderPlanV1(request);
  const manifest=compilePreparationManifestV1(plan);
  const executor=createPreparationExecutorV1({
    isPreparationAuthorized:async()=>true,
    resolveExactAsset:async({asset})=>({bytes:Buffer.from(visual),mediaType:asset.mediaType}),
    synthesizeNarrationSegment:async({segment})=>({bytes:bytes(`audio:${segment.segmentId}`),mediaType:'audio/wav'}),
    now:()=> '2026-08-09T00:00:00.000Z',
  });
  const prepared=await executor.execute({plan,manifest});
  const qualifier=createPreparedMediaQualifierV1({
    isQualificationAuthorized:async()=>true,
    inspectPreparedArtifact:async({role})=>role==='visual'
      ? {kind:'image',width:640,height:480}
      : {kind:'audio',durationSeconds:0.75,codecName:'pcm_s16le',sampleRate:48000,channels:1},
    now:()=> '2026-08-09T00:01:00.000Z',
  });
  const qualification=await qualifier.qualify({plan,manifest,prepared});
  return {plan,manifest,prepared,qualification};
};

const resign=(receipt)=>{
  receipt.qualificationDigest=computePreparedQualificationDigestV1(receipt);
  return receipt;
};

test('detached re-signed visual media-type substitution is internally self-consistent but exact prepared source rejects it',async()=>{
  const {plan,manifest,prepared,qualification}=await build();
  const changed=structuredClone(qualification);
  changed.visualInspections[0].mediaType='application/octet-stream';
  resign(changed);
  assert.equal(validatePreparedQualificationReceiptV1(changed),true);
  assert.throws(
    ()=>validatePreparedQualificationReceiptV1(changed,{plan,manifest,preparedReceipt:prepared.receipt}),
    /does not match exact prepared artifact/,
  );
});

test('detached re-signed voice SHA substitution is internally self-consistent but exact prepared source rejects it',async()=>{
  const {plan,manifest,prepared,qualification}=await build();
  const changed=structuredClone(qualification);
  changed.voiceTiming[0].sha256='b'.repeat(64);
  resign(changed);
  assert.equal(validatePreparedQualificationReceiptV1(changed),true);
  assert.throws(
    ()=>validatePreparedQualificationReceiptV1(changed,{plan,manifest,preparedReceipt:prepared.receipt}),
    /does not match exact prepared segment/,
  );
});

test('detached re-signed auto-caption qualification can be structurally self-consistent but exact prepared source rejects it',async()=>{
  const {plan,manifest,prepared,qualification}=await build();
  const changed=structuredClone(qualification);
  changed.captionQualification.cueCount=0;
  changed.captionQualification.cuesBoundToExactTimeline=false;
  resign(changed);
  assert.equal(validatePreparedQualificationReceiptV1(changed),true);
  assert.throws(
    ()=>validatePreparedQualificationReceiptV1(changed,{plan,manifest,preparedReceipt:prepared.receipt}),
    /caption qualification does not match exact prepared caption result/,
  );
});

test('re-signed measured-duration substitution remains structurally and source-chain valid, proving detached receipt is not inspector attestation',async()=>{
  const {plan,manifest,prepared,qualification}=await build();
  const changed=structuredClone(qualification);
  changed.voiceTiming[0].actualDurationSeconds=0.5;
  changed.voiceTiming[0].actualDurationMsCeil=500;
  changed.voiceTiming[0].trailingSilenceMs=500;
  resign(changed);

  assert.equal(validatePreparedQualificationReceiptV1(changed),true);
  assert.equal(validatePreparedQualificationReceiptV1(changed,{plan,manifest,preparedReceipt:prepared.receipt}),true);
  assert.notEqual(changed.qualificationDigest,qualification.qualificationDigest);
});
