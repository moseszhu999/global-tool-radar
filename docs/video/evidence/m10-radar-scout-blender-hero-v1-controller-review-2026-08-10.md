# M10 Radar Scout Blender Hero v1 — Controller Static Visual Review

Date: 2026-08-10
Owner PR: #112

## Exact source and runtime evidence

```text
Video Operation source head: 8ff7eb9e5294aabdec62cc07bcd3efb98f7dddd8
source script: apps/remotion-video/scripts/render-radar-scout-3d-hero-v1.py
shared infrastructure: MacRunner (cross-project; not TrainingOS-owned)
Blender: 5.2.0 LTS
render engine: BLENDER_EEVEE
render run: 31357960797
render job: 93361103870
output: radar-scout-3d-hero-v1-2048.png
size: 2048x2048 RGBA
alpha: yes
bytes: 2982239
PNG SHA-256: 99a2823892e249090843895ef5509bcac2c9784df780f14808d70bfe2c704224
.blend SHA-256: 304da00b8c8a7c566a2b26da8714f1d0b1eeeca48445ce523f8fba57499d41dd
objectCount: 85
materialCount: 17
heroPixelsAuthority: BLENDER_RENDER
remotionRedrawAllowed: false
heroAssetRedrawn: false
```

The persistent production files remain on shared MacRunner under:

```text
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-radar-scout-hero-v1/
```

## Preview-return evidence

GitHub Actions artifact storage was still quota-blocked, so controller review did **not** treat artifact upload failure as a Blender failure.

A compact log preview initially suffered an alpha-to-JPEG flattening problem. The exact PNG was therefore separately measured before any scene changes:

```text
alpha diagnostic run: 31358306533
job: 93362028082
nonTransparentPixelCount: 1193705
coverageFraction: 0.28460144996643066
visible bbox width: 1523 / 2048 = 74.37%
visible bbox height: 1962 / 2048 = 95.80%
visible bbox center: x=54.05%, y=52.08% (bottom-origin)
```

This proves the character was not missing from the render frame. The bad first thumbnail was a preview-conversion problem.

A second review-return pass flattened the **same exact PNG SHA** over a dark background with ffmpeg before downscaling:

```text
flattened review run: 31358421352
job: 93362347110
source PNG SHA: 99a2823892e249090843895ef5509bcac2c9784df780f14808d70bfe2c704224
review background: #101820
review width: 128px
```

## Controller visual verdict

### Technical / production gate — PASS

The first real Character-Bible-driven Blender hero plate proves the intended source-authority architecture:

- real 3D volume and specular response are visible;
- eyes read as glossy/glass-like rather than flat SVG circles;
- hair, skin, technical suit, cloak and emissive radar elements separate in 3D lighting;
- the Character Bible signatures are recognizable: pale hair, large blue/dark eyes, twin antenna orbs, teal/dark suit, chest radar, holographic radar prop and hovering-energy language;
- Blender pixels are the production authority;
- no Remotion/DOM redraw is involved.

### Static hero creative gate — REJECT

`promotionDecision=REJECT_HERO_V1_GEOMETRY_PROMOTE_3D_PIPELINE_ONLY`

The dominant defect is no longer flat material rendering. It is now:

```text
authored_shape_language_and_modeling_fidelity
```

Observed defects from the exact flattened review:

1. **Silhouette still reads as a procedural toy rather than an authored premium mascot.** The large rounded head/hair masses dominate, but the contour does not yet have deliberate primary/secondary hair-clump hierarchy.
2. **Face is cute but generic.** The large glossy eyes are a real improvement, yet the eye/head proportions and facial planes do not yet create a distinctive high-end Radar Scout identity.
3. **Body/limb construction is visibly primitive.** Arms/hands and lower hovering forms still read as assembled cylinders/ribbons instead of one coherent designed character form.
4. **Prop integration is weak.** The large right-side holographic tablet competes with the hero instead of supporting the pose and silhouette.
5. **Materials cannot compensate for simple forms.** The lighting/material system is now good enough to expose geometry quality; adding more glow would hide rather than solve the current defect.

The current v1 asset is therefore **not approved for rigging, animation, Remotion benchmark, canonical M10 replacement, or publication**.

## Controlled next experiment

Only one variable class changes:

```text
HERO FORM DESIGN / SILHOUETTE GEOMETRY
```

Keep unchanged:

- Blender render path;
- render engine;
- material family and lighting system;
- Character Bible palette and signature elements;
- 3/4 front camera intent;
- transparent 2048 output;
- heroPixelsAuthority=BLENDER_RENDER;
- Remotion redraw prohibition;
- no rigging / no animation / no M10 canonical edit.

Geometry v2 should specifically:

- replace rounded hair blobs with tapered, directional authored hair clumps;
- improve head/eye proportion and facial plane hierarchy;
- make torso/scarf/cape/arms read as one coherent designed form;
- replace tube-like limbs with tapered armored/glove forms;
- reduce/reposition the holographic tablet so it supports instead of competing with the silhouette;
- clarify the hovering lower-body/energy-tail read.

Promotion requires a second static plate to visibly clear v1 on silhouette and modeled form **without relying on stronger lighting or more effects**.

## Truth boundary

```text
controllerVisualReviewOccurred=true
humanVisualReviewOfHeroV1=false
technical3DPipelineApproved=true
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
riggingPerformed=false
animationPerformed=false
canonicalCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
