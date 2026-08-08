# Shared Media Mac Remotion Compatibility v1

Product-neutral compatibility layer between the merged `media.render.v1` contract and the existing Mac Remotion transport.

## Why this layer exists

Shared Media already has two accepted owners:

```text
media.render.v1 request/result/evidence
→ packages/shared-media-render-contract

bounded Shared Media MCP workflow surface
→ packages/shared-media-mcp-adapter
```

The repository also has an existing Mac transport owner:

```text
packages/mac-remotion-runner-client
→ /health
→ POST /v1/render
→ GET /v1/jobs/{jobId}
→ GET /v1/jobs/{jobId}/log
→ POST /v1/jobs/{jobId}/cancel
→ download URL
```

The missing boundary is semantic compatibility. The real Mac API does not accept a `media.render.v1` envelope directly.

## Live schema evidence

Two disposable read-only Apple-Silicon carriers inspected the current Mac service without reading credentials or submitting a render.

Schema discovery:

```text
TrainingOS carrier PR #615 — closed without merge
run 31249615638
job 93083754232
server.mjs SHA-256:
bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f
openapi.yaml SHA-256:
73c31a31861f3cd086ff72ce123ce612e0cd3b9ddb54a15cac8ea52c34b90656
```

The audited `POST /v1/render` request requires:

```text
brief
projectName
compositionId
```

and permits bounded:

```text
mode = create_or_update | render_existing
width 320..7680
height 240..4320
fps integer 1..120
durationSeconds 1..900
audio boolean
designNotes <= 6000 chars
outputName
projectDir
```

Field-use audit:

```text
TrainingOS carrier PR #618 — closed without merge
run 31249800726
job 93084219896
```

It established structurally that:

- `brief` participates in instruction/request/settings flow;
- `mode` participates in prompt construction/job state/execution args;
- `compositionId` and `projectDir` participate in execution args;
- `projectName` and `outputName` participate in project/output identity;
- dimensions, duration, audio and design notes enter validated runtime settings/instruction flow.

Therefore serializing the canonical media request into `brief` and calling it lossless is forbidden.

## v1 decision: pre-materialized `render_existing` only

This compatibility version supports only:

```text
valid media.render.v1 request
+ immutable pre-materialized Remotion binding
+ exact inputManifestDigest
+ exact outputProfile
+ exact shot-derived duration
+ exact audited Mac runtime identity
+ explicit external binding authorization
→ mode=render_existing transport request
```

If no exact pre-materialized binding exists, the adapter fails with `PREMATERIALIZATION_REQUIRED`.

It never falls back to `create_or_update`.

`create_or_update` requires a separately proven compiler/materializer that can show every output-affecting canonical input — shots, narration, visual assets, voice, captions and output profile — is faithfully materialized into the Remotion project. v1 makes no such claim.

## Pre-materialized binding

Schema:

```text
shared-media.mac-remotion-pre-materialized-binding.v1
```

A binding records:

```text
bindingId
status = approved_pre_materialized
inputManifestDigest
projectName
compositionId
brief
designNotes?
audio
expectedDurationSeconds
expectedOutputProfile
runtimeEvidence.serverMjsSha256
runtimeEvidence.openapiSha256
evidenceRefs[]
integrityDigest
```

The binding has its own SHA-256 integrity digest. Any change to immutable fields invalidates it.

`approved_pre_materialized` is descriptive binding state, not authorization proof. This package does not decide whether the current Workspace/Agent/job owner may use that binding. Authorization must be injected separately through `isBindingAuthorized`.

## Authorization boundary

The adapter requires both external authorizers at construction time:

```text
createSharedMediaMacTransportAdapterV1({
  client,
  isBindingAuthorized,
  isJobAuthorized,
})
```

They are intentionally not implemented by this package.

```text
isBindingAuthorized({
  binding,
  requestId,
  inputManifestDigest,
  action: 'submit_render_existing'
})

isJobAuthorized({
  runnerJobId,
  action: 'read_status' | 'cancel'
})
```

Only the exact boolean `true` authorizes an operation. Missing authorizers, `false`, `null`, `undefined`, or any other value fail closed before transport.

This keeps authority with the upper-layer Workspace / Shared Media job owner instead of turning a valid binding digest or a known job ID into a capability grant.

The compatibility package contains no credential field and does not store tokens. Authentication remains inside the existing `mac-remotion-runner-client` configuration; authorization remains outside this semantic adapter.

## `projectDir` boundary

v1 intentionally does **not** send caller-selected `projectDir`.

The audited Mac server already owns WORK_ROOT-safe project resolution. The compatibility layer supplies `projectName` and leaves path resolution to that runtime instead of enlarging caller filesystem authority.

## Output mapping

The transport request uses only audited fields:

```text
brief            <- binding
projectName      <- binding
compositionId    <- binding
mode             = render_existing
width            <- canonical outputProfile
height           <- canonical outputProfile
fps              <- canonical outputProfile, integer only
durationSeconds  <- sum(canonical shot.durationMs)
audio            <- binding
outputName       <- bounded execution value / deterministic requestId fallback
designNotes      <- binding, optional
```

Every canonical shot must have `durationMs` for this path. Fractional FPS and profiles outside the audited Mac ranges fail before transport.

## Transport status is not canonical result truth

The existing Mac backend uses:

```text
queued | running | completed | failed | cancelled
```

This package deliberately does **not** translate Mac `completed` into canonical `media.render.v1 status=succeeded`.

A transport snapshot always reports:

```text
canonicalResultReady=false
canonicalEvidenceCollected=false
artifactInspectionPerformed=false
renderLogEvidenceCollected=false
```

because canonical success still requires:

```text
artifact metadata + SHA-256
ffprobe inspection
evidence inputManifestDigest tie-out
render-log SHA-256
request/job identity tie-out
```

Even canonical failure requires render-log evidence. The evidence collector is a separate next slice.

## Reused transport owner

The adapter uses only these existing Mac client methods:

```text
submitRenderJob
getRenderJobStatus
cancelRenderJob
```

No second HTTP client, token store, tunnel manager, runner lifecycle manager or job owner is introduced.

Authorization is checked before each transport operation:

```text
binding denied
→ no submitRenderJob

job status denied
→ no getRenderJobStatus

job cancel denied
→ no cancelRenderJob
```

## Product-neutral boundary

This package owns technical compatibility/transport only.

It does not infer or emit ToolRadar/TrainingOS consumer decisions such as:

- human creative approval;
- course review/publication;
- social platform fit;
- publication permission/state;
- analytics/business outcome.

Technical receipts keep:

```text
technicalTransportOnly=true
consumerDomainDecisionInferred=false
consumerDomainMutationInferred=false
businessOutcomeInferred=false
```

## Exact-head contract coverage

The dedicated gate requires 20/20 focused contracts, including:

- binding integrity and tamper detection;
- exact `render_existing` mapping;
- manifest/profile/timing/runtime mismatch failures;
- consumer-domain field rejection;
- output-name bounds;
- transport completion not becoming canonical success;
- unknown transport status rejection;
- missing external authorizer rejection;
- binding authorization denial before submit;
- validation before authorization/transport;
- status authorization denial before status read;
- cancel authorization denial before cancellation;
- positive status/cancel reuse of the existing Mac client;
- secret and consumer-approval vocabulary exclusion.

## What v1 does not prove

Source/test PASS does not prove:

```text
real render submission
real completed artifact
artifact download
artifact SHA-256
ffprobe result
render-log SHA-256
canonical media.render.v1 succeeded result
TrainingOS Course Video completion
ToolRadar creative approval/publication
Production operation
```

A real non-production Mac smoke must be separately authorized and evidenced after the evidence collector exists; otherwise a completed transport job still cannot close the canonical result gate.