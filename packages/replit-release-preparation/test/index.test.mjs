import test from 'node:test';
import assert from 'node:assert/strict';
import {createReleasePreparation, validateReleasePreparation} from '../src/index.mjs';

const digest = 'a'.repeat(64);
const base = {
  project: {schema:'toolradar.video-project.v1', projectId:'video-project:replit:v1', stage:'QUALITY_APPROVED', status:'ACTIVE', nextEvent:'PREPARE_RELEASE'},
  qualityApproval: {schema:'toolradar.quality-approval.v1', projectId:'video-project:replit:v1', status:'QUALITY_APPROVED_FOR_RELEASE_PREPARATION', publicationAllowed:false, receiptDigest:'b'.repeat(64)},
  finalVideo: {schema:'toolradar.final-video-file-receipt.v1', projectId:'video-project:replit:v1', outputPath:'out/replit-final.mp4', fileSha256:digest, receiptDigest:'c'.repeat(64), media:{width:1080,height:1920,fps:30,durationSeconds:89}},
  copy: {title:'Replit 设计模式实测', description:'基于自有录屏制作的中文工具测评。', tags:['AI工具','Replit'], coverCandidates:['covers/replit-v1.png']},
  operator:'operator@example', preparedAt:'2026-08-06T14:00:00Z'
};

test('creates upload-ready but publication-blocked packages', () => {
  const receipt = createReleasePreparation(base);
  assert.equal(receipt.releasePackageReady, true);
  assert.equal(receipt.publicationAllowed, false);
  assert.deepEqual(receipt.platformPackages.map(x => x.platform), ['douyin','bilibili']);
  assert.ok(receipt.platformPackages.every(x => x.humanOnly && !x.publicationAllowed));
  assert.equal(validateReleasePreparation(receipt), true);
});

test('rejects a project before quality approval', () => {
  assert.throws(() => createReleasePreparation({...base, project:{...base.project, stage:'RENDER_COMPLETED'}}), /not quality approved/);
});

test('rejects quality evidence that claims publication authority', () => {
  assert.throws(() => createReleasePreparation({...base, qualityApproval:{...base.qualityApproval, publicationAllowed:true}}), /must not grant publication/);
});

test('rejects mismatched final video evidence', () => {
  assert.throws(() => createReleasePreparation({...base, finalVideo:{...base.finalVideo, projectId:'other'}}), /project mismatch/);
});

test('rejects non-canonical vertical video profile', () => {
  assert.throws(() => createReleasePreparation({...base, finalVideo:{...base.finalVideo, media:{...base.finalVideo.media, width:720}}}), /profile mismatch/);
});

test('fails validation after tampering', () => {
  const receipt = createReleasePreparation(base);
  receipt.platformPackages[0].title = 'tampered';
  assert.equal(validateReleasePreparation(receipt), false);
});
