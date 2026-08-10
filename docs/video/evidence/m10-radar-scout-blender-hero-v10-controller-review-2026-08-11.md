# M10 Radar Scout Blender Hero v10 — Controller Review

Date: 2026-08-11

## Scope

Bounded static visual-development experiment only. The canonical 19.2-second M10 candidate remains unchanged and human-rejected. This review does not authorize rigging, animation, merge, deploy, publication or analytics.

Controlled variable:

```text
HAIR_CLUMP_MASS_FIRST_SURFACE_WITH_EMBEDDED_FIBER_RELIEF
```

## Exact sources

```text
repo: moseszhu999/global-tool-radar
owner PR: #112
V6 preferred input baseline: 26008dc4dccbfd163f84aa26b76db3000154de24
V8 frozen dependency: 584c0e8840bb3e49940a8872b3eaa30f2a1894d2
V10 candidate: f289fa6f85e9cb7216ee27da21fd951e5f57f668
V10 source file: apps/remotion-video/scripts/render-radar-scout-3d-hero-v10.py
```

## Why V10 changes representation family

V8 and V9 established a visible ceiling for the strand-first bevel-curve family: even when spacing, radii, micro-clump grouping and root convergence were authored, the hair still read as individually legible tubes / antennae / cables at intended character scale.

V10 stops that family. It preserves the successful V6 macro centerline / width envelope but makes every major lock a **closed contiguous volumetric mesh** first. Fiber direction is only shallow embedded longitudinal surface fluting.

```text
14 primary contiguous mass clumps
6 secondary contiguous mass clumps
20 total closed clump meshes
embeddedFiberRelief=true
separateVisibleFiberTubes=false
rootMassFusion=true
```

## Machine-verified freeze boundary

Disposable carrier `moseszhu999/training-learning-rails#694` checked out exact V6, exact V8 and exact V10. It byte-compared the V6 and V8 source files contained in the V10 commit against their exact source commits before rendering.

Observed:

```text
V6_AND_V8_SOURCE_FILES_FROZEN_IN_V10=PASS
```

V10 receipt also records:

```text
v6PrimaryClumpCenterlinesFrozen=14
v6SecondaryClumpCenterlinesFrozen=6
v6MacroEnvelopeFrozen=true
contiguousVolumetricClumps=true
embeddedFiberRelief=true
separateVisibleFiberTubes=false
rootMassFusion=true
primaryMassClumps=14
secondaryMassClumps=6
totalMassClumps=20
```

All non-hair hero geometry, lighting, camera, renderer and the canonical candidate remain frozen.

## Source-exact same-run MacRunner evidence

```text
run/job: 31432292190 / 93598329486
runner: zhudapengdeMacBook-Air-3
Blender: 5.2.0 LTS
engine: BLENDER_EEVEE
render mode: background_cli
```

V6 same-run baseline:

```text
PNG bytes: 2,907,107
PNG SHA-256: 58db5cf172ec8bf4e4eecdb19720c7c9dd3a794855bc79ca5f0159ee3e2526b9
.blend SHA-256: 1ef3ba02e303c347d376b511b97315b35c5695c9ed53474df966efd014bdcf7f
```

V10:

```text
PNG bytes: 2,879,891
PNG SHA-256: f9b04d1e91094d749335b1cf6f349dfd933ed42f966b1594f409f631f8d1186c
.blend SHA-256: 2d9a0ebb81298a337d3019b6bbeac9495faea1037ac9f8c354d081b546d96f1a
V10_RECEIPT_BOUNDARY=PASS
```

Output is 2048x2048 RGBA with alpha.

## Durable visual-review evidence

Persisted on the disposable carrier from that exact same-run pair:

```text
V6↔V10 high-res A/B:
fc01ffc133861ff208789f8fad0cc39fc415f8a53018434c27aa87d0fe8f8250

V6↔V10 medium A/B:
276188cc4dcf24e7c9fb351caca86755278f070f656fd024a9f07147c502961d

V6↔V10 tiny A/B:
31f5ae93ed1c021d844a939dd9016e637b4177fde96d3c5cc0384f67f8e108f7

V6↔V10 ultra A/B:
9b4d5d293f29c478c92b610fd7a15320ccc602400c4ab242842c4b4ce382227a

V10 full review:
371a42d728d77519195493edd9c453f7b8a81d69ec7267bf17c0c17b0c5097e0

V10 head medium:
c5c8407e82ebbbdc5a3f0367727a768746d5c4d10bb44caca4cb91036f0d3b4c

V10 head tiny:
4926fce23546fbed4fed5969001bbe35e42e3d144c95ed613ea3c416aafc9a91

V10 head ultra:
831ad85955d0b02c9b233945c2adc77a4ef38c5937071043e250def9f55d131c
```

The controller actually decoded and inspected source-verified V6↔V10 A/B and V10 head derivatives at phone/tiny and ultra review scales.

## Controller visual verdict

### What V10 fixes

Compared with V6 and especially the rejected V8/V9 strand-first family, V10 restores a coherent **mass-first hair read**:

- each lock reads primarily as one contiguous volume rather than several separate tubes;
- the crown has materially more visual mass and fewer cable/antenna cues;
- the phone-scale silhouette is cleaner and more coherent;
- fiber direction is subordinate to the lock body rather than becoming the lock itself;
- the source change remains clearly visible at intended small viewing scale.

Therefore the controlled method experiment passes and V10 becomes the new **development baseline**:

```text
hairClumpMassFirstSurfaceExperimentPass=true
v10Promoted=true
preferredStaticBaseline=V10
```

### Why the full static hero still does not pass creative approval

V10 is a baseline promotion, not presentation-grade completion. The new primary defect is:

```text
HAIR_CLUMP_PROFILE_TAPER_AND_CROWN_CONTINUITY
```

Observed defects:

- several clumps are too uniformly inflated through their length and can read as sculpted foam / sausage-like locks;
- outer locks retain hard pointed / wedge-like tips instead of controlled layered breakup;
- crown roots are visually denser than V6 but still read as adjacent clumps rather than a truly continuous crown mass;
- the embedded fluting is subordinate as intended, but is not yet rich enough to provide premium groom nuance;
- the overall hero still does not meet the presentation-grade Character Bible target.

Therefore:

```text
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
humanFinalApproval=false
```

## Next controlled variable

```text
HAIR_CLUMP_PROFILE_TAPER_AND_CROWN_CONTINUITY
```

Freeze:

```text
V10 mass-first representation family
V6 14+6 macro centerline envelope
embedded-fiber-relief principle
all non-hair hero geometry
lighting / camera / renderer
canonical 19.2s candidate
```

Next experiment should change only mass-clump profile continuity:

- stronger authored root-to-mid-to-tip taper hierarchy;
- crown roots overlap / fuse visually before locks separate;
- reduce uniformly inflated cylindrical/foam-like cross-sections;
- soften rigid wedge tips into controlled layered taper and limited tip breakup;
- preserve lock-as-mass-first read;
- do not reintroduce visible strand tubes as the dominant detail mechanism;
- phone-scale A/B against V10 must show a clear aesthetic improvement.

## Truth boundary

```text
humanQualityDecisionOnCanonicalM10=REJECTED
controllerVisualReviewOccurred=true
technical3DPipelineApproved=true
hairGroomAndStrandSurfaceExperimentPass=true
hairFiberDensityAndMaterialResponseExperimentPass=false
hairStrandBundleSurfaceMethodDirectionPass=true
hairStrandBundleSurfaceMethodExperimentPass=false
hairBundleIrregularityAndRootFusionExperimentPass=false
hairClumpMassFirstSurfaceExperimentPass=true
v10Promoted=true
preferredStaticBaseline=V10
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
