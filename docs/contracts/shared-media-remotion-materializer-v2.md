# Shared Media Remotion Materializer v2

Product-neutral materialization after preparation and trusted qualification.

```text
media.render.v1
→ canonical render plan
→ preparation manifest
→ prepared inputs receipt
→ prepared media qualification
→ Remotion materialization candidate v2
→ later explicit staging/binding
→ render_existing
→ Evidence Collector
```

## Why v2 exists

The existing `@shared-media/remotion-materializer` v1 remains a deliberately tiny blank technical smoke. It proves the Remotion project shape and audited runtime pins, but it intentionally refuses narration, visual assets, voice and captions.

v2 extends the **same materializer owner** rather than creating a competing package. It consumes the exact source chain already established by Shared Media:

```text
exact render plan
+ exact preparation manifest
+ exact prepared inputs receipt
+ exact prepared qualification receipt
```

No consumer product gets to compile these semantics independently.

## Supported subset

v2 supports only:

- static `image/*` visual inputs;
- `voice.mode=synthesize` or `none`;
- synthesized per-narration-segment audio or no audio;
- `captions.mode=auto` or `none`;
- the audited Remotion reference runtime pins.

It fails closed for:

- video visual inputs;
- provided whole-track voice;
- provided caption payloads;
- ASR/audio-only caption generation;
- unsupported prepared media types;
- non-integer frame mappings.

The subset is deliberately narrow so the first full path can be proven without inventing a general editor.

## Generated candidate

Schema:

```text
shared-media.remotion-materialization-candidate.v2
```

The candidate contains exactly four generated project files:

```text
shared-media-materialization.json
src/index.ts
src/root.tsx
src/media-manifest.ts
```

Prepared input bytes are **not** copied by the pure materializer. Instead the candidate contains a deterministic `preparedAssetManifest` mapping every prepared visual/audio artifact to:

```text
public/assets/<artifactId>.<safe-extension>
```

A later staging owner copies the exact prepared payload bytes into those paths and must re-hash them against this manifest before any binding/transport operation.

The generated Remotion source uses `staticFile()` for these staged inputs. It creates deterministic `Sequence` ranges from the canonical timeline, `Img` layers for image inputs, `Audio` tracks for synthesized segments, and a minimal deterministic burn-in caption layer for auto captions.

The materializer does not make creative decisions such as scene transitions, typography systems, BGM/SFX selection, camera motion, mascot use, platform fit or publication strategy.

## Audio truth boundary

The materializer never changes audio duration. The preceding qualification layer has already established:

```text
actualDurationMsCeil <= targetDurationMs
trimApplied=false
timeStretchApplied=false
audioOverrunAllowed=false
```

v2 places each synthesized audio artifact at its exact target start. A shorter artifact naturally ends before the enclosing shot window; there is no trim or time-stretch operation in generated source.

## Caption truth boundary

Auto caption cues come directly from the prepared inputs receipt, whose cue sequence is already bound to the exact narration timeline. v2 converts millisecond cue boundaries into deterministic frame boundaries:

```text
from = floor(startMs * fps / 1000)
end = ceil(endMs * fps / 1000)
durationInFrames = end - from
```

No ASR or transcription is performed.

## Source authority

The v2 entry point revalidates all four source layers. The qualification receipt must be a fresh trusted measurement result for the exact prepared payloads; a detached re-signed JSON receipt is not accepted as a substitute.

`verifySharedMediaRemotionMaterializationV2(...)` rematerializes the candidate from the exact plan/manifest/prepared/qualification chain and compares the resulting candidate digest.

Therefore:

```text
candidateDigest = integrity
exact source-chain rematerialization = semantic/source authority
fresh qualification = measurement authority
```

## Staging boundary

`verifyObservedRemotionMaterializationV2(...)` accepts two independent observed manifests:

1. generated project files;
2. prepared input assets.

Both must exactly match candidate-owned SHA-256/byte-length/source metadata before a later staging owner may consider a pre-materialized binding.

This function performs no filesystem read itself; it validates evidence supplied by the staging owner.

## Truth boundary

Every v2 candidate fixes:

```text
renderAuthorized=false
bindingCreated=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

The package performs no:

```text
filesystem I/O
network I/O
provider execution
TTS
ASR
caption generation
Remotion render
Mac operation
binding creation
authorization decision
publication
analytics
```

## Runtime reference

The candidate pins the already-audited reference versions:

```text
remotion      4.0.506
@remotion/cli 4.0.506
react         19.2.3
react-dom     19.2.3
```

This is a reference-runtime identity, not proof that dependencies are installed or that the project has rendered successfully.

## Relationship to TrainingOS / ToolRadar

TrainingOS and ToolRadar remain consumer domains. They create canonical `media.render.v1` requests and retain their own business truth. Neither product should know how the Remotion composition is generated.

The Shared Media chain is therefore:

```text
TrainingOS / ToolRadar
        ↓
media.render.v1
        ↓
Shared Media plan
        ↓
Shared Media preparation
        ↓
Shared Media qualification
        ↓
Shared Media materialization
        ↓
backend-specific staging / execution
```

This is the boundary that lets future enterprise roles use the same AI media capability without duplicating TTS, caption, asset and Remotion SOPs inside every SaaS product.

## Exact-head tests

The v2 dedicated gate requires 14 contracts covering:

- deterministic course-shaped materialization;
- exact source-chain verification;
- re-signed candidate tamper rejection;
- different-source rejection;
- provided-voice fail-closed behavior;
- video-visual rejection at the existing qualification boundary;
- integer-frame timing;
- deterministic caption frame mapping;
- staticFile/Remotion source generation;
- authorization/transport truth boundary;
- observed project + prepared asset manifest tie-out;
- unsupported prepared media types;
- visual-only none-mode behavior;
- deep-freeze integrity.

A passing contract gate does **not** prove a Mac staging, render, artifact, ffprobe, render-log, TrainingOS receipt, human review or publication.
