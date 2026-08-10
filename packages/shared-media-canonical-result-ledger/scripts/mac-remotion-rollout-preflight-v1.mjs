#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname} from 'node:path';

import {validateMacCanonicalReceiptRolloutTargetV1} from '../src/index.mjs';

function usage() {
  process.stderr.write('usage: node mac-remotion-rollout-preflight-v1.mjs --server <path> --dry-run\n');
  process.exit(2);
}

const args = process.argv.slice(2);
const serverIndex = args.indexOf('--server');
if (serverIndex < 0 || !args[serverIndex + 1] || !args.includes('--dry-run')) usage();
if (args.includes('--apply') || args.includes('--restart') || args.includes('--render')) {
  throw new Error('RUNTIME_MUTATION_NOT_AUTHORIZED');
}

const serverPath = args[serverIndex + 1];
const bytes = readFileSync(serverPath);
const serverSha256 = createHash('sha256').update(bytes).digest('hex');
const runtimeDir = dirname(serverPath);
const gitProbe = spawnSync('git', ['-C', runtimeDir, 'rev-parse', '--is-inside-work-tree'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const gitRepositoryObserved = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true';
const target = validateMacCanonicalReceiptRolloutTargetV1({
  serverSha256,
  gitRepositoryObserved,
});

process.stdout.write(`${JSON.stringify({
  schemaVersion: 'shared-media.mac-canonical-receipt-rollout-preflight.v1',
  serverSha256,
  gitRepositoryObserved,
  exactShaMatch: true,
  backupRequired: target.backupRequired,
  nodeCheckRequired: target.nodeCheckRequired,
  alternatePortVerificationRequired: target.alternatePortVerificationRequired,
  healthCheckRequired: target.healthCheckRequired,
  rollbackRequired: target.rollbackRequired,
  renderSubmissionAuthorized: false,
  serviceRestartAuthorized: false,
  runtimeMutationAuthorized: false,
  sourceContentEmitted: false,
}, null, 2)}\n`);
