import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';

import {createMediaRenderRequestV1, validateMediaRenderResultV1} from '../../shared-media-render-contract/src/index.mjs';
import {createCanonicalTerminalReceiptV1} from '../../shared-media-canonical-result-ledger/src/index.mjs';
import {createCanonicalReceiptRuntimeV1} from '../src/runtime.mjs';
import {EXPECTED_MAC_REMOTION_SERVER_SHA256, patchMacRemotionServerV1} from '../scripts/patch-mac-remotion-server-v1.mjs';

const JOB_ID = '11111111-1111-4111-8111-111111111111';
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const runtime = createCanonicalReceiptRuntimeV1({validateMediaRenderResultV1});
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function request() {
  return createMediaRenderRequestV1({
    requestId: 'render-request-runtime-001',
    purpose: 'group.demo',
    title: 'Mac runtime receipt fixture',
    language: 'zh-CN',
    shots: [{shotId: 'shot-01', order: 1, durationMs: 1000, narration: {mode: 'none'}, visualAssetIds: []}],
    visualAssets: [],
    voice: {mode: 'none'},
    captions: {mode: 'none', format: 'none'},
    outputProfile: {profileId: 'portrait', width: 1080, height: 1920, fps: 30, container: 'mp4', videoCodec: 'h264', audioCodec: 'aac'},
  });
}

function succeeded(req = request()) {
  return {
    contractVersion: 'media.render.v1',
    messageType: 'result',
    requestId: req.requestId,
    jobId: JOB_ID,
    status: 'succeeded',
    artifact: {
      artifactId: 'artifact-runtime-001', locator: 'media://outputs/final.mp4', mediaType: 'video/mp4',
      byteLength: 123456, sha256: B, durationSeconds: 1, width: 1080, height: 1920,
      container: 'mp4', videoCodec: 'h264', audioCodec: 'aac',
    },
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: JOB_ID,
      inputManifestDigest: req.inputManifestDigest, artifactSha256: B,
      mediaInspection: {
        tool: 'ffprobe', status: 'passed', inspectedAt: '2026-08-10T03:00:00Z',
        format: {container: 'mp4', durationSeconds: 1, sizeBytes: 123456},
        streams: [
          {index: 0, type: 'video', codecName: 'h264', width: 1080, height: 1920, frameRate: 30},
          {index: 1, type: 'audio', codecName: 'aac'},
        ],
      },
      renderLog: {sha256: C, byteLength: 512}, collectedAt: '2026-08-10T03:00:01Z',
    },
    error: null,
  };
}

function failed(req = request()) {
  return {
    contractVersion: 'media.render.v1', messageType: 'result', requestId: req.requestId, jobId: JOB_ID,
    status: 'failed',
    evidence: {
      contractVersion: 'media.render.v1', messageType: 'evidence', requestId: req.requestId, jobId: JOB_ID,
      inputManifestDigest: req.inputManifestDigest,
      renderLog: {sha256: C, byteLength: 512}, collectedAt: '2026-08-10T03:00:01Z',
    },
    error: {code: 'RENDER_FAILED', stage: 'render', message: 'render exited non-zero', retryable: true},
  };
}

function receipt(result = succeeded()) {
  const req = request();
  return createCanonicalTerminalReceiptV1({request: req, result, persistedAt: '2026-08-10T03:00:05Z'});
}

function syntheticServerSource() {
  return `#!/usr/bin/env node\nimport http from 'node:http';\nimport {existsSync, readFileSync} from 'node:fs';\nimport {join} from 'node:path';\nimport {fileURLToPath} from 'node:url';\n\nconst JOBS_ROOT = '/tmp/jobs';\nconst MAX_BODY_BYTES = 256000;\nconst queue = [];\nconst children = new Map();\nlet active = 0;\n\nasync function route(req, res, url) {\n    const statusMatch = url.pathname.match(/^\\/v1\\/jobs\\/([a-f0-9-]+)$/i);\n    if (req.method === 'GET' && statusMatch) {\n      const job = loadJob(statusMatch[1]);\n      if (!job) return json(res, 404, {ok: false, error: 'job_not_found'});\n      return json(res, 200, publicJob(job));\n    }\n}\n\nfunction publicJob(job) { return {id: job.id, status: job.status}; }\nfunction persistJob(job) { return job; }\nfunction loadJob(id) {\n  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;\n  const path = join(JOBS_ROOT, id, 'job.json');\n  if (!existsSync(path)) return null;\n  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }\n}\nfunction updateJob(id, patch) { const job = loadJob(id); Object.assign(job, patch); persistJob(job); return job; }\nfunction readJson() {}\nfunction json() {}\n`;
}

test('runtime accepts a receipt issued by the accepted canonical ledger contract', () => {
  const value = runtime.validateReceipt(receipt(), {jobId: JOB_ID});
  assert.equal(value.schemaVersion, 'shared-media.canonical-terminal-receipt.v1');
  assert.equal(value.terminalStatus, 'succeeded');
  assert.equal(value.publicationAllowed, false);
  assert.equal(Object.isFrozen(value.canonicalResult), true);
});

test('runtime accepts canonical failed receipt without inventing success', () => {
  const req = request();
  const value = runtime.validateReceipt(createCanonicalTerminalReceiptV1({request: req, result: failed(req), persistedAt: '2026-08-10T03:00:05Z'}), {jobId: JOB_ID});
  assert.equal(value.terminalStatus, 'failed');
  assert.equal('artifact' in value.canonicalResult, false);
});

test('runtime rejects job identity mismatch', () => {
  assert.throws(() => runtime.validateReceipt(receipt(), {jobId: '22222222-2222-4222-8222-222222222222'}), /CANONICAL_RECEIPT_JOB_ID_MISMATCH/);
});

test('runtime rejects tampered canonical result digest', () => {
  const value = structuredClone(receipt());
  value.canonicalResult.artifact.byteLength += 1;
  assert.throws(() => runtime.validateReceipt(value, {jobId: JOB_ID}), /EVIDENCE_MISMATCH|RESULT_DIGEST_MISMATCH/);
});

test('runtime rejects widened human/publication boundary even if payload is otherwise unchanged', () => {
  const value = structuredClone(receipt());
  value.publicationAllowed = true;
  assert.throws(() => runtime.validateReceipt(value, {jobId: JOB_ID}), /BOUNDARY_MISMATCH/);
});

test('first durable slot write is created and frozen', () => {
  const slot = runtime.writeReceipt({incomingReceipt: receipt(), jobId: JOB_ID});
  assert.equal(slot.writeDisposition, 'created');
  assert.equal(Object.isFrozen(slot.canonicalResultReceipt), true);
});

test('identical receipt replay is idempotent', () => {
  const current = receipt();
  const slot = runtime.writeReceipt({existingReceipt: current, incomingReceipt: current, jobId: JOB_ID});
  assert.equal(slot.writeDisposition, 'idempotent_replay');
  assert.equal(slot.canonicalResultReceipt.receiptDigest, current.receiptDigest);
});

test('different terminal truth for same Mac job fails closed', () => {
  const req = request();
  const ok = createCanonicalTerminalReceiptV1({request: req, result: succeeded(req), persistedAt: '2026-08-10T03:00:05Z'});
  const bad = createCanonicalTerminalReceiptV1({request: req, result: failed(req), persistedAt: '2026-08-10T03:00:05Z'});
  assert.throws(() => runtime.writeReceipt({existingReceipt: ok, incomingReceipt: bad, jobId: JOB_ID}), /CANONICAL_TERMINAL_RECEIPT_CONFLICT/);
});

test('recovery returns null for transport-only legacy job and validates persisted receipt when present', () => {
  assert.equal(runtime.recoverReceipt({job: {id: JOB_ID, status: 'completed'}}), null);
  const recovered = runtime.recoverReceipt({job: {id: JOB_ID, status: 'completed', canonicalResultReceipt: receipt()}});
  assert.equal(recovered.terminalStatus, 'succeeded');
});

test('production patcher refuses any server SHA drift', () => {
  assert.equal(EXPECTED_MAC_REMOTION_SERVER_SHA256, 'bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f');
  assert.throws(() => patchMacRemotionServerV1(syntheticServerSource()), /MAC_REMOTION_SERVER_SHA_MISMATCH/);
});

test('patcher inserts only canonical receipt runtime hooks when an exact synthetic source is authorized', () => {
  const source = syntheticServerSource();
  const result = patchMacRemotionServerV1(source, {expectedSha256: sha256(source)});
  assert.match(result.patchedSource, /shared-media-canonical-receipt-runtime-v1\.mjs/);
  assert.match(result.patchedSource, /shared-media-render-contract-v1\.mjs/);
  assert.match(result.patchedSource, /\/canonical-result/);
  assert.match(result.patchedSource, /canonical_result_not_ready/);
  assert.match(result.patchedSource, /canonicalReceiptRuntime\.recoverReceipt\(\{job\}\)/);
  assert.equal(result.liveMutationPerformed, false);
  assert.equal(result.renderSubmitted, false);
});

test('patcher output is deterministic for the same exact source', () => {
  const source = syntheticServerSource();
  const expectedSha256 = sha256(source);
  const one = patchMacRemotionServerV1(source, {expectedSha256});
  const two = patchMacRemotionServerV1(source, {expectedSha256});
  assert.equal(one.patchedSha256, two.patchedSha256);
  assert.equal(one.patchedSource, two.patchedSource);
});

test('patcher fails closed when an audited anchor is missing', () => {
  const source = syntheticServerSource().replace("import {fileURLToPath} from 'node:url';\n", '');
  assert.throws(() => patchMacRemotionServerV1(source, {expectedSha256: sha256(source)}), /IMPORT_ANCHOR_COUNT_0/);
});

test('patcher never introduces a second database/store owner or runtime side effect', () => {
  const source = syntheticServerSource();
  const result = patchMacRemotionServerV1(source, {expectedSha256: sha256(source)});
  assert.doesNotMatch(result.patchedSource, /sqlite|DATABASE_URL|redis/i);
  assert.deepEqual(result.runtimeFilesRequired, ['shared-media-canonical-receipt-runtime-v1.mjs', 'shared-media-render-contract-v1.mjs']);
  assert.equal(result.serviceRestartPerformed, false);
});
