# M10 Radar Scout Blender Hero v7 — Controller Review

Date: 2026-08-10

## Scope

This is a bounded static visual-development A/B inside existing owner PR #112.

Canonical 19.2-second M10 candidate remains unchanged and human-rejected for presentation-grade finish.

Controlled variable:

```text
HAIR_FIBER_DENSITY_AND_MATERIAL_RESPONSE
```

Preferred baseline entering this experiment:

```text
V6
```

V6 macro hair silhouette/clump layout and all non-hair hero geometry, lighting, camera and renderer were frozen by contract.

## Exact sources

```text
V6 baseline source:
26008dc4dccbfd163f84aa26b76db3000154de24
apps/remotion-video/scripts/render-radar-scout-3d-hero-v6.py

V7 candidate source:
5bd133dda4ed4c45f9bf9f32d6654672c194ad65
apps/remotion-video/scripts/render-radar-scout-3d-hero-v7.py
```

V7 does not author new macro ribbon clumps and does not delete/rebuild the V6 macro hair geometry.

V7 changes only the hair micro/surface layer:

```text
72 micro-fiber sibling curves
13 boundary fibers
109 total visible curve fibers including the frozen 24 V6 base paths
reduced broad coat highlight
higher directional anisotropic response
added sheen
low-amplitude micro-normal breakup
```

## Source-exact same-run MacRunner evidence

Disposable cross-project carrier only:

```text
repo: moseszhu999/training-learning-rails
PR: #694
workflow: Video Operation Radar Scout v6-v7 source-exact hair material A-B on shared MacRunner
run: 31396846684
job: 93481729093
runner: zhudapengdeMacBook-Air-3
platform: macOS ARM64
Blender: 5.2.0 LTS
renderer: BLENDER_EEVEE
```

Unlike the earlier mutable shared-path baseline, both V6 and V7 were checked out from exact source commits and rendered in isolated per-run paths on the same runner in the same job.

### V6 same-run baseline

```text
2048x2048 RGBA
bytes: 2907105
PNG SHA-256: 9d281efcdcf39d4b899d8830e3bad55f5d5255d8f9b95cad376e4c5728201821
.blend SHA-256: 6a196decd5adb38d356fc17d660dac6c4d229a0bd96389091b7bbb280d002cd7
```

### V7 same-run candidate

```text
2048x2048 RGBA
bytes: 2897250
PNG SHA-256: 34205d69e776215f016dc8049cba82a75210a49eb20f61760afb6f0185f256ec
.blend SHA-256: a37d83d8905a25fa03b1cc891d2cd04ad4491356e624a64d938e6c70aeb93cc6
```

Receipt validation passed:

```text
hairPrimaryClumpsFrozen=14
hairSecondaryClumpsFrozen=6
hairBaseFiberPathsFrozen=24
hairMicroFiberSiblingCount=72
hairBoundaryFiberCount=13
hairTotalVisibleCurveFibers=109
hairMacroSilhouetteFrozen=true
v6ContinuousHeadFrozen=true
v6EyeSocketAlignmentFrozen=true
v6BodyFrozen=true
v6EarsFrozen=true
v6TabletFrozen=true
v6EnergyTailFrozen=true
v6LightingFrozen=true
v6CameraFrozen=true
v6RendererFrozen=true
canonicalCandidateModified=false
humanSelectedForCanonical=false
riggingPerformed=false
animationPerformed=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

## Durable visual-review evidence

```text
high-res V6↔V7 A/B SHA-256:
72342a9006c886a89716a132270b7756e56fdf0485261996b086cf86a0cc6852

V7 full-review SHA-256:
38ddc02f9a36dba05b73c65ec5d7a45244b35aa51838af1ad92992648cfa7567

compact V6↔V7 A/B SHA-256:
dd26aadc2b5319540fc89fc07f4b6f324d6d833656ab588ad00ad9b667a7b234

compact V7 head SHA-256:
0796ad056cc100875f053746483bcd7b70c29d0615d4e29f65654aea32c9aa1f

tiny V6↔V7 phone-scale A/B SHA-256:
d6fab853755098d3af4009f873b572f049d18b30d28e7973ac1785836f77b27f

tiny V7 head SHA-256:
e1591f2a6e40444e4a0548792bed578fb4a3009629d8183d9e036192fa0b9e3a
```

The tiny derivatives were generated only after the persisted high-resolution review evidence and exact source manifest were SHA-verified. They are visual-inspection derivatives, not replacement source authority.

## Controller visual verdict

### Technical / evidence integrity

```text
PASS
```

The source-exact pair, freeze boundary, runtime render, receipts and durable review derivation are valid.

### Controlled visual A/B

```text
REJECT
```

The V7 change is not large enough to justify promotion at intended phone-view scale.

Observed result:

- the V6 and V7 macro image remains nearly identical at phone scale;
- reducing broad coat response and adding micro-normal breakup does not materially remove the broad smooth ribbon/petal read;
- the added thin fibers are visible mainly as sparse line/arc detail rather than an integrated strand surface;
- some extra fibers read more like external wires/flyaway arcs than premium hair;
- the underlying ribbon construction remains the dominant perceptual signal;
- therefore `109 curve fibers` is a technical complexity increase, not a sufficient presentation-quality increase.

This falsifies the hypothesis that simply densifying small sibling fibers around the existing V6 ribbons is enough to cross the premium-hair quality gap.

## Promotion decision

```text
hairFiberDensityAndMaterialResponseExperimentPass=false
v7Promoted=false
preferredStaticBaseline=V6
staticHeroCreativeApproved=false
```

Do not keep stacking additional tiny fibers on this method.

## Next highest-value experiment

The next experiment must change the **hair surface representation method**, while preserving the already-improved V6 macro silhouette/character identity.

Next controlled variable:

```text
HAIR_STRAND_BUNDLE_SURFACE_METHOD
```

Target a visibly integrated strand-bundle/groom surface rather than floating micro-fiber additions:

- preserve the V6 macro centerlines and silhouette envelope;
- replace broad single-surface ribbon read with longitudinal multi-strand bundle/ridge structure or a real curve-groom equivalent;
- keep fibers inside the clump envelope instead of external wire-like arcs;
- use pale-white / pale-cyan depth separation across neighboring strand bundles;
- require the improvement to remain visible in a phone-scale same-crop A/B before promotion;
- do not proceed to rigging/animation/full candidate until this static gate is cleared.

## Truth boundary

```text
humanQualityDecisionOnCanonicalM10=REJECTED
controllerVisualReviewOccurred=true
technical3DPipelineApproved=true
hairGroomAndStrandSurfaceExperimentPass=true
hairFiberDensityAndMaterialResponseExperimentPass=false
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
```

Merge=NO. Deploy=NO. Publication=NO.
