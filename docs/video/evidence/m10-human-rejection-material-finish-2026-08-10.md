# M10 human rejection — systemic material / finish quality

Date: 2026-08-10

## Decision

The current exact ToolRadar M10 candidate is **REJECTED** for social-platform quality release.

The human reviewer reported that the latest version is only a modest improvement over the previously seen candidate and still remains visibly below mainstream publishable / presentation-grade motion-design quality. The dominant failure is not story structure or technical media integrity; it is systemic **material / finish quality** across the visual system.

Human feedback in the active review included:

> 跟上次还差不多少……最大问题一直都是缺少质感。无论是精灵也好，还是里边的素材的质感，所有的素材的质感都不够。

This feedback is sufficient to block M10. The controller classifies the defect as:

```text
primaryLayer = static_visual_development / material_finish
secondaryLayers = lighting / edge_finish / surface_depth / character_finish
storyHookRegressionClaimed = false
motionTimingRegressionClaimed = false
technicalMediaIntegrityFailureClaimed = false
```

The existing 19.2-second information structure, product-truth boundary, retention anchors, narration, and Human Gate semantics are therefore not the target of the next experiment.

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

Representative frames show a consistent finish ceiling:

1. **Flat material response** — most objects are a single gradient/fill plus glow, so plastic, glass, metal, paper/card, and emissive surfaces do not read as materially distinct.
2. **Weak edge hierarchy** — borders are mostly uniform vector strokes; there is little bevel/rim/specular behavior to separate foreground objects from the dark field.
3. **Insufficient local lighting** — glow exists, but light does not convincingly wrap, occlude, or create contact between neighboring objects.
4. **Low surface-frequency variation** — broad gradients exist, but micro roughness, subtle texture, imperfect reflection, and controlled grain are too weak to create tactile finish.
5. **Radar Scout still reads as a sticker** — silhouette is recognizable, but chassis, face glass, antenna, feet, and emissive eyes do not yet have enough depth/material separation to feel like a premium authored hero asset.
6. **Cards/modules feel schematic** — evidence cards and signal nodes communicate function but still look like diagram primitives rather than production assets.

## Next experiment — single-variable material finish benchmark

Do **not** rerender the full 19.2-second candidate yet.

The next gate is a bounded 5-second material-finish benchmark that keeps semantic roles fixed and tests only the finish system on three representative assets:

```text
A. signal / candidate module
B. evidence / decision card
C. Radar Scout hero asset
```

The candidate finish should introduce, only where useful:

- distinct material families (glass / coated polymer / metal trim / paper-card surface);
- multi-stage highlight and rim behavior;
- contact shadows / ambient occlusion cues;
- subtle roughness/noise variation rather than uniform flat fills;
- better bevel and edge separation;
- controlled emissive bloom with non-emissive body response;
- coherent key/fill/rim lighting direction;
- depth/parallax sufficient to read as authored 2.5D rather than flat stickers.

The benchmark must remain self-owned and deterministic. No generated factual UI, no third-party visual asset, no second product truth, no publication action.

## Promotion gate

Promote the new finish system only if the benchmark materially improves all of:

```text
material differentiation
hero-asset finish
edge quality
lighting coherence
surface depth
phone-speed readability
world consistency
truth safety
```

A small cosmetic improvement is not enough. If the benchmark still reads like polished SVG/CSS rather than professional motion-design artwork, reject it before touching the 19.2-second candidate.

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
