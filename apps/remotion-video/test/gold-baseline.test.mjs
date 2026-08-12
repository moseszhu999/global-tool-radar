import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const baseline = JSON.parse(readFileSync(new URL('../props/gold-baseline.v1.json', import.meta.url), 'utf8'));
const doc = readFileSync(new URL('../../../docs/video/video-operation-gold-baseline-v1.md', import.meta.url), 'utf8');

test('gold baseline identifies the canonical schema and 9:16 delivery', () => {
  assert.equal(baseline.schema, 'video.production.gold-baseline.v1');
  assert.equal(baseline.delivery.width, 1080);
  assert.equal(baseline.delivery.height, 1920);
  assert.equal(baseline.delivery.fps, 30);
  assert.equal(baseline.delivery.reviewHtmlRequired, true);
  assert.equal(baseline.delivery.contactSheetRequired, true);
});

test('camera stability is a hard non-regression rule', () => {
  assert.equal(baseline.camera.shake, 0);
  assert.equal(baseline.camera.allowSinCosMicroWobble, false);
  assert.equal(baseline.camera.allowRandomDrift, false);
  assert.equal(baseline.camera.allowDirectionReversalForSimpleMoves, false);
  assert.equal(baseline.camera.monotonicMoveRequiredByDefault, true);
  assert.match(doc, /camera shake = 0/i);
  assert.match(doc, /sin\/cos/i);
});

test('cinematic infographic must live in world space rather than PPT panels', () => {
  assert.equal(baseline.cinematicInfographic.requiredMode, 'world-space');
  assert.equal(baseline.cinematicInfographic.objectOrPathBindingRequired, true);
  assert.ok(baseline.cinematicInfographic.forbiddenDefaultTreatments.includes('full-screen-card'));
  assert.ok(baseline.cinematicInfographic.forbiddenDefaultTreatments.includes('dashboard-panel'));
  assert.ok(baseline.cinematicInfographic.forbiddenDefaultTreatments.includes('generic-horizontal-meter'));
  assert.match(doc, /Cinematic Infographic/);
  assert.match(doc, /If the paused frame reads as a complete slide/i);
});

test('mobile typography preserves the readability floor', () => {
  assert.ok(baseline.typography.subtitleMinimumPxAt1080x1920 >= 52);
  assert.ok(baseline.typography.subtitleTargetPxAt1080x1920 >= 56);
  assert.ok(baseline.typography.worldSpaceLabelMinimumEquivalentPx >= 48);
  assert.equal(baseline.typography.finalExportReadabilityReviewRequired, true);
});

test('final motion requires physical events beyond camera movement', () => {
  assert.equal(baseline.motion.cameraOnlyMotionAllowedAsFinalLanguage, false);
  assert.ok(baseline.motion.realMotionEventMinimumForThirtySecondShort >= 6);
  assert.equal(baseline.motion.physicalContinuityPreferred, true);
});

test('voice and sound retain natural duration and synchronous events', () => {
  assert.equal(baseline.voice.naturalDurationRequired, true);
  assert.equal(baseline.voice.timeStretchAllowed, false);
  assert.ok(baseline.voice.humanNaturalnessMinimum >= 85);
  assert.ok(baseline.sound.frameSynchronousEventMinimumForThirtySecondShort >= 6);
  assert.equal(baseline.sound.duckingUnderVoiceRequiredWhenBedPresent, true);
});

test('quality gates cannot be silently weakened below the gold floor', () => {
  const gates = baseline.qualityGates;
  assert.ok(gates.Voice_Naturalness >= 85);
  assert.ok(gates.Visual_Quality >= 85);
  assert.ok(gates.Visual_Consistency >= 88);
  assert.ok(gates.Material_Realism >= 85);
  assert.ok(gates.Motion_Quality >= 85);
  assert.ok(gates.Camera_Stability >= 95);
  assert.ok(gates.Sound_Design >= 85);
  assert.ok(gates.Caption_Readability >= 90);
  assert.equal(gates.Full_Watch_Review, 'PASS');
  assert.equal(gates.Technical_QC, 'PASS');
});

test('final release always requires human full-watch approval and asset adoption', () => {
  assert.equal(baseline.release.automatedPromotionToFinalAllowed, false);
  assert.equal(baseline.release.humanFullWatchRequired, true);
  assert.equal(baseline.assets.allApprovedProductionAssetsMustAppearInFinal, true);
  assert.equal(baseline.assets.lowResolutionFullScreenUpscaleForbidden, true);
  assert.match(doc, /No automated gate may silently promote a video to FINAL/i);
});
