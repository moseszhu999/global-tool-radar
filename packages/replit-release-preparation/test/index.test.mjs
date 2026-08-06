import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVideoProjectEvent,
  createVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';
import {
  applyReleasePreparationToProject,
  createReleasePreparation,
  validateReleasePreparation,
  validateReleasePreparationReceipt,
} from '../src/index.mjs';

const sha = (character) => character.repeat(64);
const times = [
  '2026-08-06T10:00:00.000Z',
  '2026-08-06T10:01:00.000Z',
  '2026-08-06T10:02:00.000Z',
  '2026-08-06T10:03:00.000Z',
  '2026-08-06T10:04:00.000Z',
  '2026-08-06T10:05:00.000Z',
  '2026-08-06T10:06:00.000Z',
  '2026-08-06T10:07:00.000Z',
];

const artifact = (type, digest, overrides = {}) => ({
  type,
  schemaVersion: `test.${type}.v1`,
  artifactId: `${type}:${digest.slice(0, 8)}`,
  digest,
  status: 'READY',
  truthBoundary: 'test_boundary',
  claims: {},
  ...overrides,
});

const makeProject = ({includeQuality = true, qualityVideoSha = sha('b')} = {}) => {
  let project = createVideoProject({
    projectId: 'video-project:release-test:v1',
    sourceSignal: {id: 'signal:1', title: 'Release test', platform: 'youtube'},
    owner: 'video-op',
    createdAt: '2026-08-06T09:59:00.000Z',
  });
  const events = [
    {type: 'SELECT_CANDIDATE', reason: 'verified signal selected for contract testing'},
    {type: 'ATTACH_RESEARCH', artifact: artifact('topic_brief', sha('1'))},
    {type: 'ATTACH_SCRIPT', artifact: artifact('production_case', sha('2'))},
    {type: 'ATTACH_STORYBOARD', artifact: artifact('storyboard_package', sha('3'))},
    {type: 'VERIFY_ASSETS', artifact: artifact('owned_media_preflight', sha('4'), {
      truthBoundary: 'owned_media_verified',
      claims: {finalRenderAllowed: true},
    })},
    {type: 'AUTHORIZE_RENDER', artifact: artifact('final_render_gate', sha('5'), {
      truthBoundary: 'render_execution_authorized',
      claims: {finalRenderAllowed: true},
    })},
    {type: 'COMPLETE_RENDER', artifact: artifact('mac_remotion_render_run', sha('6'), {
      status: 'COMPLETED',
      truthBoundary: 'runner_and_final_video_verified',
      claims: {
        realSubmissionPerformed: true,
        finalVideoClaimAllowed: true,
        finalVideoReceiptDigest: sha('a'),
        finalVideoSha256: sha('b'),
        gateDigest: sha('c'),
        outputPath: 'out/replit-final.mp4',
        renderProfile: {width: 1080, height: 1920, fps: 30, durationSeconds: 89},
      },
    })},
  ];
  if (includeQuality) {
    events.push({type: 'APPROVE_QUALITY', artifact: artifact('final_render_quality_review', sha('7'), {
      status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
      truthBoundary: 'human_quality_approved_for_release_preparation',
      claims: {
        releasePreparationAllowed: true,
        finalVideoSha256: qualityVideoSha,
        finalVideoReceiptDigest: sha('a'),
        reviewer: 'human-reviewer',
        reviewedAt: '2026-08-06T10:30:00.000Z',
      },
    })});
  }
  events.forEach((event, index) => {
    project = applyVideoProjectEvent(project, {
      eventId: `event-${index + 1}`,
      actor: 'test-operator',
      occurredAt: times[index],
      ...event,
    });
  });
  return project;
};

const productionCase = {
  caseId: 'video-case:release-test',
  script: {
    platformCopy: {
      douyin: {
        title: 'Replit Design实测：设计快，不等于能上线',
        description: '独立测试设计探索与生产交付边界。',
        tags: ['Replit Design', 'AI工具实测'],
      },
      bilibili: {
        title: 'Replit Design真实测试：设计稿很快，Build为什么没有成品？',
        description: '完整展示测试方法、设计结果与Build限制。',
        tags: ['Replit Design', 'AI网页与设计'],
      },
    },
  },
};

const createPackage = (project = makeProject()) => createReleasePreparation({
  project,
  productionCase,
  coverPaths: {
    douyin: 'covers/replit-douyin.png',
    bilibili: 'covers/replit-bilibili.png',
  },
  operator: 'release-operator',
  preparedAt: '2026-08-06T11:00:00.000Z',
});

test('creates two platform-specific handoffs from real project artifacts and copy', () => {
  const project = makeProject();
  const releasePreparation = createPackage(project);
  assert.equal(validateReleasePreparation(releasePreparation), true);
  assert.equal(releasePreparation.projectId, project.projectId);
  assert.equal(releasePreparation.finalVideo.sha256, sha('b'));
  assert.deepEqual(
    releasePreparation.platformHandoffs.map((handoff) => handoff.platform),
    ['douyin', 'bilibili'],
  );
  assert.equal(releasePreparation.platformHandoffs[0].metadata.coverPath, 'covers/replit-douyin.png');
  assert.equal(releasePreparation.platformHandoffs[1].metadata.coverPath, 'covers/replit-bilibili.png');
  assert.notEqual(
    releasePreparation.platformHandoffs[0].metadata.title,
    releasePreparation.platformHandoffs[1].metadata.title,
  );
  assert.ok(releasePreparation.platformHandoffs.every((handoff) => handoff.publicationAllowed === false));
});

test('advances the project to RELEASE_READY without claiming platform actions', () => {
  const project = makeProject();
  const releasePreparation = createPackage(project);
  const receipt = applyReleasePreparationToProject({
    project,
    releasePreparation,
    actor: 'release-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  assert.equal(validateReleasePreparationReceipt(receipt), true);
  assert.equal(receipt.status, 'RELEASE_READY');
  assert.equal(receipt.updatedProject.stage, 'RELEASE_READY');
  assert.equal(receipt.updatedProject.nextEvent, 'CONFIRM_PUBLICATION');
  assert.equal(receipt.updatedProject.events.length, 9);
  assert.equal(receipt.updatedProject.artifacts.length, 8);
  assert.equal(receipt.platformLoginPerformed, false);
  assert.equal(receipt.uploadPerformed, false);
  assert.equal(receipt.publishActionPerformed, false);
  assert.equal(receipt.publicationAllowed, false);
});

test('rejects release preparation before official quality approval', () => {
  const project = makeProject({includeQuality: false});
  assert.throws(() => createPackage(project), /requires QUALITY_APPROVED/);
});

test('rejects different video digests between quality and render evidence', () => {
  const project = makeProject({qualityVideoSha: sha('d')});
  assert.throws(() => createPackage(project), /video digests differ/);
});

test('rejects missing platform-specific production copy', () => {
  const project = makeProject();
  const incomplete = structuredClone(productionCase);
  delete incomplete.script.platformCopy.bilibili;
  assert.throws(() => createReleasePreparation({
    project,
    productionCase: incomplete,
    coverPaths: {douyin: 'covers/douyin.png', bilibili: 'covers/bilibili.png'},
    operator: 'release-operator',
    preparedAt: '2026-08-06T11:00:00.000Z',
  }), /bilibili platform copy is missing/);
});

test('fails package and lifecycle receipt validation after tampering', () => {
  const project = makeProject();
  const releasePreparation = createPackage(project);
  const tamperedPackage = structuredClone(releasePreparation);
  tamperedPackage.platformHandoffs[0].metadata.title = 'tampered';
  assert.equal(validateReleasePreparation(tamperedPackage), false);

  const receipt = applyReleasePreparationToProject({
    project,
    releasePreparation,
    actor: 'release-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  assert.throws(
    () => validateReleasePreparationReceipt({...receipt, publicationAllowed: true}),
    /digest mismatch/,
  );
});
