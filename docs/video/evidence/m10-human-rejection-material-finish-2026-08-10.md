# M10 human rejection — systemic material / finish quality

Date: 2026-08-10

## Decision

The current exact ToolRadar M10 candidate is **REJECTED** for social-platform quality release.

The human reviewer reported that the latest version is only a modest improvement over the previously seen candidate and still remains visibly below mainstream publishable / presentation-grade motion-design quality. The dominant failure is systemic **material / finish quality** across the visual system.

Human feedback in the active review included:

> 跟上次还差不多少……最大问题一直都是缺少质感。无论是精灵也好，还是里边的素材的质感，所有的素材的质感都不够。

The reviewer also identified the likely production root cause: high-quality concept images/assets seen earlier did not survive into the final MP4. The final video looked as if the concept had been reduced to a silhouette or a much rougher reconstruction.

This feedback is sufficient to block M10.

## Controller classification

```text
primaryLayer = static_visual_development / material_finish
secondaryLayers = production_asset_preservation / lighting / edge_finish / surface_depth / character_finish
storyHookRegressionClaimed = false
motionTimingRegressionClaimed = false
technicalMediaIntegrityFailureClaimed = false
```

The existing 19.2-second information structure, product-truth boundary, retention anchors, narration, and Human Gate semantics are not the target of the next experiment.

## Exact rejected media lineage

```text
source exact head: a5ac58e0ea05c5d8d8ca6861e1001b044bde44e0
workflow run: 31304399179
artifact id: 9035504064
artifact ZIP digest: cbb0a4b97201a3999b819486682d023d0d93061f1d97920c13a8c34fe51e4a3b
file: toolradar-explainer-19s-production-polish-alpha-v2.mp4
sha256: 1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598
profile: 1080x1920 / 30fps / 576 frames / 19.2s
```

The exact media remains technically valid. This rejection is a creative-quality decision and must not be converted into a technical failure claim.

## Controller diagnosis

Representative frames and source inspection show two coupled problems.

### A. Finish ceiling in the rendered assets

1. **Flat material response** — many objects reduce to one fill/gradient plus glow, so plastic, glass, metal, paper/card, and emissive surfaces do not read as materially distinct.
2. **Weak edge hierarchy** — borders are mostly uniform vector strokes; bevel/rim/specular behavior is insufficient.
3. **Insufficient local lighting** — glow exists, but light does not convincingly wrap, occlude, or create contact between neighboring objects.
4. **Low surface-frequency variation** — broad gradients exist, but controlled micro roughness, reflection variation, and surface detail are too weak.
5. **Radar Scout reads too much like a sticker** — silhouette is recognizable but chassis, face glass, antenna, feet and emissive parts lack enough material separation.
6. **Cards/modules feel schematic** — they communicate function but still resemble diagram primitives rather than production assets.

### B. Production-asset preservation failure

The more important systemic issue is the handoff between visual development and final composition.

The prior pipeline allowed this destructive translation:

```text
high-quality concept / generated image / design asset
→ reviewer sees and likes concept
→ concept is not promoted to durable production asset
→ Remotion/React recreates the idea with CSS/SVG primitives
→ only silhouette / layout / simplified colors survive
→ final MP4 loses texture, lighting, edge detail, surface response and authored micro-detail
```

This is now considered a pipeline defect. A visually approved concept must not be treated merely as a reference image for a later low-fidelity redraw.

## Production-asset preservation rule

For hero visual assets, the visual-development output itself must become the render input whenever technically possible.

Allowed durable source forms include:

```text
SVG
high-resolution PNG / WebP
transparent layered raster assets
pre-rendered 2D/2.5D/3D plates
approved Figma-exported vector/raster assets
other immutable source assets with digest/provenance
```

The final composition layer may:

```text
position
scale
crop / mask
animate transforms
apply camera/parallax
sequence shots
add deterministic product UI/text above the asset
composite layers
bind narration/captions/audio
render and collect evidence
```

The final composition layer must **not** silently replace a promoted hero asset by rebuilding an approximate low-detail version with DOM/CSS/vector primitives.

For the new benchmark, durable SVG files under `apps/remotion-video/public/assets/m10-material-finish-v1/` are the source authority and Remotion must ingest them through `staticFile()` + `<Img>`.

This does not imply SVG is always the preferred visual format. For generated/painted/3D visual work, high-resolution raster/layered assets may preserve substantially more quality and should be used directly.

## Next experiment — source-asset preservation benchmark

Do **not** rerender the full 19.2-second candidate yet.

The next gate is a bounded 5-second benchmark testing three representative asset classes:

```text
A. signal / candidate module
B. evidence / decision card
C. Radar Scout hero asset
```

The controlled experiment is now:

```text
material finish
+
production asset preservation
```

not another CSS-polish pass.

The benchmark must prove that authored source assets survive into the MP4 without being redrawn by Remotion.

## Promotion gate

Promote the new system only if it materially improves all of:

```text
source-asset fidelity
material differentiation
hero-asset finish
edge quality
lighting coherence
surface depth
phone-speed readability
world consistency
truth safety
```

A small cosmetic improvement is not enough. If the benchmark still reads like polished DOM/CSS primitives rather than professional authored motion-design assets, reject it before touching the 19.2-second candidate.

## Truth boundary

```text
realFinalMp4Exists = true
technicalMediaIntegrityPassed = true
humanVisualReviewOccurred = true
humanWatchedFullVideo = not_claimed
humanQualityDecision = REJECTED
humanQualityApproved = false
rejectedCandidateSha256 = 1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598
publicationAllowed = false
publicationPerformed = false
analyticsObserved = false
```

No platform login, upload, publication, platform identifier, public URL, analytics observation, or performance result is claimed by this receipt.
