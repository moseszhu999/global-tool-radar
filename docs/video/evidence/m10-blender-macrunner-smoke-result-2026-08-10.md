# M10 Blender shared-MacRunner smoke result

Date: 2026-08-10

## Purpose

Record the first real Blender production-pipeline smoke test executed on the shared cross-project **MacRunner** after the local Blender installation was proven callable.

This evidence belongs to Video Operation. `training-learning-rails` was used only as a disposable CI carrier because it already had access to the shared self-hosted MacRunner. The legacy runner label `trainingos-private-ci` does **not** imply TrainingOS ownership of MacRunner.

## Execution identity

```text
carrier repository: moseszhu999/training-learning-rails
carrier PR: #694 (temporary / DO NOT MERGE)
carrier exact head: c4fe5583396fa71ce66bd26f5127e2b8ad7653a4
workflow: Video Operation Blender smoke on shared MacRunner v1
workflow run: 31348106964
job: 93333748642
runner machine: zhudapengdeMacBook-Air-3
runner platform: macOS arm64
Blender executable: /Applications/Blender.app/Contents/MacOS/Blender
Blender version: 5.2.0 LTS
Blender build hash: fbe6228777e7
render engine: BLENDER_EEVEE
```

## Exact production outputs

Outputs remain on shared MacRunner storage:

```text
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-blender-smoke-v1/radar-orb-v1-1024.png
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-blender-smoke-v1/smoke-test-radar-orb-v1.blend
/Users/zhudapeng/Movies/RemotionActions/_shared/video-op-blender-smoke-v1/radar-orb-v1-receipt.json
```

Latest exact receipt:

```text
schemaVersion=toolradar.blender.smoke-test.receipt.v1
renderSucceeded=true
fileFormat=PNG
width=1024
height=1024
channels=4
alphaPresent=true
fileSizeBytes=823195
PNG SHA-256=2d367954c9ecfc2d570dfe7a84e9f815640844592d92ae897f65f487154cbbb5
.blend SHA-256=008b3d2f65f878d1c2d5f8a75389e8885cfa30c890d3e67dbb061e1952739bc8
renderMode=background_cli
outputTransparent=true
heroAssetRedrawn=false
publicationAllowed=false
publicationPerformed=false
```

Independent macOS `sips` verification on the exact output also reported:

```text
pixelWidth: 1024
pixelHeight: 1024
hasAlpha: yes
```

## Controller visual review

The MacRunner also returned a compact visual preview through its exact workflow log so the controller could inspect the rendered object without relying on GitHub artifact storage or a public tunnel.

Observed visual properties:

- clear spherical volume rather than a flat SVG/icon silhouette;
- visible specular highlight and shaded falloff across the body;
- cyan emissive/scan-ring treatment survives the Blender render;
- secondary ring geometry and small front details are visibly separate from the core body;
- the render reads as a genuine 3D-lit object, proving the intended material/light production path is real.

However, the object remains intentionally simple and should **not** be promoted as final ToolRadar hero art. It is a pipeline smoke object, not a presentation-grade asset.

## Verdict

### Blender / shared MacRunner production pipeline: PASS

The following real chain has now been proven:

```text
shared MacRunner
→ local Blender 5.2.0 LTS CLI/background mode
→ authored 3D geometry/material/light/camera
→ real transparent RGBA PNG + canonical .blend
→ SHA-256 / dimensions / alpha evidence
→ no hero-asset redraw
```

This is enough to promote Blender as the production authority for premium ToolRadar hero assets.

### Radar Orb creative quality: REJECT / NOT PROMOTED

The smoke object is not intended to meet the final mainstream presentation-grade quality bar. Its purpose was to separate pipeline capability from art-direction quality.

Do not propagate the Radar Orb itself across the 19.2-second candidate.

## Next bounded gate

The next experiment should move from generic smoke geometry to the first real **Radar Scout 3D static hero asset**, still before rigging or full-video integration:

```text
Character Bible authority
→ one 3/4 Radar Scout hero pose
→ authored 3D model + premium material/light
→ transparent 2048px or 4K production plate
→ static controller quality gate
→ only if PASS: rig / hover / scan / point-to-UI loops
→ only after those gates: Remotion integration benchmark
```

The static hero gate must specifically judge whether the source asset has crossed the previous ceiling in:

- hair / face / fabric / polymer / metal material separation;
- contact and rim lighting;
- high-frequency authored detail;
- silhouette sophistication;
- surface response and depth;
- mainstream presentation-grade finish.

## Infrastructure ownership boundary

```text
MacRunnerOwnership=SHARED_CROSS_PROJECT_INFRASTRUCTURE
TrainingOSOwnership=false
TrainingLearningRailsRole=TEMPORARY_CI_CARRIER_ONLY
carrierMergeAllowed=false
```

The carrier PR should be closed without merge after evidence capture.

## Truth boundary

```text
localBlenderInstalled=true
localBlenderCallable=true
macRunnerBlenderExecutionProven=true
backgroundRenderProven=true
transparentPngProven=true
blendSourceProven=true
assetDigestEvidenceProven=true
heroAssetRedrawn=false
blenderProductionDirectionPromoted=true
smokeObjectCreativeQualityPromoted=false
radarScout3dHeroCreated=false
canonical19sCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
