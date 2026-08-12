import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const premium = JSON.parse(readFileSync(new URL('../props/premium-baseline.v1.json', import.meta.url), 'utf8'));
const audit = JSON.parse(readFileSync(new URL('../props/premium-benchmark-audit.v1.json', import.meta.url), 'utf8'));
const premiumWorker = readFileSync(new URL('../../worker/src/apply-premium-video-profile.mjs', import.meta.url), 'utf8');
const qualityWorker = readFileSync(new URL('../../worker/src/run-video-quality-gate.mjs', import.meta.url), 'utf8');
const premiumWorkflow = readFileSync(new URL('../../../.github/workflows/premium-quality-contract.yml', import.meta.url), 'utf8');

test('Premium explicitly extends Gold rather than replacing the quality floor', () => {
  assert.equal(premium.schemaVersion, 'video.production.premium.v1');
  assert.equal(premium.extends, 'video.production.gold-baseline.v1');
  assert.equal(premium.targetBand, '95-105');
  assert.equal(premium.release.goldEvidenceRequired, true);
  assert.equal(premium.release.premiumEvidenceRequired, true);
  assert.equal(premium.release.publicationAllowed, false);
});

test('Premium raises continuity, material, performance, sound and benchmark requirements', () => {
  assert.ok(premium.continuity.physicalOrSemanticTransitionCoverageMinimum >= 0.6);
  assert.ok(premium.motion.advancedMotionScoreMinimum >= 92);
  assert.ok(premium.materials.materialRealismMinimum >= 92);
  assert.ok(premium.materials.lightingContinuityMinimum >= 92);
  assert.ok(premium.brandWorld.brandWorldScoreMinimum >= 90);
  assert.ok(premium.voice.performanceScoreMinimum >= 92);
  assert.ok(premium.voice.prosodyIntentCoverageMinimum >= 0.9);
  assert.ok(premium.sound.soundNarrativeScoreMinimum >= 92);
  assert.ok(premium.benchmark.minimumReferenceCount >= 2);
  assert.ok(premium.benchmark.overallHumanReviewMinimum >= 95);
});

test('Premium continues to ban camera-only and unmotivated oscillation grammar', () => {
  assert.equal(premium.camera.unmotivatedAmbientDriftAllowed, false);
  assert.equal(premium.camera.continuousSinCosWobbleAllowed, false);
  assert.equal(premium.motion.cameraOnlyAllowed, false);
  assert.equal(premium.motion.causalMotionRequired, true);
  assert.equal(premium.continuity.crossfadeOnlyAsPrimaryGrammarAllowed, false);
});

test('internal benchmark audit does not treat legacy benchmark filenames as Premium proof', () => {
  const benchmark = audit.sources.find((item) => item.path.includes('14to5-benchmark'));
  const animatic = audit.sources.find((item) => item.path.includes('19s-animatic'));
  const polish = audit.sources.find((item) => item.path.includes('production-polish-alpha'));
  assert.equal(benchmark.status, 'LEGACY_REFERENCE_ONLY');
  assert.equal(animatic.status, 'LEGACY_REFERENCE_ONLY');
  assert.equal(polish.status, 'PATTERN_SOURCE_ONLY');
  assert.ok(benchmark.banFromPremium.some((item) => /Math\.sin|Math\.cos/.test(item)));
  assert.ok(animatic.banFromPremium.some((item) => /Math\.sin/.test(item)));
  assert.equal(audit.premiumReferencePolicy.legacyReferenceMayBeCopiedDirectly, false);
  assert.equal(audit.premiumReferencePolicy.goldNonRegressionMustPass, true);
});

test('Premium adapter is explicit and emits pending evidence instead of auto-promoting Gold', () => {
  assert.match(premiumWorker, /applyPremiumTarget/);
  assert.match(premiumWorker, /buildPendingPremiumEvidence/);
  assert.match(premiumWorker, /premium-quality-pending\.json/);
  assert.match(premiumWorker, /premiumBaselineRequired: premiumPackage\.gates\.premiumBaselineRequired/);
});

test('canonical quality worker supports independent Gold and Premium evidence inputs', () => {
  assert.match(qualityWorker, /--creative-quality/);
  assert.match(qualityWorker, /--premium-quality/);
  assert.match(qualityWorker, /creativeQualityEvidence/);
  assert.match(qualityWorker, /premiumQualityEvidence/);
  assert.match(qualityWorker, /inheritedQualityProfile: report\.inheritedQualityProfile/);
  assert.match(qualityWorker, /qualityStage: report\.qualityStage/);
});

test('Premium contract workflow executes the real Gold-to-Premium CLI path', () => {
  assert.match(premiumWorkflow, /npm run production:render-package:replit/);
  assert.match(premiumWorkflow, /npm run production:premium-package:replit/);
  assert.match(premiumWorkflow, /video\.production\.premium\.v1/);
  assert.match(premiumWorkflow, /video\.production\.gold-baseline\.v1/);
  assert.match(premiumWorkflow, /PREMIUM_TARGET/);
});

test('Premium contract workflow forbids fabricated review values and publication authority', () => {
  assert.match(premiumWorkflow, /Premium human scores must not be fabricated/);
  assert.match(premiumWorkflow, /PENDING_HUMAN_REVIEW/);
  assert.match(premiumWorkflow, /Premium adapter cannot authorize publication/);
  assert.match(premiumWorkflow, /premiumBaselineRequired !== false/);
});

test('Premium contract artifact carries both inherited Gold and Premium pending evidence', () => {
  assert.match(premiumWorkflow, /build\/gold-creative-quality-pending\.json/);
  assert.match(premiumWorkflow, /build\/premium-quality-pending\.json/);
  assert.match(premiumWorkflow, /build\/replit-design-premium-render-package\.json/);
});
