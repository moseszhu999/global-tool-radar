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

There is intentionally no `execute_arbitrary_graph`, generic command execution, queue clearing, credential setter, social publishing tool, or MCP `tasks/*` dependency.

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

## Protocol era and long-running work

The v2 SDK does not put the 2026-07-28 era on the wire merely because v2 packages are installed. For stdio, this package uses `serveStdio(factory)`, which is the modern/legacy era-selecting entry point. A client that specifically needs 2026-07-28 behavior must opt into modern era negotiation.

Shared Media long-running correctness deliberately uses its own durable application-level job identity:

```text
media_generate_asset
→ completed result OR durable jobId
→ media_get_job
→ media_get_artifact
```

Do **not** redesign this around MCP `tasks/*` for the final 2026-07-28 revision. The final official v2 migration guidance treats the 2025 task wire surface as deprecated interoperability vocabulary, excludes `tasks/*` from modern typed method maps, and rejects inbound `tasks/*` on a modern connection.

If task interoperability with an older peer is ever required, isolate it as compatibility code with explicit schemas. It must not create a second job/evidence identity next to the Shared Media `jobId`.

Testing implications:
- `InMemoryTransport.createLinkedPair()` is useful for fast 2025-era handler/schema tests only;
- modern 2026-07-28 stdio coverage should spawn this package's `serveStdio` entry with a client that opts into modern era negotiation;
- alternatively, modern HTTP behavior can be tested through the modern handler/fetch path;
- evidence should record which protocol era was actually exercised.

## Truth boundary

Every generated/job/artifact/cancellation result is fail-closed to:

```text
humanApproved=false
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

Generation additionally binds:

```text
requestId
workflowId
workflowDigest
inputManifestDigest
```

A technically valid artifact likewise cannot imply human or publication approval.

## Validation

Run inside this package:

```bash
npm ci --ignore-scripts
npm run check
npm test
```

A dedicated exact-head GitHub workflow verifies the lockfile, installs with `npm ci`, runs the contract suite, and uploads a sanitized receipt. Protocol-level client integration should exercise both fast handler coverage and the real stdio serving entry before real backend binding.
