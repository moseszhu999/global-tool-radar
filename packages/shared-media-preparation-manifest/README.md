# Shared Media Preparation Manifest v1

Pure, product-neutral preparation compiler after the canonical render plan and before provider/materialization execution.

```text
media.render.v1
→ canonical render plan
→ preparation manifest
→ provider adapters / asset resolvers
→ materializer
→ authorized backend transport
→ Evidence Collector
```

This package does not execute providers. It makes the required preparation work explicit without choosing a concrete TTS engine, caption engine, Remotion backend or Mac route.

## Input

A valid `shared-media.canonical-render-plan.v1`.

## Output

Schema:

```text
shared-media.preparation-manifest.v1
```

It preserves and derives:

- exact request / input-manifest / render-plan identity;
- exact visual asset resolution requirements with expected SHA-256;
- narration segments re-derived from the preserved timeline;
- voice preparation: none, exact provided audio, or synthesis over exact narration segment IDs;
- caption preparation: none, exact provided caption asset, or auto generation over exact narration segment IDs;
- preserved timeline, output profile and canonical evidence requirements;
- deterministic `preparationManifestDigest`.

## v1 source rules

Synthesized voice requires at least one narration text segment.

Auto captions v1 also require narration text segments and bind to those exact segment IDs. v1 intentionally does not invent an ASR/transcription path for an audio-only request. A future audio-transcription preparation mode must be explicit rather than silently inferred.

Provided voice/caption assets retain exact `assetId + locator + mediaType + sha256` identity.

Every visual asset ID referenced by the preserved timeline must resolve to a corresponding `visualInputs` entry. A re-signed manifest cannot drop a referenced visual input and remain internally valid.

## Semantic re-derivation and source authority

The manifest SHA is integrity, not semantic authority.

Standalone validation:

- requires every timeline visual reference to resolve to preparation input;
- re-derives narration segments from the preserved timeline;
- requires synthesis segment IDs to equal the narration segments exactly;
- requires auto-caption segment IDs to equal the narration segments exactly;
- checks visual actions and SHA requirements;
- checks provided voice/caption exact asset shape and SHA;
- checks mode/action pairing;
- keeps all execution/authority flags false.

A re-signed manifest can still be internally self-consistent after replacing a visual locator with a different valid locator/SHA pair. That does **not** make the substituted source authoritative.

`validatePreparationManifestV1(manifest, {plan})` is therefore the source-authority gate: it rebuilds the expected manifest directly from the exact canonical render plan and requires full equality. Downstream provider/materializer execution must use this exact-plan form before treating preparation inputs as authorized source semantics.

## Truth boundary

Every compiled manifest fixes:

```text
providerSelected=false
providerExecutionPerformed=false
preparedArtifactsProduced=false
transportSelected=false
bindingCreated=false
renderAuthorized=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

No filesystem, network, process, TTS, caption generation, Remotion, Mac, publication or analytics operation occurs here.

## ToolRadar reuse boundary

ToolRadar PR #93 demonstrates that an `edge-tts → WAV → ffmpeg → ffprobe` pipeline is technically feasible, but that workflow also owns ToolRadar-specific narration, beat timing, BGM/SFX and social pacing. Those product semantics are not copied here.

A future Shared Media provider adapter may implement the preparation actions from this manifest using edge-tts or another provider, but provider choice and execution remain separate owners.

## Tests

The exact-head suite requires 25 contracts covering course-shaped plans, exact visual SHA requirements, visual-reference closure, narration timing, synthesized/provided voice, auto/provided captions, none modes, missing synthesis/caption source fail-closed, deterministic digest, exact plan tie-out, re-signed narration/action/segment/asset tamper rejection, explicit exact-plan source-authority rejection after a valid source substitution, execution truth boundaries, deep freeze and product-neutral output.

A PASS does not prove provider availability, TTS/caption execution, prepared files, Remotion materialization, Mac render, artifact evidence, human review or publication.
