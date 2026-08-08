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
no unknown request/shot/output-profile semantics
safe non-secret persisted requestId/profileId
```

Anything else fails `SMOKE_SUBSET_UNSUPPORTED` / `UNSUPPORTED_FIELD` before project generation.

This is intentional. v1 proves infrastructure materialization; it does not invent a lossy compiler for narration, assets, voice, captions or unrecognized future fields.

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

Composition ID:

```text
SharedMediaRenderV1
```

The composition is product-neutral black output only. Canonical shots become exact black `Sequence` frame ranges; there is no title, branding, course/social content, narration, asset, audio or caption.

The marker file binds the generated project to the exact canonical `inputManifestDigest`, project/composition identity, normalized output profile, segment frame plan and exact duration.

Persisted identifiers are bounded. Both `requestId` and `outputProfile.profileId` must be safe non-secret identifiers; path-like or credential-shaped values are rejected before generated marker/source material can be created.

## Canonicalization and semantic re-derivation

`outputProfile` is normalized into a fixed five-field shape before any generated JSON/source is emitted:

```text
profileId
width
height
fps
container
```

Therefore two semantically equal canonical requests with a different JavaScript key insertion order generate byte-identical materialization files/candidate digests.

The candidate also carries `segmentFrames[]` explicitly. Candidate validation does not merely trust its SHA values. It revalidates:

- exact audited runtime requirements;
- normalized safe persisted output profile;
- contiguous frame segments starting at zero;
- total-frame/duration equality;
- deterministic regeneration of all three files;
- file-manifest SHA/byte lengths;
- candidate digest.

`verifyCandidateAgainstRequestV1(candidate, request)` independently rematerializes the exact canonical request and requires the candidate digest/file-manifest digest to match. Later staging must use this check before any binding approval.

## Deterministic integrity

The candidate contains:

```text
generatedFileManifest[]
generatedFilesManifestSha256
candidateDigest
```

Every generated file record has path, SHA-256 and byte length. `verifyObservedMaterializedFilesV1(...)` requires an observed staging manifest to match those exact candidate-owned files before a later owner may consider creating a pre-materialized binding.

File equality or candidate digest proves content identity only. It does **not** prove authorization, binding approval, dependency correctness, runtime success or artifact evidence.

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

1. start from the exact canonical request;
2. run this materializer and `verifyCandidateAgainstRequestV1`;
3. copy/use an audited compatible Remotion template inside the Mac runtime's bounded work root;
4. write only the generated candidate files;
5. re-hash those exact files and verify them with `verifyObservedMaterializedFilesV1`;
6. verify runtime/dependency/layout identity;
7. obtain explicit external binding/job authorization;
8. only then create an approved binding through the merged Mac compatibility package;
9. submit `render_existing`;
10. collect artifact/ffprobe/render-log through the merged Evidence Collector.

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

The exact-head suite requires 25/25 contracts covering deterministic generation, key-order canonicalization, exact frame segments, marker truth, audited runtime pinning, no approval claim, visual/narration/voice/caption rejection, codec/container/fps constraints, unknown semantic rejection, integer-frame timing, safe request identity, safe persisted profile identity, file/candidate digest integrity, semantic/source tamper rejection, exact request↔candidate verification, observed staging manifest equality, deep freeze and product-neutral output.

## What source/test PASS does not prove

A passing materializer does not prove that a project has been staged on the Mac, that dependencies are installed, that the composition can render, that any binding is approved, that a render job ran, or that canonical artifact evidence exists. Those remain separate runtime gates.