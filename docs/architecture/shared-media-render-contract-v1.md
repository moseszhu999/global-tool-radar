# Shared Media Render Contract v1

## Decision

`media.render.v1` is the single product-independent boundary for render requests, lifecycle results, and auditable render evidence.

Consumers own business semantics. The shared media boundary owns only the description of media inputs/outputs and the evidence required to prove that a render artifact exists.

## Request

A request covers:

- `purpose`: opaque stable consumer intent token, not a business object;
- ordered `shots`;
- per-shot `narration`;
- immutable `visualAssets` with SHA-256;
- `voice` synthesis/provided/none mode;
- `captions` auto/provided/none mode;
- `outputProfile` dimensions, fps, container and codecs;
- mandatory evidence requirements;
- canonical `inputManifestDigest` over output-affecting inputs.

The input manifest excludes transport identity such as `requestId`, so retries of identical render inputs can be recognized without pretending they are the same execution.

## Result and evidence

Canonical statuses are:

```text
queued | running | succeeded | failed | cancelled
```

A `succeeded` result is valid only when all of the following are present and consistent:

1. final artifact metadata;
2. artifact SHA-256;
3. ffprobe inspection with duration, byte size and streams;
4. render-log SHA-256 (and optional locator/size);
5. evidence `inputManifestDigest` matching the exact request;
6. evidence identity matching request/job identity.

A failed result cannot claim a final artifact or ffprobe artifact evidence, but it must still carry input-manifest-bound render-log evidence. Queued/running/cancelled states cannot claim terminal artifact evidence.

## Truth boundary

The contract rejects fields representing:

- social-platform publishing accounts or credentials;
- TrainingOS course/unit/lesson/class/student/teacher business identifiers;
- platform growth/performance metrics;
- human approval/review claims;
- publication state or publication permission.

Therefore:

```text
render succeeded ≠ human reviewed
render succeeded ≠ human approved
render succeeded ≠ published
render succeeded ≠ publication allowed
render succeeded ≠ good platform performance
```

Those states belong to downstream consumer systems and must remain separately evidenced.

## Existing Mac POST /v1/render compatibility audit

The already-working ToolRadar Mac client proves the transport routes:

```text
GET  /health
POST /v1/render
GET  /v1/jobs/{jobId}
GET  /v1/jobs/{jobId}/log
GET  /v1/jobs/{jobId}/download
POST /v1/jobs/{jobId}/cancel
```

Its terminal backend vocabulary is `completed | failed | cancelled`; `media.render.v1` normalizes `completed → succeeded` while retaining the other lifecycle states.

This v1 contract does not alter those routes, submit a render, or copy Remotion/TTS/FFmpeg code. The separate Mac compatibility adapter should translate canonical requests/results around the existing service.

## Ownership

- Canonical contract owner: this package only.
- ToolRadar social adapter: consumer-owned, separate branch/window.
- TrainingOS course video adapter: consumer-owned, separate branch/window.
- Mac runtime compatibility adapter: runtime-owned, separate branch/window.

Any second implementation of `media.render.v1` schema/validation is a conflict and should stop in favor of this owner.
