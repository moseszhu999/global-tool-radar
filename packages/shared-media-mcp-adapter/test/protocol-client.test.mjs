import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {Client, InMemoryTransport} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';

import {createSharedMediaMcpController, sha256Json} from '../src/index.mjs';
import {createSharedMediaMcpServer} from '../src/server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

const workflow = () => ({
  id: 'protocol-image-polish-v1',
  version: '1.0.0',
  digest: sha256Json({fixture: 'protocol-image-polish-v1'}),
  purpose: 'Protocol integration fixture for bounded image polish',
  outputTypes: ['image/png'],
  allowedParameters: {
    prompt: {type: 'string', required: true, maxLength: 200},
    denoise: {type: 'number', required: true, minimum: 0.2, maximum: 0.4},
    seed: {type: 'integer', required: true, minimum: 0, maximum: 99999999},
  },
  requiredModels: [],
  requiredCustomNodes: [],
  available: true,
  commercialSafetyApproved: false,
});

const backend = () => ({
  async isReferenceAssetAuthorized(assetId) {
    return assetId === 'asset:protocol-reference';
  },
  async generate({request}) {
    return {status: 'queued', jobId: `job:${request.workflowId}`};
  },
  async getJob(jobId) {
    return {jobId, status: 'running', progress: 0.5};
  },
  async getArtifact(artifactId) {
    return {artifactId, status: 'ready', mimeType: 'image/png', sha256: sha256Json({artifactId})};
  },
  async cancelJob(jobId) {
    return {jobId, status: 'cancelled'};
  },
});

const expectedTools = [
  'media_cancel_job',
  'media_generate_asset',
  'media_get_artifact',
  'media_get_job',
  'media_get_workflow',
  'media_list_workflows',
];

const legacyConsumerTruthKeys = [
  'humanApproved',
  'humanWatchedFullCandidate',
  'socialPlatformBusinessFitApprovedByHuman',
  'publicationAllowed',
  'publicationPerformed',
  'analyticsObserved',
];

const call = async (client, name, args = {}) => client.callTool({name, arguments: args});

const assertTechnicalTruthBoundary = (value) => {
  assert.equal(value.technicalResultOnly, true);
  assert.equal(value.humanDecisionInferred, false);
  assert.equal(value.consumerDomainDecisionInferred, false);
  assert.equal(value.businessOutcomeInferred, false);
  for (const key of legacyConsumerTruthKeys) assert.equal(key in value, false);
};

test('legacy in-memory client lists and calls the six bounded MCP tools', async (t) => {
  const controller = createSharedMediaMcpController({workflows: [workflow()], backend: backend()});
  const server = createSharedMediaMcpServer({controller, name: 'shared-media-in-memory-test'});
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({name: 'shared-media-test-client', version: '1.0.0'});

  t.after(async () => {
    await client.close().catch(() => {});
    await server.close().catch(() => {});
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  assert.equal(client.getProtocolEra(), 'legacy');

  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), expectedTools);

  const workflowList = await call(client, 'media_list_workflows');
  assert.equal(workflowList.isError, undefined);
  assert.equal(workflowList.structuredContent.workflows[0].id, 'protocol-image-polish-v1');

  const generated = await call(client, 'media_generate_asset', {
    workflowId: 'protocol-image-polish-v1',
    purpose: 'protocol integration',
    parameters: {prompt: 'subtle polish', denoise: 0.35, seed: 7},
    referenceAssetIds: ['asset:protocol-reference'],
    outputProfile: {width: 1080, height: 1920},
  });
  assert.equal(generated.isError, undefined);
  assert.equal(generated.structuredContent.jobId, 'job:protocol-image-polish-v1');
  assertTechnicalTruthBoundary(generated.structuredContent);

  const rejected = await call(client, 'media_generate_asset', {
    workflowId: 'protocol-image-polish-v1',
    purpose: 'reject raw graph',
    parameters: {prompt: 'x', denoise: 0.35, seed: 1, graph: '{"nodes":[]}'},
  });
  assert.equal(rejected.isError, true);
});

test('modern stdio client negotiates 2026-07-28 and uses durable Shared Media jobs without tasks', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'shared-media-mcp-modern-'));
  const workflowsFile = join(scratch, 'workflows.json');
  const backendFile = join(scratch, 'backend.mjs');
  await writeFile(workflowsFile, JSON.stringify([workflow()], null, 2) + '\n');
  await writeFile(backendFile, `
import {createHash} from 'node:crypto';
const sha=(value)=>createHash('sha256').update(value).digest('hex');
export const backend={
  async isReferenceAssetAuthorized(assetId){ return assetId === 'asset:protocol-reference'; },
  async generate({request}){ return {status:'queued',jobId:'job:'+request.workflowId}; },
  async getJob(jobId){ return {jobId,status:'running',progress:0.5}; },
  async getArtifact(artifactId){ return {artifactId,status:'ready',mimeType:'image/png',sha256:sha(artifactId)}; },
  async cancelJob(jobId){ return {jobId,status:'cancelled'}; }
};
`);

  const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'src', 'stdio.mjs')],
    cwd: packageRoot,
    env: {
      ...inheritedEnv,
      SHARED_MEDIA_MCP_WORKFLOWS_FILE: workflowsFile,
      SHARED_MEDIA_MCP_BACKEND_MODULE: backendFile,
    },
    stderr: 'pipe',
  });
  const client = new Client(
    {name: 'shared-media-modern-test-client', version: '1.0.0'},
    {versionNegotiation: {mode: {pin: '2026-07-28'}}},
  );

  t.after(async () => {
    await client.close().catch(() => {});
    await rm(scratch, {recursive: true, force: true});
  });

  await client.connect(transport);
  assert.equal(client.getProtocolEra(), 'modern');

  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), expectedTools);
  assert.equal(listed.tools.some((tool) => tool.name.startsWith('tasks/')), false);

  const generated = await call(client, 'media_generate_asset', {
    workflowId: 'protocol-image-polish-v1',
    purpose: 'modern protocol integration',
    parameters: {prompt: 'subtle polish', denoise: 0.35, seed: 8},
  });
  assert.equal(generated.isError, undefined);
  assert.equal(generated.structuredContent.status, 'queued');
  assert.equal(generated.structuredContent.jobId, 'job:protocol-image-polish-v1');
  assert.equal('taskId' in generated.structuredContent, false);
  assertTechnicalTruthBoundary(generated.structuredContent);

  const job = await call(client, 'media_get_job', {jobId: generated.structuredContent.jobId});
  assert.equal(job.isError, undefined);
  assert.equal(job.structuredContent.job.jobId, generated.structuredContent.jobId);
  assertTechnicalTruthBoundary(job.structuredContent.job);

  const artifact = await call(client, 'media_get_artifact', {artifactId: 'artifact:modern'});
  assert.equal(artifact.isError, undefined);
  assert.match(artifact.structuredContent.artifact.sha256, /^[a-f0-9]{64}$/);
  assertTechnicalTruthBoundary(artifact.structuredContent.artifact);

  const invalidSchema = await call(client, 'media_get_job', {jobId: ''});
  assert.equal(invalidSchema.isError, true);

  await assert.rejects(() => call(client, 'tasks/get', {taskId: 'not-supported'}));
});
