#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  confirmProjectPublication,
  createPublicationConfirmationTemplate,
  validatePublicationConfirmationReceipt,
  validatePublicationConfirmationTemplate,
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

const mode = required('PUBLICATION_CONFIRMATION_MODE').toLowerCase();
const ledgerInput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim()
    || 'artifacts/replit-design-release-ready-ledger.json',
);
const releasePreparationInput = resolve(
  process.env.RELEASE_PREPARATION_INPUT?.trim()
    || 'artifacts/replit-release-preparation.json',
);
const templateOutput = resolve(
  process.env.PUBLICATION_TEMPLATE_OUTPUT?.trim()
    || 'artifacts/replit-publication-confirmation-template.json',
);
const confirmationOutput = resolve(
  process.env.PUBLICATION_CONFIRMATION_OUTPUT?.trim()
    || 'artifacts/replit-publication-confirmation-receipt.json',
);
const boundReceiptOutput = resolve(
  process.env.BOUND_PUBLICATION_RECEIPT_OUTPUT?.trim()
    || 'artifacts/replit-bound-publication-receipt.json',
);
const ledgerOutput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim()
    || 'artifacts/replit-design-published-ledger.json',
);

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));
  const releasePreparation = JSON.parse(await readFile(releasePreparationInput, 'utf8'));

  if (mode === 'prepare') {
    const template = createPublicationConfirmationTemplate({
      project: ledger.project,
      releasePreparation,
      platform: required('PUBLICATION_PLATFORM'),
      preparedBy: required('TOOLRADAR_OPERATOR'),
      preparedAt: process.env.TOOLRADAR_PREPARED_AT?.trim() || new Date().toISOString(),
    });
    validatePublicationConfirmationTemplate(template);
    await writeJson(templateOutput, template);
    process.stdout.write(`${JSON.stringify({
      mode,
      status: 'PUBLICATION_EVIDENCE_REQUIRED',
      projectId: template.projectId,
      platform: template.platform,
      templateDigest: template.templateDigest,
      templateOutput,
      publicationConfirmed: template.publicationConfirmed,
      analyticsIntakeAllowed: template.analyticsIntakeAllowed,
      requiredEvidence: template.requiredEvidence,
    }, null, 2)}\n`);
  } else if (mode === 'confirm') {
    const templateInput = resolve(required('PUBLICATION_TEMPLATE_INPUT'));
    const publicationReceiptInput = resolve(required('PUBLICATION_RECEIPT_INPUT'));
    const template = JSON.parse(await readFile(templateInput, 'utf8'));
    const publicationReceipt = JSON.parse(await readFile(publicationReceiptInput, 'utf8'));
    const confirmation = confirmProjectPublication({
      project: ledger.project,
      releasePreparation,
      template,
      publicationReceipt,
      actor: required('TOOLRADAR_OPERATOR'),
      occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
    });
    validatePublicationConfirmationReceipt(confirmation);
    await writeJson(confirmationOutput, confirmation);

    if (confirmation.status === 'PUBLISHED') {
      await writeJson(boundReceiptOutput, confirmation.boundPublicationReceipt);
      await writeJson(ledgerOutput, {
        ...ledger,
        project: confirmation.updatedProject,
        summary: confirmation.summary,
        publicationConfirmation: {
          platform: confirmation.platform,
          boundReceiptDigest: confirmation.boundPublicationReceipt.receiptDigest,
          confirmationReceiptDigest: confirmation.receiptDigest,
          truthBoundary: confirmation.truthBoundary,
        },
      });
    }

    process.stdout.write(`${JSON.stringify({
      mode,
      status: confirmation.status,
      projectId: confirmation.projectId,
      platform: confirmation.platform,
      projectStage: confirmation.summary?.stage ?? null,
      projectStatus: confirmation.summary?.status ?? null,
      nextLifecycleEvent: confirmation.nextLifecycleEvent,
      confirmationOutput,
      boundReceiptOutput: confirmation.status === 'PUBLISHED' ? boundReceiptOutput : null,
      ledgerOutput: confirmation.status === 'PUBLISHED' ? ledgerOutput : null,
      publicationConfirmed: confirmation.publicationConfirmed,
      analyticsIntakeAllowed: confirmation.analyticsIntakeAllowed,
      platformApiVerified: confirmation.platformApiVerified,
      metricsObserved: confirmation.metricsObserved,
      errors: confirmation.errors,
    }, null, 2)}\n`);
    if (confirmation.status !== 'PUBLISHED') process.exitCode = 2;
  } else {
    throw new Error(`unsupported_mode:${mode}`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
