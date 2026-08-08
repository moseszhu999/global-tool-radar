# Shared Media MCP Adapter v1

Product-neutral MCP boundary for approved Shared Media workflows.

This package currently lives in the `global-tool-radar` repository, but its logical owner is **Shared Media**, not the ToolRadar social/content domain. Repository location must not be confused with domain-truth ownership.

## Responsibilities

This package owns only:

- MCP tool registration;
- approved-workflow discovery;
- workflow/parameter allowlist validation;
- reference-asset authorization hooks;
- stable request/input-manifest identity;
- job/artifact/cancellation tool surfaces;
- secret-shaped evidence rejection;
- technical-result truth boundaries.

It does **not** own:

- the canonical `media.render.v1` schema;
- Mac Remotion transport implementation;
- ComfyUI raw graph design;
- model/custom-node installation;
- ToolRadar social candidate or creative-review truth;
- TrainingOS course-review/publication truth;
- human approval in any consumer domain;
- social publishing;
- analytics or business-performance truth.

The canonical `media.render.v1` request/result/evidence owner is the merged `packages/shared-media-render-contract` package. A later render backend binding must reuse that package rather than reproduce its schemas or validators in this MCP package.

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

There is intentionally no arbitrary graph execution, generic shell/command execution, queue clearing, credential setter, social publishing tool, dynamic custom-node installer, or MCP `tasks/*` dependency.

## Workflow manifest

The caller selects an approved workflow ID. The agent does not submit arbitrary renderer graphs.

Example:

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

If a workflow declares custom nodes, registration fails unless `customNodesApproved=true` is explicitly present. That flag means the dependency was reviewed for that exact workflow; it is not permission to install nodes dynamically.

## Backend contract

`createSharedMediaMcpController` requires an injected backend:

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

- a later Mac Remotion adapter should reuse `packages/mac-remotion-runner-client`;
- an approved local ComfyUI adapter may translate a registered workflow to a reviewed fixed graph;
- neither transport may leak credentials into MCP results.

The controller rejects secret-shaped fields in manifests, parameters and backend results.

For consumer-domain truth, the boundary is stronger: Shared Media does not normalize or own those decisions. If a backend attempts to return legacy consumer truth fields such as ToolRadar full-candidate approval/platform-fit/publication/analytics flags, the controller rejects the result instead of echoing or rewriting it.

## Product-neutral technical truth boundary

Generated/job/artifact/cancellation results carry only the generic boundary:

```text
technicalResultOnly=true
humanDecisionInferred=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

These fields mean only that the MCP result is technical infrastructure evidence.

They do **not** mean:

- a ToolRadar candidate was watched or approved;
- a social platform fit decision was made;
- TrainingOS course content was reviewed or published;
- a human approved any domain action;
- a business outcome was achieved.

Those states remain owned by the consuming domain system.

## Canonical render boundary

This MCP package is a capability transport/controller, not a second render contract.

For render workflows the intended future composition is:

```text
Agent / consumer
→ Shared Media MCP tool
→ bounded workflow controller
→ backend adapter
→ merged media.render.v1 contract
→ Mac/approved renderer
→ media.render.v1 result/evidence
```

The real backend is not bound in this v1 PR.

## Stdio entry

The package includes an injectable stdio entry for local MCP hosts:

```bash
SHARED_MEDIA_MCP_WORKFLOWS_FILE=/absolute/path/workflows.json \
SHARED_MEDIA_MCP_BACKEND_MODULE=/absolute/path/backend.mjs \
node src/stdio.mjs
```

The backend module exports either `backend` or `createBackend()`. It may read runtime secrets from its own environment; secrets must never be stored in workflow JSON or returned through MCP.

The stdio protocol owns stdout. Startup information goes to stderr only.

## Protocol era and long-running work

The v2 MCP SDK does not place the modern protocol era on the wire merely because v2 packages are installed. The stdio entry uses the SDK's modern serving path; a client that needs the 2026-07-28 era explicitly opts into modern negotiation.

Long-running work uses Shared Media's own durable application-level identity:

```text
media_generate_asset
→ completed result OR durable jobId
→ media_get_job
→ media_get_artifact
```

Do not redesign this around MCP `tasks/*`. A second task identity would compete with the canonical Shared Media job/evidence identity and with higher-level durable Mission/Recovery ownership in AI Execution OS.

## Validation

Run inside this package:

```bash
npm ci --ignore-scripts
npm run check
npm test
```

The dedicated exact-head workflow verifies:

- immutable PR-head checkout;
- pinned dependency lock;
- exactly six bounded tools;
- no arbitrary graph/shell/publishing/tasks surface;
- controller tests;
- legacy in-memory protocol test;
- modern 2026-07-28 stdio protocol test;
- product-neutral technical truth boundary;
- no real backend/Mac execution claim.

## Current truth boundary

This package proves a bounded MCP adapter foundation only.

```text
canonicalMediaRenderContractOwner = merged Shared Media render-contract package
realBackendBound = false
realMacOperationPerformed = false
consumerDomainDecisionInferred = false
businessOutcomeInferred = false
publicationPerformed = not owned by Shared Media MCP
```

The next implementation owner is a reviewed Shared Media backend compatibility binding that reuses both the merged `media.render.v1` contract and the existing Mac transport. TrainingOS and ToolRadar remain consumers; neither should duplicate the shared renderer stack.
