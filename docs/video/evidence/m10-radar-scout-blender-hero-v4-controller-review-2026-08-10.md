# M10 Radar Scout Blender Hero v4 — Controller Review

Date: 2026-08-10
Owner lane: Video Operation / M10 visual development
Owner PR: #112

## Purpose

Test one bounded source-authoring change after v3 proved that stacking primitive facial overlays is a regression.

Controlled variable:

`CONTINUOUS_AUTHORED_HEAD_MESH`

Everything else is intentionally frozen to the preferred v2 static baseline: eyes, ears, hair, body silhouette, tablet scale, energy-tail envelope, materials, lighting, camera and Blender renderer.

## Exact source and runtime evidence

- Exact Video Operation render source: `7fca6c04ccf6964cac49b04b7dc27cc0c24b3c50`
- Source file: `apps/remotion-video/scripts/render-radar-scout-3d-hero-v4.py`
- Source method: `CONTINUOUS_CUSTOM_DENSE_MESH`
- Facial primitive overlays: `false`
- Head object: `ScoutHeadContinuousV4`
- Base head vertices: `8176`
- Base head polygons: `8064`
- Scene object count: `91`
- Material count: `17`
- Blender: `5.2.0 LTS`
- Render engine: `BLENDER_EEVEE`
- Output: `2048x2048` transparent RGBA PNG
- Output size: `2,904,040` bytes
- PNG SHA-256: `84b71687b2fbd99005bf2cf904166fd3908f267c49784946c13ec7dda41b1560`
- `.blend` SHA-256: `356b26d81dca1bd210cf8d0e402be42c3f75e0201e2d5c9e3303139f51e1df99`
- Persistent MacRunner directory: `/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-radar-scout-hero-v4/`

Shared MacRunner execution:

- Render / same-crop A-B run: `31362279851`
- Render job: `93373354684`
- Exact persisted evidence recheck / compact review run: `31362434534`
- Compact review job: `93373824539`

The render, receipt validation, frozen-v2 boundary checks and same-crop v2-v4 face A-B all passed. The first job's final `actions/upload-artifact` step failed only because the GitHub Actions artifact storage quota had been reached. No render or evidence-generation step failed. The compact recheck then read the exact persisted MacRunner files, verified their SHA-256 values and returned the review images through the job log without rerendering.

## Frozen boundary verified

Receipt asserts:

- `preferredBaseline=v2`
- `v2EyesFrozen=true`
- `v2HairFrozen=true`
- `v2BodyFrozen=true`
- `v2TabletFrozen=true`
- `v2EnergyTailFrozen=true`
- `heroPixelsAuthority=BLENDER_RENDER`
- `remotionRedrawAllowed=false`
- `heroAssetRedrawn=false`

## Controller visual review

A same-coordinate face crop was generated from the exact persisted v2 and v4 2048 RGBA sources. Left is v2; right is v4.

Observed change:

1. v4 removes the v3-style stuck-on brow / lid / temple construction noise.
2. The head is now one continuous surface, so temple, forehead, cheek, muzzle and jaw transitions are structurally coherent rather than separate overlay objects.
3. However, the actual visible delta versus v2 is still modest. At review scale the character reads as essentially the same stylized toy-like mascot.
4. The premium Character Bible target is still not reached: the forehead/brow/socket/cheek hierarchy is too shallow, the eye-to-socket fit remains generic, and the locked v2 head/eye proportions dominate the read.
5. Adding effects, rigging or animation now would not solve the remaining defect.

## Verdict

- `continuousHeadMethodDirectionPass=true`
- `continuousHeadTechnicalGatePass=true`
- `v4PresentationGrade=false`
- `v4PromotedAsCanonicalStaticHero=false`
- `preferredStaticBaseline=v2`
- `v3PrimitiveOverlayMethodRejected=true`
- `staticHeroCreativeApproved=false`

The important result is methodological: **single-surface facial authoring is promoted as the development direction, but this specific v4 shape is not promoted as the visual asset.**

## Next controlled variable

`HEAD_PROPORTION_AND_EYE_SOCKET_ALIGNMENT`

For the next A/B:

- keep the v4 continuous-head authoring method;
- freeze v2 body, tablet, energy tail, materials, lighting, camera and renderer;
- allow only head proportions plus eye position/depth/scale needed to seat the glossy eyes inside authored sockets;
- increase readable forehead → brow → socket → cheek → muzzle → jaw plane hierarchy;
- do not add facial overlay primitives;
- perform the same static 2048 render and same-coordinate face A/B before any rigging or animation.

## Truth boundary

- `canonicalCandidateModified=false`
- `humanSelectedForCanonical=false`
- `riggingPerformed=false`
- `animationPerformed=false`
- `publicationAllowed=false`
- `publicationPerformed=false`
- `analyticsObserved=false`

Merge=NO. Deploy=NO. Publication=NO.
