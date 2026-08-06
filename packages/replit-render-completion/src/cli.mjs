#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  completeVideoProjectRender,
  validateRenderCompletionReceipt,
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

const ledgerInput = resolve(process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim() || 'artifacts/replit-design-render-authorized-ledger.json');
const runnerRequestInput = resolve(required('MAC_REMOTION_RUNNER_REQUEST_INPUT'));
const runnerRunInput = resolve(required('MAC_REMOTION_RUN_RECEIPT_INPUT'));
const finalVideoInput = resolve(required('FINAL_VIDEO_RECEIPT_INPUT'));
const ledgerOutput = resolve(process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim() || 'artifacts/replit-design-render-completed-ledger.json');
const receiptOutput = resolve(process.env.RENDER_COMPLETION_RECEIPT_OUTPUT?.trim() || 'artifacts/replit-render-completion-receipt.json');
const evidenceOutput = resolve(process.env.RENDER_COMPLETION_EVIDENCE_OUTPUT?.trim() || 'artifacts/replit-render-completion-evidence.json');

try {
  const [ledger, runnerRequestEnvelope, runnerRunReceipt, finalVideoReceipt] = await Promise.all([
    readFile(ledgerInput, 'utf8').then(JSON.parse),
    readFile(runnerRequestInput, 'utf8').then(JSON.parse),
    readFile(runnerRunInput, 'utf8').then(JSON.parse),
    readFile(finalVideoInput, 'utf8').then(JSON.parse),
  ]);
  const receipt = completeVideoProjectRender({
    project: ledger.project,
    runnerRequestEnvelope,
    runnerRunReceipt,
    finalVideoReceipt,
    actor: required('TOOLRADAR_OPERATOR'),
    occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || new Date().toISOString(),
  });
  validateRenderCompletionReceipt(receipt);
  await writeJson(receiptOutput, receipt);

  if (receipt.status === 'RENDER_COMPLETED') {
    await writeJson(evidenceOutput, receipt.evidence);
    await writeJson(ledgerOutput, {
      ...ledger,
      project: receipt.updatedProject,
      summary: receipt.summary,
      renderCompletion: {
        receiptDigest: receipt.receiptDigest,
        evidenceDigest: receipt.evidenceDigest,
        finalVideoReceiptDigest: receipt.evidence.finalVideoReceiptDigest,
        finalVideoSha256: receipt.evidence.finalVideoSha256,
        truthBoundary: receipt.truthBoundary,
      },
    });
  }

  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    truthBoundary: receipt.truthBoundary,
    projectId: receipt.projectId,
    receiptOutput,
    evidenceOutput: receipt.status === 'RENDER_COMPLETED' ? evidenceOutput : null,
    ledgerOutput: receipt.status === 'RENDER_COMPLETED' ? ledgerOutput : null,
    projectStage: receipt.summary.stage,
    projectStatus: receipt.summary.status,
    nextLifecycleEvent: receipt.nextLifecycleEvent,
    renderCompleted: receipt.renderCompleted,
    m10ReviewPreparationAllowed: receipt.m10ReviewPreparationAllowed,
    qualityApproved: receipt.qualityApproved,
    publicationAllowed: receipt.publicationAllowed,
    errors: receipt.errors,
  }, null, 2)}\n`);

  if (receipt.status !== 'RENDER_COMPLETED') process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
