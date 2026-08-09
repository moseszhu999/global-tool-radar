# M10 Explainer v2 — Controller Re-verification Receipt

Date: 2026-08-09

## Scope

This receipt records a fresh controller-level re-verification of the exact ToolRadar M10 candidate after PR #108 bound the already-rendered candidate into the canonical lifecycle.

This is **not** human M10 approval, publication authorization, publication evidence, or analytics evidence.

## Exact identity

```text
repository: moseszhu999/global-tool-radar
current main observed before this receipt: 7f86239d6e56522d2cec2138defae32116380dc9
source exact head: a5ac58e0ea05c5d8d8ca6861e1001b044bde44e0
workflow run: 31304399179
artifact id: 9035504064
artifact name: toolradar-explainer-production-polish-alpha-ab-v2
artifact ZIP digest: sha256:cbb0a4b97201a3999b819486682d023d0d93061f1d97920c13a8c34fe51e4a3b
MP4: toolradar-explainer-19s-production-polish-alpha-v2.mp4
MP4 SHA-256: 1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598
```

## Fresh artifact retrieval

The controller re-fetched workflow-run `31304399179` from GitHub Actions and observed artifact `9035504064` as present and not expired.

The downloaded ZIP was extracted and the MP4 SHA-256 was recomputed locally:

```text
1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598
```

The recomputed value matches the canonical M10 lifecycle/review evidence.

## Fresh media inspection

Fresh `ffprobe` inspection of the downloaded MP4 observed:

```text
video codec: h264
video dimensions: 1080x1920
video frame rate: 30/1
audio codec: aac
audio sample rate: 48000
audio channels: 2
duration: 19.200000s
size: 3662040 bytes
```

The artifact's production-polish receipt also records:

```text
frames: 576
integratedLoudnessMeasured: -16.0
truePeakMeasured: -1.5
blackIntervalAtLeast035s: false
silenceIntervalAtLeast075s: false
fourCameoStrategyPreserved: true
productProofTextModified: false
generatedFactualUiUsed: false
thirdPartyVisualAssetsUsed: false
```

## Controller visual sample

Ten frames were freshly extracted at approximately:

```text
0.5s, 2.0s, 4.0s, 6.0s, 8.0s,
10.0s, 12.0s, 14.0s, 16.0s, 18.5s
```

Controller-level sampling did not reveal a black frame, obvious crop failure, or CJK tofu in those samples. The samples include the hook, signal clustering, evidence-before-heat framing, before/after reveal, upgrade explanation, Agent/Human Gate, and loop return.

This visual sample is only controller technical/dynamic evidence. It does not prove that a human watched the entire 19.2-second candidate or accepted its social-platform business fit.

## Canonical lifecycle binding

PR #108 merged the bounded already-rendered-candidate import path and committed the current project-bound evidence:

```text
docs/video/evidence/m10-explainer-v2-render-completed-import-ledger.json
docs/video/evidence/m10-explainer-v2-quality-review-pack.json
```

The lifecycle preserves the truth boundary for imported execution evidence:

```text
originalRenderGateProven=false
historicalStagesProven=false
publicationAllowed=false
```

## Human gate truth

Keep all of the following false until explicitly proven by a real human review and later consequential actions:

```text
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

## Next highest-value action

The earliest unresolved business gate remains a full human playback of the exact MP4 above with an explicit `ACCEPT` or `REJECT` against the committed 10-item M10 quality review pack.

If accepted, M11 publication preparation may begin, while login/upload/publish remains a separate consequential action. If rejected, the Creative Director skill should diagnose the single primary defect layer and use the cheapest controlled validation stage before another full render.
