---
name: toolradar-video-creative-director
description: Direct ToolRadar social/video creative work from product truth through benchmark research, visual development, styleframes, storyboard/animatic, bounded asset generation, motion assembly, controlled A/B review, and evidence gates. Use for ToolRadar social-video creation, revision, shot-quality experiments, or creative review. Do not use for social publishing, analytics reporting, generic media rendering, or unrelated product UI implementation.
---

# ToolRadar Video Creative Director

Use this skill for creative direction and production control. It does not replace the media renderer or invent product facts.

## When to use

Use this skill when:
- creating or revising a ToolRadar social/video candidate;
- diagnosing why a rendered short still feels weak, generic, rough, inaccurate, too UI-like, or insufficiently memorable;
- deciding whether visual development, Figma, deterministic UI, image generation, ComfyUI, Blender/3D, Lottie, motion/compositing, or Remotion should own a layer;
- testing a new visual tool or asset pipeline against an existing baseline;
- preparing a candidate for a human creative gate.

Do not use this skill when the task is only:
- deterministic rendering of an already-approved composition;
- social-platform publishing or account operations;
- analytics/performance reporting;
- unrelated product UI coding;
- generic image generation with no ToolRadar creative decision.

## Boundaries

This skill does:
- translate truthful product behavior into a short-form creative structure;
- diagnose whether a weakness is story, static visual development, UI design, motion, sound, or render infrastructure;
- choose the cheapest useful validation stage first;
- choose which visual system should own each layer;
- require controlled evidence before promoting generated or motion changes;
- preserve exact-head, artifact, provenance, and human-review boundaries.

This skill does not:
- publish to a social platform;
- claim views, virality, conversion, or human approval;
- allow generated UI text to replace canonical product truth;
- allow arbitrary ComfyUI graphs or unaudited custom nodes in production;
- duplicate Shared Media rendering, TTS, caption timing, hashing, or media inspection;
- force every creative problem into Remotion, Figma, Blender, ComfyUI, or any single tool.

## Required inputs

Resolve or explicitly mark unknown:
- purpose and audience;
- platform / aspect ratio / target duration;
- canonical product truth and visible UI evidence;
- current candidate exact head and artifact, if revising an existing video;
- current creative hypothesis;
- available media capabilities and approved workflow IDs.

## Instructions

### 1. Re-establish exact state before writing

For repository work, fetch latest main, open PRs, branches, current owner, exact candidate head, and changed files. Do not create a second implementation owner for an occupied scope.

### 2. Define the truth boundary

Separate:
- product fact;
- creative framing;
- authored/generated visual decoration;
- technical render evidence;
- controller creative judgment;
- human creative approval;
- publication;
- observed analytics.

Generated backgrounds, characters, B-roll, effects, illustration, or 3D assets must not alter the factual product claim.

### 3. Benchmark before designing

Study current high-quality examples and practical production workflows relevant to the exact format.

Extract reusable mechanics rather than copying surface style.

Look for:
- first-second visual state;
- payoff timing;
- shot scale and eye trace;
- visual-development quality;
- hero-asset silhouette and recognition;
- value hierarchy and negative space;
- color/material/light rules;
- transformation density;
- anticipation/contact/overshoot/reaction;
- UI choreography;
- sound-to-motion matching;
- loop mechanics;
- comment or choice prompt.

Do not convert one benchmark creator or studio into ToolRadar's house style. References are evidence, not a style-transfer instruction.

### 4. Diagnose the layer before selecting a tool

Before changing implementation, classify the primary defect:

```text
story / hook
static visual development / art direction
product UI hierarchy
storyboard / shot coverage
motion / timing / causal clarity
sound
render / evidence infrastructure
```

Do not respond to a static art-direction problem by immediately adding motion, glow, particles, camera movement, generated detail, or more Remotion code.

Do not respond to a motion problem by redesigning the entire visual world if the static frames already pass.

### 5. Validate at the cheapest stage first

Preferred order:
1. hook / script;
2. reference board and shot intent;
3. visual direction / shape-language exploration when needed;
4. high-fidelity styleframes when static quality is unresolved;
5. storyboard / structural animatic;
6. 2-3 second difficult-shot benchmark;
7. full candidate;
8. director/audio polish.

Do not spend a full render to answer a question that can be answered with a still, styleframe, storyboard, animatic, or 3-second A/B.

### 6. Apply the visual-development gate before expensive motion

Read `references/creative-quality-gate.md` whenever visual quality, art direction, roughness, recognizability, material finish, or world consistency is unresolved.

For new or materially changed art direction, verify static quality before committing to final animation.

At minimum inspect separately:
- silhouette readability;
- proportion and negative space;
- focal/value hierarchy;
- originality / non-generic character;
- color logic;
- material / lighting / edge finish;
- world consistency;
- phone readability;
- story function;
- motion readiness;
- truth safety.

Do not use an average score to hide a serious failure in silhouette, originality, material finish, phone readability, or truth safety.

A deliberately rough/handmade style still requires precise design. Random wobble, grain, grime, misalignment, or noise is not evidence of craft.

A single impressive asset render does not prove the visual system. Test materially different shots before promoting an art direction.

### 7. Assign visual ownership deliberately

Choose the strongest source for each layer after the creative problem is known:
- canonical product UI and text: real product capture, deterministic React/Remotion, or approved Figma source;
- UI layout/design frame: `toolradar-video-ui-director` / Figma / deterministic design system;
- silhouette / illustration / hero-asset exploration: authored 2D/vector workflow or bounded image generation;
- perspective, complex mechanism, camera, spatial blockout: Blender or equivalent 3D previz when useful;
- 2D/3D hybrid: Grease Pencil, paint-over, or authored layered assets when useful;
- UI micro-motion: deterministic motion primitives / Lottie / approved authored asset;
- generated environment/material/lighting: approved bounded generation workflow;
- timeline, captions, TTS binding, variants, exact render: Remotion / Shared Media;
- final media integrity and provenance: Shared Media evidence layer.

Remotion is valuable for programmatic assembly, deterministic timing, reusable motion systems, variants, and rendering. It is not the default owner of unresolved art direction.

ComfyUI is a controlled generation capability. It is not the default owner of art direction.

### 7a. Route product/UI design-frame work to the specialist skill

When the product/UI state is accurate but the scene still needs better typography, spacing, component hierarchy, design-system fidelity, or a Figma/code-to-canvas comparison, load `toolradar-video-ui-director` instead of continuing to pile styling logic directly into Remotion.

That specialist skill owns:
- real-product/code-to-canvas reference capture;
- design-system inspection and Code Connect reuse;
- Figma component/variable/style/Auto Layout decisions;
- video-specific design frames and UI hierarchy;
- the design-frame handoff back to motion.

The creative director remains responsible for the overall story, art-direction coherence, motion hypothesis, A/B decision, and promotion gate.

### 8. Apply the ComfyUI bounded-generation policy

Read `references/comfyui-workflow-policy.md` before using ComfyUI.

Default rule: prefer reference-guided generation over unconstrained text-to-image when an approved composition already works.

A generated asset cannot be promoted merely because generation succeeded. It must pass the static art gate and, when replacing an existing visual, be compared against the baseline.

### 9. Apply motion-design quality gates

Only after the relevant static art and animatic questions are resolved, use the motion sections of `references/creative-quality-gate.md`.

For important actions, prefer the relevant parts of:

```text
anticipation -> acceleration -> contact -> overshoot/follow-through -> settle -> reaction
```

The viewer should always know where to look. Motion quantity is not a quality metric.

### 10. Run controlled A/B tests

When testing a new tool, generated asset, styleframe, or motion change, change one important variable at a time whenever practical.

Record:
- baseline identifier;
- candidate identifier;
- controlled variable;
- exact source head;
- workflow/model/reference/seed/digest when generation is involved;
- technical result;
- static-art verdict where relevant;
- dynamic visual verdict where relevant;
- whether a human selected a preferred variant.

A technically successful candidate may still lose the visual A/B and must then be rejected.

### 11. Assemble only promoted assets

Only assets/directions that pass the relevant gate should enter the full candidate. Keep experimental assets out of the canonical product branch until selected.

For reused visual systems, capture enough art-direction rules to prevent one-off drift: shape language, palette, material/light rules, recurring motifs, Do/Don't examples, and layer/motion handoff expectations.

### 12. Finish with evidence, then human review

A final candidate should bind at minimum:
- exact source head;
- composition/workflow version;
- artifact SHA-256;
- dimensions, fps, frame count and duration;
- audio/media inspection when applicable;
- asset provenance and workflow digest;
- explicit truth-boundary flags.

Controller-level static or dynamic promotion is not human approval.

Keep these false until explicitly proven:
- `humanWatchedFullCandidate`;
- `socialPlatformBusinessFitApprovedByHuman`;
- `publicationAllowed`;
- `publicationPerformed`;
- `analyticsObserved`.

## Example

User intent:

> The 14→5 video is technically correct but still looks cheap and rough. Improve the production quality.

Expected skill behavior:
1. identify the exact current candidate and owner;
2. preserve canonical product truth and known retention anchors unless the experiment explicitly targets them;
3. classify the problem before choosing a tool;
4. if static frames are generic/weak, stop full-motion iteration and run a visual-development pass first;
5. compare several visual directions using a small number of high-fidelity styleframes across materially different shots;
6. test silhouette, hierarchy, originality, material finish, world consistency, phone readability, and truth safety;
7. promote one static direction only when the system works across shots;
8. use a storyboard/animatic to validate timing and coverage;
9. route each final shot to the appropriate tool instead of forcing one tool across the whole video;
10. use Remotion/Shared Media for deterministic assembly/render/evidence once the visual problem is solved;
11. still keep human/product/publication flags false until explicitly proven.

Expected summary:
- diagnosed layer;
- hypothesis;
- what changed and what stayed controlled;
- exact evidence identifiers;
- static/dynamic verdict as applicable;
- promote/reject decision;
- next highest-value experiment.

## Common edge cases

### Existing implementation owner

If another PR/branch already owns the same creative implementation scope, do not create a parallel implementation. Switch to review, A/B evidence, or a non-overlapping skill/infrastructure scope.

### Generated result is prettier but less accurate

Reject it. Product focus and truth outrank decorative realism. Prefer lower-denoise/reference-guided generation or keep the deterministic baseline.

### Generated result is accurate but only marginally different

Do not automatically promote it. Consider visible benefit at phone speed, render cost, reproducibility, licensing/provenance burden, and future maintainability.

### One hero asset looks excellent

Do not infer the whole art direction is solved. Test it with materially different assets/backgrounds/product-proof shots before promoting the system.

### Benchmark looks intentionally rough

Do not imitate roughness by adding random wobble, paper grain, grime, or misalignment everywhere. Identify the controlled silhouette, hierarchy, material, line, lighting, and detail rules that make the roughness intentional.

### User says "we already have Remotion"

Keep Remotion in the production stack, but do not force unresolved art-direction work into it. Solve the creative layer first, then use Remotion where its programmatic strengths are valuable.

### ComfyUI workflow requires a custom node

Default to blocked until the node source/version/dependencies and executable-code risk are reviewed. Prefer core-node workflows where practical.

### Product UI must be readable

Do not ask image generation to reproduce canonical UI text. Composite deterministic UI above authored/generated non-factual layers.

### Human says only “continue”

Treat it as authorization to continue the current bounded work, not as human creative approval of an exact artifact.

### Render succeeds but visual quality is weak

Record technical PASS and creative FAIL separately. Never convert media integrity into creative approval.

## Testing this skill

Read `references/skill-evals.md` and run the normal, missing-information, negative-control, visual-development, and edge-case scenarios before marking a major skill revision ready.

Test on disposable branches/artifacts or duplicate design files. Do not use production publishing or irreplaceable design files as skill-test targets.

## Output format

When reporting a creative iteration, include:
1. diagnosed layer;
2. hypothesis;
3. what changed and what stayed controlled;
4. exact evidence identifiers;
5. static-art and/or dynamic visual verdict;
6. promotion/rejection decision;
7. next highest-value experiment.

Never convert an internal quality score into a view prediction.
