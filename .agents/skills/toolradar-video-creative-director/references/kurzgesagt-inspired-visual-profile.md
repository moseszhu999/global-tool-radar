# ToolRadar Kurzgesagt-Inspired Explainer Visual Profile

## Intent

Use a **Kurzgesagt-inspired explanatory animation grammar** as a visual north star for ToolRadar social video work when the goal is clarity, retention, and polished storytelling.

This means borrowing broad production principles — flat geometric illustration, bold color systems, visual metaphors, clean shape language, layered parallax, continuous scene transformation, and narration-led explanation — **without copying Kurzgesagt's proprietary characters, exact palettes, icons, compositions, scene layouts, or signature assets**.

The target is not imitation. The target is a distinct ToolRadar visual language built from similar high-level explanatory-motion principles.

## Core visual ratio

Default short-form composition target:

```text
~70% explanatory illustration / metaphor
~20% deterministic product-proof UI
~10% captions / labels / CTA
```

Do not make the desktop dashboard the whole video. Product UI should appear when it proves a claim, not as the permanent background.

## Scene grammar

Each beat should usually contain one obvious visual idea.

Preferred pattern:

```text
narration idea
→ one visual metaphor appears
→ supporting objects orbit / connect / transform
→ product proof enters briefly
→ metaphor resolves into next scene
```

Avoid:
- static UI screen with narration layered over it;
- five equal-priority cards fighting for attention;
- decorative effects that do not explain anything;
- long presenter-style talking-head framing;
- transitions that merely fade between slides.

## ToolRadar metaphor system

Build a reusable ToolRadar-specific metaphor vocabulary instead of borrowing recognizable Kurzgesagt assets.

### Discovery / radar

Use:
- radar sweep;
- concentric rings;
- orbiting signal dots;
- candidate objects entering a detection field;
- weak/noisy signals fading or scattering.

### Evidence

Use:
- evidence cards snapping into a stack;
- source nodes connected by thin lines;
- document fragments converging into a verified object;
- checkmarks only when the underlying state is actually verified.

### Rights / copyright / safety

Use:
- shield / lock / boundary ring metaphors;
- red or amber gate objects;
- unsafe candidate physically stopped before the production lane;
- unknown state shown as unknown, never silently rendered as safe.

### Original production

Use:
- source fragments collapsing into abstract ingredients;
- those ingredients entering a transformation chamber;
- a newly structured original composition emerging;
- no visual implication that the source video itself was copied or reposted.

### Agent / automation

Use:
- a small ToolRadar-specific geometric helper/agent glyph;
- task nodes lighting in sequence;
- proposal cards handed to a human-review gate;
- no autonomous-publication metaphor unless publication is actually authorized.

## Product UI role

Product UI is **evidence**, not the entire aesthetic.

Use real deterministic UI for:
- actual ToolRadar labels;
- counts / scores / states;
- review decisions;
- exact product flows;
- visible proof that the product really contains the capability being narrated.

Preferred presentation:
- crop one decisive panel;
- enlarge one real number/label;
- place it inside an illustrated scene as a proof card;
- keep typography and copy deterministic;
- return quickly to explanatory animation.

Do not ask image generation to recreate factual UI.

## Shape language

Prefer:
- circles, rounded rectangles, capsules, rings, arcs, simple polygons;
- strong silhouettes readable at phone size;
- soft but deliberate corner radii;
- minimal internal line detail;
- simple layered depth rather than photorealistic surfaces.

Characters, if used, should be **original ToolRadar geometric mascots** with simple rigs and distinct proportions. Do not recreate Kurzgesagt birds or other signature character designs.

## Color language

Use a small scene palette with clear semantic roles:

```text
base background
primary ToolRadar accent
secondary accent
success / verified
warning / unknown
danger / blocked
neutral foreground
```

Favor saturated, clean colors against dark or lightly tinted backgrounds.

Use gradients only when they clarify depth/light; do not rely on glossy SaaS gradients as the main style.

Color should explain state:
- blue = system / neutral action;
- green = verified / safe only when proven;
- amber = unknown / pending;
- red = blocked / risk;
- purple / cyan may be used for generated/original-production energy if not confused with truth-state colors.

## Motion language

Motion should feel designed, not merely eased.

For important objects:

```text
anticipation
→ accelerated travel on an arc
→ contact / transformation
→ small overshoot
→ settle
→ secondary reaction
```

Preferred motion devices:
- orbital entry;
- radial expansion/contraction;
- object morph between related concepts;
- wipe caused by a physical object;
- camera push into a detail, then reveal a new scene from the same shape;
- parallax across 3-5 depth layers;
- linked object chains rather than independent floating cards.

Avoid:
- every object bouncing identically;
- random scale pulses;
- continuous camera motion with no narrative purpose;
- one generic easing curve for all actions.

## Transition language

Transitions should preserve conceptual continuity.

Good examples:
- radar ring grows until it becomes the next scene background;
- a candidate card rotates and becomes an evidence card;
- shield closes and becomes a circular portal into production;
- a dot travels along a line and becomes the next focal object;
- a chart bar expands to fill frame and reveals a new composition.

Goal: the viewer experiences one continuous visual argument, not a slide deck.

## Camera / composition

For 9:16:
- one main focal object at a time;
- keep critical action near the central safe area;
- use top/bottom margins for platform UI and captions;
- prefer medium/close framing during explanation;
- use wide establishing frames briefly;
- camera moves should support a reveal or follow an action.

Do not show the full desktop product UI unless the story specifically requires orientation.

## Typography

Text should support narration, not duplicate it paragraph-for-paragraph.

Prefer:
- 2-6 word labels;
- one large key phrase or number;
- strong Chinese type hierarchy;
- high contrast;
- motion tied to the object being described.

For current ToolRadar Chinese work, verified `Noto Sans SC` is acceptable when the canonical product font is unavailable or not required for exact product-proof UI.

## Asset strategy

Prefer reusable vector-first assets:

```text
Figma/SVG
→ optional Rive/Lottie for reusable stateful motion
→ Remotion composition
→ Shared Media render/evidence
```

Use Blender/Spline only when real 3D adds explanatory value.

Use ComfyUI mainly for non-factual decorative layers, texture/light/background experiments, and bounded reference-guided polish — not as the primary source of the flat-vector product story.

## Sound language

Sound should reinforce transformations:
- soft whoosh for orbital travel;
- click/snap for evidence attachment;
- low impact for blocked gate;
- bright chime for verified state;
- short riser before major reveal;
- subtle ambience/music bed under narration.

Do not sound every cut. Important events get distinct sonic anchors.

## ToolRadar short-form adaptation

Kurzgesagt-style explanatory density must be compressed for short-form social viewing.

For a ~19 second candidate:

```text
0.0–1.5s  immediate visual hook / surprising state
1.5–5.2s  problem metaphor + first payoff
5.2–10.4s evidence / transformation chain
10.4–15.5s product mechanism / second payoff
15.5–17.6s conclusion / choice / CTA setup
17.6–19.2s loop-return transition
```

Do not copy this timing blindly when the story requires another structure; preserve the existing proven retention anchors unless a controlled experiment justifies changing them.

## Current #89 implication

The next ToolRadar candidate should **not** be another layer of polish on the current dashboard/presenter composition.

A higher-value experiment is a new visual treatment with the same product truth and macro timing:

```text
radar signal
→ candidate objects
→ evidence convergence
→ rights/safety gate
→ original-production transformation
→ Ask ToolRadar / human gate proof insert
→ loop back to radar signal
```

Keep the product UI as short deterministic proof inserts.

This is a controlled visual-language experiment, not authorization to replace the current accepted technical baseline.

## Quality gate

A frame/shot fails this profile if:
- it looks primarily like a slide deck or dashboard demo;
- the viewer must read multiple dense panels at once;
- illustration is decorative rather than explanatory;
- transitions do not connect concepts;
- generated imagery owns factual product text/state;
- recognizable Kurzgesagt proprietary characters/assets are reproduced;
- the visual style becomes more important than ToolRadar's own product identity.

A frame/shot passes only when:
- the core idea is understandable without reading a paragraph;
- one focal object dominates each beat;
- motion explains causality;
- product proof remains truthful and deterministic;
- the result feels like a coherent ToolRadar explainer system rather than a copy of another studio's work.
