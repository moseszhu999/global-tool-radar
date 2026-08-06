import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {buildReplitOwnedMediaTaskPack, validateReplitOwnedMediaTaskPack} from '../src/index.mjs';

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8').then(JSON.parse);
const fixtures = () => Promise.all([
  read('apps/web/data/replit-design-production-case.json'),
  read('apps/web/data/replit-design-storyboard-package.json'),
  read('apps/remotion-video/props/final.json'),
  read('apps/web/data/replit-design-video-project-ledger.json'),
]);

test('builds the exact three-file human work package', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  assert.equal(pack.status, 'HUMAN_MEDIA_WORK_REQUIRED');
  assert.equal(pack.truthBoundary, 'task_plan_only_no_media_claimed');
  assert.equal(pack.finalRenderAllowed, false);
  assert.equal(pack.files.length, 3);
  assert.deepEqual(pack.files.map((item) => item.role), ['design_recording','build_limit_recording','voiceover']);
  assert.equal(validateReplitOwnedMediaTaskPack(pack), true);
});

test('binds the exact Remotion paths and storyboard coverage', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  const [design, build, voice] = pack.files;
  assert.equal(design.repositoryTargetPath, 'apps/remotion-video/public/assets/replit-design-owned-recording.mp4');
  assert.equal(build.repositoryTargetPath, 'apps/remotion-video/public/assets/replit-build-limit-owned-recording.mp4');
  assert.equal(voice.repositoryTargetPath, 'apps/remotion-video/public/assets/replit-design-voiceover.wav');
  assert.equal(design.timelineCoverageSeconds, 18);
  assert.equal(build.timelineCoverageSeconds, 23);
  assert.equal(voice.targetDurationSeconds, 89);
  assert.equal(voice.fullVoiceover, productionCase.script.fullVoiceover);
});

test('does not treat final props verification booleans as real evidence', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  assert.equal(finalProps.designRecordingVerified, true);
  const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  assert.equal(pack.propsVerificationFlagsAreEvidence, false);
  assert.equal(pack.policy.humanFileVerificationRequired, true);
  assert.ok(pack.files.every((item) => item.currentState.includes('REQUIRED')));
});

test('emits an executable preflight command without credentials', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  const pack = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  assert.match(pack.preflight.command, /REMOTION_DESIGN_RECORDING=/);
  assert.match(pack.preflight.command, /REMOTION_VOICEOVER_VERIFIED="true"/);
  assert.match(pack.preflight.command, /packages\/remotion-media-preflight\/src\/cli\.mjs/);
  assert.doesNotMatch(pack.preflight.command, /token|authorization|password|cookie/i);
  assert.deepEqual(pack.lifecycleAfterCompletion, ['RESUME_PROJECT','VERIFY_ASSETS']);
});

test('output and digest are deterministic for unchanged inputs', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  const first = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  const second = buildReplitOwnedMediaTaskPack({productionCase, storyboardPackage, finalProps, projectLedger});
  assert.deepEqual(second, first);
  assert.match(first.taskPackDigest, /^[a-f0-9]{64}$/);
});

test('fails closed when the project or storyboard is no longer at this blocker', async () => {
  const [productionCase, storyboardPackage, finalProps, projectLedger] = await fixtures();
  assert.throws(() => buildReplitOwnedMediaTaskPack({
    productionCase, storyboardPackage, finalProps,
    projectLedger: {...projectLedger, project: {...projectLedger.project, status: 'ACTIVE'}},
  }), /expected blocker/);
  assert.throws(() => buildReplitOwnedMediaTaskPack({
    productionCase,
    storyboardPackage: {...storyboardPackage, gates: {...storyboardPackage.gates, renderAllowed: true}},
    finalProps, projectLedger,
  }), /expected owned-media blocker/);
});
