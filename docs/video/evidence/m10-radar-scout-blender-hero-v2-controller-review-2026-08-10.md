# M10 Radar Scout Blender Hero v2 — Controlled Geometry A/B Controller Review

Date: 2026-08-10
Owner PR: #112

## Purpose

Run one controlled static-hero A/B after v1 was rejected for `authored_shape_language_and_modeling_fidelity`.

Only this variable class changed:

```text
HERO_FORM_DESIGN_SILHOUETTE_GEOMETRY
```

The v1 material family, lighting system, camera intent, Blender renderer, transparent production output and source-authority boundary were intentionally inherited unchanged.

## Exact source

```text
Video Operation repo: moseszhu999/global-tool-radar
v2 source head: 64b8504e4d4ce469e8f091ffc0cce4754e0d64c5
source: apps/remotion-video/scripts/render-radar-scout-3d-hero-v2.py
comparison base: apps/remotion-video/scripts/render-radar-scout-3d-hero-v1.py
source reference: Radar Scout Character Bible Board.png
```

## Geometry changes only

```text
smaller refined head/eye proportions
tapered directional hair blade hierarchy
tapered suit limbs plus cuffs/gloves
coherent torso/scarf/cape silhouette
32-percent smaller repositioned holographic tablet
tighter tapered lower energy-tail silhouette
```

Receipt guards confirmed:

```text
materialsInheritedFromV1=true
lightingInheritedFromV1=true
cameraInheritedFromV1=true
heroPixelsAuthority=BLENDER_RENDER
remotionRedrawAllowed=false
heroAssetRedrawn=false
```

## Shared MacRunner exact render evidence

MacRunner is shared cross-project infrastructure. `training-learning-rails` was used only as a disposable CI carrier and is not the asset/render owner.

```text
workflow: Video Operation Radar Scout 3D Hero geometry v2 on shared MacRunner
run: 31358730533
job: 93363200940
carrier exact head: 9c21333abd261dd65bce83992b4c9876d4034c9e
Video Operation exact source: 64b8504e4d4ce469e8f091ffc0cce4754e0d64c5
Blender: 5.2.0 LTS
render engine: BLENDER_EEVEE
render time: ~11.67s
```

Exact outputs persisted on shared MacRunner:

```text
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-radar-scout-hero-v2/

radar-scout-3d-hero-v2-2048.png
radar-scout-3d-hero-v2.blend
radar-scout-3d-hero-v2-receipt.json
```

Exact artifact facts:

```text
PNG: 2048x2048 RGBA
alpha: yes
PNG bytes: 2909855
PNG SHA-256: e3f65181de4188e58fb8ae4ca3e665113c6b1ab3e0c7f7c2253c0302f672a01a
.blend SHA-256: 2b9c2bb6ce91712b8a3444f10f8e25f4f277ba033537e1a99ff9bff28a7eecdc
objectCount: 93
materialCount: 17
receipt: toolradar.blender.radar-scout-hero.receipt.v2
```

Truth / lifecycle fields remained:

```text
canonicalCandidateModified=false
riggingPerformed=false
animationPerformed=false
humanSelectedForCanonical=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

## Exact controller review return

The same persisted v2 PNG SHA was separately re-verified before creating the compact review thumbnail:

```text
review-return run: 31358822132
review-return job: 93363460499
verified source PNG SHA: e3f65181de4188e58fb8ae4ca3e665113c6b1ab3e0c7f7c2253c0302f672a01a
flatten background: #101820
review width: 96px
```

The preview conversion used ffmpeg alpha compositing before downscaling; therefore it does not repeat the v1 direct-alpha-to-JPEG failure.

## Controller A/B verdict

### Geometry experiment — PASS

Relative to the exact v1 controller review, the controlled v2 geometry change produces a real, visible improvement:

1. Hair no longer reads primarily as rounded blobs. Directional tapered clumps create a clearer crown and side-lock hierarchy.
2. Head/eye proportion is less top-heavy and the face reads more cleanly at thumbnail scale.
3. The body silhouette is narrower and more coherent; limb construction reads less like raw cylinders.
4. The holographic tablet is materially less dominant and supports the pose better.
5. The lower hovering / energy-tail read is tighter and less visually noisy.

This is enough to promote the **geometry direction** and retire v1 as the preferred form baseline.

### Presentation-grade static Hero gate — REJECT

`promotionDecision=REJECT_HERO_V2_VISUAL_PROMOTE_GEOMETRY_DIRECTION_ONLY`

v2 is visibly better, but it still does not meet the project's mainstream presentation-grade target.

The new dominant defect is narrower than v1:

```text
FACIAL_IDENTITY_AND_PREMIUM_CHARACTER_SCULPT_LANGUAGE
```

Observed remaining defects:

1. The face is recognizable and cute but still generic. Eye sockets, brow/forehead planes, cheek/muzzle transition and mouth/nose treatment do not yet create a distinctive premium Radar Scout identity.
2. Hair is directionally improved but still made from visibly simple blade/taper primitives rather than fully authored sculpted clumps with secondary breakup.
3. The torso and hands are cleaner, yet the character still reads closer to a polished stylized toy than a high-end hero asset.
4. At small scale the silhouette works better, but the design lacks one or two unmistakable authored identity cues beyond antennae / radar chest / palette.
5. More glow, stronger lighting, more particles, rigging or motion would not solve the current defect and therefore remain out of scope.

## Next controlled experiment

Change only:

```text
FACIAL_IDENTITY_AND_CHARACTER_SCULPT
```

Keep v2 unchanged as the form baseline for:

- overall body silhouette;
- tablet scale/placement;
- energy-tail envelope;
- material family;
- lighting;
- camera;
- renderer;
- 2048 transparent output;
- Blender hero-pixel authority;
- Remotion redraw prohibition.

A v3 static sculpt benchmark should focus on:

- authored forehead / brow / cheek / muzzle planes;
- more character-specific eye framing rather than simply large glossy spheres;
- cleaner nose/mouth identity;
- layered hair-clump sculpt with primary / secondary breakup;
- one strong signature facial/helmet/scout cue consistent with the Character Bible.

Do **not** rig or animate until this static facial-identity gate is visually cleared.

## Truth boundary

```text
controllerVisualReviewOccurred=true
humanVisualReviewOfHeroV2=false
technical3DPipelineApproved=true
geometryExperimentApproved=true
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
riggingPerformed=false
animationPerformed=false
canonicalCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
