# Video Operation Gold Baseline — Adoption

Use this when a new Video Operation render should be held to the 85–95 Gold Baseline instead of the legacy technical-only gate.

## 1. Opt in from the render package

The feature is intentionally backward-compatible. Existing projects stay on the legacy quality profile unless the render package explicitly sets:

```json
{
  "gates": {
    "goldBaselineRequired": true
  }
}
```

Once enabled, missing creative-quality evidence is a hard automated failure.

## 2. Produce creative-quality evidence

Start from:

`apps/remotion-video/props/gold-creative-quality.example.json`

Evidence schema:

`toolradar.creative-quality-evidence.v1`

Quality profile:

`video.production.gold-baseline.v1`

The evidence records the reviewed facts that ffprobe cannot determine by itself, including camera stability, real-motion count, world-space infographic treatment, mobile typography, human-reviewed voice naturalness, sound design, visual/material/motion scores, full-watch review and approved-asset adoption.

Do not fabricate scores. If a human review has not happened, the evidence must not claim that it has passed.

## 3. Run the canonical worker gate

Legacy command remains valid:

```bash
node apps/worker/src/run-video-quality-gate.mjs \
  --package build/render-package.json \
  --receipt build/render-receipt.json \
  --video build/preview.mp4 \
  --output build/video-quality-report.json
```

Gold command adds exactly one optional argument:

```bash
node apps/worker/src/run-video-quality-gate.mjs \
  --package build/render-package.json \
  --receipt build/render-receipt.json \
  --video build/preview.mp4 \
  --creative-quality build/creative-quality-evidence.json \
  --output build/video-quality-report.json
```

## 4. Expected outcomes

When `goldBaselineRequired=true`:

- missing creative evidence → `creative.gold_evidence_required` + `GOLD_BASELINE_QA_FAILED`;
- camera shake/micro-wobble → automated FAIL;
- camera-only motion or too few physical motion events → automated FAIL;
- screen-space/PPT infographic treatment → automated FAIL;
- subtitle/world-label text below the mobile floor → automated FAIL;
- voice, sound, visual, material, motion, camera-stability or caption-readability scores below the Gold floor → automated FAIL;
- missing full-watch, technical QC or approved-asset adoption → automated FAIL.

A passing automated Gold gate still does **not** authorize publication. The quality report keeps `publicationAllowed=false` and remains bounded by human release approval.

## 5. Non-regression checks

Run:

```bash
npm --prefix apps/remotion-video run check
```

This executes the existing Remotion contract tests plus the Gold Baseline contract and worker-wiring tests.

For the Gold contract alone:

```bash
npm --prefix apps/remotion-video run check:gold
```

The runtime quality-gate tests live under:

`packages/video-quality-gate/test/video-quality-gate.test.mjs`

## 6. Ownership boundary

Gold Baseline governs production quality. It does not own social publication, account credentials, platform posting or analytics actions. Those remain outside Shared Media rendering and continue to require their existing human/publication controls.
