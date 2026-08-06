import {createHash} from 'node:crypto';
import {
  bindPublicationAnalyticsObservation,
  validateBoundPublicationAnalyticsObservation,
} from '../../publication-analytics-observation-binding/src/index.mjs';
import {bindPublicationAnalyticsObservationSeries} from '../../publication-analytics-observation-series/src/index.mjs';
import {validatePublicationAnalyticsObservationSeries} from '../../publication-analytics-observation-series/src/validate.mjs';
import {buildBoundedPublicationFeedbackSummary} from '../../publication-bounded-feedback-summary/src/index.mjs';
import {validateBoundedPublicationFeedbackSummary} from '../../publication-bounded-feedback-summary/src/validate.mjs';
import {validateBoundPublicationReceipt} from '../../platform-publication-receipt-binding/src/index.mjs';
import {
  applyVideoProjectEvent,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const METRIC_FIELDS = Object.freeze(['views', 'likes', 'comments', 'shares', 'favorites', 'followersGained']);

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');
const withDigest = (core, field) => Object.freeze({...core, [field]: digest(core)});

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const timestamp = (value, field) => {
  const date = new Date(requiredText(value, field));
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
};

const assertPublishedProject = (project) => {
  validateVideoProject(project);
  if (project.stage !== 'PUBLISHED' || project.status !== 'ACTIVE' || project.nextEvent !== 'ATTACH_FEEDBACK') {
    throw new Error('feedback completion requires PUBLISHED / ACTIVE / ATTACH_FEEDBACK');
  }
};

const latestPublicationArtifact = (project) => [...project.artifacts]
  .reverse()
  .find((artifact) => artifact.type === 'bound_publication_receipt'
    && artifact.status === 'PUBLICATION_CONFIRMED');

const assertPublicationBinding = (project, receipt) => {
  assertPublishedProject(project);
  validateBoundPublicationReceipt(receipt);
  const artifact = latestPublicationArtifact(project);
  if (!artifact) throw new Error('bound publication artifact is missing');
  if (artifact.digest !== receipt.receiptDigest) throw new Error('bound publication receipt digest mismatch');
  for (const field of ['platform', 'platformVideoId', 'publicUrl', 'uploadHandoffDigest', 'finalVideoSha256']) {
    if (artifact.claims?.[field] !== receipt[field]) throw new Error(`publication artifact ${field} mismatch`);
  }
  if (artifact.claims?.publicationConfirmed !== true || artifact.claims?.analyticsIntakeAllowed !== true) {
    throw new Error('publication artifact does not allow analytics intake');
  }
  return artifact;
};

const templateCore = (template) => ({
  schemaVersion: template.schemaVersion,
  projectId: template.projectId,
  sourceProjectDigest: template.sourceProjectDigest,
  publicationReceiptDigest: template.publicationReceiptDigest,
  platform: template.platform,
  platformVideoId: template.platformVideoId,
  preparedBy: template.preparedBy,
  preparedAt: template.preparedAt,
  analyticsObservation: template.analyticsObservation,
  requiredEvidence: template.requiredEvidence,
  truthBoundary: template.truthBoundary,
  analyticsObserved: template.analyticsObserved,
  feedbackCompletionAllowed: template.feedbackCompletionAllowed,
});

export const createAnalyticsObservationTemplate = ({
  project,
  boundPublicationReceipt,
  preparedBy,
  preparedAt = new Date().toISOString(),
} = {}) => {
  assertPublicationBinding(project, boundPublicationReceipt);
  const core = {
    schemaVersion: 'toolradar.analytics-observation-template.v1',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    publicationReceiptDigest: boundPublicationReceipt.receiptDigest,
    platform: boundPublicationReceipt.platform,
    platformVideoId: boundPublicationReceipt.platformVideoId,
    preparedBy: requiredText(preparedBy, 'preparedBy'),
    preparedAt: timestamp(preparedAt, 'preparedAt'),
    analyticsObservation: {
      platform: boundPublicationReceipt.platform,
      publicationReceiptDigest: boundPublicationReceipt.receiptDigest,
      platformVideoId: boundPublicationReceipt.platformVideoId,
      observedAt: null,
      source: 'platform-ui-manual',
      operator: null,
      operatorConfirmedMetrics: false,
      metrics: Object.fromEntries(METRIC_FIELDS.map((field) => [field, null])),
    },
    requiredEvidence: [
      'observedAt',
      'operator',
      'operatorConfirmedMetrics=true',
      ...METRIC_FIELDS.map((field) => `metrics.${field}`),
    ],
    truthBoundary: 'human_platform_ui_metric_observation_required',
    analyticsObserved: false,
    feedbackCompletionAllowed: false,
  };
  return withDigest(core, 'templateDigest');
};

export const validateAnalyticsObservationTemplate = (template) => {
  if (template?.schemaVersion !== 'toolradar.analytics-observation-template.v1') {
    throw new TypeError('unsupported analytics observation template');
  }
  if (!SHA256.test(template.templateDigest ?? '') || digest(templateCore(template)) !== template.templateDigest) {
    throw new Error('analytics observation template digest mismatch');
  }
  if (!SHA256.test(template.sourceProjectDigest ?? '') || !SHA256.test(template.publicationReceiptDigest ?? '')) {
    throw new Error('analytics observation template evidence digest is invalid');
  }
  const draft = template.analyticsObservation;
  if (draft?.platform !== template.platform
    || draft?.publicationReceiptDigest !== template.publicationReceiptDigest
    || draft?.platformVideoId !== template.platformVideoId
    || draft?.source !== 'platform-ui-manual') {
    throw new Error('analytics observation template binding is invalid');
  }
  if (draft?.operatorConfirmedMetrics !== false
    || template.analyticsObserved !== false
    || template.feedbackCompletionAllowed !== false) {
    throw new Error('analytics observation template cannot claim metrics or completion');
  }
  for (const field of METRIC_FIELDS) {
    if (draft?.metrics?.[field] !== null) throw new Error('analytics observation template must be metric-empty');
  }
  return true;
};

export const bindProjectAnalyticsObservation = ({
  project,
  boundPublicationReceipt,
  template,
  analyticsObservation,
} = {}) => {
  const errors = [];
  try {
    assertPublicationBinding(project, boundPublicationReceipt);
  } catch (error) {
    errors.push(`publication:${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    validateAnalyticsObservationTemplate(template);
  } catch (error) {
    errors.push(`template:${error instanceof Error ? error.message : String(error)}`);
  }
  if (template?.projectId !== project?.projectId) errors.push('template_project_mismatch');
  if (template?.sourceProjectDigest !== project?.projectDigest) errors.push('template_source_project_mismatch');
  if (template?.publicationReceiptDigest !== boundPublicationReceipt?.receiptDigest) {
    errors.push('template_publication_receipt_mismatch');
  }

  let boundObservation = null;
  if (errors.length === 0) {
    try {
      const candidate = bindPublicationAnalyticsObservation({boundPublicationReceipt, analyticsObservation});
      if (candidate.status === 'ANALYTICS_OBSERVATION_BOUND') {
        validateBoundPublicationAnalyticsObservation(candidate);
        boundObservation = candidate;
      } else {
        errors.push(...candidate.reasons.map((reason) => `observation:${reason}`));
      }
    } catch (error) {
      errors.push(`observation:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const core = {
    schemaVersion: 'toolradar.project-analytics-observation-intake.v1',
    status: errors.length === 0 ? 'ANALYTICS_OBSERVATION_BOUND' : 'ANALYTICS_OBSERVATION_BLOCKED',
    truthBoundary: errors.length === 0
      ? 'human_platform_ui_metrics_bound_to_published_project'
      : 'analytics_observation_evidence_blocked',
    projectId: project?.projectId ?? null,
    sourceProjectDigest: project?.projectDigest ?? null,
    templateDigest: template?.templateDigest ?? null,
    publicationReceiptDigest: boundPublicationReceipt?.receiptDigest ?? null,
    boundObservation,
    errors: Object.freeze([...new Set(errors)]),
    projectUnchanged: true,
    analyticsObserved: errors.length === 0,
    feedbackCompletionAllowed: false,
  };
  return withDigest(core, 'intakeDigest');
};

export const validateProjectAnalyticsObservationIntake = (intake) => {
  if (intake?.schemaVersion !== 'toolradar.project-analytics-observation-intake.v1') {
    throw new TypeError('unsupported project analytics observation intake');
  }
  const {intakeDigest, ...core} = intake;
  if (!SHA256.test(intakeDigest ?? '') || digest(core) !== intakeDigest) {
    throw new Error('project analytics observation intake digest mismatch');
  }
  if (intake.projectUnchanged !== true || intake.feedbackCompletionAllowed !== false) {
    throw new Error('analytics observation intake cannot mutate or complete the project');
  }
  if (intake.status === 'ANALYTICS_OBSERVATION_BOUND') {
    validateBoundPublicationAnalyticsObservation(intake.boundObservation);
    if (intake.analyticsObserved !== true || intake.errors.length !== 0) {
      throw new Error('bound analytics observation intake boundary is invalid');
    }
  } else if (intake.status === 'ANALYTICS_OBSERVATION_BLOCKED') {
    if (intake.analyticsObserved !== false || intake.boundObservation !== null || intake.errors.length === 0) {
      throw new Error('blocked analytics observation intake boundary is invalid');
    }
  } else {
    throw new RangeError(`unsupported analytics observation intake status: ${intake.status}`);
  }
  return true;
};

const feedbackArtifact = (summary) => ({
  type: 'bounded_feedback_summary',
  schemaVersion: summary.schema,
  artifactId: `bounded-feedback-summary:${summary.summaryDigest}`,
  digest: summary.summaryDigest,
  status: 'BOUNDED_FEEDBACK_SUMMARY_READY',
  truthBoundary: 'descriptive_platform_feedback_ready',
  claims: {
    feedbackSummaryReady: true,
    platform: summary.platform,
    platformVideoId: summary.platformVideoId,
    publicationReceiptDigest: summary.publicationReceiptDigest,
    seriesDigest: summary.seriesDigest,
    observationCount: summary.observationCount,
    firstObservedAt: summary.firstObservedAt,
    lastObservedAt: summary.lastObservedAt,
    metricDelta: summary.metricDelta,
    averageDeltaPerHour: summary.averageDeltaPerHour,
    causalClaimsAllowed: false,
    recommendationClaimsAllowed: false,
    platformApiVerified: false,
    interpretation: 'descriptive-only',
  },
});

export const completeProjectFeedback = ({
  project,
  boundPublicationReceipt,
  boundObservations,
  actor,
  occurredAt = new Date().toISOString(),
} = {}) => {
  assertPublicationBinding(project, boundPublicationReceipt);
  const normalizedActor = requiredText(actor, 'actor');
  const normalizedOccurredAt = timestamp(occurredAt, 'occurredAt');
  if (!Array.isArray(boundObservations) || boundObservations.length < 2) {
    throw new Error('at least two bound analytics observations are required');
  }
  for (const [index, observation] of boundObservations.entries()) {
    validateBoundPublicationAnalyticsObservation(observation);
    if (observation.publicationReceiptDigest !== boundPublicationReceipt.receiptDigest) {
      throw new Error(`observation ${index} publication receipt mismatch`);
    }
    if (observation.platform !== boundPublicationReceipt.platform
      || observation.platformVideoId !== boundPublicationReceipt.platformVideoId) {
      throw new Error(`observation ${index} platform identity mismatch`);
    }
  }

  const observationSeries = bindPublicationAnalyticsObservationSeries({boundObservations});
  if (observationSeries.status !== 'ANALYTICS_OBSERVATION_SERIES_BOUND') {
    throw new Error(`analytics observation series blocked: ${observationSeries.reasons?.join(', ') || 'unknown'}`);
  }
  validatePublicationAnalyticsObservationSeries(observationSeries);
  const feedbackSummary = buildBoundedPublicationFeedbackSummary({observationSeries});
  if (feedbackSummary.status !== 'BOUNDED_FEEDBACK_SUMMARY_READY') {
    throw new Error(`bounded feedback summary blocked: ${feedbackSummary.reasons?.join(', ') || 'unknown'}`);
  }
  validateBoundedPublicationFeedbackSummary(feedbackSummary);

  const eventId = `replit-feedback-complete:${feedbackSummary.summaryDigest.slice(0, 20)}`;
  const updatedProject = applyVideoProjectEvent(project, {
    eventId,
    type: 'ATTACH_FEEDBACK',
    actor: normalizedActor,
    occurredAt: normalizedOccurredAt,
    artifact: feedbackArtifact(feedbackSummary),
  });
  validateVideoProject(updatedProject);
  const core = {
    schemaVersion: 'toolradar.feedback-completion.v1',
    status: 'FEEDBACK_READY',
    truthBoundary: 'video_project_descriptive_feedback_ready',
    projectId: project.projectId,
    sourceProjectDigest: project.projectDigest,
    publicationReceiptDigest: boundPublicationReceipt.receiptDigest,
    observationSeries,
    feedbackSummary,
    appliedEvent: eventId,
    updatedProject,
    updatedProjectDigest: updatedProject.projectDigest,
    summary: summarizeVideoProject(updatedProject),
    nextLifecycleEvent: updatedProject.nextEvent,
    feedbackSummaryReady: true,
    causalClaimsAllowed: false,
    recommendationClaimsAllowed: false,
    platformApiVerified: false,
  };
  return withDigest(core, 'receiptDigest');
};

export const validateFeedbackCompletionReceipt = (receipt) => {
  if (receipt?.schemaVersion !== 'toolradar.feedback-completion.v1') {
    throw new TypeError('unsupported feedback completion receipt');
  }
  const {receiptDigest, ...core} = receipt;
  if (!SHA256.test(receiptDigest ?? '') || digest(core) !== receiptDigest) {
    throw new Error('feedback completion receipt digest mismatch');
  }
  validatePublicationAnalyticsObservationSeries(receipt.observationSeries);
  validateBoundedPublicationFeedbackSummary(receipt.feedbackSummary);
  if (receipt.status !== 'FEEDBACK_READY'
    || receipt.updatedProject?.stage !== 'FEEDBACK_READY'
    || receipt.updatedProject?.status !== 'COMPLETED'
    || receipt.nextLifecycleEvent !== null) {
    throw new Error('feedback-ready lifecycle boundary is invalid');
  }
  if (receipt.feedbackSummaryReady !== true
    || receipt.causalClaimsAllowed !== false
    || receipt.recommendationClaimsAllowed !== false
    || receipt.platformApiVerified !== false) {
    throw new Error('feedback-ready truth boundary is invalid');
  }
  validateVideoProject(receipt.updatedProject);
  return true;
};

export {METRIC_FIELDS};
