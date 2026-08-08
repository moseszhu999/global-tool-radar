#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  authorizeReplitRender,
  validateRenderAuthorizationReceipt,
} from './index.mjs';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const optionalJson = (name) => {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`invalid_json_environment:${name}`);
  }
};

const writeJson = async (path, value) => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const ledgerInput = resolve(process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim() || 'artifacts/replit-design-assets-verified-ledger.json');
const creativePreflightInput = resolve(process.env.TOOLRADAR_CREATIVE_PREFLIGHT_INPUT?.trim() || 'artifacts/toolradar-video-creative-preflight.json');
const preflightInput = resolve(process.env.REMOTION_PREFLIGHT_INPUT?.trim() || 'artifacts/remotion-media-preflight.json');
const ledgerOutput = resolve(process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim() || 'artifacts/replit-design-render-authorized-ledger.json');
const receiptOutput = resolve(process.env.RENDER_AUTHORIZATION_RECEIPT_OUTPUT?.trim() || 'artifacts/replit-render-authorization-receipt.json');
const gateOutput = resolve(process.env.FINAL_RENDER_GATE_OUTPUT?.trim() || 'artifacts/remotion-final-render-gate.json');
const intentOutput = resolve(process.env.MAC_REMOTION_RENDER_INTENT_OUTPUT?.trim() || 'artifacts/mac-remotion-render-intent.json');

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));
  const creativePreflight = JSON.parse(await readFile(creativePreflightInput, 'utf8'));
  const receipt = await authorizeReplitRender({
    project: ledger.project,
    creativePreflight,
    preflightReceiptPath: preflightInput,
    actor: required('TOOLRADAR_OPERATOR'),
    occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
    appDir: process.env.REMOTION_APP_DIR?.trim() || 'apps/remotion-video',
    outputPath: process.env.REMOTION_OUTPUT_PATH?.trim() || 'out/toolradar-replit-final.mp4',
    renderProfile: optionalJson('REMOTION_RENDER_PROFILE_JSON'),
    compositionId: process.env.REMOTION_COMPOSITION_ID?.trim() || 'ToolRadarReplitPortrait',
  });
  validateRenderAuthorizationReceipt(receipt);
  await writeJson(receiptOutput, receipt);
  if (receipt.finalRenderGate) await writeJson(gateOutput, receipt.finalRenderGate);
  if (receipt.renderIntent) await writeJson(intentOutput, receipt.renderIntent);

  if (receipt.status === 'RENDER_AUTHORIZED') {
    await writeJson(ledgerOutput, {
      ...ledger,
      project: receipt.updatedProject,
      summary: receipt.summary,
      creativePreflight: {
        schemaVersion: receipt.creativePreflight.schemaVersion,
        status: receipt.creativePreflight.status,
        truthBoundary: receipt.creativePreflight.truthBoundary,
        receiptDigest: receipt.creativePreflightDigest,
        reviewer: receipt.creativePreflight.reviewer,
        reviewedAt: receipt.creativePreflight.reviewedAt,
        artGate: receipt.creativePreflight.artGate,
        animaticGate: receipt.creativePreflight.animaticGate,
        humanCreativeApprovalClaimed: receipt.creativePreflight.humanCreativeApprovalClaimed,
        publicationAllowed: receipt.creativePreflight.publicationAllowed,
      },
      renderAuthorization: {
        receiptDigest: receipt.receiptDigest,
        creativePreflightDigest: receipt.creativePreflightDigest,
        gateDigest: receipt.finalRenderGate.gateDigest,
        renderIntentBindingDigest: receipt.renderIntent.bindingDigest,
        truthBoundary: receipt.truthBoundary,
      },
    });
  }

  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    truthBoundary: receipt.truthBoundary,
    projectId: receipt.projectId,
    creativePreflightInput,
    creativePreflightDigest: receipt.creativePreflightDigest,
    receiptOutput,
    gateOutput: receipt.finalRenderGate ? gateOutput : null,
    intentOutput: receipt.renderIntent ? intentOutput : null,
    ledgerOutput: receipt.status === 'RENDER_AUTHORIZED' ? ledgerOutput : null,
    projectStage: receipt.summary.stage,
    projectStatus: receipt.summary.status,
    nextLifecycleEvent: receipt.nextLifecycleEvent,
    nextAction: receipt.nextAction,
    renderExecutionAllowed: receipt.renderExecutionAllowed,
    runnerSubmissionReady: receipt.runnerSubmissionReady,
    errors: receipt.errors,
  }, null, 2)}\n`);

  if (receipt.status !== 'RENDER_AUTHORIZED') process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
