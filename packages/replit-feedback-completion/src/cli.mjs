#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  bindProjectAnalyticsObservation,
  completeProjectFeedback,
  createAnalyticsObservationTemplate,
  validateAnalyticsObservationTemplate,
  validateFeedbackCompletionReceipt,
  validateProjectAnalyticsObservationIntake,
} from './index.mjs';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const writeJson = async (path, value) => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const mode = required('FEEDBACK_COMPLETION_MODE').toLowerCase();
const ledgerInput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim()
    || 'artifacts/replit-design-published-ledger.json',
);
const publicationReceiptInput = resolve(
  process.env.BOUND_PUBLICATION_RECEIPT_INPUT?.trim()
    || 'artifacts/replit-bound-publication-receipt.json',
);
const templateOutput = resolve(
  process.env.ANALYTICS_OBSERVATION_TEMPLATE_OUTPUT?.trim()
    || 'artifacts/replit-analytics-observation-template.json',
);
const intakeOutput = resolve(
  process.env.ANALYTICS_OBSERVATION_INTAKE_OUTPUT?.trim()
    || 'artifacts/replit-analytics-observation-intake.json',
);
const boundObservationOutput = resolve(
  process.env.BOUND_ANALYTICS_OBSERVATION_OUTPUT?.trim()
    || 'artifacts/replit-bound-analytics-observation.json',
);
const seriesOutput = resolve(
  process.env.ANALYTICS_OBSERVATION_SERIES_OUTPUT?.trim()
    || 'artifacts/replit-analytics-observation-series.json',
);
const summaryOutput = resolve(
  process.env.BOUNDED_FEEDBACK_SUMMARY_OUTPUT?.trim()
    || 'artifacts/replit-bounded-feedback-summary.json',
);
const completionOutput = resolve(
  process.env.FEEDBACK_COMPLETION_OUTPUT?.trim()
    || 'artifacts/replit-feedback-completion-receipt.json',
);
const ledgerOutput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim()
    || 'artifacts/replit-design-feedback-ready-ledger.json',
);

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));
  const boundPublicationReceipt = JSON.parse(await readFile(publicationReceiptInput, 'utf8'));

  if (mode === 'prepare') {
    const template = createAnalyticsObservationTemplate({
      project: ledger.project,
      boundPublicationReceipt,
      preparedBy: required('TOOLRADAR_OPERATOR'),
      preparedAt: process.env.TOOLRADAR_PREPARED_AT?.trim() || new Date().toISOString(),
    });
    validateAnalyticsObservationTemplate(template);
    await writeJson(templateOutput, template);
    process.stdout.write(`${JSON.stringify({
      mode,
      status: 'ANALYTICS_OBSERVATION_EVIDENCE_REQUIRED',
      projectId: template.projectId,
      platform: template.platform,
      platformVideoId: template.platformVideoId,
      templateDigest: template.templateDigest,
      templateOutput,
      analyticsObserved: template.analyticsObserved,
      feedbackCompletionAllowed: template.feedbackCompletionAllowed,
      requiredEvidence: template.requiredEvidence,
    }, null, 2)}\n`);
  } else if (mode === 'observe') {
    const templateInput = resolve(required('ANALYTICS_OBSERVATION_TEMPLATE_INPUT'));
    const observationInput = resolve(required('ANALYTICS_OBSERVATION_INPUT'));
    const template = JSON.parse(await readFile(templateInput, 'utf8'));
    const analyticsObservation = JSON.parse(await readFile(observationInput, 'utf8'));
    const intake = bindProjectAnalyticsObservation({
      project: ledger.project,
      boundPublicationReceipt,
      template,
      analyticsObservation,
    });
    validateProjectAnalyticsObservationIntake(intake);
    await writeJson(intakeOutput, intake);
    if (intake.status === 'ANALYTICS_OBSERVATION_BOUND') {
      await writeJson(boundObservationOutput, intake.boundObservation);
    }
    process.stdout.write(`${JSON.stringify({
      mode,
      status: intake.status,
      projectId: intake.projectId,
      intakeDigest: intake.intakeDigest,
      intakeOutput,
      boundObservationOutput: intake.status === 'ANALYTICS_OBSERVATION_BOUND'
        ? boundObservationOutput
        : null,
      projectUnchanged: intake.projectUnchanged,
      analyticsObserved: intake.analyticsObserved,
      feedbackCompletionAllowed: intake.feedbackCompletionAllowed,
      errors: intake.errors,
    }, null, 2)}\n`);
    if (intake.status !== 'ANALYTICS_OBSERVATION_BOUND') process.exitCode = 2;
  } else if (mode === 'complete') {
    const observationsInput = resolve(required('BOUND_ANALYTICS_OBSERVATIONS_INPUT'));
    const boundObservations = JSON.parse(await readFile(observationsInput, 'utf8'));
    const completion = completeProjectFeedback({
      project: ledger.project,
      boundPublicationReceipt,
      boundObservations,
      actor: required('TOOLRADAR_OPERATOR'),
      occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
    });
    validateFeedbackCompletionReceipt(completion);
    await writeJson(seriesOutput, completion.observationSeries);
    await writeJson(summaryOutput, completion.feedbackSummary);
    await writeJson(completionOutput, completion);
    await writeJson(ledgerOutput, {
      ...ledger,
      project: completion.updatedProject,
      summary: completion.summary,
      feedbackCompletion: {
        publicationReceiptDigest: completion.publicationReceiptDigest,
        observationSeriesDigest: completion.observationSeries.seriesDigest,
        feedbackSummaryDigest: completion.feedbackSummary.summaryDigest,
        completionReceiptDigest: completion.receiptDigest,
        truthBoundary: completion.truthBoundary,
      },
    });
    process.stdout.write(`${JSON.stringify({
      mode,
      status: completion.status,
      projectId: completion.projectId,
      projectStage: completion.summary.stage,
      projectStatus: completion.summary.status,
      nextLifecycleEvent: completion.nextLifecycleEvent,
      observationCount: completion.feedbackSummary.observationCount,
      metricDelta: completion.feedbackSummary.metricDelta,
      averageDeltaPerHour: completion.feedbackSummary.averageDeltaPerHour,
      seriesOutput,
      summaryOutput,
      completionOutput,
      ledgerOutput,
      feedbackSummaryReady: completion.feedbackSummaryReady,
      causalClaimsAllowed: completion.causalClaimsAllowed,
      recommendationClaimsAllowed: completion.recommendationClaimsAllowed,
      platformApiVerified: completion.platformApiVerified,
    }, null, 2)}\n`);
  } else {
    throw new Error(`unsupported_mode:${mode}`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
