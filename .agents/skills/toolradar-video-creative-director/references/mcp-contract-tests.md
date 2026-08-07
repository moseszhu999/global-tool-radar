# Shared Media MCP Contract Test Matrix

Use this when the Shared Media MCP adapter is implemented. Run automated SDK/in-memory tests where possible and exercise the server with MCP Inspector before integration approval.

## Discovery / read-only

### T1 list approved workflows

Call `media_list_workflows`.

Expect:
- deterministic ordering;
- only authorized/approved workflow manifests;
- workflow ID/version/digest and bounded parameter schema;
- no secrets or raw credentials.

### T2 get known workflow

Call `media_get_workflow` with an approved ID.

Expect exact manifest/provenance and no mutable renderer internals beyond what the contract intends.

### T3 unknown workflow

Call `media_get_workflow` with an unknown ID.

Expect a typed not-found error; no fallback to arbitrary graph execution.

## Generate

### T4 accepted bounded request

Call `media_generate_asset` with an approved workflow and allowed parameters.

Expect:
- stable job/task handle or completed result;
- workflow digest and input-manifest identity bound to the job;
- no publication side effect.

### T5 arbitrary graph injection

Include raw ComfyUI graph JSON or an unknown node graph field.

Expect rejection.

### T6 out-of-range parameter

For example, submit denoise outside the approved manifest range.

Expect validation failure before ComfyUI execution.

### T7 unapproved custom-node workflow

Request a workflow whose required custom-node set is not approved.

Expect fail closed.

### T8 unknown reference asset

Supply a reference asset ID not in the authorized artifact registry.

Expect rejection before execution.

## Jobs / long-running work

### T9 status polling

After a long-running generation, call `media_get_job` repeatedly.

Expect monotonic state transitions and stable immutable request/workflow identifiers.

### T10 Tasks-capable client

When negotiated support exists for the MCP Tasks extension, verify task creation/status flow maps to the same durable job and evidence identity as ordinary polling.

### T11 client without Tasks

Verify the ordinary job-handle + `media_get_job` path remains complete and correct.

### T12 concurrent jobs

Submit two bounded jobs.

Expect independent handles, no artifact cross-binding, and truthful queued/running state based on actual backend capacity.

## Artifact evidence

### T13 completed artifact

Call `media_get_artifact` after success.

Expect:
- MIME/type and dimensions/duration as applicable;
- output SHA-256;
- workflow digest;
- input manifest digest;
- reference/model provenance;
- technical inspection status;
- human/publication/analytics approval not inferred.

### T14 artifact before completion

Expect a typed not-ready state rather than an invented path/result.

## Cancellation

### T15 cancel owned queued/running job

Call `media_cancel_job` for an owned cancellable job.

Expect bounded cancellation and durable final state.

### T16 cancel another scope's job

Expect authorization failure.

### T17 generic queue clearing attempt

No normal MCP tool should allow clearing unrelated queued/running work.

## Security / logging

### T18 secret-shaped input/logging

Verify logs and tool responses do not echo `.env`, bearer tokens, model-store credentials, social credentials, or GitHub tokens.

### T19 malformed input

Use missing fields, unexpected fields, oversized strings, invalid asset IDs, and wrong types.

Expect structured errors and no backend execution on schema failure.

### T20 request identity

Verify each compute request has a stable request/job ID in structured logs and that logs can be correlated without exposing secrets.

## Tooling

During development:
1. run unit/contract tests through the selected official MCP SDK or in-memory client;
2. run MCP Inspector against the local server;
3. test invalid inputs, concurrency, and error handling;
4. test in the actual target client after Inspector passes;
5. retain sanitized exact-head evidence for the server revision being accepted.