# Shared Media Preparation Executor v1

Bounded product-neutral runtime adapter that executes an exact preparation manifest through injected operations and returns a prepared-inputs receipt plus defensive payload accessors.

```text
media.render.v1
→ canonical render plan
→ preparation manifest
→ explicit preparation authorization
→ injected asset resolver / narration synthesizer
→ verified prepared inputs + deterministic caption cues
→ later full materializer
```

## Source authority

Execution requires both the exact canonical render plan and its preparation manifest.

Before any resolver or synthesis call:

1. `validateCanonicalRenderPlanV1(plan)`;
2. `validatePreparationManifestV1(manifest, {plan})`;
3. `isPreparationAuthorized(...) === true` for the exact request/input-manifest/render-plan/preparation-manifest digests.

A mismatched or unauthorized source stops before provider I/O.

## Injected operations

```js
createPreparationExecutorV1({
  resolveExactAsset,
  synthesizeNarrationSegment,
  isPreparationAuthorized,
  now,
})
```

The core owns no network route, provider credential, filesystem path, edge-tts command, object store, Remotion project or Mac runner.

`resolveExactAsset` receives a bounded role plus exact source asset identity. Returned bytes are copied immediately and SHA-256 checked against the canonical expected digest for visual/provided voice/provided caption inputs.

`synthesizeNarrationSegment` receives one exact narration segment plus the logical voice preparation request. It must return bytes and an `audio/*` media type. The core snapshots/hashes the bytes but does not claim actual audio duration fits the target shot window; later media inspection/materialization must close that gap.

Provider exceptions are converted to a generic operation failure so token-bearing provider messages are not persisted or surfaced by the core.

## Auto captions v1

Auto captions do not invoke ASR. They are deterministic cues derived from the exact narration timeline:

```text
segmentId
shotId
startMs
endMs
text
```

This is consistent with Preparation Manifest v1, which rejects auto captions when there are no narration text segments. Audio-only transcription remains a future explicit mode.

## Prepared receipt

Schema:

```text
shared-media.prepared-inputs.v1
```

The receipt includes only metadata/evidence:

- request / input-manifest / render-plan / preparation-manifest identity;
- prepared timestamp;
- visual artifact SHA/size/type records;
- provided or synthesized voice artifact SHA/size/type records;
- auto caption cues or one provided caption artifact;
- bounded action facts;
- deterministic `preparedInputsDigest`;
- all transport/binding/render/domain-outcome flags false.

Raw prepared bytes are deliberately absent from the receipt.

## Receipt semantic re-derivation

`preparedInputsDigest` is integrity only. Standalone validation independently re-derives:

- `assetResolutionPerformed` from visual/provided-voice/provided-caption artifacts;
- `voiceSynthesisPerformed` from synthesized voice artifacts;
- `captionCompilationPerformed` from auto-caption cues;
- `preparedArtifactsProduced` from actual prepared artifacts/cues.

Therefore changing those facts and recomputing the receipt digest still fails.

When the exact `{plan, manifest}` is supplied, validation additionally re-binds prepared evidence to source authority:

- each visual artifact must match the exact source `assetId + expectedSha256 + mediaType`;
- provided voice must match its exact `audioAsset` identity/SHA/type;
- provided caption must match its exact `captionAsset` identity/SHA/type;
- every synthesized voice artifact must match its exact narration `segmentId`, source shot, target start and target duration;
- auto-caption cues must equal the exact narration timeline.

A self-consistent re-signed receipt is therefore not sufficient to substitute source evidence.

## Payload boundary

The returned execution object exposes `getPayload(artifactId)`, which returns a fresh byte copy on every call. Caller mutation therefore cannot alter the executor-owned snapshot.

`verifyPreparedPayloadsV1(...)` re-reads every prepared payload and verifies exact byte length + SHA against the receipt. A later materializer must perform this verification again before consuming bytes.

This is an in-memory v1 boundary, not a production large-file streaming claim.

## What v1 does not prove

A successful preparation receipt does not prove:

- synthesized audio duration fits its target shot;
- provider quality or human acceptability;
- caption visual layout/readability;
- Remotion materialization;
- backend selection or binding;
- Mac render;
- final artifact/ffprobe/render-log evidence;
- TrainingOS course review/publication;
- ToolRadar social-platform fit/publication/analytics.

## Tests

The hardened exact-head suite requires 30 contracts: the original 24 authorization/provider/payload/receipt cases plus six adversarial re-sign cases for action facts, prepared-artifact truth, visual source SHA, provided voice source, provided caption source, and synthesized segment/source/timing evidence.
