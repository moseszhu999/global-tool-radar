# M10 Radar Scout Blender Hero v9 — Controller Review

Date: 2026-08-11

## Scope

Bounded static visual-development experiment only. The canonical 19.2-second M10 candidate remains unchanged and human-rejected. No rigging, animation, merge, deploy, publication or analytics are authorized by this review.

Controlled variable:

```text
HAIR_BUNDLE_IRREGULARITY_AND_ROOT_FUSION
```

## Exact sources

```text
repo: moseszhu999/global-tool-radar
owner PR: #112
V6 preferred baseline: 26008dc4dccbfd163f84aa26b76db3000154de24
V8 method source: 584c0e8840bb3e49940a8872b3eaa30f2a1894d2
V9 candidate: b81b3117711e455cb3f78ecb9adafd1da609a970
V9 source file: apps/remotion-video/scripts/render-radar-scout-3d-hero-v9.py
```

## Hypothesis

V8 proved that longitudinal detail should be integrated into the hair-clump surface rather than stacked outside the clump as flyaway/wire curves. However, V8's 128 integrated bundle strands were too evenly spaced and similarly sized, reading partly like comb teeth, cable bundles or molded grooves.

V9 therefore freezes the V8 surface-method implementation and V6 macro centerline envelope, changing only bundle organization:

```text
authored irregular spacing
non-uniform neighboring radii
2–4 strand micro-clump hierarchy
root convergence / fusion
progressive separation from root to tip
no random noise
```

V9 deliberately reduces visible curve count rather than increasing it:

```text
84 primary bundle strands
30 secondary bundle strands
114 total strands
```

## Machine-verified freeze boundary

The disposable MacRunner carrier checked out exact V8 and exact V9 and byte-compared the V8 source file contained in the V9 commit against the exact V8 commit.

Observed:

```text
V8_SOURCE_FILE_FROZEN_IN_V9=PASS
```

The V9 receipt records:

```text
v8SurfaceRepresentationFrozen=true
v6PrimaryClumpCenterlinesFrozen=14
v6SecondaryClumpCenterlinesFrozen=6
v6MacroEnvelopeFrozen=true
authoredIrregularSpacing=true
nonUniformRadii=true
microClumpHierarchy=true
rootFusionApplied=true
progressiveRootSeparation=true
randomNoiseUsed=false
```

## Source-exact same-run evidence

Dedicated shared MacRunner workflow:

```text
run/job: 31430248383 / 93591651384
runner: zhudapengdeMacBook-Air-3
Blender: 5.2.0 LTS
engine: BLENDER_EEVEE
render mode: background_cli
```

All three sources were rendered in the same job into isolated run paths.

V6 same-run:

```text
PNG SHA-256: 49399beb390426360addc272b97be54f67f9c48d21f34ede6a7e93a041bf4a89
.blend SHA-256: 6c0b8235c02379b2872c5652e1e29840b4b233ef6161ec6056e426202481bce4
```

V8 same-run:

```text
PNG SHA-256: 9815b26541d98dc0c12c8b9630fe5f162cc50692d42bd22468414ebe5102f289
.blend SHA-256: a34b56f88331a29e00deead23b58f3196c95a99e98f455b9f7fd873a88cc42d8
```

V9:

```text
PNG bytes: 2,890,203
PNG SHA-256: fd6af7561860dc9ba611bb189e73a5e5e54ccffb03f2b05b138cf01bad46f11e
.blend SHA-256: 96c8e0433b5cb4c74f9e2496e582d1e1fef9962c0d62b6eebca1215902dbc107
V9_RECEIPT_BOUNDARY=PASS
```

## Durable visual-review evidence

Persisted on disposable carrier `moseszhu999/training-learning-rails#694`:

```text
V8↔V9 high-res controlled A/B:
ec025bc9196a62da93c6e2959b262efae4f7bd45fa3d27f8418b23d82ea72d4a

V8↔V9 medium controlled A/B:
aed6afe3d765bc2626cbed191fd7f874620391c0f1810b2fe7a0bcc11d67cb2e

V6↔V9 high-res promotion A/B:
a036e9b482a2ac1d77fa63fbd65c0614e9d8241039c549ccb7e4ec7f681aaa4e

V6↔V9 medium promotion A/B:
45b199387e31d21395f3153db5fd5ecc66656622a2eec47de2b5a50a47c16a1f

V9 full review:
0123e7ce35d68eac5bdaf4a52f81f50648e30eaac6fb4bd49a9b5751d8d3b982

V9 medium head:
6423b1fcc50998936c4c836423d8ac42744f9c38f9b2368f75cbbad2c4604da7

V8↔V9 phone/tiny A/B:
30e324bddc94aa66a6ed5952953d1b5b5b79a56a738eb6b52c10aacc906eb081

V6↔V9 phone/tiny promotion A/B:
8843973140c2bed18e64578b6ac0236435d6cf8ea5402608f03be2b81bfae419

V9 phone/tiny head:
51c74d0b1ce45b0fb2aa9311fbfdb4e73fc65b613c881e12389910b3e23f8a3f
```

Ultra-small controller-inspection derivatives, source-verified from those tiny images:

```text
V8↔V9 ultra A/B:
a2ab8ef743c0fd2e62baa570a845be4ebaae2eb4794523d1fad1a6779226798a

V6↔V9 ultra promotion A/B:
dc021e2cf11a8de67afadbc1eeefe715cf4517731f1f32d1fe66afecebce89d5

V9 ultra head:
c8a1060cfb6f2942d5ae12b67eb7cc7505099dc82c986f96be74e5ecebb64430
```

## Controller visual verdict

The controller actually inspected the source-verified V8↔V9, V6↔V9 and V9 head derivatives.

### V8 → V9 controlled result

The authored irregular spacing and root convergence reduce some of V8's uniform cadence, but the visible geometry is still dominated by individually legible bevel-curve tubes. The improvement does **not** cross the presentation-quality threshold.

```text
hairBundleIrregularityAndRootFusionExperimentPass=false
```

### V6 → V9 promotion result

V6 retains a more coherent macro hair mass. V9 fragments that mass into separated tubular locks which read first as antennae/tentacles/cables and only secondarily as hair. This is especially clear around the crown and outer silhouette.

Therefore V9 is not a credible promotion over V6.

```text
v9Promoted=false
preferredStaticBaseline=V6
staticHeroCreativeApproved=false
```

## Method-level conclusion

V8/V9 establish an important ceiling for the current representation family:

```text
many individually beveled curve strands
→ technically controllable
→ directionally richer than a flat ribbon
→ but too visually legible as separate tubes at intended character scale
```

Continuing to tune curve count, offset, radius or root-blend parameters is now considered low-value parameter churn.

The next experiment must move from **strand-first geometry** to **mass-first clump geometry**:

```text
HAIR_CLUMP_MASS_FIRST_SURFACE_WITH_EMBEDDED_FIBER_RELIEF
```

Required behavior:

- preserve V6's successful macro silhouette / centerline envelope;
- each major lock reads first as a coherent contiguous hair volume;
- strand direction appears as embedded surface relief / groom response, not as separately readable tubes;
- use authored longitudinal ridge/normal/displacement/true-groom equivalent inside the clump surface;
- roots form a continuous crown mass before locks separate;
- tip breakup may be finer, but should not make the whole hairstyle look like antennae;
- pearl-white / pale-cyan material response remains directional and layered;
- phone-scale A/B against V6 must clearly win before any baseline promotion.

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
v9Promoted=false
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
