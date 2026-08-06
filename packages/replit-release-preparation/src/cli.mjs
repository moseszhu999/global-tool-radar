#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  applyReleasePreparationToProject,
  createReleasePreparation,
  validateReleasePreparation,
  validateReleasePreparationReceipt,
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

const ledgerInput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim()
    || 'artifacts/replit-design-quality-approved-ledger.json',
);
const productionCaseInput = resolve(
  process.env.PRODUCTION_CASE_INPUT?.trim()
    || 'apps/web/data/replit-design-production-case.json',
);
const packageOutput = resolve(
  process.env.RELEASE_PREPARATION_OUTPUT?.trim()
    || 'artifacts/replit-release-preparation.json',
);
const receiptOutput = resolve(
  process.env.RELEASE_PREPARATION_RECEIPT_OUTPUT?.trim()
    || 'artifacts/replit-release-preparation-receipt.json',
);
const ledgerOutput = resolve(
  process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim()
    || 'artifacts/replit-design-release-ready-ledger.json',
);

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));
  const productionCase = JSON.parse(await readFile(productionCaseInput, 'utf8'));
  const actor = required('TOOLRADAR_OPERATOR');
  const releasePreparation = createReleasePreparation({
    project: ledger.project,
    productionCase,
    coverPaths: {
      douyin: required('DOUYIN_COVER_PATH'),
      bilibili: required('BILIBILI_COVER_PATH'),
    },
    operator: actor,
    preparedAt: process.env.TOOLRADAR_PREPARED_AT?.trim() || new Date().toISOString(),
  });
  if (!validateReleasePreparation(releasePreparation)) throw new Error('release preparation validation failed');

  const receipt = applyReleasePreparationToProject({
    project: ledger.project,
    releasePreparation,
    actor,
    occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
  });
  validateReleasePreparationReceipt(receipt);

  await writeJson(packageOutput, releasePreparation);
  await writeJson(receiptOutput, receipt);
  await writeJson(ledgerOutput, {
    ...ledger,
    project: receipt.updatedProject,
    summary: receipt.summary,
    releasePreparation: {
      packageDigest: releasePreparation.packageDigest,
      receiptDigest: receipt.receiptDigest,
      platforms: releasePreparation.platformHandoffs.map((handoff) => handoff.platform),
      truthBoundary: receipt.truthBoundary,
    },
  });

  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    projectId: receipt.projectId,
    projectStage: receipt.summary.stage,
    projectStatus: receipt.summary.status,
    nextLifecycleEvent: receipt.nextLifecycleEvent,
    platforms: releasePreparation.platformHandoffs.map((handoff) => handoff.platform),
    packageOutput,
    receiptOutput,
    ledgerOutput,
    platformLoginPerformed: receipt.platformLoginPerformed,
    uploadPerformed: receipt.uploadPerformed,
    publishActionPerformed: receipt.publishActionPerformed,
    publicationAllowed: receipt.publicationAllowed,
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
