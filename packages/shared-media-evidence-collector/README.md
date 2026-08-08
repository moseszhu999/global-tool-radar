# Shared Media Evidence Collector v1

Product-neutral evidence closure for canonical `media.render.v1` terminal results.

```text
media.render.v1 request
+ authorized backend job
+ exact artifact-byte snapshot
+ passed ffprobe inspection
+ exact render-log bytes
→ artifact/render-log SHA-256
→ request/job/input-manifest tie-out
→ canonical validateMediaRenderResultV1(...)
```

## Canonical owner

This package does not redefine success/failure. Final truth remains owned by `packages/shared-media-render-contract` and every returned terminal result must pass:

```js
validateMediaRenderResultV1(result, {request})
```

## Injected operations

v1 owns no HTTP, filesystem, Mac tunnel, ffprobe process execution, object storage or provider credentials.

```js
createSharedMediaEvidenceCollectorV1({
  readArtifact,
  inspectArtifact,
  readRenderLog,
  isJobAuthorized,
  now,
})
```

Backend-specific code supplies those operations. The same evidence gate can therefore sit behind Mac or future cloud transport without moving canonical truth.

## Authorization

Knowing a `jobId` is not authority. Before any evidence read, the collector requires exact boolean `true` from:

```text
isJobAuthorized({
  requestId,
  inputManifestDigest,
  jobId,
  action: collect_succeeded_evidence | collect_failed_evidence
})
```

Anything else fails before I/O. No token, Workspace grant or backend credential is stored here.

## Success closure

`readArtifact` may provide only:

```text
artifactId
locator
mediaType
bytes
```

Caller-supplied SHA/evidence fields are rejected. Credential-bearing/signed-query locators are rejected so ephemeral secrets do not become canonical evidence.

Artifact bytes are copied into a collector-owned snapshot. The inspector receives a separate copy, so an inspector cannot mutate the bytes later hashed into canonical evidence.

`inspectArtifact` must return passed ffprobe evidence. The byte length must equal ffprobe `format.sizeBytes`; a video stream is mandatory. Artifact duration/dimensions/container/codecs are derived from inspection, not caller claims.

`readRenderLog` supplies exact log bytes/text. The collector computes both artifact and log SHA-256 itself.

The final canonical validator then checks request/job/inputManifestDigest, output profile, codec, ffprobe and evidence tie-outs.

## Failure closure

A failed result does not claim artifact or ffprobe evidence. It still requires:

```text
requestId/jobId/inputManifestDigest
exact render-log SHA evidence
canonical error {code, stage, message, retryable}
```

Invalid error fields/stages are rejected before authorization and I/O.

## Immutable terminal receipts

After canonical validation, the returned result is a structured clone that is recursively frozen. Consumers cannot mutate nested artifact/evidence/inspection objects and continue treating the modified object as the collector-issued receipt.

## Failure ordering

```text
invalid request/job/error
→ stop

authorization denied
→ stop before evidence reads

invalid artifact source/locator/bytes
→ stop before inspection/log

invalid ffprobe / size mismatch
→ stop before render-log read

missing/bad render log
→ no terminal result

canonical output/evidence mismatch
→ no terminal result
```

## Product-neutral boundary

The collector does not infer TrainingOS course/student/teacher truth, ToolRadar creative/social/publishing truth, human approval, publication state or analytics/business outcome.

## In-memory v1 limitation

Artifact bytes are currently carried as `Buffer`/`Uint8Array` so the collector can snapshot/hash the exact bytes and give a separate copy to the injected inspector.

This is a bounded contract/runtime adapter v1, **not** a claim of production-grade large-file streaming. A later streaming implementation should preserve the same authorization, SHA, ffprobe, render-log and canonical-validator semantics while using file/stream handles.

## Exact-head tests

The dedicated gate requires 22/22 contracts covering:

- required injected operations and authorization;
- byte-derived artifact/log SHA;
- canonical request/job/manifest tie-out;
- ffprobe-derived artifact metadata;
- authorization denial before I/O;
- caller-supplied evidence rejection;
- signed/credential locator rejection;
- empty artifact rejection;
- non-passed/missing-video/size-mismatched inspection;
- inspector mutation isolation;
- canonical output-profile mismatch;
- artifact/inspection/log operation failures;
- failed-result log-only behavior;
- failure authorization;
- invalid error stage/fields;
- invalid collection timestamp;
- deep-frozen terminal receipts;
- consumer-domain truth exclusion.

## What source/test PASS does not prove

It does not prove a real Mac render, artifact download, ffprobe process, render-log retrieval, backend credentials, real `media.render.v1` terminal receipt, TrainingOS Course Video completion, ToolRadar review/publication or Production operation. Those remain a separate non-production runtime proof.