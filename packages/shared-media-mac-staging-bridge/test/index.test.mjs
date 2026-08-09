import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {compileCanonicalRenderPlanV1} from '../../shared-media-canonical-render-plan/src/index.mjs';
import {compilePreparationManifestV1} from '../../shared-media-preparation-manifest/src/index.mjs';
import {computePreparedInputsDigestV1, validatePreparedInputsReceiptV1} from '../../shared-media-preparation-executor/src/index.mjs';
import {computePreparedQualificationDigestV1, validatePreparedQualificationReceiptV1} from '../../shared-media-prepared-qualification/src/index.mjs';
import {materializeSharedMediaRemotionV2} from '../../shared-media-remotion-materializer/src/v2.mjs';
import {MAC_REMOTION_RUNTIME_SCHEMA_V1} from '../../shared-media-mac-compatibility/src/index.mjs';
import {
  SHARED_MEDIA_MAC_STAGING_V1,
  createSharedMediaMacStagingCandidateV1,
  validateSharedMediaMacStagingCandidateV1,
  verifySharedMediaMacStagingCandidateV1,
} from '../src/index.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const expectCode = (fn, code) => assert.throws(fn, (error) => error?.code === code);

const makeSource = () => {
  const imageSha = sha('image-payload');
  const audioSha = sha('audio-payload');
  const request = createMediaRenderRequestV1({
    requestId:'fixture-course-video-01', purpose:'course.explainer', title:'Bounded fixture', language:'zh-CN',
    shots:[{shotId:'shot-1', order:1, durationMs:1000, narration:{mode:'text', text:'这是一个确定性的测试片段。'}, visualAssetIds:['visual-1']}],
    visualAssets:[{assetId:'visual-1', kind:'image', locator:'fixture://visual-1', mediaType:'image/png', sha256:imageSha}],
    voice:{mode:'synthesize', provider:'edge-tts', voiceId:'zh-CN-XiaoxiaoNeural', rate:1.12, locale:'zh-CN'},
    captions:{mode:'auto', format:'burn-in', language:'zh-CN'},
    outputProfile:{profileId:'training-video-1080x1920-30', width:1080, height:1920, fps:30, container:'mp4'},
  });
  const plan = compileCanonicalRenderPlanV1(request);
  const manifest = compilePreparationManifestV1(plan);
  const narration = manifest.narrationSegments[0];
  const prepared = {
    schemaVersion:'shared-media.prepared-inputs.v1', requestId:plan.requestId, inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest, preparationManifestDigest:manifest.preparationManifestDigest, preparedAt:'2026-08-09T00:00:00.000Z',
    visualArtifacts:[{artifactId:'prepared-visual-1', role:'visual', sourceId:'visual-1', mediaType:'image/png', byteLength:13, sha256:imageSha}],
    voiceResult:{mode:'synthesize', artifacts:[{artifactId:'prepared-voice-1', role:'voice-synthesized', sourceId:narration.segmentId, mediaType:'audio/wav', byteLength:17, sha256:audioSha, segmentId:narration.segmentId, sourceShotId:narration.shotId, targetStartMs:narration.startMs, targetDurationMs:narration.durationMs}]},
    captionResult:{mode:'auto', format:'burn-in', cues:[{cueId:`caption-${narration.segmentId}`, segmentId:narration.segmentId, shotId:narration.shotId, startMs:narration.startMs, endMs:narration.startMs+narration.durationMs, text:narration.text}], artifacts:[]},
    actions:{assetResolutionPerformed:true, voiceSynthesisPerformed:true, captionCompilationPerformed:true},
    preparedArtifactsProduced:true, transportSelected:false, bindingCreated:false, renderAuthorized:false, consumerDomainDecisionInferred:false, businessOutcomeInferred:false,
  };
  prepared.preparedInputsDigest = computePreparedInputsDigestV1(prepared);
  validatePreparedInputsReceiptV1(prepared,{plan,manifest});
  const qualification = {
    schemaVersion:'shared-media.prepared-qualification.v1', requestId:plan.requestId, inputManifestDigest:plan.inputManifestDigest,
    renderPlanDigest:plan.renderPlanDigest, preparationManifestDigest:manifest.preparationManifestDigest, preparedInputsDigest:prepared.preparedInputsDigest,
    qualifiedAt:'2026-08-09T00:00:01.000Z',
    visualInspections:[{artifactId:'prepared-visual-1', sha256:imageSha, mediaType:'image/png', kind:'image', width:1920, height:1080, qualified:true}],
    voiceTiming:[{artifactId:'prepared-voice-1', sha256:audioSha, mediaType:'audio/wav', kind:'audio', actualDurationSeconds:0.2, actualDurationMsCeil:200, targetDurationMs:narration.durationMs, trailingSilenceMs:800, fitsWindow:true, segmentId:narration.segmentId, sourceShotId:narration.shotId, playbackStartMs:narration.startMs}],
    captionQualification:{mode:'auto', format:'burn-in', cueCount:1, cuesBoundToExactTimeline:true, providedCaptionPayloadSupported:false},
    policy:{timeStretchApplied:false, trimApplied:false, audioOverrunAllowed:false, shortAudioTrailingSilenceAllowed:true},
    qualificationPassed:true, materializationAuthorized:false, transportSelected:false, bindingCreated:false, renderAuthorized:false, consumerDomainDecisionInferred:false, businessOutcomeInferred:false,
  };
  qualification.qualificationDigest = computePreparedQualificationDigestV1(qualification);
  validatePreparedQualificationReceiptV1(qualification,{plan,manifest,preparedReceipt:prepared});
  const materialization = materializeSharedMediaRemotionV2({plan,manifest,preparedReceipt:prepared,qualificationReceipt:qualification});
  return {plan,manifest,prepared,qualification,materialization};
};

const makeStaging = () => { const source = makeSource(); const staging = createSharedMediaMacStagingCandidateV1({candidate:source.materialization, plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}); return {...source, staging}; };

test('creates a Mac staging candidate from the exact materialization source chain', () => {
  const {staging} = makeStaging();
  assert.equal(staging.schemaVersion, SHARED_MEDIA_MAC_STAGING_V1);
  assert.equal(staging.approvalRequired, true);
  assert.equal(staging.bindingCreated, false);
  assert.equal(staging.renderAuthorized, false);
  assert.equal(staging.transportSubmissionAllowed, false);
  validateSharedMediaMacStagingCandidateV1(staging);
});

test('staging project name and composition are deterministic safe identifiers', () => {
  const {staging, materialization} = makeStaging();
  assert.equal(staging.projectName, 'shared-fixture-course-video-01');
  assert.equal(staging.compositionId, materialization.compositionId);
  assert.match(staging.projectName, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/);
});

test('prepared asset staging paths are rooted under public and preserve source hashes', () => {
  const {staging, materialization} = makeStaging();
  assert.equal(staging.preparedAssetsToStage.length, materialization.preparedAssetManifest.length);
  for (const asset of staging.preparedAssetsToStage) {
    assert.match(asset.relativePath, /^public\/assets\//);
    const source = materialization.preparedAssetManifest.find((x)=>x.artifactId===asset.artifactId);
    assert.deepEqual(asset.sha256, source.sha256);
    assert.equal(asset.byteLength, source.byteLength);
  }
});

test('generated project files preserve exact content bytes, paths and sizes', () => {
  const {staging, materialization} = makeStaging();
  assert.equal(staging.generatedFilesToStage.length, materialization.files.length);
  for (const file of staging.generatedFilesToStage) {
    const source = materialization.files.find((x)=>x.path===file.path);
    assert.equal(file.sha256, sha(source.content));
    assert.equal(file.byteLength, Buffer.byteLength(source.content));
    assert.equal(file.content, source.content);
  }
});

test('runtime evidence is pinned to the audited Mac compatibility schema', () => {
  const {staging} = makeStaging();
  assert.deepEqual(staging.runtimeEvidence, {
    serverMjsSha256:MAC_REMOTION_RUNTIME_SCHEMA_V1.serverMjsSha256,
    openapiSha256:MAC_REMOTION_RUNTIME_SCHEMA_V1.openapiSha256,
  });
});

test('evidence refs bind plan, prepared, qualification and materialization digests', () => {
  const {staging, plan, prepared, qualification, materialization} = makeStaging();
  assert.deepEqual(staging.evidenceRefs, [
    `materialization:${materialization.candidateDigest}`,
    `qualification:${qualification.qualificationDigest}`,
    `prepared:${prepared.preparedInputsDigest}`,
    `plan:${plan.renderPlanDigest}`,
  ]);
});

test('same exact source chain produces byte-identical staging candidate', () => {
  const a = makeStaging().staging;
  const b = makeStaging().staging;
  assert.equal(a.stagingDigest, b.stagingDigest);
  assert.deepEqual(a, b);
});

test('staging candidate verification re-materializes the exact source chain', () => {
  const {staging, materialization, plan, manifest, prepared, qualification} = makeStaging();
  assert.equal(verifySharedMediaMacStagingCandidateV1({candidate:staging, materializationCandidate:materialization, plan, manifest, preparedReceipt:prepared, qualificationReceipt:qualification}), true);
});

test('staging digest tampering fails closed', () => {
  const {staging} = makeStaging();
  const tampered = structuredClone(staging);
  tampered.projectName = 'shared-other-project';
  expectCode(()=>validateSharedMediaMacStagingCandidateV1(tampered), 'STAGING_INTEGRITY_MISMATCH');
});

test('re-signed staging candidate from a different materialization source is rejected', () => {
  const source = makeStaging();
  const changed = makeSource();
  const tampered = createSharedMediaMacStagingCandidateV1({candidate:changed.materialization, plan:changed.plan, manifest:changed.manifest, preparedReceipt:changed.prepared, qualificationReceipt:changed.qualification});
  expectCode(()=>verifySharedMediaMacStagingCandidateV1({candidate:tampered, materializationCandidate:source.materialization, plan:source.plan, manifest:source.manifest, preparedReceipt:source.prepared, qualificationReceipt:source.qualification}), 'SOURCE_SEMANTICS_MISMATCH');
});

test('staging candidate cannot be changed into an approved binding', () => {
  const {staging} = makeStaging();
  const tampered = structuredClone(staging);
  tampered.approvalRequired = false;
  tampered.bindingCreated = true;
  expectCode(()=>validateSharedMediaMacStagingCandidateV1(tampered), 'TRUTH_BOUNDARY');
});

test('staging bridge does not emit Mac transport submission fields', () => {
  const {staging} = makeStaging();
  assert.equal('mode' in staging, false);
  assert.equal('outputName' in staging, false);
  assert.equal('projectDir' in staging, false);
  assert.equal('route' in staging, false);
  assert.equal('method' in staging, false);
});

test('staging bridge does not perform filesystem, network or process operations', () => {
  const {staging} = makeStaging();
  const serialized = JSON.stringify(staging);
  assert.doesNotMatch(serialized, /Authorization|Bearer |fetch\(|spawn\(|exec\(|projectDir/);
});

test('staging candidate preserves output profile and duration from materialization', () => {
  const {staging, materialization} = makeStaging();
  assert.deepEqual(staging.expectedOutputProfile, materialization.expectedOutputProfile);
  assert.equal(staging.expectedDurationSeconds, materialization.expectedDurationSeconds);
  assert.equal(staging.audio, true);
});

test('staging candidate is deeply independent from its source objects', () => {
  const source = makeStaging();
  const original = source.staging.stagingDigest;
  source.staging.generatedFilesToStage[0].content = 'mutated';
  assert.equal(source.staging.stagingDigest, original);
  assert.notEqual(source.staging.generatedFilesToStage[0].content, source.materialization.files[0].content);
});
