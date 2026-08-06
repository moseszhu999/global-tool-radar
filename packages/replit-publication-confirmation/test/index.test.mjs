import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVideoProjectEvent,
  createVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';
import {
  applyReleasePreparationToProject,
  createReleasePreparation,
} from '../../replit-release-preparation/src/index.mjs';
import {
  confirmProjectPublication,
  createPublicationConfirmationTemplate,
  validatePublicationConfirmationReceipt,
  validatePublicationConfirmationTemplate,
} from '../src/index.mjs';

const sha = (character) => character.repeat(64);
const times = Array.from({length: 9}, (_, index) => `2026-08-06T10:0${index}:00.000Z`);

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

const makeQualityApprovedProject = () => {
  let project = createVideoProject({
    projectId: 'video-project:publication-test:v1',
    sourceSignal: {id: 'signal:1', title: 'Publication test', platform: 'youtube'},
    owner: 'video-op',
    createdAt: '2026-08-06T09:59:00.000Z',
  });
  const events = [
    {type: 'SELECT_CANDIDATE', reason: 'verified signal selected for publication contracts'},
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
    {type: 'APPROVE_QUALITY', artifact: artifact('final_render_quality_review', sha('7'), {
      status: 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION',
      truthBoundary: 'human_quality_approved_for_release_preparation',
      claims: {
        releasePreparationAllowed: true,
        finalVideoSha256: sha('b'),
        finalVideoReceiptDigest: sha('a'),
        reviewer: 'human-reviewer',
        reviewedAt: '2026-08-06T10:30:00.000Z',
      },
    })},
  ];
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
  caseId: 'video-case:publication-test',
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

const makeReleaseReadyFixture = () => {
  const qualityProject = makeQualityApprovedProject();
  const releasePreparation = createReleasePreparation({
    project: qualityProject,
    productionCase,
    coverPaths: {
      douyin: 'covers/replit-douyin.png',
      bilibili: 'covers/replit-bilibili.png',
    },
    operator: 'release-operator',
    preparedAt: '2026-08-06T11:00:00.000Z',
  });
  const releaseReceipt = applyReleasePreparationToProject({
    project: qualityProject,
    releasePreparation,
    actor: 'release-operator',
    occurredAt: '2026-08-06T11:01:00.000Z',
  });
  return {project: releaseReceipt.updatedProject, releasePreparation};
};

const validPublicationReceipt = (template, overrides = {}) => ({
  platform: template.platform,
  uploadHandoffDigest: template.uploadHandoffDigest,
  finalVideoSha256: template.finalVideoSha256,
  platformVideoId: template.platform === 'bilibili' ? 'BV1REAL12345' : 'douyin-real-12345',
  publicUrl: template.platform === 'bilibili'
    ? 'https://www.bilibili.com/video/BV1REAL12345'
    : 'https://www.douyin.com/video/douyin-real-12345',
  publishedAt: '2026-08-06T12:00:00.000Z',
  capturedAt: '2026-08-06T12:05:00.000Z',
  operator: 'publication-operator',
  operatorConfirmedPublication: true,
  platformLoginPerformed: true,
  uploadPerformed: true,
  publishActionPerformed: true,
  ...overrides,
});

test('prepares an evidence template for exactly one selected platform', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  assert.equal(validatePublicationConfirmationTemplate(template), true);
  assert.equal(template.platform, 'bilibili');
  assert.equal(template.publicationReceipt.operatorConfirmedPublication, false);
  assert.equal(template.publicationConfirmed, false);
  assert.equal(template.analyticsIntakeAllowed, false);
  assert.match(template.uploadHandoffDigest, /^[a-f0-9]{64}$/);
});

test('advances a human-confirmed publication to PUBLISHED', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  const receipt = confirmProjectPublication({
    ...fixture,
    template,
    publicationReceipt: validPublicationReceipt(template),
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  assert.equal(validatePublicationConfirmationReceipt(receipt), true);
  assert.equal(receipt.status, 'PUBLISHED');
  assert.equal(receipt.updatedProject.stage, 'PUBLISHED');
  assert.equal(receipt.updatedProject.nextEvent, 'ATTACH_FEEDBACK');
  assert.equal(receipt.updatedProject.events.length, 10);
  assert.equal(receipt.updatedProject.artifacts.length, 9);
  assert.equal(receipt.publicationConfirmed, true);
  assert.equal(receipt.analyticsIntakeAllowed, true);
  assert.equal(receipt.platformApiVerified, false);
  assert.equal(receipt.metricsObserved, false);
});

test('supports an explicit Douyin publication without combining Bilibili evidence', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'douyin',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  const receipt = confirmProjectPublication({
    ...fixture,
    template,
    publicationReceipt: validPublicationReceipt(template),
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  assert.equal(receipt.status, 'PUBLISHED');
  assert.equal(receipt.platform, 'douyin');
  assert.equal(receipt.boundPublicationReceipt.platform, 'douyin');
});

test('keeps the project unchanged when human actions are incomplete', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  const receipt = confirmProjectPublication({
    ...fixture,
    template,
    publicationReceipt: validPublicationReceipt(template, {
      operatorConfirmedPublication: false,
      publishActionPerformed: false,
    }),
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  assert.equal(validatePublicationConfirmationReceipt(receipt), true);
  assert.equal(receipt.status, 'PUBLICATION_CONFIRMATION_BLOCKED');
  assert.equal(receipt.projectUnchanged, true);
  assert.equal(receipt.updatedProject, null);
  assert.equal(receipt.publicationConfirmed, false);
  assert.equal(receipt.analyticsIntakeAllowed, false);
  assert.ok(receipt.errors.some((error) => error.includes('human publication confirmation is required')));
});

test('blocks platform, handoff, video, or operator mismatches', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  const receipt = confirmProjectPublication({
    ...fixture,
    template,
    publicationReceipt: validPublicationReceipt(template, {
      platform: 'douyin',
      uploadHandoffDigest: sha('d'),
      finalVideoSha256: sha('e'),
      operator: 'other-operator',
    }),
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  assert.equal(receipt.status, 'PUBLICATION_CONFIRMATION_BLOCKED');
  assert.ok(receipt.errors.some((error) => error.includes('platform does not match')));
  assert.ok(receipt.errors.some((error) => error.includes('upload handoff digest mismatch')));
  assert.ok(receipt.errors.some((error) => error.includes('final video digest mismatch')));
});

test('rejects tampered templates and confirmation receipts', () => {
  const fixture = makeReleaseReadyFixture();
  const template = createPublicationConfirmationTemplate({
    ...fixture,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  assert.throws(
    () => validatePublicationConfirmationTemplate({...template, platform: 'douyin'}),
    /digest mismatch/,
  );
  const receipt = confirmProjectPublication({
    ...fixture,
    template,
    publicationReceipt: validPublicationReceipt(template),
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  assert.throws(
    () => validatePublicationConfirmationReceipt({...receipt, analyticsIntakeAllowed: false}),
    /digest mismatch/,
  );
});
