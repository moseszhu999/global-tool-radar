#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {recordQualityDecision} from '../../final-video-quality-review-pack/src/index.mjs';
import {
  applyProjectQualityDecision,
  prepareQualityReviewPackFromProject,
  validateQualityApprovalReceipt,
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

const action = (process.env.QUALITY_REVIEW_ACTION?.trim() || 'prepare').toLowerCase();
const ledgerInput = resolve(process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim() || 'artifacts/replit-design-render-completed-ledger.json');
const packOutput = resolve(process.env.QUALITY_REVIEW_PACK_OUTPUT?.trim() || 'artifacts/replit-final-video-quality-review-pack.json');

try {
  const ledger = JSON.parse(await readFile(ledgerInput, 'utf8'));

  if (action === 'prepare') {
    const pack = prepareQualityReviewPackFromProject({
      project: ledger.project,
      createdAt: process.env.QUALITY_REVIEW_CREATED_AT?.trim() || new Date().toISOString(),
      reviewerInstructionsVersion: process.env.QUALITY_REVIEW_INSTRUCTIONS_VERSION?.trim() || '2026-08-06',
    });
    await writeJson(packOutput, pack);
    process.stdout.write(`${JSON.stringify({
      action,
      status: 'QUALITY_REVIEW_PACK_PREPARED',
      projectId: ledger.project.projectId,
      packOutput,
      reviewPackDigest: pack.digest,
      checkCount: pack.checks.length,
      officialReviewCreated: pack.officialReviewCreated,
      publicationAllowed: pack.publicationAllowed,
    }, null, 2)}\n`);
  } else if (action === 'decide') {
    const packInput = resolve(process.env.QUALITY_REVIEW_PACK_INPUT?.trim() || packOutput);
    const decisionsInput = resolve(required('QUALITY_REVIEW_DECISIONS_INPUT'));
    const envelopeOutput = resolve(process.env.QUALITY_DECISION_ENVELOPE_OUTPUT?.trim() || 'artifacts/replit-quality-decision-envelope.json');
    const receiptOutput = resolve(process.env.QUALITY_APPROVAL_RECEIPT_OUTPUT?.trim() || 'artifacts/replit-quality-approval-receipt.json');
    const ledgerOutput = resolve(process.env.VIDEO_PROJECT_LEDGER_OUTPUT?.trim() || 'artifacts/replit-design-quality-approved-ledger.json');
    const [pack, decisions] = await Promise.all([
      readFile(packInput, 'utf8').then(JSON.parse),
      readFile(decisionsInput, 'utf8').then(JSON.parse),
    ]);
    const reviewer = required('QUALITY_REVIEWER');
    const reviewedAt = process.env.QUALITY_REVIEWED_AT?.trim() || new Date().toISOString();
    const envelope = recordQualityDecision(pack, {
      reviewer,
      reviewedAt,
      decisions: Array.isArray(decisions) ? decisions : decisions.decisions,
      reviewerApproved: process.env.QUALITY_REVIEWER_APPROVED?.trim().toLowerCase() === 'true',
    });
    await writeJson(envelopeOutput, envelope);
    const receipt = applyProjectQualityDecision({
      project: ledger.project,
      reviewPack: pack,
      qualityDecisionEnvelope: envelope,
      actor: process.env.TOOLRADAR_OPERATOR?.trim() || reviewer,
      occurredAt: process.env.TOOLRADAR_OCCURRED_AT?.trim() || reviewedAt,
    });
    validateQualityApprovalReceipt(receipt);
    await writeJson(receiptOutput, receipt);

    if (receipt.status === 'QUALITY_APPROVED') {
      await writeJson(ledgerOutput, {
        ...ledger,
        project: receipt.updatedProject,
        summary: receipt.summary,
        qualityApproval: {
          receiptDigest: receipt.receiptDigest,
          reviewPackDigest: receipt.reviewPackDigest,
          qualityDecisionEnvelopeDigest: receipt.qualityDecisionEnvelopeDigest,
          officialReviewSha256: receipt.officialReview.reviewSha256,
          truthBoundary: receipt.truthBoundary,
        },
      });
    }

    process.stdout.write(`${JSON.stringify({
      action,
      status: receipt.status,
      truthBoundary: receipt.truthBoundary,
      projectId: receipt.projectId,
      envelopeOutput,
      receiptOutput,
      ledgerOutput: receipt.status === 'QUALITY_APPROVED' ? ledgerOutput : null,
      projectStage: receipt.summary.stage,
      projectStatus: receipt.summary.status,
      nextLifecycleEvent: receipt.nextLifecycleEvent,
      releasePreparationAllowed: receipt.releasePreparationAllowed,
      publicationAllowed: receipt.publicationAllowed,
      errors: receipt.errors,
    }, null, 2)}\n`);
    if (receipt.status !== 'QUALITY_APPROVED') process.exitCode = 2;
  } else {
    throw new Error(`unsupported_quality_review_action:${action}`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
