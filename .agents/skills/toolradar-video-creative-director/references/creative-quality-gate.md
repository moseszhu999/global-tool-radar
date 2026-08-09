# Creative Quality Gate

Use this as a production review aid, not as a view forecast.

## Gate order

Do not jump directly from a rough idea into final motion. Prefer:

```text
benchmark / reference research
-> story beats and shot intent
-> shape language / visual direction
-> silhouette / proportion / negative space
-> value / composition
-> color / material / lighting
-> high-fidelity styleframe
-> storyboard / animatic
-> motion implementation
-> render evidence
-> human review
-> analytics feedback
```

If an earlier, cheaper stage can answer the creative question, stay in that stage.

## Visual-development gate — before motion

When the complaint is that the video feels visually weak, generic, rough, flat, synthetic, too UI-like, or insufficiently memorable, do **not** respond first by adding motion, glow, particles, camera movement, Remotion styling, or generated decoration.

First diagnose static visual development.

### Reference research

Extract mechanics, not surface imitation:
- silhouette and shape language;
- proportion and negative space;
- focal hierarchy;
- color roles;
- material and edge treatment;
- lighting direction;
- detail density;
- environment/world consistency;
- shot scale and viewing speed.

Do not reduce research to `make it like X`. Do not reproduce proprietary characters, exact palettes, icons, compositions, or signature assets.

### Shape language

For a reusable visual direction, define a small visual alphabet before polishing hero assets:
- dominant primitive families;
- corner / edge treatments;
- characteristic cutouts, notches, bevels, gaps, or asymmetry;
- proportion rules;
- recurring motifs;
- explicit Do / Don't examples.

A beautiful isolated asset that does not fit the shared visual language is not production-ready.

### Silhouette / proportion / negative space

Important assets must remain distinguishable before internal detail, texture, text, glow, or color are added.

Check at phone size and, when useful, in pure black silhouette.

A major asset should have at least one describable recognition feature. `Simple` is acceptable; `generic` is not.

### Value / composition

Before color polish, check:
- one obvious focal point per beat;
- readable foreground / subject / background separation;
- deliberate eye trace;
- enough negative space for social-viewing speed;
- lower contrast/detail in supporting regions;
- factual UI and captions do not compete with the hero visual.

If the frame works only because of saturated color or glow, revise the value structure.

### Color

Use a bounded palette with defined roles. Do not silently map decorative color to factual states such as verified, safe, approved, or published.

### Material / lighting / edge control

A deliberately rough or handmade style still requires precise finish.

Inspect:
- surface roughness / reflectivity;
- edge thickness / bevel language;
- occlusion and contact shadow;
- light direction;
- highlight width;
- print / paper / grain treatment when used;
- wear / imperfection placement;
- line-weight hierarchy.

Random wobble, arbitrary grime, indiscriminate grain, excessive texture, or extra glow are not substitutes for authored finish.

Concentrate detail around focal areas and structural explanations; do not distribute detail uniformly.

### Styleframe hard gate

A styleframe is a near-final visual-quality still, not a rough storyboard panel.

Before expensive animation, use enough styleframes to prove:
- the visual world;
- hero-asset quality;
- focal hierarchy;
- product-proof integration;
- typography/caption coexistence;
- material/light treatment;
- consistency across materially different shots.

For a new art direction, prefer a small number of high-fidelity frames across multiple directions before selecting one.

Do not promote a visual direction merely because one isolated asset render looks impressive.

### Static art PASS / REVISE checks

Record these separately; do not hide a serious weakness inside one average score:
1. silhouette readability;
2. focal hierarchy;
3. originality / non-generic character;
4. material / edge finish;
5. world consistency;
6. bounded color logic;
7. story function;
8. phone readability;
9. motion readiness / layerability;
10. truth safety for product UI/text/state.

A serious failure in silhouette, originality, material finish, phone readability, or truth safety must return to visual development.

## Hook / first second

Check:
- Is the important visual state visible immediately?
- Is there motion, emotion, contrast, or curiosity before explanation?
- Does the opening frame communicate what kind of video this is?

## Staging / eye trace

At each beat, identify the intended focal point. If multiple elements compete equally, simplify or sequence them.

Prefer close/medium shots for important operation or reaction beats. Wide shots are useful for context but should not dominate every beat.

## Animatic gate

After static art direction passes, use a cheap animatic to test:
- hook speed;
- shot order;
- dwell time;
- narration timing;
- transition logic;
- causal clarity;
- whether high-detail frames remain readable at actual viewing speed;
- loop setup.

Do not fully animate a beautiful shot if the animatic shows that the shot itself is unnecessary.

## Major action anatomy

For a tactile or causal action, use the relevant parts of:

```text
anticipation
acceleration
contact
overshoot / follow-through
settle
reaction
```

The hand/cursor/object path should visually meet the affected target. Avoid actions where a presenter gestures vaguely while an unrelated object changes elsewhere.

## Timing / spacing

Do not judge animation only by keyframe count. Check velocity and spacing:
- acceleration should be intentional;
- impacts should land on a precise frame;
- important payoffs may deserve a short reaction hold;
- repetitive transformations should have varied rhythm when appropriate.

## UI choreography

UI transitions should preserve cause and state continuity. Prefer:
- collapse / regroup;
- drag / snap;
- morph / resize;
- focus / de-emphasize;
- before/after comparison;

over arbitrary fly-in/fly-out motion.

Canonical UI text should remain deterministic and readable.

## Tool routing

Choose tools after identifying the creative problem:
- benchmark/reference: research and reference boards;
- silhouette / 2D visual exploration: authored drawing/vector tooling or bounded generation;
- product UI hierarchy: `toolradar-video-ui-director`, Figma, deterministic product capture;
- 3D blockout, perspective, mechanisms, camera: Blender or equivalent previz;
- bounded generated environment/material exploration: approved generation workflows with provenance;
- programmatic assembly, variants, captions, deterministic timing, batch render: Remotion / Shared Media;
- final media integrity/provenance: Shared Media evidence layer.

Remotion is a production/automation layer, not the default owner of visual-development defects.

ComfyUI is a controlled generation capability, not the default owner of art direction.

## Sound choreography

Match sound energy to motion energy. Separate when useful:
- motion sound;
- contact/impact sound;
- payoff/emotional tail.

Do not add a whoosh to every cut. Silence and restraint are valid staging tools.

## Generated visual gate

Ask:
- Did the generated asset preserve product focus?
- Did it introduce irrelevant objects or semantic drift?
- Is it more coherent with the chosen visual direction than the deterministic baseline?
- Does it improve depth/material/light without reducing readability?

If the answer is ambiguous, keep the deterministic baseline or return to visual development.

## Loop gate

For a looping short:
- compare the final visual state with the opening state;
- inspect both frame continuity and perceived motion continuity;
- do not call a loop seamless solely because a pixel-distance metric improved.

## Hard fails

Reject or revise when any applies:
- generated UI text alters product truth;
- first useful payoff arrives too late for the chosen format;
- static lecture-like staging dominates the opening;
- a character or cursor does not visibly cause the claimed transformation;
- background detail competes with the product UI;
- a weak static design is sent directly to final animation because a tool is available;
- an isolated impressive asset is treated as proof that the full visual system works;
- `rough` is implemented as random wobble/grime/noise rather than deliberate design;
- technical render success is represented as creative approval, publication, or performance evidence.
