# Shared Media Canonical Render Plan v1

Product-neutral, pure compilation layer between canonical `media.render.v1` truth and backend-specific materialization/execution.

```text
media.render.v1 request
→ canonical render-plan compiler
→ lossless technical execution plan
→ later backend/materializer/provider adapters
```

## Why this layer exists

The merged blank Remotion materializer proves only a tiny infrastructure subset (`narration=none`, no visual assets, `voice=none`, `captions=none`). Real consumers such as course explainers legitimately use narration, immutable visual assets, voice synthesis/provided audio and captions.

Those semantics must not be reimplemented inside TrainingOS, ToolRadar or a Mac transport adapter. This package gives Shared Media one product-neutral place to preserve them before backend selection.

## v1 input

A valid canonical `media.render.v1` request. v1 additionally requires every shot to carry positive integer `durationMs`, because an executable timeline cannot be compiled without explicit timing.

The compiler is intentionally fail-closed on unknown request/shot/narration/asset/voice/caption/output-profile/evidence fields. A future contract field must be implemented here before it can silently disappear from execution semantics.

Known current optional semantic extensions that are preserved include:

- voice `locale`;
- caption `language`;
- output `videoCodec` / `audioCodec`;
- provided voice/caption assets.

## Output

Schema:

```text
shared-media.canonical-render-plan.v1
```

The plan contains:

- exact request identity and `inputManifestDigest`;
- purpose/title/language;
- contiguous millisecond timeline with exact narration and visual asset refs per shot;
- complete immutable visual asset bindings;
- voice intent;
- caption intent;
- output profile;
- canonical evidence requirements;
- derived technical requirements for asset resolution, voice synthesis/provided audio, caption generation/provided captions, timeline materialization and evidence closure;
- deterministic `renderPlanDigest`.

## Semantic re-derivation

`renderPlanDigest` is an integrity checksum, not authorization and not sufficient semantic proof. A caller can compute a new SHA after modifying a plan, so standalone validation does not trust the digest by itself.

`validateCanonicalRenderPlanV1(...)` reconstructs a canonical `media.render.v1` request from the plan and reruns the canonical request validator. This re-checks:

- request/input-manifest digest identity;
- shot order and narration structure;
- visual asset IDs and shot asset references;
- voice mode/provided asset structure;
- caption mode/provided asset structure;
- output profile and canonical evidence requirements.

It also independently re-derives the technical `requirements` flags from preserved assets/voice/captions and requires exact equality.

Therefore changing requirements, shot order or asset references and then recomputing `renderPlanDigest` still fails validation.

`validateCanonicalRenderPlanV1(plan, {request})` adds the stronger source tie-out: it recompiles the exact external canonical request and requires complete semantic equality, so a valid plan for one request cannot be substituted for another.

## Truth boundary

Compilation is **not execution**. Every plan fixes:

```text
transportSelected=false
bindingCreated=false
renderAuthorized=false
providerExecutionPerformed=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

The package performs no filesystem, network, child-process, provider, TTS, caption, Remotion, Mac, publication or analytics operation.

## Backend sequencing

A later Shared Media owner may consume this plan to implement bounded provider/materialization stages, for example:

```text
resolve immutable visual inputs
→ synthesize/use provided voice
→ generate/use provided captions
→ materialize product-neutral timeline/project
→ explicit binding/job authorization
→ backend transport
→ Evidence Collector
→ canonical media.render.v1 terminal result
```

Concrete routes such as the audited Mac `POST /v1/render` remain backend transport details. Consumer products should not hard-code that raw route as the canonical Shared Media contract.

## Consumer boundary

TrainingOS may map Unit/lesson/storyboard semantics into `media.render.v1`, but Unit IDs and course approval truth stay in TrainingOS. ToolRadar may map social/editorial intent into `media.render.v1`, but platform fit/publication/analytics stay in ToolRadar.

This compiler contains neither domain's business vocabulary or approval truth.

## Tests

The exact-head suite requires 22 contracts covering:

- course-explainer-shaped canonical input;
- lossless assets/voice/captions/output/evidence preservation;
- contiguous timeline compilation;
- derived technical requirements;
- deterministic digest across object key ordering;
- unknown request/shot/voice/caption/profile semantics fail-closed;
- required duration;
- provided voice/caption assets;
- none-mode behavior;
- timeline/digest/truth-boundary tamper rejection;
- re-signed requirements tamper rejection;
- re-signed unknown asset-reference rejection;
- re-signed shot-order rejection;
- exact request↔plan verification;
- deep freeze;
- product-neutral output.

A source/test PASS does not prove a Mac render, provider availability, materialized project, backend binding, artifact, ffprobe, render-log closure, consumer receipt, human review or publication.
