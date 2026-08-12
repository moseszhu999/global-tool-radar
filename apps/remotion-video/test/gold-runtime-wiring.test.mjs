import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const qualityWorker = readFileSync(new URL('../../worker/src/run-video-quality-gate.mjs', import.meta.url), 'utf8');
const caseWorker = readFileSync(new URL('../../worker/src/build-video-production-case.mjs', import.meta.url), 'utf8');
const storyboardWorker = readFileSync(new URL('../../worker/src/build-storyboard-manifest.mjs', import.meta.url), 'utf8');
const renderPackageWorker = readFileSync(new URL('../../worker/src/build-render-preview-package.mjs', import.meta.url), 'utf8');
const renderPreviewWorkflow = readFileSync(new URL('../../../.github/workflows/render-preview.yml', import.meta.url), 'utf8');

test('quality worker exposes the optional creative-quality evidence input', () => {
  assert.match(qualityWorker, /--creative-quality/);
  assert.match(qualityWorker, /creativeQualityPath/);
  assert.match(qualityWorker, /creativeQualityEvidence/);
});

test('quality worker passes creative-quality evidence into the canonical quality report builder', () => {
  assert.match(
    qualityWorker,
    /buildVideoQualityReport\(\{[\s\S]*creativeQualityEvidence,[\s\S]*generatedAt[\s\S]*\}\)/,
  );
});

test('quality worker continues to support the legacy path when no creative-quality file is supplied', () => {
  assert.match(qualityWorker, /creativeQualityArg \? resolve\(creativeQualityArg\) : null/);
  assert.match(qualityWorker, /creativeQualityPath \? readFile\(creativeQualityPath,[\s\S]*: Promise\.resolve\(null\)/);
});

test('quality worker exposes the selected quality profile in its operator receipt', () => {
  assert.match(qualityWorker, /qualityProfile: report\.qualityProfile/);
});

test('new production-case worker applies Gold defaults after building the canonical case', () => {
  assert.match(caseWorker, /applyGoldDefaultsToProductionCase\(buildVideoProductionCase\(/);
  assert.match(caseWorker, /validateGoldTarget\(productionCase\)/);
  assert.match(caseWorker, /goldBaselineTarget: productionCase\.gates\.goldBaselineTarget/);
});

test('new storyboard worker applies Gold defaults after building the canonical storyboard', () => {
  assert.match(storyboardWorker, /applyGoldDefaultsToStoryboardPackage\(buildStoryboardManifest\(/);
  assert.match(storyboardWorker, /validateGoldTarget\(value\)/);
  assert.match(storyboardWorker, /goldBaselineTarget: value\.gates\.goldBaselineTarget/);
});

test('render-package worker defaults to Gold target and emits pending creative evidence', () => {
  assert.match(renderPackageWorker, /applyGoldDefaultsToRenderPreviewPackage\(buildRenderPreviewPackage\(/);
  assert.match(renderPackageWorker, /buildPendingCreativeQualityEvidence\(renderPackage\)/);
  assert.match(renderPackageWorker, /gold-creative-quality-pending\.json/);
  assert.match(renderPackageWorker, /goldBaselineRequired: renderPackage\.gates\.goldBaselineRequired/);
});

test('preview Gold target remains non-enforcing until creative evidence is supplied', () => {
  assert.match(renderPackageWorker, /qualityStage: renderPackage\.qualityStage/);
  assert.match(renderPackageWorker, /goldBaselineTarget: renderPackage\.gates\.goldBaselineTarget/);
  assert.match(renderPackageWorker, /goldBaselineRequired: renderPackage\.gates\.goldBaselineRequired/);
});

test('render-preview workflow is triggered by Gold profile changes', () => {
  assert.match(renderPreviewWorkflow, /packages\/video-gold-profile\/\*\*/);
});

test('Gold target preview workflow requires the creative-review blocker instead of deleting it for CI', () => {
  assert.match(renderPreviewWorkflow, /qualityProfile === "video\.production\.gold-baseline\.v1"/);
  assert.match(renderPreviewWorkflow, /qualityStage === "TARGET_PENDING"/);
  assert.match(renderPreviewWorkflow, /GOLD_CREATIVE_REVIEW_REQUIRED/);
  assert.match(renderPreviewWorkflow, /Gold target preview must remain blocked for creative review/);
});

test('render-preview workflow still requires the legacy safety blockers and rejects unknown blockers', () => {
  assert.match(renderPreviewWorkflow, /OWNED_SCREEN_RECORDINGS_REQUIRED/);
  assert.match(renderPreviewWorkflow, /FINAL_VOICE_APPROVAL_REQUIRED/);
  assert.match(renderPreviewWorkflow, /HUMAN_QUALITY_REVIEW_REQUIRED/);
  assert.match(renderPreviewWorkflow, /unexpected release blockers/);
});
