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
} from '../../replit-publication-confirmation/src/index.mjs';
import {
  bindProjectAnalyticsObservation,
  completeProjectFeedback,
  createAnalyticsObservationTemplate,
  validateAnalyticsObservationTemplate,
  validateFeedbackCompletionReceipt,
  validateProjectAnalyticsObservationIntake,
} from '../src/index.mjs';

const sha = (character) => character.repeat(64);
const times = Array.from({length: 8}, (_, index) => `2026-08-06T10:0${index}:00.000Z`);

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
    projectId: 'video-project:feedback-test:v1',
    sourceSignal: {id: 'signal:1', title: 'Feedback test', platform: 'youtube'},
    owner: 'video-op',
    createdAt: '2026-08-06T09:59:00.000Z',
  });
  const events = [
    {type: 'SELECT_CANDIDATE', reason: 'verified signal selected for feedback contracts'},
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
  caseId: 'video-case:feedback-test',
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

const makePublishedFixture = () => {
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
  const publicationTemplate = createPublicationConfirmationTemplate({
    project: releaseReceipt.updatedProject,
    releasePreparation,
    platform: 'bilibili',
    preparedBy: 'publication-operator',
    preparedAt: '2026-08-06T11:30:00.000Z',
  });
  const publicationConfirmation = confirmProjectPublication({
    project: releaseReceipt.updatedProject,
    releasePreparation,
    template: publicationTemplate,
    publicationReceipt: {
      platform: 'bilibili',
      uploadHandoffDigest: publicationTemplate.uploadHandoffDigest,
      finalVideoSha256: publicationTemplate.finalVideoSha256,
      platformVideoId: 'BV1REAL12345',
      publicUrl: 'https://www.bilibili.com/video/BV1REAL12345',
      publishedAt: '2026-08-06T12:00:00.000Z',
      capturedAt: '2026-08-06T12:05:00.000Z',
      operator: 'publication-operator',
      operatorConfirmedPublication: true,
      platformLoginPerformed: true,
      uploadPerformed: true,
      publishActionPerformed: true,
    },
    actor: 'publication-operator',
    occurredAt: '2026-08-06T12:06:00.000Z',
  });
  return {
    project: publicationConfirmation.updatedProject,
    boundPublicationReceipt: publicationConfirmation.boundPublicationReceipt,
  };
};

const observationInput = (fixture, observedAt, metrics, overrides = {}) => ({
  platform: fixture.boundPublicationReceipt.platform,
  publicationReceiptDigest: fixture.boundPublicationReceipt.receiptDigest,
  platformVideoId: fixture.boundPublicationReceipt.platformVideoId,
  observedAt,
  source: 'platform-ui-manual',
  operator: 'analytics-operator',
  operatorConfirmedMetrics: true,
  metrics,
  ...overrides,
});

const metrics = (views, likes, comments, shares, favorites, followersGained) => ({
  views, likes, comments, shares, favorites, followersGained,
});

const bindObservation = (fixture, observedAt, values, preparedAt = '2026-08-06T12:30:00.000Z') => {
  const template = createAnalyticsObservationTemplate({
    ...fixture,
    preparedBy: 'analytics-operator',
    preparedAt,
  });
  const intake = bindProjectAnalyticsObservation({
    ...fixture,
    template,
    analyticsObservation: observationInput(fixture, observedAt, values),
  });
  validateProjectAnalyticsObservationIntake(intake);
  return {template, intake, observation: intake.boundObservation};
};

test('prepares a metric-empty template bound to the published project', () => {
  const fixture = makePublishedFixture();
  const template = createAnalyticsObservationTemplate({
    ...fixture,
    preparedBy: 'analytics-operator',
    preparedAt: '2026-08-06T12:30:00.000Z',
  });
  assert.equal(validateAnalyticsObservationTemplate(template), true);
  assert.equal(template.projectId, fixture.project.projectId);
  assert.equal(template.publicationReceiptDigest, fixture.boundPublicationReceipt.receiptDigest);
  assert.ok(Object.values(template.analyticsObservation.metrics).every((value) => value === null));
  assert.equal(template.analyticsObserved, false);
  assert.equal(template.feedbackCompletionAllowed, false);
});

test('binds one human observation without changing or completing the project', () => {
  const fixture = makePublishedFixture();
  const {intake} = bindObservation(
    fixture,
    '2026-08-06T13:00:00.000Z',
    metrics(100, 10, 2, 1, 3, 1),
  );
  assert.equal(intake.status, 'ANALYTICS_OBSERVATION_BOUND');
  assert.equal(intake.projectUnchanged, true);
  assert.equal(intake.analyticsObserved, true);
  assert.equal(intake.feedbackCompletionAllowed, false);
  assert.equal(fixture.project.stage, 'PUBLISHED');
});

test('blocks unconfirmed or cross-publication metric observations', () => {
  const fixture = makePublishedFixture();
  const template = createAnalyticsObservationTemplate({
    ...fixture,
    preparedBy: 'analytics-operator',
    preparedAt: '2026-08-06T12:30:00.000Z',
  });
  const intake = bindProjectAnalyticsObservation({
    ...fixture,
    template,
    analyticsObservation: observationInput(
      fixture,
      '2026-08-06T13:00:00.000Z',
      metrics(100, 10, 2, 1, 3, 1),
      {operatorConfirmedMetrics: false, publicationReceiptDigest: sha('d')},
    ),
  });
  assert.equal(validateProjectAnalyticsObservationIntake(intake), true);
  assert.equal(intake.status, 'ANALYTICS_OBSERVATION_BLOCKED');
  assert.equal(intake.projectUnchanged, true);
  assert.ok(intake.errors.some((error) => error.includes('publication receipt digest mismatch')));
  assert.ok(intake.errors.some((error) => error.includes('human metric confirmation is required')));
});

test('completes feedback only after two chronological non-decreasing observations', () => {
  const fixture = makePublishedFixture();
  const first = bindObservation(
    fixture,
    '2026-08-06T13:00:00.000Z',
    metrics(100, 10, 2, 1, 3, 1),
  ).observation;
  const second = bindObservation(
    fixture,
    '2026-08-06T15:00:00.000Z',
    metrics(220, 25, 5, 3, 8, 3),
    '2026-08-06T14:30:00.000Z',
  ).observation;
  const receipt = completeProjectFeedback({
    ...fixture,
    boundObservations: [first, second],
    actor: 'analytics-operator',
    occurredAt: '2026-08-06T15:05:00.000Z',
  });
  assert.equal(validateFeedbackCompletionReceipt(receipt), true);
  assert.equal(receipt.status, 'FEEDBACK_READY');
  assert.equal(receipt.updatedProject.stage, 'FEEDBACK_READY');
  assert.equal(receipt.updatedProject.nextEvent, null);
  assert.equal(receipt.updatedProject.events.length, 11);
  assert.equal(receipt.updatedProject.artifacts.length, 10);
  assert.equal(receipt.feedbackSummary.metricDelta.views, 120);
  assert.equal(receipt.feedbackSummary.averageDeltaPerHour.views, 60);
  assert.equal(receipt.causalClaimsAllowed, false);
  assert.equal(receipt.recommendationClaimsAllowed, false);
  assert.equal(receipt.platformApiVerified, false);
});

test('rejects one observation and decreasing cumulative metrics', () => {
  const fixture = makePublishedFixture();
  const first = bindObservation(
    fixture,
    '2026-08-06T13:00:00.000Z',
    metrics(100, 10, 2, 1, 3, 1),
  ).observation;
  assert.throws(() => completeProjectFeedback({
    ...fixture,
    boundObservations: [first],
    actor: 'analytics-operator',
  }), /at least two/);

  const lower = bindObservation(
    fixture,
    '2026-08-06T15:00:00.000Z',
    metrics(90, 10, 2, 1, 3, 1),
  ).observation;
  assert.throws(() => completeProjectFeedback({
    ...fixture,
    boundObservations: [first, lower],
    actor: 'analytics-operator',
  }), /metric views decreased/);
});

test('rejects tampered templates, observations, and completion receipts', () => {
  const fixture = makePublishedFixture();
  const firstBound = bindObservation(
    fixture,
    '2026-08-06T13:00:00.000Z',
    metrics(100, 10, 2, 1, 3, 1),
  );
  assert.throws(
    () => validateAnalyticsObservationTemplate({...firstBound.template, platformVideoId: 'tampered'}),
    /digest mismatch/,
  );
  const tamperedObservation = structuredClone(firstBound.observation);
  tamperedObservation.metrics.views = 101;
  assert.throws(() => completeProjectFeedback({
    ...fixture,
    boundObservations: [tamperedObservation, firstBound.observation],
    actor: 'analytics-operator',
  }), /digest mismatch/);

  const second = bindObservation(
    fixture,
    '2026-08-06T15:00:00.000Z',
    metrics(220, 25, 5, 3, 8, 3),
  ).observation;
  const receipt = completeProjectFeedback({
    ...fixture,
    boundObservations: [firstBound.observation, second],
    actor: 'analytics-operator',
    occurredAt: '2026-08-06T15:05:00.000Z',
  });
  assert.throws(
    () => validateFeedbackCompletionReceipt({...receipt, recommendationClaimsAllowed: true}),
    /digest mismatch/,
  );
});
