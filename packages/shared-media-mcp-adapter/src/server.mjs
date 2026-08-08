import {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const jsonResult = (value) => ({
  content: [{type: 'text', text: JSON.stringify(value)}],
  structuredContent: value,
});

const scalar = z.union([z.string(), z.number(), z.boolean()]);
const parameterMap = z.record(z.string().min(1).max(128), scalar);

const assertController = (controller) => {
  for (const method of ['listWorkflows', 'getWorkflow', 'generateAsset', 'getJob', 'getArtifact', 'cancelJob']) {
    if (typeof controller?.[method] !== 'function') throw new TypeError(`controller.${method} must be a function`);
  }
  return controller;
};

export const createSharedMediaMcpServer = ({controller, name = 'shared-media', version = '0.1.0'} = {}) => {
  const media = assertController(controller);
  const server = new McpServer(
    {name, version},
    {
      instructions: [
        'Use approved Shared Media workflows only.',
        'List or inspect a workflow before requesting generation when its parameter contract is unknown.',
        'Generation/render success is technical evidence only; never infer human approval, publication, or analytics.',
        'Do not request arbitrary ComfyUI graphs, credentials, social accounts, or custom-node installation through this server.',
      ].join(' '),
    },
  );

  server.registerTool(
    'media_list_workflows',
    {
      title: 'List Approved Media Workflows',
      description: 'List the approved, bounded Shared Media workflow manifests available to this caller. Does not expose renderer credentials or arbitrary graph JSON.',
      inputSchema: z.object({}).strict(),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    },
    async () => jsonResult({workflows: media.listWorkflows()}),
  );

  server.registerTool(
    'media_get_workflow',
    {
      title: 'Get Approved Media Workflow',
      description: 'Read one approved workflow manifest, including its digest, allowed parameters, output types, and model/custom-node requirements.',
      inputSchema: z.object({workflowId: z.string().min(1).max(128)}).strict(),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    },
    async ({workflowId}) => jsonResult({workflow: media.getWorkflow(workflowId)}),
  );

  server.registerTool(
    'media_generate_asset',
    {
      title: 'Generate Media Asset',
      description: 'Submit one bounded generation/render request using an approved workflow. Parameters outside the workflow allowlist, unauthorized references, and unapproved custom-node workflows are rejected before backend execution.',
      inputSchema: z.object({
        workflowId: z.string().min(1).max(128),
        purpose: z.string().min(1).max(1000),
        parameters: parameterMap.optional(),
        referenceAssetIds: z.array(z.string().min(1).max(128)).max(32).optional(),
        outputProfile: parameterMap.optional(),
      }).strict(),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false},
    },
    async (input) => jsonResult(await media.generateAsset(input)),
  );

  server.registerTool(
    'media_get_job',
    {
      title: 'Get Media Job',
      description: 'Read the current state of one durable Shared Media generation/render job. This is the compatibility path for clients that do not use MCP Tasks.',
      inputSchema: z.object({jobId: z.string().min(1).max(256)}).strict(),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    },
    async ({jobId}) => jsonResult({job: await media.getJob(jobId)}),
  );

  server.registerTool(
    'media_get_artifact',
    {
      title: 'Get Media Artifact Evidence',
      description: 'Read immutable metadata/evidence for a completed or pending artifact. Returns metadata, digests, and technical evidence only; never human approval or publication truth.',
      inputSchema: z.object({artifactId: z.string().min(1).max(256)}).strict(),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    },
    async ({artifactId}) => jsonResult({artifact: await media.getArtifact(artifactId)}),
  );

  server.registerTool(
    'media_cancel_job',
    {
      title: 'Cancel Owned Media Job',
      description: 'Request bounded cancellation of one owned job. The backend must enforce ownership/scope; this tool cannot clear the general queue or cancel unrelated work.',
      inputSchema: z.object({jobId: z.string().min(1).max(256)}).strict(),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false},
    },
    async ({jobId}) => jsonResult({cancellation: await media.cancelJob(jobId)}),
  );

  return server;
};
