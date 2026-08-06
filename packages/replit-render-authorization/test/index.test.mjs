import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {intakeOwnedMediaIntoVideoProject} from '../../replit-owned-media-intake/src/index.mjs';
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

const authorize = async (fixture, overrides = {}) => authorizeReplitRender({
  project: fixture.project,
  preflightReceiptPath: fixture.preflightReceiptPath,
  actor: 'render-operator',
  occurredAt: '2026-08-06T13:10:00.000Z',
  ...overrides,
});

test('rechecks media and advances an assets-verified project to RENDER_AUTHORIZED', async () => {
  const fixture = await prepareAssetsVerified();
  const receipt = await authorize(fixture);
  assert.equal(validateRenderAuthorizationReceipt(receipt), true);
  assert.equal(receipt.status, 'RENDER_AUTHORIZED');
  assert.equal(receipt.finalRenderGate.truthBoundary, 'render_execution_authorized');
  assert.equal(receipt.renderIntent.truthBoundary, 'verified_gate_bound_to_render_intent');
  assert.equal(receipt.updatedProject.stage, 'RENDER_AUTHORIZED');
  assert.equal(receipt.updatedProject.status, 'ACTIVE');
  assert.equal(receipt.updatedProject.nextEvent, 'COMPLETE_RENDER');
  assert.equal(receipt.updatedProject.events.length, 8);
  assert.equal(receipt.updatedProject.artifacts.length, 5);
  assert.equal(receipt.renderExecutionAllowed, true);
  assert.equal(receipt.runnerSubmissionReady, false);
  assert.equal(receipt.nextAction, 'MATERIALIZE_RUNNER_REQUEST_WITH_DEPLOYED_ADAPTER');
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
      occurredAt: '2026-08-06T13:10:00.000Z',
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
