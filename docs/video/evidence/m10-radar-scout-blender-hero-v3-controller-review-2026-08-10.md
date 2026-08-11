# M10 Radar Scout Blender Hero v3 — Facial Sculpt A/B Controller Review

Date: 2026-08-10
Owner PR: #112

## Purpose

Test one controlled follow-up after v2 geometry direction passed but the full static Hero remained below the presentation-grade bar.

Only this variable class changed:

```text
FACIAL_IDENTITY_AND_CHARACTER_SCULPT
```

Frozen from v2:

```text
body silhouette
tablet scale / placement
energy-tail envelope
material family
lighting
camera
renderer
2048 transparent output
Blender hero-pixel authority
```

## Exact Video Operation source

```text
repo: moseszhu999/global-tool-radar
v3 source head: 2d56c8a50dba703a2b48d186a0ff370d3a872fde
source: apps/remotion-video/scripts/render-radar-scout-3d-hero-v3.py
comparison base: Radar Scout 3D Static Hero v2
source reference: Radar Scout Character Bible Board.png
```

Controlled v3 additions:

```text
shallow cheek / jaw / brow sculpt planes
narrower eye framing with cyan glass iris layer
authored upper lids and asymmetric brows
refined nose / mouth expression
temple scanner identity cue
secondary hair-clump breakup
antenna root collars
```

## Shared MacRunner exact render evidence

MacRunner is shared cross-project infrastructure. `training-learning-rails` was a disposable CI carrier only and is not the media owner.

```text
workflow: Video Operation Radar Scout 3D Hero facial sculpt v3 on shared MacRunner
run: 31359179087
job: 93364486803
carrier exact head: 407d5e61b365c306a7245b917ca678eece7ac93a
Video Operation exact source: 2d56c8a50dba703a2b48d186a0ff370d3a872fde
Blender: 5.2.0 LTS
render engine: BLENDER_EEVEE
render time: ~8.58s
```

Exact persisted outputs:

```text
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-radar-scout-hero-v3/

radar-scout-3d-hero-v3-2048.png
radar-scout-3d-hero-v3.blend
radar-scout-3d-hero-v3-receipt.json
```

Exact artifact facts:

```text
PNG: 2048x2048 RGBA
alpha: yes
PNG bytes: 2949828
PNG SHA-256: 8c7b54fbab7ca0ee962326f22d5004d93e785f3383ff2d2a0f3ca23d18ac41ce
.blend SHA-256: cf272d144d500afda8ea85ae890d7331b1f67deef5524f9c0ed57fed130e2bbd
objectCount: 122
materialCount: 17
receipt: toolradar.blender.radar-scout-hero.receipt.v3
```

Receipt guards passed:

```text
controlledVariable=FACIAL_IDENTITY_AND_CHARACTER_SCULPT
v2BodySilhouetteFrozen=true
v2TabletFrozen=true
v2EnergyTailFrozen=true
materialsInheritedFromV1=true
lightingInheritedFromV1=true
cameraInheritedFromV1=true
heroPixelsAuthority=BLENDER_RENDER
remotionRedrawAllowed=false
heroAssetRedrawn=false
canonicalCandidateModified=false
riggingPerformed=false
animationPerformed=false
humanSelectedForCanonical=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

## Exact review-return evidence

A clean alpha-correct v3 whole-character review thumbnail was returned from the same persisted PNG:

```text
run: 31359334405
job: 93364929912
verified source PNG SHA: 8c7b54fbab7ca0ee962326f22d5004d93e785f3383ff2d2a0f3ca23d18ac41ce
review width: 64px
background: #101820
```

Because the experiment specifically targeted facial identity, a second exact review compared the face region directly from persisted v2 and v3 PNGs before any verdict:

```text
workflow: Video Operation Radar Scout v2-v3 face A-B review on shared MacRunner
run: 31359509078
job: 93365421766
carrier exact head: e97120fcf89c16015ca41338503544694a1d19a8
left source: v2 PNG SHA e3f65181de4188e58fb8ae4ca3e665113c6b1ab3e0c7f7c2253c0302f672a01a
right source: v3 PNG SHA 8c7b54fbab7ca0ee962326f22d5004d93e785f3383ff2d2a0f3ca23d18ac41ce
face crop: same coordinates for both sources
review image: 240x120, v2 left / v3 right
alpha flattened to #101820 before crop/downscale
```

## Controller A/B verdict

### v3 facial-sculpt experiment — REJECT / REGRESSION

```text
facialIdentityExperimentApproved=false
preferredStaticBaseline=V2
promotionDecision=REJECT_V3_KEEP_V2_BASELINE
```

The exact face A/B shows that v3 does **not** improve the premium facial-identity problem.

Observed regression:

1. **v2 is visually cleaner and more coherent.** The eyes remain simple, but the face reads as one character rather than a collection of added parts.
2. **v3 adds visible construction noise.** Upper-lid arcs, brow accents, temple traces and extra face volumes read as attached lines / pieces instead of a continuous sculpted face.
3. **The new parts interfere with the strongest v2 feature — the glossy eyes.** The face becomes busier without becoming more distinctive or premium.
4. **Primitive layering is now the limiting method.** Adding more small spheres, curves, discs or shallow overlay volumes to a base head cannot reliably produce the authored plane transitions required by the target quality bar.
5. **More facial parts would be the wrong next move.** The experiment falsifies the assumption that incremental procedural add-ons can bridge the remaining quality gap.

## What is promoted vs rejected

Promoted:

```text
shared MacRunner -> Blender execution
Blender hero-pixel authority
v2 overall body / silhouette direction
v2 tablet / energy-tail envelope
current material / light / camera baseline for controlled testing
```

Rejected:

```text
v3 facial overlay strategy
primitive-layer facial sculpting as the next refinement path
rigging before a better head asset exists
animation as a way to hide static source weakness
```

## Next blocker / method change

The next problem is no longer a parameter-tuning problem. It is a source-asset authoring problem:

```text
CONTINUOUS_AUTHORED_HEAD_MESH / PREMIUM_SOURCE_SCULPT
```

The next static experiment should replace the v2/v3 head-face construction with **one coherent authored head / face surface**, rather than layering more primitives.

Acceptable source paths include:

- a genuinely sculpted Blender mesh with continuous forehead / brow / socket / cheek / muzzle transitions;
- a high-quality externally authored or generated 3D head/source mesh with provenance and durable persistence;
- a production-grade head asset derived from the approved Character Bible and preserved as the source authority.

It should preserve v2 body silhouette and current render baseline so the next A/B changes only the head/source-sculpt method.

Do not rig, animate, touch the canonical 19.2-second M10 candidate, or publish before this static source-asset gate is cleared.

## Truth boundary

```text
controllerVisualReviewOccurred=true
humanVisualReviewOfHeroV3=false
technical3DPipelineApproved=true
geometryExperimentV2Approved=true
facialIdentityExperimentV3Approved=false
preferredStaticBaseline=V2
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
riggingPerformed=false
animationPerformed=false
canonicalCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
