# M10 Radar Scout Character Bible source-asset experiment

Date: 2026-08-10

## Why this experiment exists

Human review identified a pipeline-level visual quality failure: earlier concept/generated imagery could look substantially more polished than the final MP4, while the rendered character looked like a rough silhouette or a low-fidelity reconstruction.

A prior high-detail visual-development reference was recovered from the operator's file library:

```text
Radar Scout Character Bible Board.png
created: 2026-08-09
```

The board already establishes a substantially richer authored visual language for Radar Scout: pale white/blue hair, large glossy eyes, pointed ears, twin antennae with luminous blue orbs, teal/blue scarf-cloak, dark technical suit, radar chest emblem, hovering energy tail, holographic radar UI, multiple expressions/poses and motion-loop ideas.

This experiment does **not** treat the board as a loose inspiration that Remotion may redraw. It converts the recovered character direction into a durable source asset and tests that asset at large on screen.

## Single variable

Only the Radar Scout hero source asset is upgraded.

Controlled / unchanged:

```text
canonical 19.2-second candidate
story structure
retention anchors
narration
product claims
publication truth
existing signal/evidence-card benchmark assets
```

Changed:

```text
Radar Scout hero source asset only
```

## Durable source asset

```text
apps/remotion-video/public/assets/m10-material-finish-v1/radar-scout-character-bible-hero-v2.svg
```

The SVG contains authored hair, face, eyes, ears, antennae/orbs, cloak, suit, radar emblem, hands, energy tail, holographic tablet, radar rings, particles, gradients, specular-light treatment and controlled surface texture.

It is intentionally a source asset rather than a React/CSS character implementation.

## Render path

```text
Radar Scout Character Bible visual direction
→ durable hero SVG
→ staticFile()
→ <Img>
→ transform / camera / compositing only
→ 3.0-second difficult-shot MP4
```

Composition:

```text
ToolRadarRadarScoutCharacterBibleBenchmarkV2
```

The character occupies a large portion of the 1080x1920 frame so that low-detail shortcuts cannot be hidden by scale, background complexity or fast editing.

## Promotion gate

Technical render success is insufficient.

Promote the hero asset only if representative frames visibly improve the exact rejected quality dimension:

1. character must read as an authored hero object, not a sticker/icon;
2. hair/eyes/cloak/suit/emblem must remain materially distinct at large scale;
3. high-frequency authored detail must survive into MP4;
4. the asset must retain its intended specular/emissive hierarchy;
5. no Remotion redraw approximation may replace the source SVG;
6. improvement must be large enough to justify a later full-candidate integration.

A small cosmetic improvement remains REJECT.

## Truth boundary

```text
characterBibleRecoveredAsVisualReference=true
sourceAssetCreated=true
canonicalCandidateModified=false
humanSelectedForCanonical=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
