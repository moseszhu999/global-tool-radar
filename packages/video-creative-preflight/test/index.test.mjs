import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {intakeOwnedMediaIntoVideoProject} from '../../replit-owned-media-intake/src/index.mjs';
import {
  ART_GATE_CHECKS,
  ANIMATIC_GATE_CHECKS,
  assertCreativePreflightAllowsRenderAuthorization,
  createVideoCreativePreflight,
  validateVideoCreativePreflight,
} from '../src/index.mjs';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

const loadBlockedProject = async () => {
  const ledger = JSON.parse(await readFile(new URL('../../../apps/web/data/replit-design-video-project-ledger.json', import.meta.url), 'utf8'));
  return ledger.project;
};

const prepareAssetsVerified = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-creative-preflight-'));
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
  return intake.updatedProject;
};

const passChecks = (names) => Object.fromEntries(names.map((name) => [name, true]));
const passingArtGate = () => ({
  evidenceType: 'toolradar.styleframe-art-gate.v1',
  evidenceDigest: SHA_A,
  checks: passChecks(ART_GATE_CHECKS),
});
const passingAnimaticGate = () => ({
  evidenceType: 'toolradar.animatic-gate.v1',
  evidenceDigest: SHA_B,
  checks: passChecks(ANIMATIC_GATE_CHECKS),
});

const createPassing = async (overrides = {}) => createVideoCreativePreflight({
  project: await prepareAssetsVerified(),
  artGate: passingArtGate(),
  animaticGate: passingAnimaticGate(),
  reviewer: 'creative-controller',
  reviewedAt: '2026-08-09T04:50:00.000Z',
  ...overrides,
});

test('passes only when both art and animatic evidence gates pass', async () => {
  const receipt = await createPassing();
  assert.equal(validateVideoCreativePreflight(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_PASSED');
  assert.equal(receipt.truthBoundary, 'creative_preflight_passed');
  assert.equal(receipt.artGate.passed, true);
  assert.equal(receipt.animaticGate.passed, true);
  assert.equal(receipt.renderAuthorizationInputAllowed, true);
  assert.equal(receipt.humanCreativeApprovalClaimed, false);
  assert.equal(receipt.publicationAllowed, false);
});

test('blocks when one static-art requirement fails', async () => {
  const artGate = passingArtGate();
  artGate.checks = {...artGate.checks, materialFinishSufficient: false};
  const receipt = await createPassing({artGate});
  assert.equal(validateVideoCreativePreflight(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.equal(receipt.renderAuthorizationInputAllowed, false);
  assert.deepEqual(receipt.errors, ['art_gate_not_passed']);
});

test('blocks when one animatic requirement fails', async () => {
  const animaticGate = passingAnimaticGate();
  animaticGate.checks = {...animaticGate.checks, payoffTimingReviewed: false};
  const receipt = await createPassing({animaticGate});
  assert.equal(validateVideoCreativePreflight(receipt), true);
  assert.equal(receipt.status, 'CREATIVE_PREFLIGHT_BLOCKED');
  assert.deepEqual(receipt.errors, ['animatic_gate_not_passed']);
});

test('requires the canonical ASSETS_VERIFIED lifecycle boundary', async () => {
  await assert.rejects(
    async () => createVideoCreativePreflight({
      project: await loadBlockedProject(),
      artGate: passingArtGate(),
      animaticGate: passingAnimaticGate(),
      reviewer: 'creative-controller',
    }),
    /requires ASSETS_VERIFIED/,
  );
});

test('binds preflight to the exact current project digest', async () => {
  const project = await prepareAssetsVerified();
  const receipt = createVideoCreativePreflight({
    project,
    artGate: passingArtGate(),
    animaticGate: passingAnimaticGate(),
    reviewer: 'creative-controller',
    reviewedAt: '2026-08-09T04:50:00.000Z',
  });
  assert.equal(assertCreativePreflightAllowsRenderAuthorization({project, receipt}), true);
  const other = {...project, projectId: 'video-project:other:v1'};
  assert.throws(() => assertCreativePreflightAllowsRenderAuthorization({project: other, receipt}), /project digest mismatch|projectId mismatch/);
});

test('rejects tampering and secret-shaped gate evidence', async () => {
  const receipt = await createPassing();
  assert.throws(() => validateVideoCreativePreflight({...receipt, publicationAllowed: true}), /digest mismatch/);
  await assert.rejects(
    async () => createVideoCreativePreflight({
      project: await prepareAssetsVerified(),
      artGate: {...passingArtGate(), apiToken: 'should-not-persist'},
      animaticGate: passingAnimaticGate(),
      reviewer: 'creative-controller',
    }),
    /must not contain secret fields/,
  );
});
