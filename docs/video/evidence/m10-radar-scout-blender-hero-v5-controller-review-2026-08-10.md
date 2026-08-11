# M10 Radar Scout Blender Hero v5 — Controller Review

Date: 2026-08-10
Owner lane: Video Operation / M10 visual development
Owner PR: #112

## Purpose

Continue from the v4 methodological result: a single continuous head surface is the correct source-authoring direction, but v4's visible delta was too small to replace the v2 visual baseline.

This v5 A/B changed exactly one coupled facial-structure variable:

`HEAD_PROPORTION_AND_EYE_SOCKET_ALIGNMENT`

The v4 continuous-mesh method is retained. v2 body, ears, hair, tablet, energy-tail envelope, materials, lighting, camera and renderer remain frozen.

## Exact source and runtime evidence

- Exact Video Operation source: `04248f7f0e89ebc8b5e2301799f51e8a2617adff`
- Source file: `apps/remotion-video/scripts/render-radar-scout-3d-hero-v5.py`
- MacRunner workflow run: `31363059121`
- MacRunner job: `93375680694`
- Blender: `5.2.0 LTS`
- Render engine: `BLENDER_EEVEE`
- Output: `2048x2048` transparent RGBA PNG
- Output file size: `2,903,638` bytes
- PNG SHA-256: `c913fc01c6765002bba788a0115f720a4273974abf9772e57ef32d256ef7592c`
- `.blend` SHA-256: `66609c17538d9f55e94ffb557ad1b11499e10a2530b0bcd573e6942a52ad08be`
- Persistent MacRunner directory: `/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-radar-scout-hero-v5/`
- Head object: `ScoutHeadContinuousV5`
- Head vertices: `10368`
- Head polygons: `10240`
- Scene objects: `91`
- Materials: `17`

The exact v2 and v4 persisted baseline PNG hashes were verified before rendering v5.

## Frozen boundary

Receipt asserts:

- `controlledVariable=HEAD_PROPORTION_AND_EYE_SOCKET_ALIGNMENT`
- `headSourceAuthoringMethod=CONTINUOUS_CUSTOM_DENSE_MESH`
- `facialPrimitiveOverlays=false`
- `v2BodyFrozen=true`
- `v2HairFrozen=true`
- `v2EarsFrozen=true`
- `v2TabletFrozen=true`
- `v2EnergyTailFrozen=true`
- `heroPixelsAuthority=BLENDER_RENDER`
- `remotionRedrawAllowed=false`
- `heroAssetRedrawn=false`

No artifact upload was required; the shared MacRunner retained the exact PNG / blend / receipt and returned compact review frames in the successful job log.

## Controller visual review

The review triptych was generated from exact persisted 2048 RGBA images in this order:

`v2 → v4 → v5`

Observed v5 improvement:

1. The head is visibly narrower and less spherical than v2/v4.
2. The lower face now has a more legible cheek → jaw → chin hierarchy.
3. The glossy eyes sit more coherently inside the authored sockets instead of reading as objects attached to a round face.
4. The facial identity reads closer to an elf / scout character and less like a generic toy mascot.
5. The v4 continuous-surface method therefore survives a second test: with stronger head proportions and eye/socket alignment, it creates a meaningful visible improvement rather than only a technical topology change.

Remaining rejection reason:

1. The complete Hero is still below presentation-grade / mainstream stage quality.
2. The strongest newly exposed defect is now the hair: large hard tapered spikes still read as low-poly plastic / foam geometry.
3. This conflicts with the recovered Character Bible art direction of pearly white-to-pale-cyan hair with softer directional clumps, fiber response and premium surface separation.
4. Additional glow, animation or camera motion would not fix that source-asset defect.

## Verdict

- `continuousHeadMethodDirectionPass=true`
- `headProportionAndEyeSocketExperimentPass=true`
- `v5PreferredStaticBaseline=true`
- `preferredStaticBaseline=V5`
- `v5PresentationGrade=false`
- `staticHeroCreativeApproved=false`
- `riggingGateOpen=false`
- `animationGateOpen=false`

This is a real baseline promotion, not a human final approval. The controller promotes v5 only as the next visual-development source baseline.

## Next controlled variable

`HAIR_GROOM_AND_STRAND_SURFACE`

Next A/B requirements:

- freeze the v5 head / face / eye placement;
- freeze body, ears, tablet, energy tail, lighting, camera and renderer;
- replace the current hard spike hair construction with a durable Blender-authored hair source using layered directional clumps / strands or equivalent groom geometry;
- target pearly white-to-pale-cyan material response, readable strand breakup, soft-to-sharp silhouette variation and controlled cyan rim response;
- do not modify face proportions in the hair experiment;
- static 2048 render gate first; no rigging / animation until the source hair passes.

## Truth boundary

- `canonicalCandidateModified=false`
- `humanSelectedForCanonical=false`
- `humanFinalApproval=false`
- `riggingPerformed=false`
- `animationPerformed=false`
- `publicationAllowed=false`
- `publicationPerformed=false`
- `analyticsObserved=false`

Merge=NO. Deploy=NO. Publication=NO.
