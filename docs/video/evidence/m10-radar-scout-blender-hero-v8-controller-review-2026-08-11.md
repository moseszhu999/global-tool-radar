# M10 Radar Scout Blender Hero v8 — Controller Review

Date: 2026-08-11

## Scope

This is a bounded static visual-development A/B. It does **not** modify the canonical 19.2-second M10 candidate and does not authorize rigging, animation, merge, deploy or publication.

Preferred input baseline remains Radar Scout Blender Hero **v6** unless the controlled candidate visibly wins.

Controlled variable:

```text
HAIR_STRAND_BUNDLE_SURFACE_METHOD
```

## Exact source

```text
repo: moseszhu999/global-tool-radar
owner PR: #112
v6 baseline source: 26008dc4dccbfd163f84aa26b76db3000154de24
v8 candidate source: 584c0e8840bb3e49940a8872b3eaa30f2a1894d2
v8 source file: apps/remotion-video/scripts/render-radar-scout-3d-hero-v8.py
```

## Hypothesis

V7 falsified the idea that adding more external micro-fiber curves around a broad V6 ribbon could create premium hair.

V8 therefore changes the **surface representation** instead of adding another detail layer:

```text
V6 broad curved ribbon clumps
→ preserve exact V6 centerlines / macro envelope
→ remove broad ribbon surface + external V6 fiber lines
→ fill each clump envelope with tapered longitudinal strand bundles
```

V8 uses:

```text
14 V6 primary centerlines frozen
6 V6 secondary centerlines frozen
98 primary bundle strands
30 secondary bundle strands
128 total integrated longitudinal bundle strands
3 bounded hair materials: pearl / pale-cyan / depth
```

## Machine-verified freeze boundary

Disposable MacRunner carrier PR `moseszhu999/training-learning-rails#694` compared the exact V6 `geometry_v6()` `primary` and `secondary` literals against V8 `V6_PRIMARY` and `V6_SECONDARY` using Python AST literal extraction.

Observed result:

```text
V6_V8_CENTERLINE_FREEZE=PASS
```

The V8 receipt additionally records:

```text
v6PrimaryClumpCenterlinesFrozen=14
v6SecondaryClumpCenterlinesFrozen=6
v6MacroEnvelopeFrozen=true
broadRibbonSurfaceRemoved=true
externalMicroFiberStackingRemoved=true
v6ContinuousHeadFrozen=true
v6EyeSocketAlignmentFrozen=true
v6BodyFrozen=true
v6EarsFrozen=true
v6TabletFrozen=true
v6EnergyTailFrozen=true
v6LightingFrozen=true
v6CameraFrozen=true
v6RendererFrozen=true
```

This freeze is stronger than a comment-only claim: the exact source arrays were machine-compared before rendering.

## Source-exact same-run render evidence

Dedicated shared MacRunner workflow:

```text
run/job: 31427229025 / 93581698380
runner: zhudapengdeMacBook-Air-3
Blender: 5.2.0 LTS
engine: BLENDER_EEVEE
render mode: background_cli
output: 2048x2048 RGBA PNG
```

V6 same-run baseline:

```text
PNG SHA-256: a854eba59493b86ee92f74bf42728c8d6005429a6508cdf38a722b171e8f9b5f
.blend SHA-256: 6d566ac7518bd2338d3392fb2a6f742449a4e714402905d6095088ae28b5d73c
```

V8 candidate:

```text
PNG bytes: 2,924,319
PNG SHA-256: 37047f874bc66ec5820e554cee39f943624c9bb0224038b84058c3cfe608642c
.blend SHA-256: 88c85564a68360a2d13ea8ffe5b5650d2ab1ac1c968a81788f28b6fed7db9120
```

Receipt validation:

```text
V8_RECEIPT_BOUNDARY=PASS
```

## Durable visual-review evidence

Persisted on the disposable carrier branch from the same source-exact render pair:

```text
high-res V6↔V8 A/B SHA:
8976ff9a42d90291b158a6f577cdb68bd1d9cf5c74db586b6e34c79e15847756

V8 full-review SHA:
ea6983a6f54a8c2d17cab9a3e6327069c84b18c38b549b2e1a82a9058ad6c933

phone-scale A/B SHA:
b06993f8e42f071a8bc67dfef8c37ccf8a1ae2f8da3c6bd9b3d6fc20fa633002

phone-scale V8 head SHA:
4cb394480e2848b1590d677b7edf32c9cc9685d73448d4fc98b61bd85b9f0675

medium A/B SHA:
d75d7b5e8b6be550d0f8372ef1fe002167edaecf4371538d5cc31a866c696ef4

medium V8 head SHA:
f4e2992f3a77c9c74e81413c71cf5849c13756da234e69fe47365dec64e622c1
```

Medium evidence was derived only from the already persisted high-resolution visual-review images; Blender was not re-run for that derivation.

## Controller visual verdict

### What V8 proves

V8 is a meaningful representation change rather than a curve-count-only change.

At intended phone scale the V8 hair is visibly different from V6: longitudinal segmentation is now integrated into the body of the clump instead of appearing mainly as external wire/flyaway arcs. Therefore the **strand-bundle surface direction is validated** as a better path than V7's external micro-fiber stacking.

```text
technicalEvidencePass=true
hairStrandBundleSurfaceMethodDirectionPass=true
```

### Why V8 itself is not promoted

The current 128-strand parameterization introduces a new primary defect:

```text
BUNDLE_REGULARITY_AND_ROOT_FUSION
```

Observed defects:

- bundle spacing is too even and parallel;
- neighboring bundle radii are too uniform;
- longitudinal ridges read partly as comb teeth, cable bundles or molded grooves rather than organic premium hair;
- roots do not fuse into a convincing coherent mass before separating into locks;
- strand grouping lacks small/medium/large clump hierarchy and controlled irregularity;
- several locks still terminate with a rigid engineered cadence;
- the representation is more informative than V6, but the current candidate is not a clear presentation-quality win.

Therefore:

```text
hairStrandBundleSurfaceMethodExperimentPass=false
v8Promoted=false
preferredStaticBaseline=V6
staticHeroCreativeApproved=false
```

This is a **method-direction PASS / candidate-promotion REJECT**, not a technical failure.

## Next controlled variable

```text
HAIR_BUNDLE_IRREGULARITY_AND_ROOT_FUSION
```

Freeze:

```text
V6 primary/secondary centerline envelope
continuous head / eyes / body / ears / tablet / energy tail
lighting / camera / renderer
canonical 19.2s candidate
```

Next experiment should keep the integrated strand-bundle representation but change only bundle organization:

- irregular but authored spacing, not random noise;
- non-uniform neighboring radii and 2–4-strand micro-clumps;
- fused/root-volume zones that separate progressively into longitudinal bundles;
- fewer equally dominant ridges;
- controlled overlap and pearl-white / pale-cyan depth grouping;
- no external wire/flyaway layer as the primary detail mechanism;
- phone-scale A/B must show a clear aesthetic win, not merely a larger object count.

## Truth boundary

```text
humanQualityDecisionOnCanonicalM10=REJECTED
controllerVisualReviewOccurred=true
technical3DPipelineApproved=true
hairGroomAndStrandSurfaceExperimentPass=true
hairFiberDensityAndMaterialResponseExperimentPass=false
hairStrandBundleSurfaceMethodDirectionPass=true
hairStrandBundleSurfaceMethodExperimentPass=false
v8Promoted=false
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
