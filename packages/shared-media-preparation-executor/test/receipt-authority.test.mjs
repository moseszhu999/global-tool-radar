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
} from '../src/index.mjs';

const bytes = (value) => Buffer.from(value, 'utf8');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const visual = bytes('authority-visual');
const providedVoice = bytes('authority-voice');
const providedCaption = bytes('authority-caption');

const source = (overrides = {}) => {
  const request=createMediaRenderRequestV1({
    requestId:'prepared-authority-001',purpose:'infra.smoke',title:'Prepared receipt authority',language:'en',
    shots:[{shotId:'shot-1',order:1,durationMs:1000,narration:{mode:'text',text:'Authority segment.'},visualAssetIds:['asset-1']}],
    visualAssets:[{assetId:'asset-1',kind:'image',locator:'media://asset-1.png',mediaType:'image/png',sha256:digest(visual)}],
    voice:{mode:'synthesize',provider:'shared-tts',voiceId:'neutral-1'},
    captions:{mode:'auto',format:'burn-in'},
    outputProfile:{profileId:'authority',width:640,height:480,fps:30,container:'mp4'},
    ...overrides,
  });
  const plan=compileCanonicalRenderPlanV1(request);
  const manifest=compilePreparationManifestV1(plan);
  return {plan,manifest};
};

const execute = async ({plan,manifest,extraAssets=new Map()}={}) => {
  const assets=new Map([['asset-1',visual],...extraAssets]);
  const executor=createPreparationExecutorV1({
    isPreparationAuthorized:async()=>true,
    resolveExactAsset:async({asset})=>({bytes:Buffer.from(assets.get(asset.assetId)),mediaType:asset.mediaType}),
    synthesizeNarrationSegment:async({segment})=>({bytes:bytes(`audio:${segment.segmentId}`),mediaType:'audio/wav'}),
    now:()=> '2026-08-09T00:00:00.000Z',
  });
  return executor.execute({plan,manifest});
};
const resign = (receipt) => {
  receipt.preparedInputsDigest=computePreparedInputsDigestV1(receipt);
  return receipt;
};

test('re-signed action-fact tampering is rejected by standalone semantic re-derivation', async()=>{
  const {plan,manifest}=source();
  const {receipt}=await execute({plan,manifest});
  const tampered=structuredClone(receipt);
  tampered.actions.assetResolutionPerformed=false;
  resign(tampered);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered),/action facts do not match prepared artifacts\/cues/);
});

test('re-signed preparedArtifactsProduced tampering is rejected by standalone semantic re-derivation', async()=>{
  const {plan,manifest}=source();
  const {receipt}=await execute({plan,manifest});
  const tampered=structuredClone(receipt);
  tampered.preparedArtifactsProduced=false;
  resign(tampered);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered),/preparedArtifactsProduced does not match prepared artifacts\/cues/);
});

test('re-signed visual SHA substitution is rejected by exact plan-manifest source gate', async()=>{
  const {plan,manifest}=source();
  const {receipt}=await execute({plan,manifest});
  const tampered=structuredClone(receipt);
  tampered.visualArtifacts[0].sha256='b'.repeat(64);
  resign(tampered);
  assert.equal(validatePreparedInputsReceiptV1(tampered),true);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered,{plan,manifest}),/does not match exact preparation source identity/);
});

test('re-signed provided voice source substitution is rejected by exact source gate', async()=>{
  const audioAsset={assetId:'voice-provided',locator:'media://voice.wav',mediaType:'audio/wav',sha256:digest(providedVoice)};
  const {plan,manifest}=source({voice:{mode:'provided',audioAsset}});
  const {receipt}=await execute({plan,manifest,extraAssets:new Map([['voice-provided',providedVoice]])});
  const tampered=structuredClone(receipt);
  tampered.voiceResult.artifacts[0].sha256='c'.repeat(64);
  resign(tampered);
  assert.equal(validatePreparedInputsReceiptV1(tampered),true);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered,{plan,manifest}),/does not match exact preparation source identity/);
});

test('re-signed provided caption source substitution is rejected by exact source gate', async()=>{
  const captionAsset={assetId:'caption-provided',locator:'media://caption.srt',mediaType:'application/x-subrip',sha256:digest(providedCaption)};
  const {plan,manifest}=source({captions:{mode:'provided',format:'srt',captionAsset}});
  const {receipt}=await execute({plan,manifest,extraAssets:new Map([['caption-provided',providedCaption]])});
  const tampered=structuredClone(receipt);
  tampered.captionResult.artifacts[0].sourceId='other-caption';
  resign(tampered);
  assert.equal(validatePreparedInputsReceiptV1(tampered),true);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered,{plan,manifest}),/does not match exact preparation source identity/);
});

test('re-signed synthesized timing or sourceId substitution is rejected by exact narration-segment gate', async()=>{
  const {plan,manifest}=source();
  const {receipt}=await execute({plan,manifest});
  const tampered=structuredClone(receipt);
  tampered.voiceResult.artifacts[0].sourceId='other-segment';
  tampered.voiceResult.artifacts[0].targetStartMs=999;
  resign(tampered);
  assert.equal(validatePreparedInputsReceiptV1(tampered),true);
  assert.throws(()=>validatePreparedInputsReceiptV1(tampered,{plan,manifest}),/does not match exact narration segment/);
});
