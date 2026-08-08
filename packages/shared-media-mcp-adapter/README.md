# Shared Media MCP Adapter v1

Product-neutral MCP boundary for approved Shared Media workflows.

## Responsibilities

This package owns only:
- MCP tool registration;
- approved-workflow discovery;
- workflow/parameter allowlist validation;
- reference-asset authorization hooks;
- stable request/input-manifest identity;
- job/artifact/cancellation tool surfaces;
- secret-shaped evidence rejection;
- technical-vs-human/publication truth boundaries.

It does **not** own:
- the canonical `media.render.v1` schema (separate Shared Media contract owner);
- Mac Remotion transport implementation;
- ComfyUI raw graph design;
- model/custom-node installation;
- ToolRadar social publishing;
- human creative approval;
- analytics.

## MCP tools

Exactly six normal tools are registered:

```text
media_list_workflows
media_get_workflow
media_generate_asset
media_get_job
media_get_artifact
media_cancel_job
```

There is intentionally no `execute_arbitrary_graph`, generic command execution, queue clearing, credential setter, or social publishing tool.

## Workflow manifest

The MCP caller selects an approved workflow ID. The agent does not submit arbitrary renderer graphs.

Example manifest shape:

```json
{
  "id": "shared-media-image-polish-v1",
  "version": "1.0.0",
  "digest": "<64-char sha256>",
  "purpose": "Reference-guided image polish",
  "outputTypes": ["image/png"],
  "allowedParameters": {
    "prompt": {"type": "string", "required": true, "maxLength": 1000},
    "denoise": {"type": "number", "required": true, "minimum": 0.2, "maximum": 0.4},
    "seed": {"type": "integer", "required": true, "minimum": 0}
  },
  "requiredModels": [],
  "requiredCustomNodes": [],
  "available": true,
  "commercialSafetyApproved": false
}
```

If a workflow declares custom nodes, registration fails unless `customNodesApproved=true` is explicitly present. That flag means the executable dependency was reviewed for this workflow; it is not a general permission to install nodes dynamically.

## Backend contract

`createSharedMediaMcpController` requires a backend with:

```js
{
  generate({ workflow, request, inputManifestDigest }),
  getJob(jobId),
  getArtifact(artifactId),
  cancelJob(jobId),
  // required when referenceAssetIds are used:
  isReferenceAssetAuthorized(assetId)
}
```

The backend owns transport-specific authorization and job ownership. For example:
- a Mac Remotion adapter can reuse `packages/mac-remotion-runner-client`;
- a local ComfyUI adapter can translate an approved workflow manifest to the fixed local graph/API;
- neither transport should leak credentials into MCP results.

The controller rejects secret-shaped fields in manifests, parameters, and backend results.

## Stdio entry

The package includes an injectable stdio entry for local MCP hosts:

```bash
SHARED_MEDIA_MCP_WORKFLOWS_FILE=/absolute/path/workflows.json \
SHARED_MEDIA_MCP_BACKEND_MODULE=/absolute/path/backend.mjs \
node src/stdio.mjs
```

The backend module exports either:

```js
export const backend = { /* methods above */ };
```

or:

```js
export async function createBackend() {
  return { /* methods above */ };
}
```

The module itself may read runtime secrets from its environment. Secrets must never be placed in workflow JSON or MCP tool results.

The stdio protocol owns stdout. This package logs startup information only to stderr.

## Long-running work

v1 deliberately exposes durable job polling through `media_get_job`.

This keeps the adapter complete for clients that do not support the MCP Tasks extension. Tasks may later be added as a protocol optimization while preserving the same durable backend job/evidence identity; they must not create a second job model.

## Truth boundary

Every generated result force-binds:

```text
requestId
workflowId
workflowDigest
inputManifestDigest
humanApproved=false
publicationPerformed=false
analyticsObserved=false
```

A technically valid artifact likewise cannot imply human or publication approval.

## Validation

Run inside this package:

```bash
npm install --ignore-scripts
npm run check
npm test
```

A dedicated exact-head GitHub workflow installs the pinned direct dependencies and runs the contract suite. MCP Inspector / target-client integration remains a later deployment gate once a real backend module is bound.
