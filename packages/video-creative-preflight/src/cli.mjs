#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  createVideoCreativePreflight,
  validateVideoCreativePreflight,
} from './index.mjs';
import {toCreativePreflightGate} from './evidence-producer.mjs';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readGate = async (path) => {
  const input = await readJson(path);
  if (input?.schemaVersion === 'toolradar.video-creative-gate-evidence.v1') return toCreativePreflightGate(input);
  return input;
};

const ledgerInput = resolve(process.env.VIDEO_PROJECT_LEDGER_INPUT?.trim() || 'artifacts/replit-design-assets-verified-ledger.json');
const artGateInput = resolve(required('TOOLRADAR_ART_GATE_INPUT'));
const animaticGateInput = resolve(required('TOOLRADAR_ANIMATIC_GATE_INPUT'));
const output = resolve(process.env.TOOLRADAR_CREATIVE_PREFLIGHT_OUTPUT?.trim() || 'artifacts/toolradar-video-creative-preflight.json');

try {
  const ledger = await readJson(ledgerInput);
  const receipt = createVideoCreativePreflight({
    project: ledger.project,
    artGate: await readGate(artGateInput),
    animaticGate: await readGate(animaticGateInput),
    reviewer: required('TOOLRADAR_CREATIVE_REVIEWER'),
    reviewedAt: process.env.TOOLRADAR_CREATIVE_REVIEWED_AT?.trim() || new Date().toISOString(),
  });
  validateVideoCreativePreflight(receipt);
  await writeJson(output, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    truthBoundary: receipt.truthBoundary,
    projectId: receipt.projectId,
    sourceProjectDigest: receipt.sourceProjectDigest,
    output,
    renderAuthorizationInputAllowed: receipt.renderAuthorizationInputAllowed,
    humanCreativeApprovalClaimed: receipt.humanCreativeApprovalClaimed,
    publicationAllowed: receipt.publicationAllowed,
    errors: receipt.errors,
  }, null, 2)}\n`);
  if (receipt.status !== 'CREATIVE_PREFLIGHT_PASSED') process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
