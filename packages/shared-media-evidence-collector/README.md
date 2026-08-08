# Shared Media Evidence Collector v1

Product-neutral evidence closure for `media.render.v1` terminal results.

This package exists after transport compatibility and before any consumer-domain interpretation.

```text
media.render.v1 request
+ authorized backend job
+ exact artifact bytes
+ passed ffprobe inspection
+ exact render log bytes
→ artifact SHA-256
→ render-log SHA-256
→ request/job/input-manifest tie-out
→ canonical media.render.v1 result validation
```

## Canonical owner

The package does not redefine success/failure semantics. Final truth remains owned by:

```text
packages/shared-media-render-contract
→ validateMediaRenderResultV1(result, {request})
```

A collector output is returned only if that canonical validator accepts it.

## Injected operations

v1 deliberately does not own HTTP, filesystem, Mac tunnel, ffprobe process execution, object storage or provider credentials.

```js
createSharedMediaEvidenceCollectorV1({
  readArtifact,
  inspectArtifact,
  readRenderLog,
  isJobAuthorized,
  now,
})
```

The future Mac backend binding may implement these operations using already-owned transport/runtime primitives. A cloud backend can implement the same bounded interface without changing `media.render.v1` truth.

## Authorization boundary

Evidence collection is not authorized by possession of a `jobId`.

Before any artifact/log read, the collector calls:

```text
isJobAuthorized({
  requestId,
  inputManifestDigest,
  jobId,
  action: collect_succeeded_evidence | collect_failed_evidence
})
```

Only exact boolean `true` allows evidence I/O. All other values fail closed.

The package stores no token and does not own Workspace, Agent, provider or backend-job authorization truth.

## Succeeded result

Succeeded collection requires all three injected evidence sources:

```text
readArtifact
→ artifactId + locator + mediaType + exact bytes

inspectArtifact
→ passed ffprobe evidence

readRenderLog
→ exact render-log bytes/text
```

The collector itself computes:

```text
artifact.sha256
artifact.byteLength
renderLog.sha256
renderLog.byteLength
```

Caller-supplied artifact SHA fields are rejected. The collected artifact byte length must equal ffprobe `format.sizeBytes`.

Artifact duration, dimensions, container and codecs are derived from inspection, then the final result is checked against the original request output profile by the canonical contract.

## Failed result

A failed render does not claim a final artifact or ffprobe evidence.

It still requires:

```text
exact requestId/jobId/inputManifestDigest
render-log bytes + SHA-256
canonical error {code, stage, message, retryable}
```

Invalid error stages/fields fail before authorization and I/O.

## Product-neutral boundary

The collector does not infer:

- TrainingOS course/teacher/student truth;
- ToolRadar creative/social/publishing truth;
- human approval;
- publication permission/state;
- analytics/business outcome.

Those remain with the consumer domain.

## Failure ordering

v1 minimizes unnecessary evidence I/O:

```text
invalid request/job/error
→ stop

authorization denied
→ stop before reads

invalid artifact source
→ stop before inspection/log

invalid ffprobe / size mismatch
→ stop before render-log read

missing/bad render log
→ no canonical terminal result

canonical result mismatch
→ no result returned
```

## In-memory v1 limitation

Artifact bytes are currently passed as `Buffer`/`Uint8Array` so the collector can compute an exact SHA-256 and feed the same bytes to the injected inspector.

This is intentionally a bounded v1 contract/test implementation. It does **not** claim production-grade streaming for very large media artifacts. A later streaming collector may preserve the same canonical evidence semantics while hashing/inspecting file or stream handles without loading a whole artifact in memory.

Do not call v1 production-scalable solely because the source contracts pass.

## What source/test PASS does not prove

```text
real Mac render
real artifact download
real ffprobe process invocation
real render-log retrieval
real backend credential use
real media.render.v1 succeeded/failed receipt from Mac
TrainingOS Course Video completion
ToolRadar human review/publication
Production deployment
```

Those require a separate non-production runtime proof after this truth gate is accepted.

## Test coverage

The exact-head suite covers 19 contracts including:

- required injected operations and authorization;
- exact SHA derivation from artifact/log bytes;
- successful canonical identity/manifest tie-out;
- ffprobe-derived artifact metadata;
- denial before evidence I/O;
- rejection of caller-supplied SHA/evidence fields;
- empty artifact rejection;
- non-passed/missing-video/size-mismatched inspection rejection;
- final canonical output-profile rejection;
- artifact/inspection/log operation failure propagation;
- failed result reading log only;
- failure authorization denial;
- invalid error stage/field rejection before I/O;
- invalid collection timestamp rejection;
- consumer-domain truth exclusion.