# Shared Media Mac Remotion Compatibility v1

Product-neutral compatibility layer between the merged `media.render.v1` contract and the existing Mac Remotion transport.

## Why this layer exists

Shared Media already has two separate accepted owners:

```text
media.render.v1 request/result/evidence
→ packages/shared-media-render-contract

bounded MCP workflow transport
→ packages/shared-media-mcp-adapter
```

The repository also has a proven Mac transport client:

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

A disposable read-only Apple-Silicon carrier inspected the currently running Mac service without reading credentials or submitting a render.

```text
TrainingOS carrier PR #615 — closed without merge
run 31249615638
job 93083754232
server.mjs SHA-256:
bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f
openapi.yaml SHA-256:
73c31a31861f3cd086ff72ce123ce612e0cd3b9ddb54a15cac8ea52c34b90656
```

The exact live `POST /v1/render` JSON schema requires:

```text
brief
projectName
compositionId
```

and permits:

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

A second disposable source-identity-pinned audit established structural field usage without emitting source lines or literals:

```text
TrainingOS carrier PR #618 — closed without merge
run 31249800726
job 93084219896
```

Important findings:

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
+ immutable approved pre-materialized Remotion binding
+ exact same inputManifestDigest
+ exact same outputProfile
+ exact same shot-derived duration
+ exact audited Mac runtime identity
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

The binding has its own SHA-256 integrity digest. Any change to its immutable fields invalidates the binding.

`approved_pre_materialized` is a contract input, not something this package independently proves. The owning materialization/review process must create that evidence. This package only verifies structural integrity and exact runtime/input matching before transport.

## `projectDir` boundary

v1 intentionally does **not** send caller-selected `projectDir`.

The audited Mac server already owns WORK_ROOT-safe project resolution. The compatibility layer supplies `projectName` and leaves path resolution to that runtime instead of enlarging the filesystem authority surface.

## Output mapping

The transport request uses only live-audited fields:

```text
brief            <- approved binding
projectName      <- approved binding
compositionId    <- approved binding
mode             = render_existing
width            <- canonical outputProfile
height           <- canonical outputProfile
fps              <- canonical outputProfile, integer only
durationSeconds  <- sum(canonical shot.durationMs)
audio            <- approved binding
outputName       <- bounded execution value / deterministic requestId fallback
designNotes      <- approved binding, optional
```

Every canonical shot must have `durationMs` for this path. Fractional FPS and profiles outside the audited Mac ranges fail before transport.

## Transport status is not canonical result truth

The existing Mac backend uses:

```text
queued | running | completed | failed | cancelled
```

This package deliberately does **not** translate Mac `completed` into a valid canonical `media.render.v1 status=succeeded` result.

A Mac transport snapshot always reports:

```text
canonicalResultReady=false
canonicalEvidenceCollected=false
artifactInspectionPerformed=false
renderLogEvidenceCollected=false
```

because canonical success requires all of:

```text
artifact metadata + SHA-256
ffprobe inspection
evidence inputManifestDigest tie-out
render-log SHA-256
request/job identity tie-out
```

Even canonical failure requires render-log evidence. That evidence collector is a separate next slice.

## Reused transport owner

`createSharedMediaMacTransportAdapterV1({client})` requires only the already-existing Mac client methods:

```text
submitRenderJob
getRenderJobStatus
cancelRenderJob
```

No second HTTP client, token store, tunnel manager, runner lifecycle manager or job owner is introduced.

The package has no credential field. Authentication remains inside `mac-remotion-runner-client` configuration.

## Product-neutral boundary

This package owns technical transport only.

It does not infer or emit ToolRadar/TrainingOS consumer decisions such as:

- human creative approval;
- course review/publication;
- social platform fit;
- publication permission/state;
- analytics/business outcome.

Technical receipts instead keep:

```text
technicalTransportOnly=true
consumerDomainDecisionInferred=false
consumerDomainMutationInferred=false
businessOutcomeInferred=false
```

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

A real non-production Mac smoke must be separately authorized/evidenced after the evidence collector is ready; otherwise a completed transport job still cannot close the canonical result gate.
