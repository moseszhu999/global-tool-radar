import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const EXPECTED_MAC_REMOTION_SERVER_SHA256 = 'bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f';
export const RUNTIME_RECEIPT_MODULE = 'shared-media-canonical-receipt-runtime-v1.mjs';
export const RUNTIME_RENDER_CONTRACT_MODULE = 'shared-media-render-contract-v1.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const occurrenceCount = (source, needle) => source.split(needle).length - 1;
const requireOne = (source, needle, label) => {
  const count = occurrenceCount(source, needle);
  if (count !== 1) throw new Error(`${label}_ANCHOR_COUNT_${count}`);
};

const IMPORT_ANCHOR = "import {fileURLToPath} from 'node:url';\n";
const STATE_ANCHOR = "const children = new Map();\nlet active = 0;\n";
const STATUS_ROUTE_ANCHOR = `    const statusMatch = url.pathname.match(/^\\/v1\\/jobs\\/([a-f0-9-]+)$/i);\n    if (req.method === 'GET' && statusMatch) {\n      const job = loadJob(statusMatch[1]);\n      if (!job) return json(res, 404, {ok: false, error: 'job_not_found'});\n      return json(res, 200, publicJob(job));\n    }\n`;
const LOAD_JOB_ANCHOR = `function loadJob(id) {\n  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;\n  const path = join(JOBS_ROOT, id, 'job.json');\n  if (!existsSync(path)) return null;\n  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }\n}\n`;

const IMPORT_INSERT = `${IMPORT_ANCHOR}import {createCanonicalReceiptRuntimeV1} from './${RUNTIME_RECEIPT_MODULE}';\nimport {validateMediaRenderResultV1} from './${RUNTIME_RENDER_CONTRACT_MODULE}';\n`;
const STATE_INSERT = `${STATE_ANCHOR}const canonicalReceiptRuntime = createCanonicalReceiptRuntimeV1({validateMediaRenderResultV1});\n`;
const ROUTE_INSERT = `${STATUS_ROUTE_ANCHOR}\n    const canonicalResultMatch = url.pathname.match(/^\\/v1\\/jobs\\/([a-f0-9-]+)\\/canonical-result$/i);\n    if (req.method === 'GET' && canonicalResultMatch) {\n      const job = loadJob(canonicalResultMatch[1]);\n      if (!job) return json(res, 404, {ok: false, error: 'job_not_found'});\n      const receipt = canonicalReceiptRuntime.recoverReceipt({job});\n      if (!receipt) return json(res, 409, {ok: false, error: 'canonical_result_not_ready'});\n      return json(res, 200, {ok: true, canonicalResultReceipt: receipt});\n    }\n    if (req.method === 'POST' && canonicalResultMatch) {\n      const id = canonicalResultMatch[1];\n      const job = loadJob(id);\n      if (!job) return json(res, 404, {ok: false, error: 'job_not_found'});\n      const body = await readJson(req, MAX_BODY_BYTES);\n      const slot = canonicalReceiptRuntime.writeReceipt({\n        existingReceipt: job.canonicalResultReceipt ?? null,\n        incomingReceipt: body?.canonicalResultReceipt,\n        jobId: id,\n      });\n      if (slot.writeDisposition === 'created') {\n        updateJob(id, {canonicalResultReceipt: slot.canonicalResultReceipt});\n        const recovered = canonicalReceiptRuntime.recoverReceipt({job: loadJob(id)});\n        return json(res, 201, {ok: true, writeDisposition: 'created', canonicalResultReceipt: recovered});\n      }\n      return json(res, 200, {ok: true, writeDisposition: 'idempotent_replay', canonicalResultReceipt: slot.canonicalResultReceipt});\n    }\n`;
const LOAD_JOB_INSERT = `function loadJob(id) {\n  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;\n  const path = join(JOBS_ROOT, id, 'job.json');\n  if (!existsSync(path)) return null;\n  let job;\n  try { job = JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }\n  canonicalReceiptRuntime.recoverReceipt({job});\n  return job;\n}\n`;

export function patchMacRemotionServerV1(source, {expectedSha256 = EXPECTED_MAC_REMOTION_SERVER_SHA256} = {}) {
  if (typeof source !== 'string' || source.length < 1) throw new TypeError('source must be non-empty text');
  const actualSha256 = sha256(source);
  if (actualSha256 !== expectedSha256) throw new Error(`MAC_REMOTION_SERVER_SHA_MISMATCH:${actualSha256}`);
  for (const [needle, label] of [
    [IMPORT_ANCHOR, 'IMPORT'],
    [STATE_ANCHOR, 'STATE'],
    [STATUS_ROUTE_ANCHOR, 'STATUS_ROUTE'],
    [LOAD_JOB_ANCHOR, 'LOAD_JOB'],
  ]) requireOne(source, needle, label);
  if (source.includes('canonicalResultReceipt') || source.includes('/canonical-result')) {
    throw new Error('MAC_REMOTION_SERVER_ALREADY_PATCHED_OR_DRIFTED');
  }

  const patched = source
    .replace(IMPORT_ANCHOR, IMPORT_INSERT)
    .replace(STATE_ANCHOR, STATE_INSERT)
    .replace(STATUS_ROUTE_ANCHOR, ROUTE_INSERT)
    .replace(LOAD_JOB_ANCHOR, LOAD_JOB_INSERT);

  if (!patched.includes('createCanonicalReceiptRuntimeV1({validateMediaRenderResultV1})')) throw new Error('PATCH_RUNTIME_BINDING_MISSING');
  if (!patched.includes("error: 'canonical_result_not_ready'")) throw new Error('PATCH_READ_ROUTE_MISSING');
  if (!patched.includes("writeDisposition: 'idempotent_replay'")) throw new Error('PATCH_IDEMPOTENT_ROUTE_MISSING');
  if (patched.includes('sqlite') || patched.includes('DATABASE_URL') || patched.includes('redis')) throw new Error('PATCH_NEW_STORE_FORBIDDEN');
  return Object.freeze({
    sourceSha256: actualSha256,
    patchedSha256: sha256(patched),
    patchedSource: patched,
    runtimeFilesRequired: Object.freeze([RUNTIME_RECEIPT_MODULE, RUNTIME_RENDER_CONTRACT_MODULE]),
    liveMutationPerformed: false,
    serviceRestartPerformed: false,
    renderSubmitted: false,
  });
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedAsScript) {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--server');
  const outputIndex = args.indexOf('--out');
  if (inputIndex < 0 || !args[inputIndex + 1] || outputIndex < 0 || !args[outputIndex + 1]) {
    console.error('usage: node patch-mac-remotion-server-v1.mjs --server <server.mjs> --out <patched.mjs>');
    process.exit(2);
  }
  const source = readFileSync(args[inputIndex + 1], 'utf8');
  const result = patchMacRemotionServerV1(source);
  writeFileSync(args[outputIndex + 1], result.patchedSource, {mode: 0o600});
  console.log(JSON.stringify({
    schemaVersion: 'shared-media.mac-canonical-receipt-runtime-patch.v1',
    sourceSha256: result.sourceSha256,
    patchedSha256: result.patchedSha256,
    runtimeFilesRequired: result.runtimeFilesRequired,
    liveMutationPerformed: false,
    serviceRestartPerformed: false,
    renderSubmitted: false,
  }));
}
