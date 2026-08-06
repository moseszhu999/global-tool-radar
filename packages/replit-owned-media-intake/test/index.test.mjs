import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  intakeOwnedMediaIntoVideoProject,
  validateOwnedMediaIntakeReceipt,
} from '../src/index.mjs';

const loadProject = async () => {
  const ledger = JSON.parse(await readFile(new URL('../../../apps/web/data/replit-design-video-project-ledger.json', import.meta.url), 'utf8'));
  return ledger.project;
};

const mediaFixture = async ({voiceoverVerified = true, missingVoiceover = false} = {}) => {
  const dir = await mkdtemp(join(tmpdir(), 'toolradar-owned-media-intake-'));
  const designRecording = join(dir, 'design.mp4');
  const buildLimitRecording = join(dir, 'build-limit.mp4');
  const voiceover = join(dir, 'voiceover.wav');
  await writeFile(designRecording, 'owned design recording bytes');
  await writeFile(buildLimitRecording, 'owned build limit recording bytes');
  if (!missingVoiceover) await writeFile(voiceover, 'approved voiceover bytes');
  return {
    designRecording,
    buildLimitRecording,
    voiceover,
    designRecordingVerified: true,
    buildLimitRecordingVerified: true,
    voiceoverVerified,
  };
};

const fixedTime = '2026-08-06T13:00:00.000Z';

test('resumes the canonical project and advances it to ASSETS_VERIFIED after real preflight success', async () => {
  const project = await loadProject();
  const before = JSON.stringify(project);
  const receipt = await intakeOwnedMediaIntoVideoProject({
    project,
    media: await mediaFixture(),
    actor: 'human-media-operator',
    occurredAt: fixedTime,
  });

  assert.equal(validateOwnedMediaIntakeReceipt(receipt), true);
  assert.equal(receipt.status, 'ASSETS_VERIFIED');
  assert.equal(receipt.preflight.truthBoundary, 'owned_media_verified');
  assert.equal(receipt.updatedProject.stage, 'ASSETS_VERIFIED');
  assert.equal(receipt.updatedProject.status, 'ACTIVE');
  assert.equal(receipt.updatedProject.nextEvent, 'AUTHORIZE_RENDER');
  assert.equal(receipt.updatedProject.events.length, 7);
  assert.equal(receipt.updatedProject.artifacts.length, 4);
  assert.deepEqual(receipt.appliedEvents.map((id) => id.split(':')[0]), ['replit-owned-media-resume', 'replit-owned-media-verify']);
  assert.equal(receipt.renderExecutionAllowed, false);
  assert.equal(JSON.stringify(project), before, 'source project must remain immutable');
});

test('keeps the project unchanged when a required file is missing', async () => {
  const project = await loadProject();
  const receipt = await intakeOwnedMediaIntoVideoProject({
    project,
    media: await mediaFixture({missingVoiceover: true}),
    actor: 'human-media-operator',
    occurredAt: fixedTime,
  });

  assert.equal(validateOwnedMediaIntakeReceipt(receipt), true);
  assert.equal(receipt.status, 'MEDIA_PREFLIGHT_BLOCKED');
  assert.equal(receipt.projectUnchanged, true);
  assert.equal(receipt.updatedProject, null);
  assert.equal(receipt.summary.stage, 'STORYBOARD_READY');
  assert.equal(receipt.summary.status, 'BLOCKED');
  assert.ok(receipt.preflight.assets.find((asset) => asset.role === 'voiceover').errors.includes('file_missing'));
});

test('does not accept a file without explicit human verification', async () => {
  const project = await loadProject();
  const receipt = await intakeOwnedMediaIntoVideoProject({
    project,
    media: await mediaFixture({voiceoverVerified: false}),
    actor: 'human-media-operator',
    occurredAt: fixedTime,
  });

  assert.equal(receipt.status, 'MEDIA_PREFLIGHT_BLOCKED');
  assert.ok(receipt.preflight.assets.find((asset) => asset.role === 'voiceover').errors.includes('human_verification_missing'));
  assert.equal(receipt.renderExecutionAllowed, false);
});

test('produces deterministic receipts for identical project, files, actor, and time', async () => {
  const project = await loadProject();
  const media = await mediaFixture();
  const first = await intakeOwnedMediaIntoVideoProject({project, media, actor: 'operator-a', occurredAt: fixedTime});
  const second = await intakeOwnedMediaIntoVideoProject({project, media, actor: 'operator-a', occurredAt: fixedTime});
  assert.equal(first.receiptDigest, second.receiptDigest);
  assert.equal(first.updatedProjectDigest, second.updatedProjectDigest);
});

test('rejects intake after the project has already left STORYBOARD_READY', async () => {
  const project = await loadProject();
  const media = await mediaFixture();
  const verified = await intakeOwnedMediaIntoVideoProject({project, media, actor: 'operator-a', occurredAt: fixedTime});
  await assert.rejects(
    intakeOwnedMediaIntoVideoProject({project: verified.updatedProject, media, actor: 'operator-a', occurredAt: fixedTime}),
    /requires STORYBOARD_READY/,
  );
});

test('rejects a tampered intake receipt', async () => {
  const receipt = await intakeOwnedMediaIntoVideoProject({
    project: await loadProject(),
    media: await mediaFixture(),
    actor: 'operator-a',
    occurredAt: fixedTime,
  });
  const tampered = {...receipt, nextAction: 'COMPLETE_RENDER'};
  assert.throws(() => validateOwnedMediaIntakeReceipt(tampered), /digest mismatch/);
});
