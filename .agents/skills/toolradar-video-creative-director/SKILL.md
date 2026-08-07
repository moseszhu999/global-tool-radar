---
name: toolradar-video-creative-director
description: Direct ToolRadar social/video creative work from product truth and benchmark research through storyboard, bounded asset generation, Remotion assembly, A/B review, and evidence gates. Use when creating, revising, or reviewing ToolRadar social videos, hooks, scenes, visual assets, pacing, or creative variants.
---

# ToolRadar Video Creative Director

Use this skill for creative direction and production control. It does not replace the media renderer or invent product facts.

## Boundaries

This skill does:
- translate a truthful product story into a short-form creative structure;
- choose the cheapest useful validation stage first: script -> storyboard -> animatic -> bounded asset test -> final render;
- choose which visual system should own each layer;
- require controlled A/B evidence before promoting AI-generated visual changes;
- preserve exact-head, artifact, provenance, and human-review boundaries.

This skill does not:
- publish to a social platform;
- claim views, virality, conversion, or human approval;
- allow generated UI text to replace canonical product truth;
- allow arbitrary ComfyUI graphs or unaudited custom nodes in production;
- duplicate Shared Media rendering, TTS, caption timing, hashing, or media inspection.

## Required inputs

Resolve or explicitly mark unknown:
- purpose and audience;
- platform / aspect ratio / target duration;
- canonical product truth and visible UI evidence;
- current candidate exact head and artifact, if revising an existing video;
- current creative hypothesis;
- available media capabilities and approved workflow IDs.

## Workflow

### 1. Re-establish exact state before writing

For repository work, fetch latest main, open PRs, branches, current owner, exact candidate head, and changed files. Do not create a second implementation owner for an occupied scope.

### 2. Define the truth boundary

Separate:
- product fact;
- creative framing;
- generated visual decoration;
- technical render evidence;
- human creative approval;
- publication;
- observed analytics.

Generated backgrounds, characters, B-roll, effects, or illustration must not alter the factual product claim.

### 3. Benchmark before designing

Study current high-quality examples and practical production tutorials relevant to the exact format. Extract reusable mechanics rather than copying surface style.

Look for:
- first-second visual state;
- payoff timing;
- shot scale and eye trace;
- transformation density;
- anticipation/contact/overshoot/reaction;
- UI choreography;
- sound-to-motion matching;
- loop mechanics;
- comment or choice prompt.

### 4. Validate in the cheapest stage first

Prefer this order:
1. hook/script;
2. storyboard/design frames;
3. structural animatic;
4. 2-3 second difficult-shot benchmark;
5. full candidate;
6. director/audio polish.

Do not spend a full render to answer a question that can be answered with a still, storyboard, or 3-second A/B.

### 5. Assign visual ownership deliberately

Use the strongest source for each layer:
- canonical product UI and text: real product capture, deterministic React/Remotion, or approved Figma source;
- layout/design frame: Figma or deterministic design system;
- UI micro-motion: deterministic motion primitives / Lottie / approved authored asset;
- generated environment/material/lighting: approved ComfyUI workflow;
- character/3D: approved rigged/3D pipeline when needed;
- timeline, captions, TTS binding, variants, exact render: Remotion / Shared Media;
- final media integrity and provenance: Shared Media evidence layer.

### 6. Apply the ComfyUI bounded-generation policy

Read `references/comfyui-workflow-policy.md` before using ComfyUI.

Default rule: prefer reference-guided generation over unconstrained text-to-image when the composition already works.

A generated asset cannot be promoted merely because generation succeeded. It must be compared against the deterministic baseline.

### 7. Apply motion-design quality gates

Read `references/creative-quality-gate.md` before finalizing motion.

For important actions, prefer:
`anticipation -> acceleration -> contact -> overshoot -> settle -> reaction`.

The viewer should always know where to look. Motion quantity is not a quality metric.

### 8. Run controlled A/B tests

When testing a new tool or generated asset, change one important variable at a time whenever practical.

Record:
- baseline identifier;
- candidate identifier;
- controlled variable;
- exact source head;
- workflow/model/reference/seed/digest when generation is involved;
- technical result;
- visual verdict;
- whether a human selected a preferred variant.

A technically successful candidate may still lose the visual A/B and must then be rejected.

### 9. Assemble only promoted assets

Only assets that pass the relevant quality gate should enter the full candidate. Keep experimental assets out of the canonical product branch until selected.

### 10. Finish with evidence, then human review

A final candidate should bind at minimum:
- exact source head;
- composition/workflow version;
- artifact SHA-256;
- dimensions, fps, frame count and duration;
- audio/media inspection when applicable;
- asset provenance and workflow digest;
- explicit truth-boundary flags.

Keep these false until explicitly proven:
- `humanWatchedFullCandidate`;
- `socialPlatformBusinessFitApprovedByHuman`;
- `publicationAllowed`;
- `publicationPerformed`;
- `analyticsObserved`.

## Output format

When reporting a creative iteration, include:
1. hypothesis;
2. what changed and what stayed controlled;
3. exact evidence identifiers;
4. visual verdict with visible strengths and defects;
5. promotion/rejection decision;
6. next highest-value experiment.

Never convert an internal quality score into a view prediction.
