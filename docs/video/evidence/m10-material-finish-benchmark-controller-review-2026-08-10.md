# M10 material-finish benchmark — controller review

Date: 2026-08-10

## Exact benchmark evidence

```text
PR: #112
exact head: 08863d0f21253341d4129303e6b8ede36e6d8ce9
workflow: M10 Material Finish Benchmark v1
run: 31341248721
artifact: 9045897200
artifact digest: sha256:8f09f20634c260e473ec80abe126a8744d45703558e489e675bc25ac5779f653
MP4 SHA-256: 519240449f9ce8c9f6b51f31ae159ec88cff2aa120cb71c039d872ece38eb3b7
profile: 1080x1920 / 30fps / 150 frames / 5.0s
```

Source asset digests recorded by the exact workflow:

```text
signal-module.svg  897eaf1bf304dc75cfce4b7d477c0ed66f272dd8d80229cbcd76c0fac15511e6
evidence-card.svg  48bef375ccd049cd18c2b255ea89cf879b4b65511c119c143c011a64ad992af5
radar-scout.svg    4cf472edf1df8397b006d279cba899c39b395327105c74a4b5c053c9c00551fc
```

The immutable receipt proves:

```text
sourceAssetAuthority=durable_svg_files
remotionAssetPath=staticFile_plus_Img
remotionRedrawOfHeroAssets=false
canonicalCandidateModified=false
```

## Controller verdict

### Production-asset preservation: PASS

The benchmark successfully fixes the pipeline defect. The authored SVG assets survive as the source authority into the rendered MP4 and Remotion is used as a composition/timing layer rather than a hero-asset redraw layer.

This architecture is promoted as the correct production direction.

### Creative/material quality: REJECT / NOT PROMOTED

Representative frame review shows a visible improvement in coherence and asset integrity, but the benchmark still does not clear the target quality bar for mainstream presentation-grade motion design.

Observed remaining gaps:

1. Radar Scout still reads primarily as a polished icon / sticker rather than a fully authored premium hero asset.
2. The evidence card is cleaner but still reads as a UI mock/card primitive rather than a materially rich object integrated into the scene.
3. The signal module preserves its authored gradient/highlight system, but the family is still too schematic and generic.
4. Scene lighting does not yet create enough contact, occlusion, reflected color, depth separation or environment response across objects.
5. Material families remain too close to vector illustration; glass, metal/polymer, paper/card and emissive surfaces are not separated strongly enough.
6. The scene lacks the higher-frequency authored detail and imperfect surface response typical of premium 2.5D/3D plates or high-end raster illustration.

## Consequence

Do not apply these three benchmark SVGs across the full 19.2-second candidate.

The next experiment should preserve the now-correct asset-ingestion architecture while upgrading the **source assets themselves**. Candidate directions:

```text
high-resolution transparent PNG/WebP hero assets
layered 2.5D plates (foreground/body/highlight/shadow/emissive)
Figma-authored/exported vectors where the design itself is already final
Blender/3D renders for hero objects when real material/light response is required
generated/painted visual-development assets with stable provenance and alpha/mattes
```

The important rule is that whichever visual-development output wins the static gate becomes the actual render input. It must not be approximated again inside Remotion.

## Truth boundary

```text
assetPreservationArchitecturePromoted=true
benchmarkTechnicalMediaPassed=true
benchmarkCreativeQualityPromoted=false
canonicalCandidateModified=false
humanSelectedForCanonical=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
