# Shared Media Prepared Media Qualification v1

Product-neutral qualification layer between prepared inputs and the later full materializer.

```text
exact render plan
+ exact preparation manifest
+ prepared inputs receipt + payloads
→ explicit qualification authorization
→ injected media inspector
→ prepared qualification receipt
→ later full Remotion materializer
```

## Why this layer exists

A prepared synthesized-audio SHA proves byte identity, not that the audio fits its target shot window. The existing ToolRadar explainer evidence uses a conservative policy: narration is synthesized at original speed, measured before final composition, never time-stretched, and rejected if it exceeds the allotted beat.

This Shared Media layer makes that technical policy product-neutral and explicit before materialization.

## v1 bounded subset

v1 intentionally supports the current Course Video-compatible subset:

```text
visuals: static image/* only
voice: synthesize or none
captions: auto-from-narration or none
```

Not yet supported:

```text
video visual inputs
provided whole-track voice
provided caption payloads
ASR / audio-only caption generation
```

Those modes fail closed rather than being approximated.

## Audio timing policy

Synthesized audio is independently inspected. The qualifier computes:

```text
actualDurationMsCeil = ceil(durationSeconds * 1000)
```

The conservative rule is:

```text
actualDurationMsCeil > targetDurationMs → FAIL
actualDurationMsCeil <= targetDurationMs → PASS
trailingSilenceMs = targetDurationMs - actualDurationMsCeil
```

The emitted receipt fixes:

```text
timeStretchApplied=false
trimApplied=false
audioOverrunAllowed=false
shortAudioTrailingSilenceAllowed=true
```

A short clip is later scheduled at the exact target start and the remainder of its target window is silence. This package never stretches or trims media.

## Source and payload authority

Before inspection:

1. canonical render plan is validated;
2. preparation manifest is validated against the exact plan;
3. prepared receipt is validated against the exact plan/manifest;
4. every prepared payload is re-hashed through `verifyPreparedPayloadsV1`;
5. `isQualificationAuthorized(...) === true` is required for the exact identity chain.

The core owns no ffprobe/ImageMagick/browser/process implementation. `inspectPreparedArtifact` is injected.

## Qualification receipt

Schema:

```text
shared-media.prepared-qualification.v1
```

It contains:

- exact source-chain digests;
- qualified image width/height evidence bound to prepared artifact ID/SHA/type;
- synthesized voice measured duration, conservative ceil-ms duration, exact target window and trailing-silence budget;
- auto-caption mode/format/cue-count truth;
- immutable no-stretch/no-trim policy;
- deterministic qualification digest;
- no materialization/render authority.

`validatePreparedQualificationReceiptV1(receipt, {plan, manifest, preparedReceipt})` re-binds artifact IDs/SHA/media types, synthesized segment/source-shot/playback-start/target-window, and caption mode/format to the exact prepared source chain.

## Important truth boundary

Qualification does **not** prove:

- a concrete inspector identity unless the caller separately attests it;
- provider quality or speaker acceptability;
- caption visual readability;
- image layout policy;
- Remotion project materialization;
- backend selection/binding;
- Mac render;
- final artifact/ffprobe/render-log evidence;
- course/social human approval or publication.

Every receipt keeps:

```text
materializationAuthorized=false
transportSelected=false
bindingCreated=false
renderAuthorized=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

## Tests

The exact-head suite requires 27 contracts covering source authorization, payload re-verification before inspection, image qualification, v1 subset rejection, conservative audio timing/overrun policy, inspector-error sanitization, auto-caption binding, none modes, provided-mode rejection, qualification integrity/re-sign semantics, exact prepared-source tie-out, deep freeze, timestamp, product neutrality and deterministic digest.
