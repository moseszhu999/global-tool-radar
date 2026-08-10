# M10 Blender local capability probe contract

Date: 2026-08-10

## Purpose

Establish the smallest truthful bridge from Video Operation to a user-owned Blender installation before any modeling, rendering, file mutation, or runtime integration is attempted.

This probe exists because the new production direction promotes Blender/3D as the authority for premium hero assets, while the current connected environment does **not** yet prove that the user's local Mac Blender installation is callable.

## Probe contract

Canonical script:

```text
apps/remotion-video/scripts/probe-blender-capability.mjs
```

The probe is intentionally read-only. It may only:

1. inspect explicit `BLENDER_BIN` when provided;
2. inspect common macOS Blender executable paths;
3. try `blender` from `PATH`;
4. execute `blender --version`;
5. return a JSON receipt.

It must not:

- open a `.blend` file;
- run Blender Python;
- render frames;
- write an output asset;
- install Blender;
- change Blender preferences;
- mutate the Mac runtime;
- publish or upload anything.

## Receipt schema

```text
toolradar.blender.capability-probe.v1
```

Required truth fields include:

```text
probeMode=READ_ONLY_VERSION_PROBE
installed
executable
discoverySource
versionLine
filesModified=false
blendOpened=false
renderPerformed=false
externalStateModified=false
```

## Discovery order

When applicable:

```text
BLENDER_BIN
/Applications/Blender.app/Contents/MacOS/Blender
/opt/homebrew/bin/blender
/usr/local/bin/blender
PATH: blender
```

## Contract validation

Exact validated head:

```text
7a7c5b92e11da0f3210970c851183cd580450442
```

Workflow:

```text
M10 Blender Capability Probe Contract v1
run: 31344298380
conclusion: SUCCESS
```

The workflow validates both:

- positive fixture: an explicit executable returns `Blender 4.5.0 LTS` and the receipt is `installed=true`;
- negative fixture: no Blender executable is found and the receipt fails closed with `installed=false` and process exit code 2.

The first workflow attempt failed only because the negative fixture hard-coded `/usr/bin/node`; current hosted runners expose Node elsewhere. The fixed workflow captures `command -v node` before constraining `PATH`. That CI failure was unrelated to Blender detection logic and unrelated to the user's local machine.

A green cloud CI run still does **not** prove the user's local Blender is installed or reachable.

The local capability truth remains:

```text
localMacReachableFromCurrentController=false_or_not_proven
localBlenderInstalled=NOT_PROVEN
localBlenderCallable=NOT_PROVEN
localBlenderVersion=NOT_PROVEN
localBlenderRenderPerformed=false
```

## Promotion gate

Only after a real local receipt reports `installed=true` may the next bounded phase test:

```text
Blender background mode
→ synthetic test .blend or generated scene
→ transparent PNG output
→ SHA-256 + dimensions + alpha verification
→ handoff into Shared Media / Remotion asset ingestion
```

That later render test is a separate gate and must not be inferred from this probe contract.

## Production architecture decision

The current target division of responsibility is:

```text
Character Bible / visual-development authority
→ Blender: hero character / robot / premium object / material / light / short animation
→ transparent PNG/WebP / PNG sequence / optional EXR passes
→ Shared Media asset evidence
→ Remotion: timeline / camera-style 2D transforms / captions / audio / compositing
→ MP4
```

Figma/SVG remains the preferred authority for deterministic UI, logo, HUD, iconography, and factual information surfaces.

## Truth boundary

```text
blenderProductionDirectionSelected=true
probeContractImplemented=true
probeContractCloudValidated=true
probeContractRun=31344298380
localProbeExecuted=false
localBlenderInstalled=NOT_PROVEN
localRenderExecuted=false
canonical19sCandidateModified=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```
