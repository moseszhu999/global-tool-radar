# M10 Radar Scout Character Bible benchmark v2 — controller review

Date: 2026-08-10

## Exact evidence

```text
PR: #112
exact head: 3aeca69a789fe5d3642051c686daab3e76431499
workflow: M10 Radar Scout Character Bible Benchmark v2
run: 31341691138
artifact: 9046030548
artifact digest: sha256:e278c30a3dbdc35dd360add98e2e68b5f59f1c9da435c848478c73e4c83a3fa1
MP4 SHA-256: b1720bae468305940d2ad8fc06c138d42301580be0bf5d63703e8e0508541cb3
profile: 1080x1920 / 30fps / 90 frames / 3.0s
source asset: radar-scout-character-bible-hero-v2.svg
source asset SHA-256: 0f1f46b609b0c967b40c5e4e51c622b182fa56791f9e53969618c0212d8eedc4
```

Receipt confirms:

```text
sourceReference=Radar Scout Character Bible Board.png
sourceAssetAuthority=radar-scout-character-bible-hero-v2.svg
remotionAssetPath=staticFile_plus_Img
remotionRedrawOfHeroAsset=false
canonicalCandidateModified=false
```

## Controller verdict

### Asset preservation / render fidelity: PASS

The large-hero difficult-shot benchmark proves that the durable SVG reaches the MP4 through the direct asset path. The character is not being silently reconstructed by Remotion.

This removes the earlier ambiguity about whether the major quality loss was still happening in the composition/render layer.

### Creative quality: REJECT

The result is visibly more complete than the old primitive/icon-level Radar Scout, but it still does not clear the mainstream presentation-grade bar.

Observed remaining gap:

1. the character still reads as a polished vector mascot rather than a premium authored hero object;
2. hair, skin, eyes, cloak and suit have more separation, but material response is still illustration-like rather than deeply dimensional;
3. silhouette and facial design remain simplified compared with the recovered Character Bible visual-development board;
4. high-frequency texture and surface imperfection are insufficient;
5. the holographic tablet and emissive elements work, but the body does not receive enough physically convincing environmental response;
6. the benchmark is improved enough to validate the pipeline, but not improved enough to justify full-candidate integration.

## Root cause now narrowed

The current dominant gap is no longer the Remotion asset handoff.

```text
OLD uncertainty:
source quality ? + asset handoff loss ? + render loss ?

NOW:
asset handoff = PASS
render fidelity = PASS
source asset quality = still below target
```

## Next controlled experiment

Stop hand-authoring increasingly complex SVG approximations.

Move the Radar Scout visual-development stage to a higher-fidelity source format:

```text
high-resolution transparent PNG/WebP hero illustration
or layered 2.5D raster plates
or high-quality 3D/rendered plate with alpha
```

The recovered `Radar Scout Character Bible Board.png` remains the art-direction reference. The winning raster/2.5D asset must itself pass a static visual gate before any new Remotion benchmark is rendered.

## Truth boundary

```text
assetPreservationArchitecturePromoted=true
characterBibleSvgBenchmarkTechnicalPassed=true
characterBibleSvgBenchmarkCreativePromoted=false
canonicalCandidateModified=false
humanSelectedForCanonical=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
