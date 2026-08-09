# Shared Media MCP Contract Direction

## Target

Expose Shared Media capabilities to agents without exposing raw renderer internals or arbitrary ComfyUI graphs.

Protocol target for a new implementation: MCP 2026-07-28, while retaining negotiated legacy compatibility only where the selected official SDK entry supports it safely.

## Principle

MCP is the capability transport. Skills contain the production SOP and quality rules.

The MCP layer should be small, typed, auditable, and product-neutral.

Shared Media's durable `jobId` is an application/backend contract. It must not depend on the deprecated MCP task wire vocabulary.

## Proposed tools

### `media_list_workflows`

Read-only.

Returns approved workflow manifests that the caller is authorized to use, including:
- workflow ID;
- version/digest;
- purpose;
- allowed parameters;
- output types;
- model/custom-node requirements;
- current availability.

### `media_get_workflow`

Read-only.

Returns one approved workflow manifest and provenance metadata. It must not return secrets.

### `media_generate_asset`

Write / compute operation.

Accepts a workflow ID plus only the parameters allowed by that manifest.

Typical inputs:
- purpose;
- prompt / negative prompt when allowed;
- reference asset IDs;
- seed;
- bounded workflow-specific controls such as denoise;
- output profile.

Returns either a completed result or a durable Shared Media job handle.

It must reject:
- unknown workflow IDs;
- arbitrary graph JSON;
- parameters outside the allowlist;
- unknown reference assets;
- unapproved custom-node requirements.

### `media_get_job`

Read-only.

Returns current generation/render state, timestamps, bounded progress, error model, and immutable workflow/input identifiers for a durable Shared Media job.

This ordinary application-level job path is canonical for long-running execution. Do not replace it with MCP `tasks/*` methods on the 2026-07-28 protocol revision: the final v2 SDK documents task wire vocabulary as deprecated interoperability surface for older peers, excludes `tasks/*` from modern typed method maps, and rejects inbound `tasks/*` on a modern connection.

### `media_get_artifact`

Read-only.

Returns immutable artifact metadata:
- artifact ID/path or safe retrieval handle;
- MIME type;
- dimensions/duration when applicable;
- SHA-256;
- workflow digest;
- input manifest digest;
- model/reference provenance;
- technical inspection/evidence status.

Do not imply human or publishing approval.

### `media_cancel_job`

Destructive/bounded.

Cancels only a job owned by the authorized caller/scope and only when cancellation is supported. It must not expose a generic queue-clearing operation.

## ComfyUI adapter mapping

The local adapter may internally use ComfyUI server routes such as:
- system health / capability inspection;
- prompt submission;
- per-prompt history/status;
- artifact retrieval;
- owned-job interruption.

Do not expose the entire local ComfyUI API as MCP tools.

## Long-running execution

Generation and rendering are naturally long-running. Prefer:
1. submit bounded request;
2. return a stable Shared Media `jobId` when work does not complete inline;
3. observe status/progress through `media_get_job`;
4. retrieve immutable artifact/evidence through `media_get_artifact`.

The client should not need a persistent application session for correctness; durable job/evidence identity belongs to Shared Media, not to an MCP session or deprecated task vocabulary.

### Protocol-era note

For the final MCP 2026-07-28 revision:
- a v2 client must explicitly opt into modern era negotiation (`versionNegotiation`) when that behavior is required;
- `serveStdio(factory)` is the correct stdio entry for modern/legacy era selection;
- in-memory linked transports exercise legacy/2025-era behavior only;
- protocol-level modern stdio coverage requires spawning the `serveStdio` entry or using the modern HTTP handler path;
- do not design new correctness dependencies around `tasks/*`.

## Authorization and safety

Separate low-risk read operations from compute/destructive operations.

Never pass model-store credentials, GitHub tokens, social credentials, or `.env` content through MCP tool arguments/results.

Publishing is not part of this MCP server.

## Evidence boundary

Every successful generation/render result should be able to bind:
- request/workflow version;
- exact workflow digest;
- input manifest digest;
- model/reference provenance;
- output SHA-256;
- technical inspection result;
- logs or durable job evidence.

Keep human approval, publication, and analytics as separate product-layer facts.
