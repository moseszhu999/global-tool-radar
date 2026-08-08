import assert from 'node:assert/strict';
import test from 'node:test';

import {createMediaRenderRequestV1} from '../../shared-media-render-contract/src/index.mjs';
import {
  SHARED_MEDIA_CANONICAL_RENDER_PLAN_V1,
  compileCanonicalRenderPlanV1,
  validateCanonicalRenderPlanV1,
} from '../src/index.mjs';

const sha = (c) => c.repeat(64);

const courseRequest = (overrides = {}) => createMediaRenderRequestV1({
  requestId: 'render-course-explainer-001',
  purpose: 'course.explainer',
  title: 'Controller and RequestMapping',
  language: 'zh-CN',
  shots: [
    {
      shotId: 'shot-001',
      order: 1,
      durationMs: 12000,
      narration: {mode: 'text', text: '这一节先看两个学习目标。'},
      visualAssetIds: ['asset-slide-objective'],
    },
    {
      shotId: 'shot-002',
      order: 2,
      durationMs: 25000,
      narration: {mode: 'text', text: '接下来用一个最小 Controller 演示请求映射。'},
      visualAssetIds: ['asset-code-demo-frame'],
    },
  ],
  visualAssets: [
    {assetId: 'asset-slide-objective', kind: 'slide', locator: 'media://training-inputs/slide-objective.png', mediaType: 'image/png', sha256: sha('a')},
    {assetId: 'asset-code-demo-frame', kind: 'code', locator: 'media://training-inputs/code-demo-frame.png', mediaType: 'image/png', sha256: sha('b')},
  ],
  voice: {mode: 'synthesize', provider: 'shared-tts', voiceId: 'zh-voice-neutral-01', locale: 'zh-CN', rate: 1},
  captions: {mode: 'auto', format: 'burn-in', language: 'zh-CN'},
  outputProfile: {profileId: 'course-1080p-landscape-v1', width: 1920, height: 1080, fps: 30, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac'},
  ...overrides,
});

const clone = (value) => structuredClone(value);

test('course-explainer-shaped canonical request compiles without losing media semantics', () => {
  const request = courseRequest();
  const plan = compileCanonicalRenderPlanV1(request);
  assert.equal(plan.schemaVersion, SHARED_MEDIA_CANONICAL_RENDER_PLAN_V1);
  assert.equal(plan.contractVersion, 'media.render.v1');
  assert.equal(plan.requestId, request.requestId);
  assert.equal(plan.inputManifestDigest, request.inputManifestDigest);
  assert.deepEqual(plan.visualAssets, request.visualAssets);
  assert.deepEqual(plan.voice, request.voice);
  assert.deepEqual(plan.captions, request.captions);
  assert.deepEqual(plan.outputProfile, request.outputProfile);
  assert.deepEqual(plan.evidenceRequirements, request.evidenceRequirements);
  assert.match(plan.renderPlanDigest, /^[a-f0-9]{64}$/);
});

test('timeline is contiguous and preserves exact shot narration and asset references', () => {
  const plan = compileCanonicalRenderPlanV1(courseRequest());
  assert.equal(plan.timeline.totalDurationMs, 37000);
  assert.deepEqual(plan.timeline.shots.map(({startMs,durationMs,endMs}) => ({startMs,durationMs,endMs})), [
    {startMs: 0, durationMs: 12000, endMs: 12000},
    {startMs: 12000, durationMs: 25000, endMs: 37000},
  ]);
  assert.equal(plan.timeline.shots[0].narration.text, '这一节先看两个学习目标。');
  assert.deepEqual(plan.timeline.shots[1].visualAssetIds, ['asset-code-demo-frame']);
});

test('execution requirements are derived without performing provider work', () => {
  const plan = compileCanonicalRenderPlanV1(courseRequest());
  assert.deepEqual(plan.requirements, {
    visualAssetResolutionRequired: true,
    voiceSynthesisRequired: true,
    providedVoiceAssetRequired: false,
    captionGenerationRequired: true,
    providedCaptionAssetRequired: false,
    timelineMaterializationRequired: true,
    canonicalEvidenceCollectionRequired: true,
  });
  assert.equal(plan.providerExecutionPerformed, false);
});

test('semantically equal requests with different object key insertion order produce same plan digest', () => {
  const first = courseRequest();
  const second = courseRequest({
    outputProfile: {audioCodec: 'aac', videoCodec: 'h264', container: 'mp4', fps: 30, height: 1080, width: 1920, profileId: 'course-1080p-landscape-v1'},
  });
  assert.equal(first.inputManifestDigest, second.inputManifestDigest);
  assert.equal(compileCanonicalRenderPlanV1(first).renderPlanDigest, compileCanonicalRenderPlanV1(second).renderPlanDigest);
});

test('unknown request semantics fail closed instead of being silently dropped', () => {
  const request = clone(courseRequest());
  request.renderIntent = 'future-semantics';
  assert.throws(() => compileCanonicalRenderPlanV1(request), /renderIntent is not supported/);
});

test('unknown shot semantics fail closed', () => {
  const request = clone(courseRequest());
  request.shots[0].transition = 'fade';
  assert.throws(() => compileCanonicalRenderPlanV1(request), /transition is not supported/);
});

test('unknown voice semantics fail closed even if the base media validator accepts extra fields', () => {
  const request = clone(courseRequest());
  request.voice.style = 'future-style';
  assert.throws(() => compileCanonicalRenderPlanV1(request), /voice\.style is not supported/);
});

test('unknown caption semantics fail closed', () => {
  const request = clone(courseRequest());
  request.captions.position = 'bottom';
  assert.throws(() => compileCanonicalRenderPlanV1(request), /captions\.position is not supported/);
});

test('unknown output-profile semantics fail closed', () => {
  const request = clone(courseRequest());
  request.outputProfile.colorSpace = 'bt709';
  assert.throws(() => compileCanonicalRenderPlanV1(request), /outputProfile\.colorSpace is not supported/);
});

test('duration is required for executable timeline planning', () => {
  const request = clone(courseRequest());
  delete request.shots[0].durationMs;
  request.inputManifestDigest = createMediaRenderRequestV1({
    ...request,
    contractVersion: undefined,
    messageType: undefined,
    evidenceRequirements: undefined,
    inputManifestDigest: undefined,
  }).inputManifestDigest;
  assert.throws(() => compileCanonicalRenderPlanV1(request), /durationMs must be a positive integer/);
});

test('provided voice asset is preserved and classified separately from synthesis', () => {
  const request = courseRequest({
    voice: {mode: 'provided', audioAsset: {assetId: 'voice-audio-1', locator: 'media://voice/audio.wav', mediaType: 'audio/wav', sha256: sha('c')}},
  });
  const plan = compileCanonicalRenderPlanV1(request);
  assert.equal(plan.requirements.voiceSynthesisRequired, false);
  assert.equal(plan.requirements.providedVoiceAssetRequired, true);
  assert.deepEqual(plan.voice, request.voice);
});

test('provided captions are preserved and classified separately from auto generation', () => {
  const request = courseRequest({
    captions: {mode: 'provided', format: 'srt', language: 'zh-CN', captionAsset: {assetId: 'caption-1', locator: 'media://captions/course.srt', mediaType: 'application/x-subrip', sha256: sha('d')}},
  });
  const plan = compileCanonicalRenderPlanV1(request);
  assert.equal(plan.requirements.captionGenerationRequired, false);
  assert.equal(plan.requirements.providedCaptionAssetRequired, true);
  assert.deepEqual(plan.captions, request.captions);
});

test('none voice and captions require no generation but still require timeline and evidence closure', () => {
  const request = courseRequest({voice: {mode: 'none'}, captions: {mode: 'none', format: 'none'}});
  const plan = compileCanonicalRenderPlanV1(request);
  assert.equal(plan.requirements.voiceSynthesisRequired, false);
  assert.equal(plan.requirements.providedVoiceAssetRequired, false);
  assert.equal(plan.requirements.captionGenerationRequired, false);
  assert.equal(plan.requirements.providedCaptionAssetRequired, false);
  assert.equal(plan.requirements.timelineMaterializationRequired, true);
  assert.equal(plan.requirements.canonicalEvidenceCollectionRequired, true);
});

test('plan validation rejects timeline tampering', () => {
  const plan = clone(compileCanonicalRenderPlanV1(courseRequest()));
  plan.timeline.shots[1].startMs = 11000;
  assert.throws(() => validateCanonicalRenderPlanV1(plan), /contiguous from zero/);
});

test('plan validation rejects semantic digest tampering', () => {
  const plan = clone(compileCanonicalRenderPlanV1(courseRequest()));
  plan.voice.voiceId = 'different-voice';
  assert.throws(() => validateCanonicalRenderPlanV1(plan), /renderPlanDigest does not match/);
});

test('compiled plan cannot claim transport selection, binding, authorization or provider execution', () => {
  for (const field of ['transportSelected','bindingCreated','renderAuthorized','providerExecutionPerformed','consumerDomainDecisionInferred','businessOutcomeInferred']) {
    const plan = clone(compileCanonicalRenderPlanV1(courseRequest()));
    plan[field] = true;
    assert.throws(() => validateCanonicalRenderPlanV1(plan), /must remain false/);
  }
});

test('exact request-to-plan verification rejects a plan from another canonical request', () => {
  const first = compileCanonicalRenderPlanV1(courseRequest());
  const secondRequest = courseRequest({title: 'Different course explainer'});
  assert.throws(() => validateCanonicalRenderPlanV1(first, {request: secondRequest}), /does not match the exact canonical request/);
});

test('compiled plan is deeply frozen', () => {
  const plan = compileCanonicalRenderPlanV1(courseRequest());
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.timeline), true);
  assert.equal(Object.isFrozen(plan.timeline.shots), true);
  assert.equal(Object.isFrozen(plan.voice), true);
  assert.throws(() => { plan.timeline.shots[0].startMs = 99; }, TypeError);
});

test('compiled plan remains product-neutral and contains no TrainingOS or ToolRadar business truth', () => {
  const serialized = JSON.stringify(compileCanonicalRenderPlanV1(courseRequest()));
  for (const forbidden of ['TrainingOS','ToolRadar','unitId','lessonId','studentId','teacherId','publicationAllowed','analyticsObserved','humanApproved']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
