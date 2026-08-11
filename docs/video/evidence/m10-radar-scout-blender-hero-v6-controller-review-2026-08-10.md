# M10 Radar Scout Blender Hero v6 — Controller Review

Date: 2026-08-10
Owner PR: #112
Status: controller-reviewed static source experiment; **not** human final approval.

## Purpose

Run one bounded A/B from the preferred static v5 development baseline, changing only the hair source-authoring method and hair-specific surface response.

Controlled variable:

```text
HAIR_GROOM_AND_STRAND_SURFACE
```

Frozen boundary:

```text
v5 continuous head = frozen
v5 head proportion / eye-socket alignment = frozen
v5 body = frozen
v5 ears = frozen
v5 tablet = frozen
v5 energy tail = frozen
lighting = frozen
camera = frozen
renderer/profile = frozen
canonical 19.2s candidate = untouched
```

## Exact v6 source

```text
repo: moseszhu999/global-tool-radar
source commit: 26008dc4dccbfd163f84aa26b76db3000154de24
script: apps/remotion-video/scripts/render-radar-scout-3d-hero-v6.py
```

V6 replaces the inherited v2/v5 tapered hair blades with:

```text
hairSourceAuthoringMethod=LAYERED_RIBBON_CLUMPS_AND_FIBER_STRANDS
primaryRibbonClumps=14
secondaryDepthClumps=6
fiberStrands=24
hairSpecificMaterialChanged=true
```

The v6 hair-specific material targets pearly white to pale-cyan response with lower roughness, coat and anisotropic response. No other hero material family was intentionally changed.

## Exact MacRunner render evidence

Dedicated cross-project MacRunner run:

```text
carrier repo: moseszhu999/training-learning-rails
carrier PR: #694 (disposable; merge forbidden)
workflow run: 31375921362
job: 93415019517
Blender: 5.2.0 LTS
render engine: BLENDER_EEVEE
profile: 2048x2048 RGBA / transparent
```

All dedicated Video Operation steps passed:

```text
exact v5 baseline check = PASS at execution time
exact v6 source checkout = PASS
v6 source boundary verification = PASS
Blender v6 render = PASS
receipt / freeze-boundary validation = PASS
v5-v6 hair A/B generation = PASS
v6 full review generation = PASS
```

Exact v6 artifact truth from the render receipt:

```text
PNG bytes: 2907111
PNG SHA-256: 89f6b2b26370068f8fcc83d7df964fb98535c94e8b6c9fcde43653f9e45b2f18
.blend SHA-256: 71bc56f17f694817de3f6ea9c4a238a5ab980c193539bc4e452a0d87edfdec92
objectCount: 117
materialCount: 19
heroPixelsAuthority: BLENDER_RENDER
remotionRedrawAllowed: false
heroAssetRedrawn: false
```

## Baseline integrity incident and recovery

A later read of the mutable shared v5 path found that the path no longer contained the historically reviewed v5 PNG bytes. The historical v5 review recorded:

```text
historical v5 PNG SHA: c913fc01c6765002bba788a0115f720a4273974abf9772e57ef32d256ef7592c
```

A diagnostic later observed a different SHA at the same mutable shared path, so the path itself cannot be treated as immutable evidence authority.

To avoid using contaminated baseline pixels, the controller recovered v5 from its exact source commit into an isolated run path:

```text
v5 exact source commit: 04248f7f0e89ebc8b5e2301799f51e8a2617adff
recovery run/job: 31377312318 / 93419398816
recovery PNG SHA: 0bc6e47f2c47e25fc8bf3998c5b10c0e9b73b9d6d55784acc8dd76166c6421e5
recovery .blend SHA: 95bd6046e9d83cf3d69d234f59be61b21228b4009d013056d5e308c2c20032bc
result: SOURCE_EXACT_RE_RENDER_NOT_BYTE_EXACT
```

This shows that for this Blender workflow, exact source plus the same named Blender version/profile is not sufficient to promise byte-identical PNG output. Therefore PNG byte SHA remains useful evidence for a specific render, but **must not be the sole reproducibility authority**.

Required evidence identity going forward:

```text
exact source commit
+ renderer/version/profile
+ isolated or immutable run path
+ render receipt
+ pixel digest for that run
+ durable visual-review derivative
```

Do not reuse mutable version-named shared paths as historical baseline authority without SHA verification.

## Source-exact v5 recovery vs exact v6 visual evidence

The controller generated a new A/B with explicit provenance:

```text
LEFT = V5_SOURCE_EXACT_RECOVERY
RIGHT = V6_EXACT_PERSISTED
```

High-resolution review evidence persisted on the disposable carrier branch:

```text
carrier evidence commit: 5850cf94d323b9f6214fe40d39d1f106f6795d2f
A/B JPG SHA: 137a429a473b94df10c8c31b269bc7b77f7b705a44d8d1f249c02037fb9798b5
V6 full-review JPG SHA: e24ab7db7b6011c8a9d74df91923bdfa349ed4a14b5a20341eeaa644bbebab6b
```

Compact inspection derivatives were independently reverified from those persisted JPGs before transform:

```text
compact run/job: 31378491906 / 93423073199
A/B compact SHA: 3bc31b65df191cb1dfc7357d0b86102badb151009e0909b5e8a7d81a99b7772d
V6 head compact SHA: e14de3a58da56f93ab71e246b65481097da86b012480e10062bb2ad337ed11cd
```

## Controller visual verdict

### Hair source construction: PASS

The v6 delta is meaningful and visible, not merely a topology/code-count change.

Compared with the source-exact v5 recovery, v6:

- removes the obvious exploding triangular spike-crown read;
- creates a more coherent and directional hair silhouette;
- layers broad locks over one another instead of exposing isolated tapered cones;
- softens the side framing and gives the head a more unified character-design mass;
- is materially closer to the Character Bible's pearly white / pale-cyan directional hair language.

Therefore:

```text
hairGroomAndStrandSurfaceExperimentPass=true
preferredStaticBaseline=V6
```

### Full presentation-grade Hero: REJECT

V6 does **not** clear the full static-Hero creative gate.

The remaining hair problem is now one level deeper. The locks still read as broad smooth geometric ribbons / petals rather than a premium groom with convincing high-frequency breakup. At review scale:

- strand density is still too low;
- broad clumps are too uniformly smooth;
- pearly fiber response is present only weakly;
- high-frequency flyaway / breakup behavior is limited;
- several upper/right locks still retain a blade-like or petal-like silhouette;
- material richness remains below the Character Bible / presentation-grade target.

The successful v6 experiment should therefore be promoted as the **new static development baseline**, not as final art.

## Next controlled variable

```text
HAIR_FIBER_DENSITY_AND_MATERIAL_RESPONSE
```

Freeze the v6 overall hair silhouette/clump layout, v5 face/eyes/body/ears/tablet/energy-tail, lighting, camera and renderer.

The next valid A/B should change only the micro/fiber layer and hair material response, for example:

- denser fine secondary fibers;
- strand breakup concentrated around silhouette and clump boundaries;
- less uniform broad-clump highlights;
- stronger anisotropic/fiber-direction response without plastic sheen;
- subtle pale-cyan depth separation between overlapping locks;
- no return to procedural spike stacking.

Do not rig or animate until the static source asset clears the creative gate.

## Truth boundary

```text
controllerVisualReviewOccurred=true
hairGroomAndStrandSurfaceExperimentPass=true
preferredStaticBaseline=V6
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
humanFinalApproval=false
riggingPerformed=false
animationPerformed=false
canonicalCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
Merge=NO
Deploy=NO
Publication=NO
```
