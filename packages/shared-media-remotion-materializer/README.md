# Shared Media Remotion Materializer v1

Deterministic, product-neutral pre-materialization candidate generator for a deliberately tiny `media.render.v1` technical-smoke subset.

This package exists because the audited Mac `render_existing` path has no proven runtime `--props` injection. Canonical render semantics therefore have to be embedded in a project/composition before transport submission.

## What v1 supports

Only blank infrastructure smoke requests:

```text
valid media.render.v1
visualAssets = []
all shot.visualAssetIds = []
all shot.narration.mode = none
voice.mode = none
captions = none / none
container = mp4
videoCodec omitted
audioCodec omitted
integer fps in audited Mac range
width/height in audited Mac range
every shot has durationMs
all durationMs map exactly to integer frames
total duration 1..900 seconds
```

Anything else fails `SMOKE_SUBSET_UNSUPPORTED` before project generation.

This is intentional. v1 proves infrastructure materialization; it does not invent a lossy compiler for narration, assets, voice or captions.

## Audited runtime basis

Read-only Mac layout audit:

```text
TrainingOS disposable carrier PR #633
run 31254844201
job 93096608745
```

Observed working reference project:

```text
name: mac-remotion-connected
entry: src/index.ts
composition: MacRemotionConnected
remotion: 4.0.506
@remotion/cli: 4.0.506
react: 19.2.3
react-dom: 19.2.3
source-manifest SHA-256:
068da049c4b0b2a795e6b91de1cca47ca290d7aced4ab8a8f4b09baf6c805561
```

The server audit also proved:

```text
render_existing referenced
compositionId/projectName/projectDir/outputName participate in runtime
runtime --props CLI injection NOT proven
npm install/ci path NOT proven
npx path NOT proven
```

Therefore this materializer pins the known reference dependency versions but does not install dependencies or execute Remotion.

## Generated candidate

Schema:

```text
shared-media.remotion-materialization-candidate.v1
```

A supported request produces exactly three files:

```text
shared-media-materialization.json
src/index.ts
src/root.tsx
```

`src/root.tsx` contains a product-neutral black composition named:

```text
SharedMediaRenderV1
```

Each canonical shot becomes a black Remotion `Sequence` with the exact integer frame range derived from `durationMs × fps`. There is no title, branding, course/social content, narration, asset, audio or caption.

The marker file binds the generated project to the exact canonical `inputManifestDigest`, project/composition identity, expected duration/frame count and output profile.

## Deterministic integrity

The candidate contains:

```text
generatedFileManifest[]
generatedFilesManifestSha256
candidateDigest
```

Every generated file record has path, SHA-256 and byte length. `verifyObservedMaterializedFilesV1(...)` requires an observed staging manifest to match those exact candidate-owned files before a later owner may even consider creating a pre-materialized binding.

File-manifest equality proves only that the generated files were staged unchanged. It does **not** prove authorization, binding approval, dependency correctness, runtime success or artifact evidence.

## No approval or transport authority

The materializer always emits:

```text
renderAuthorized=false
bindingCreated=false
consumerDomainDecisionInferred=false
businessOutcomeInferred=false
```

It never emits `approved_pre_materialized` and never calls `createMacPreMaterializedBindingV1`.

A later non-production staging/smoke owner must separately:

1. copy/use an audited compatible Remotion template inside the Mac runtime's bounded work root;
2. write the generated candidate files;
3. re-hash those exact files and verify them against the candidate;
4. verify runtime/dependency/layout identity;
5. obtain explicit external binding/job authorization;
6. only then create an approved binding through the merged Mac compatibility package;
7. submit `render_existing`;
8. collect artifact/ffprobe/render-log through the merged Evidence Collector.

## Why codecs are omitted in smoke v1

The audited Mac compatibility request does not expose a proven codec selector. The blank project also has no audio track.

Therefore v1 refuses explicit `videoCodec` and `audioCodec` claims rather than guessing that the backend will emit a particular codec/audio stream. The canonical Evidence Collector will record what ffprobe actually observes; a future runtime-specific codec proof may widen this subset.

## Product-neutral boundary

Generated source contains no ToolRadar or TrainingOS business vocabulary and does not infer creative approval, course publication, social-platform fit, analytics or business outcomes.

## Pure-function boundary

This package performs no:

```text
filesystem writes
network requests
process execution
npm install
npx
Remotion render
Mac operation
binding creation
authorization decision
artifact read
publication
```

It only returns deeply frozen strings/metadata for a later explicitly authorized staging owner.

## Tests

The exact-head suite requires 21/21 contracts covering deterministic generation, exact frame segments, marker truth, runtime pinning, no approval claim, visual/narration/voice/caption rejection, codec/container/fps constraints, integer-frame timing, safe request identity, file/candidate digest integrity, observed staging manifest equality, deep freeze and product-neutral output.

## What source/test PASS does not prove

A passing materializer does not prove that a project has been staged on the Mac, that dependencies are installed, that the composition can render, that any binding is approved, that a render job ran, or that canonical artifact evidence exists. Those remain separate runtime gates.