import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {intakeOwnedMediaIntoVideoProject} from '../../replit-owned-media-intake/src/index.mjs';
import {
  ART_GATE_CHECKS,
  ANIMATIC_GATE_CHECKS,
  createVideoCreativePreflight,
} from '../../video-creative-preflight/src/index.mjs';
import {
  authorizeReplitRender,
  validateRenderAuthorizationReceipt,
} from '../src/index.mjs';

const loadBlockedProject = async () => {
  const ledger = JSON.parse(await readFile(new URL('../../../apps/web/data/replit-design-video-project-ledger.json', import.meta.url), 'utf8'));
  return ledger.project;
};

const prepareAssetsVerified = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-render-authorization-'));
  const designRecording = join(dir, 'design.mp4');
  const buildLimitRecording = join(dir, 'build-limit.mp4');
  const voiceover = join(dir, 'voiceover.wav');
  await writeFile(designRecording, 'owned design recording bytes');
  await writeFile(buildLimitRecording, 'owned build limit recording bytes');
  await writeFile(voiceover, 'approved voiceover bytes');
  const intake = await intakeOwnedMediaIntoVideoProject({
    project: await loadBlockedProject(),
    actor: 'human-media-operator',
    occurredAt: '2026-08-06T13:00:00.000Z',
    media: {
      designRecording,
      buildLimitRecording,
      voiceover,
      designRecordingVerified: true,
      buildLimitRecordingVerified: true,
      voiceoverVerified: true,
    },
  });
  const preflightReceiptPath = join(dir, 'preflight.json');
  await writeFile(preflightReceiptPath, `${JSON.stringify(intake.preflight, null, 2)}\n`);
  return {dir, designRecording, preflightReceiptPath, project: intake.updatedProject};
};

const passChecks = (names) => Object.fromEntries(names.map((name) => [name, true]));
const createCreativePreflight = (project, {artPass = true, animaticPass = true} = {}) => {
  const artChecks = passChecks(ART_GATE_CHECKS);
  const animaticChecks = passChecks(ANIMATIC_GATE_CHECKS);
  if (!artPass) artChecks.materialFinishSufficient = false;
  if (!animaticPass) animaticChecks.payoffTimingReviewed = false;
  return createVideoCreativePreflight({
    project,
    artGate: {
      evidenceType: 'toolradar.styleframe-art-gate.v1',
      evidenceDigest: 'a'.repeat(64),
      checks: artChecks,
    },
    animaticGate: {
      evidenceType: 'toolradar.animatic-gate.v1',
      evidenceDigest: 'b'.repeat(64),
      checks: animaticChecks,
    },
    reviewer: 'creative-controller',
    reviewedAt: '2026-08-09T04:50:00.000Z',
  });
};

const authorize = async (fixture, overrides = {}) => authorizeReplitRender({
  project: fixture.project,
  creativePreflight: createCreativePreflight(fixture.project),
  preflightReceiptPath: fixture.preflightReceiptPath,
  actor: 'render-operator',
  occurredAt: '2026-08-09T04:55:00.000Z',
  ...overrides,
});

test('rechecks media and advances only after an exact passing creative preflight', async () => {
  const fixture = await prepareAssetsVerified();
  const receipt = await authorize(fixture);
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'RENDER_AUTHORIZED');
  assert.equal(receipt.creativePreflight.status, 'CREATIVE_PREFLIGHT_PASSED');
  assert.equal(receipt.creativePreflightDigest, receipt.creativePreflight.receiptDigest);
  assert.equal(receipt.finalRenderGate.truthBoundary, 'render_execution_authorized');
  assert.equal(receipt.renderIntent.truthBoundary, 'verified_gate_bound_to_render_intent');
  assert.equal(receipt.updatedProject.stage, 'RENDER_AUTHORIZED');
  assert.equal(receipt.updatedProject.status, 'ACTIVE');
  assert.equal(receipt.updatedProject.nextEvent, 'COMPLETE_RENDER');
  assert.equal(receipt.updatedProject.events.length, 8);
  assert.equal(receipt.updatedProject.artifacts.length, 5);
  assert.equal(receipt.updatedProject.artifacts.at(-1).claims.creativePreflightDigest, receipt.creativePreflightDigest);
  assert.equal(receipt.renderExecutionAllowed, true);
  assert.equal(receipt.runnerSubmissionReady, false);
  assert.equal(receipt.nextAction, 'MATERIALIZE_RUNNER_REQUEST_WITH_DEPLOYED_ADAPTER');
});

test('blocks before render-gate construction when creative preflight is missing', async () => {
  const fixture = await prepareAssetsVerified();
  const receipt = await authorizeReplitRender({
    project: fixture.project,
    preflightReceiptPath: '/path/that/must/not/be/read.json',
    actor: 'render-operator',
    occurredAt: '2026-08-09T04:55:00.000Z',
  });
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.equal(receipt.finalRenderGate, null);
  assert.equal(receipt.renderIntent, null);
  assert.equal(receipt.projectUnchanged, true);
  assert.equal(receipt.renderExecutionAllowed, false);
});

test('blocks when art gate fails even though animatic passes', async () => {
  const fixture = await prepareAssetsVerified();
  const receipt = await authorize(fixture, {creativePreflight: createCreativePreflight(fixture.project, {artPass: false})});
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.equal(receipt.nextAction, 'REPAIR_ART_OR_ANIMATIC_GATE');
  assert.equal(receipt.finalRenderGate, null);
});

test('blocks when animatic gate fails even though art passes', async () => {
  const fixture = await prepareAssetsVerified();
  const receipt = await authorize(fixture, {creativePreflight: createCreativePreflight(fixture.project, {animaticPass: false})});
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.equal(receipt.finalRenderGate, null);
});

test('blocks an otherwise passing creative preflight bound to another project digest', async () => {
  const fixture = await prepareAssetsVerified();
  const creativePreflight = createCreativePreflight(fixture.project);
  const mismatched = {
    ...creativePreflight,
    sourceProjectDigest: 'c'.repeat(64),
  };
  const receipt = await authorize(fixture, {creativePreflight: mismatched});
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.equal(receipt.renderExecutionAllowed, false);
});

test('blocks authorization when media changes after preflight', async () => {
  const fixture = await prepareAssetsVerified();
  await writeFile(fixture.designRecording, 'mutated after preflight');
  const receipt = await authorize(fixture);
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'RENDER_GATE_BLOCKED');
  assert.equal(receipt.projectUnchanged, true);
  assert.equal(receipt.updatedProject, null);
  assert.ok(receipt.errors.some((error) => error.includes('digest_changed_after_preflight')));
  assert.equal(receipt.renderExecutionAllowed, false);
});

test('rejects authorization before the project reaches ASSETS_VERIFIED', async () => {
  await assert.rejects(
    authorizeReplitRender({
      project: await loadBlockedProject(),
      preflightReceiptPath: '/tmp/not-used.json',
      actor: 'render-operator',
      occurredAt: '2026-08-09T04:55:00.000Z',
    }),
    /requires ASSETS_VERIFIED/,
  );
});

test('binds output path and render profile into distinct gate and project digests', async () => {
  const fixture = await prepareAssetsVerified();
  const first = await authorize(fixture, {outputPath: 'out/replit-a.mp4'});
  const second = await authorize(fixture, {outputPath: 'out/replit-b.mp4'});
  assert.notEqual(first.finalRenderGate.gateDigest, second.finalRenderGate.gateDigest);
  assert.notEqual(first.renderIntent.bindingDigest, second.renderIntent.bindingDigest);
  assert.notEqual(first.updatedProjectDigest, second.updatedProjectDigest);
});

test('does not materialize or claim a runner request without the deployed adapter', async () => {
  const receipt = await authorize(await prepareAssetsVerified());
  assert.equal(receipt.runnerSubmissionReady, false);
  assert.equal('runnerRequest' in receipt, false);
  assert.equal(receipt.renderIntent.schemaVersion, 'toolradar.mac-remotion-render-intent.v1');
});

test('rejects a tampered render authorization receipt', async () => {
  const receipt = await authorize(await prepareAssetsVerified());
  const tampered = {...receipt, runnerSubmissionReady: true};
  assert.throws(() => validateRenderAuthorizationReceipt(tampered), /digest mismatch/);
});
