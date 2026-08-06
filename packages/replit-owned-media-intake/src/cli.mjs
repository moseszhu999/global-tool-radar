#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  intakeOwnedMediaIntoVideoProject,
  validateOwnedMediaIntakeReceipt,
} from './index.mjs';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const verified = (name) => process.env[name]?.trim().toLowerCase() === 'true';
const writeJson = async (path, value) => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const ledgerInput = resolve(process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim() || 'apps/web/data/replit-design-video-project-ledger.json');
const ledgerOutput = resolve(process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim() || 'artifacts/replit-design-assets-verified-ledger.json');
const receiptOutput = resolve(process.env.OWNED_MEDIA_INTAKE_RECEIPT_OUTPUT?.trim() || 'artifacts/replit-owned-media-intake-receipt.json');
const preflightOutput = resolve(process.env.REMOTION_PREFLIGHT_OUTPUT?.trim() || 'artifacts/remotion-media-preflight.json');

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));
  const receipt = await intakeOwnedMediaIntoVideoProject({
    project: ledger.project,
    actor: required('TOOLRADAR_OPERATOR'),
    occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
    media: {
      designRecording: required('REMOTION_DESIGN_RECORDING'),
      buildLimitRecording: required('REMOTION_BUILD_LIMIT_RECORDING'),
      voiceover: required('REMOTION_VOICEOVER'),
      designRecordingVerified: verified('REMOTION_DESIGN_RECORDING_VERIFIED'),
      buildLimitRecordingVerified: verified('REMOTION_BUILD_LIMIT_RECORDING_VERIFIED'),
      voiceoverVerified: verified('REMOTION_VOICEOVER_VERIFIED'),
    },
  });
  validateOwnedMediaIntakeReceipt(receipt);
  await writeJson(receiptOutput, receipt);
  await writeJson(preflightOutput, receipt.preflight);

  if (receipt.status === 'ASSETS_VERIFIED') {
    await writeJson(ledgerOutput, {
      ...ledger,
      project: receipt.updatedProject,
      summary: receipt.summary,
      ownedMediaIntake: {
        receiptDigest: receipt.receiptDigest,
        preflightReceiptDigest: receipt.preflight.receiptDigest,
        truthBoundary: receipt.truthBoundary,
      },
    });
  }

  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    truthBoundary: receipt.truthBoundary,
    projectId: receipt.projectId,
    receiptOutput,
    preflightOutput,
    ledgerOutput: receipt.status === 'ASSETS_VERIFIED' ? ledgerOutput : null,
    projectStage: receipt.summary.stage,
    projectStatus: receipt.summary.status,
    nextAction: receipt.nextAction,
    blockedAssets: receipt.preflight.assets.filter((asset) => !asset.ready).map(({role, errors}) => ({role, errors})),
    renderExecutionAllowed: receipt.renderExecutionAllowed,
  }, null, 2)}\n`);

  if (receipt.status !== 'ASSETS_VERIFIED') process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
