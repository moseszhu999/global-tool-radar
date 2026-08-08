import assert from 'node:assert/strict';
import test from 'node:test';

import {createSharedMediaMcpController, normalizeWorkflowManifest, sha256Json} from '../src/index.mjs';
import {createSharedMediaMcpServer} from '../src/server.mjs';

const digest = (label) => sha256Json({label});

const workflow = (overrides = {}) => ({
  id: 'shared-media-image-polish-v1',
  version: '1.0.0',
  digest: digest('workflow-v1'),
  purpose: 'Reference-guided image polish for non-factual visual layers',
  outputTypes: ['image/png'],
  allowedParameters: {
    prompt: {type: 'string', required: true, maxLength: 1000},
    denoise: {type: 'number', required: true, minimum: 0.2, maximum: 0.4},
    seed: {type: 'integer', required: true, minimum: 0, maximum: 2147483647},
    preserveLayout: {type: 'boolean'},
  },
  requiredModels: ['example-model@sha256:' + digest('model')],
  requiredCustomNodes: [],
  available: true,
  commercialSafetyApproved: false,
  ...overrides,
});

const createBackend = () => {
  const calls = {generate: [], getJob: [], getArtifact: [], cancelJob: [], references: []};
  return {
    calls,
    async isReferenceAssetAuthorized(assetId) {
      calls.references.push(assetId);
      return assetId === 'asset:approved-reference';
    },
    async generate(input) {
      calls.generate.push(input);
      return {status: 'queued', jobId: 'job:1'};
    },
    async getJob(jobId) {
      calls.getJob.push(jobId);
      return {jobId, status: 'running', progress: 0.5};
    },
    async getArtifact(artifactId) {
      calls.getArtifact.push(artifactId);
      return {artifactId, status: 'ready', mimeType: 'image/png', sha256: digest('artifact')};
    },
    async cancelJob(jobId) {
      calls.cancelJob.push(jobId);
      return {jobId, status: 'cancelled'};
    },
  };
};

const controllerFor = ({workflows = [workflow()], backend = createBackend()} = {}) => ({
  controller: createSharedMediaMcpController({workflows, backend}),
  backend,
});

test('workflow registry is deterministic and returns copies', () => {
  const backend = createBackend();
  const controller = createSharedMediaMcpController({
    workflows: [workflow({id: 'z-workflow'}), workflow({id: 'a-workflow', digest: digest('a')})],
    backend,
  });
  const listed = controller.listWorkflows();
  assert.deepEqual(listed.map((item) => item.id), ['a-workflow', 'z-workflow']);
  listed[0].id = 'mutated';
  assert.equal(controller.listWorkflows()[0].id, 'a-workflow');
});

test('unknown workflow fails before backend execution', async () => {
  const {controller, backend} = controllerFor();
  await assert.rejects(() => controller.generateAsset({workflowId: 'missing', purpose: 'test'}), /unknown workflowId/);
  assert.equal(backend.calls.generate.length, 0);
});

test('valid bounded generation binds request and evidence identity', async () => {
  const {controller, backend} = controllerFor();
  const result = await controller.generateAsset({
    workflowId: 'shared-media-image-polish-v1',
    purpose: 'Polish an already truthful ToolRadar background',
    parameters: {prompt: 'subtle dark studio material polish', denoise: 0.35, seed: 24080835, preserveLayout: true},
    referenceAssetIds: ['asset:approved-reference'],
    outputProfile: {width: 1080, height: 1920},
  });
  assert.equal(result.status, 'queued');
  assert.equal(result.jobId, 'job:1');
  assert.match(result.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(result.workflowDigest, digest('workflow-v1'));
  assert.match(result.inputManifestDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.humanApproved, false);
  assert.equal(result.publicationPerformed, false);
  assert.equal(result.analyticsObserved, false);
  assert.equal(backend.calls.generate.length, 1);
  assert.equal(backend.calls.generate[0].request.parameters.denoise, 0.35);
  assert.equal(backend.calls.references.length, 1);
});

test('arbitrary graph-style parameter is rejected before backend execution', async () => {
  const {controller, backend} = controllerFor();
  await assert.rejects(() => controller.generateAsset({
    workflowId: 'shared-media-image-polish-v1',
    purpose: 'test',
    parameters: {prompt: 'x', denoise: 0.35, seed: 1, graph: '{"nodes":[]}'},
  }), /parameters\.graph is not allowed/);
  assert.equal(backend.calls.generate.length, 0);
});

test('out-of-range bounded parameter is rejected before backend execution', async () => {
  const {controller, backend} = controllerFor();
  await assert.rejects(() => controller.generateAsset({
    workflowId: 'shared-media-image-polish-v1',
    purpose: 'test',
    parameters: {prompt: 'x', denoise: 0.95, seed: 1},
  }), /denoise is above maximum/);
  assert.equal(backend.calls.generate.length, 0);
});

test('missing required parameter is rejected', async () => {
  const {controller, backend} = controllerFor();
  await assert.rejects(() => controller.generateAsset({
    workflowId: 'shared-media-image-polish-v1',
    purpose: 'test',
    parameters: {denoise: 0.35, seed: 1},
  }), /parameters\.prompt is required/);
  assert.equal(backend.calls.generate.length, 0);
});

test('unauthorized reference asset fails closed before backend execution', async () => {
  const {controller, backend} = controllerFor();
  await assert.rejects(() => controller.generateAsset({
    workflowId: 'shared-media-image-polish-v1',
    purpose: 'test',
    parameters: {prompt: 'x', denoise: 0.35, seed: 1},
    referenceAssetIds: ['asset:not-authorized'],
  }), /reference asset is not authorized/);
  assert.equal(backend.calls.generate.length, 0);
});

test('workflow requiring unapproved custom nodes cannot be registered', () => {
  assert.throws(() => normalizeWorkflowManifest(workflow({
    id: 'custom-node-workflow',
    digest: digest('custom'),
    requiredCustomNodes: ['third-party/node@1.0.0'],
    customNodesApproved: false,
  })), /custom nodes must be explicitly approved/);
});

test('approved custom-node manifest may be registered explicitly', () => {
  const normalized = normalizeWorkflowManifest(workflow({
    id: 'reviewed-custom-node-workflow',
    digest: digest('reviewed-custom'),
    requiredCustomNodes: ['reviewed/node@1.0.0'],
    customNodesApproved: true,
  }));
  assert.deepEqual(normalized.requiredCustomNodes, ['reviewed/node@1.0.0']);
});

test('secret-shaped workflow fields are rejected', () => {
  assert.throws(() => normalizeWorkflowManifest({...workflow(), apiKey: 'do-not-store'}), /apiKey is forbidden/);
});

test('secret-shaped backend results are rejected instead of echoed', async () => {
  const backend = createBackend();
  backend.getJob = async (jobId) => ({jobId, status: 'running', authorization: 'Bearer abc123'});
  const controller = createSharedMediaMcpController({workflows: [workflow()], backend});
  await assert.rejects(() => controller.getJob('job:1'), /authorization is forbidden/);
});

test('ready artifact requires valid SHA-256 and never implies approval/publication', async () => {
  const {controller} = controllerFor();
  const artifact = await controller.getArtifact('artifact:1');
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  assert.equal(artifact.humanApproved, false);
  assert.equal(artifact.publicationPerformed, false);
  assert.equal(artifact.analyticsObserved, false);
});

test('ready artifact without valid SHA-256 is rejected', async () => {
  const backend = createBackend();
  backend.getArtifact = async (artifactId) => ({artifactId, status: 'ready', sha256: 'bad'});
  const controller = createSharedMediaMcpController({workflows: [workflow()], backend});
  await assert.rejects(() => controller.getArtifact('artifact:1'), /valid sha256/);
});

test('job polling surface delegates stable job id', async () => {
  const {controller, backend} = controllerFor();
  const job = await controller.getJob('job:42');
  assert.equal(job.jobId, 'job:42');
  assert.deepEqual(backend.calls.getJob, ['job:42']);
});

test('cancellation delegates only one explicit job id', async () => {
  const {controller, backend} = controllerFor();
  const result = await controller.cancelJob('job:42');
  assert.equal(result.status, 'cancelled');
  assert.deepEqual(backend.calls.cancelJob, ['job:42']);
});

test('MCP server factory constructs with the six-tool controller surface', () => {
  const {controller} = controllerFor();
  const server = createSharedMediaMcpServer({controller});
  assert.ok(server);
  assert.equal(typeof server.registerTool, 'function');
});
