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
import {authorizeReplitRender} from '../../replit-render-authorization/src/index.mjs';
import {materializeMacRemotionRunnerRequest} from '../../mac-remotion-render-job-binding/src/index.mjs';
import {runMacRemotionRender} from '../../mac-remotion-render-orchestration/src/index.mjs';
import {buildFinalRenderReceipt} from '../../remotion-final-render-receipt/src/index.mjs';
import {
  completeVideoProjectRender,
  validateRenderCompletionReceipt,
} from '../src/index.mjs';

const loadBlockedProject = async () => {
  const ledger = JSON.parse(await readFile(new URL('../../../apps/web/data/replit-design-video-project-ledger.json', import.meta.url), 'utf8'));
  return ledger.project;
};

const validProbe = async () => ({
  width: 1080,
  height: 1920,
  durationSeconds: 89,
  fps: 30,
  codec: 'h264',
  audioCodec: 'aac',
});

const runnerClient = (status = 'completed', outputPath = '/tmp/final.mp4') => ({
  checkHealth: async () => ({ok: true}),
  submitRenderJob: async () => ({jobId: `job-${status}-001`}),
  pollRenderJob: async () => ({status}),
  getRenderResult: async () => ({resultAvailable: status === 'completed', ...(status === 'completed' ? {outputPath} : {})}),
  getRenderJobLog: async () => ({message: `runner ended with ${status}`}),
  getDownloadUrl: (jobId) => `https://runner.example/v1/jobs/${jobId}/download`,
});

const buildRunReceipt = async (jobRequest, status = 'completed') => runMacRemotionRender({
  client: runnerClient(status, jobRequest?.outputPath),
  jobRequest,
  now: () => '2026-08-06T14:00:00.000Z',
});

const passChecks = (names) => Object.fromEntries(names.map((name) => [name, true]));
const creativePreflightFor = (project, label) => createVideoCreativePreflight({
  project,
  artGate: {
    evidenceType: 'toolradar.styleframe-art-gate.v1',
    evidenceDigest: label === 'a' ? 'a'.repeat(64) : 'c'.repeat(64),
    checks: passChecks(ART_GATE_CHECKS),
  },
  animaticGate: {
    evidenceType: 'toolradar.animatic-gate.v1',
    evidenceDigest: label === 'a' ? 'b'.repeat(64) : 'd'.repeat(64),
    checks: passChecks(ANIMATIC_GATE_CHECKS),
  },
  reviewer: 'creative-controller',
  reviewedAt: '2026-08-09T04:50:00.000Z',
});

const prepareFixture = async (label = 'a') => {
  const dir = await mkdtemp(join(tmpdir(), `toolradar-render-completion-${label}-`));
  const designRecording = join(dir, 'design.mp4');
  const buildLimitRecording = join(dir, 'build-limit.mp4');
  const voiceover = join(dir, 'voiceover.wav');
  await writeFile(designRecording, `owned design recording ${label}`);
  await writeFile(buildLimitRecording, `owned build limit recording ${label}`);
  await writeFile(voiceover, `approved voiceover ${label}`);

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
  const preflightPath = join(dir, 'preflight.json');
  await writeFile(preflightPath, `${JSON.stringify(intake.preflight, null, 2)}\n`);
  const videoPath = join(dir, `final-${label}.mp4`);
  const authorization = await authorizeReplitRender({
    project: intake.updatedProject,
    creativePreflight: creativePreflightFor(intake.updatedProject, label),
    preflightReceiptPath: preflightPath,
    actor: 'render-operator',
    occurredAt: '2026-08-09T04:55:00.000Z',
    outputPath: videoPath,
  });
  assert.equal(authorization.status, 'RENDER_AUTHORIZED');
  const gatePath = join(dir, 'gate.json');
  await writeFile(gatePath, `${JSON.stringify(authorization.finalRenderGate, null, 2)}\n`);

  const runnerRequestEnvelope = materializeMacRemotionRunnerRequest({
    binding: authorization.renderIntent,
    mapRequest: (intent) => ({
      compositionId: intent.compositionId,
      outputPath: intent.outputPath,
      renderProfile: intent.renderProfile,
      evidence: intent.evidence,
    }),
  });
  const runnerRunReceipt = await buildRunReceipt(runnerRequestEnvelope.requestBody);
  await writeFile(videoPath, `verified final video ${label}`);
  const finalVideoReceipt = await buildFinalRenderReceipt({
    gateReceiptPath: gatePath,
    videoPath,
    probeVideo: validProbe,
  });

  return {
    project: authorization.updatedProject,
    runnerRequestEnvelope,
    runnerRunReceipt,
    finalVideoReceipt,
  };
};

const complete = (fixture, overrides = {}) => completeVideoProjectRender({
  project: fixture.project,
  runnerRequestEnvelope: fixture.runnerRequestEnvelope,
  runnerRunReceipt: fixture.runnerRunReceipt,
  finalVideoReceipt: fixture.finalVideoReceipt,
  actor: 'completion-operator',
  occurredAt: '2026-08-06T14:10:00.000Z',
  ...overrides,
});

test('advances only a request-bound runner completion with a verified final MP4', async () => {
  const receipt = complete(await prepareFixture());
  assert.equal(validateRenderCompletionReceipt(receipt), true);
  assert.equal(receipt.status, 'RENDER_COMPLETED');
  assert.equal(receipt.updatedProject.stage, 'RENDER_COMPLETED');
  assert.equal(receipt.updatedProject.status, 'ACTIVE');
  assert.equal(receipt.updatedProject.nextEvent, 'APPROVE_QUALITY');
  assert.equal(receipt.updatedProject.events.length, 9);
  assert.equal(receipt.updatedProject.artifacts.length, 6);
  assert.equal(receipt.renderCompleted, true);
  assert.equal(receipt.m10ReviewPreparationAllowed, true);
  assert.equal(receipt.qualityApproved, false);
  assert.equal(receipt.publicationAllowed, false);
});

test('blocks a valid runner request from a different authorized gate', async () => {
  const first = await prepareFixture('first');
  const second = await prepareFixture('second');
  const receipt = complete(first, {
    runnerRequestEnvelope: second.runnerRequestEnvelope,
    runnerRunReceipt: second.runnerRunReceipt,
  });
  assert.equal(validateRenderCompletionReceipt(receipt), true);
  assert.equal(receipt.status, 'RENDER_COMPLETION_BLOCKED');
  assert.ok(receipt.errors.includes('runner_request_binding_does_not_match_project_gate'));
  assert.equal(receipt.projectUnchanged, true);
});

test('blocks a runner receipt that does not belong to the request envelope', async () => {
  const fixture = await prepareFixture();
  const otherRun = await buildRunReceipt({differentRequest: true});
  const receipt = complete(fixture, {runnerRunReceipt: otherRun});
  assert.equal(receipt.status, 'RENDER_COMPLETION_BLOCKED');
  assert.ok(receipt.errors.includes('runner_run_request_digest_mismatch'));
});

test('blocks a final MP4 receipt bound to another project gate', async () => {
  const first = await prepareFixture('first-video');
  const second = await prepareFixture('second-video');
  const receipt = complete(first, {finalVideoReceipt: second.finalVideoReceipt});
  assert.equal(receipt.status, 'RENDER_COMPLETION_BLOCKED');
  assert.ok(receipt.errors.includes('final_video_gate_does_not_match_project'));
  assert.ok(receipt.errors.includes('final_video_path_does_not_match_project_gate'));
});

test('blocks a real runner failure even when a valid final file receipt is supplied', async () => {
  const fixture = await prepareFixture();
  const failedRun = await buildRunReceipt(fixture.runnerRequestEnvelope.requestBody, 'failed');
  const receipt = complete(fixture, {runnerRunReceipt: failedRun});
  assert.equal(receipt.status, 'RENDER_COMPLETION_BLOCKED');
  assert.ok(receipt.errors.includes('runner_run_not_completed'));
  assert.equal(receipt.m10ReviewPreparationAllowed, false);
});

test('rejects a tampered render completion receipt', async () => {
  const receipt = complete(await prepareFixture());
  const tampered = {...receipt, qualityApproved: true};
  assert.throws(() => validateRenderCompletionReceipt(tampered), /digest mismatch/);
});
