# Video Operation Gold Baseline — Adoption

Gold Baseline is the default quality target for **new Video Operation worker-generated projects**. Legacy checked-in artifacts and direct package API callers remain backward-compatible.

## 1. Default path for new projects

The worker chain now applies Gold automatically:

`build-video-production-case → build-storyboard-manifest → build-render-preview-package → render → video-quality-gate`

New worker-generated artifacts receive:

- `qualityProfile: "video.production.gold-baseline.v1"`;
- `gates.goldBaselineTarget: true`;
- the 85–95 Gold quality target;
- stable-camera and mobile-typography constraints;
- cinematic/world-space or product-UI-native infographic direction;
- a prohibition on camera-only motion as the finished motion language.

The adapter lives at:

`packages/video-gold-profile/src/index.mjs`

It is deliberately separate from the older canonical builders so that historical fixtures and older consumers are not silently rewritten.

## 2. Storyboard behavior

For new worker-generated storyboards, card-first visual grammar is upgraded before the storyboard is written:

- `generated_title_card` → `cinematic_infographic`;
- `generated_evidence_card` → `cinematic_infographic`;
- `generated_comparison_card` → `spatial_comparison`;
- `generated_end_card` → `cinematic_end_frame`.

Each shot receives `creativeDirection` covering:

- stable monotonic or locked camera;
- no camera shake, random drift or sin/cos micro-wobble;
- no camera-only finished motion;
- world-space infographic treatment, or `product-ui-native` for genuine UI-product footage;
- object/path binding;
- subtitle minimum 52 px;
- world-space label minimum 48 px equivalent.

This prevents the system from generating PPT-like storyboard grammar and only discovering the problem during final QC.

## 3. Preview is Gold-targeted, not prematurely Gold-enforced

A new render preview package receives:

```json
{
  "qualityProfile": "video.production.gold-baseline.v1",
  "qualityStage": "PREVIEW_TARGET",
  "gates": {
    "goldBaselineTarget": true,
    "goldBaselineRequired": false,
    "creativeQualityEvidenceRequiredForFinal": true
  }
}
```

This distinction is intentional.

The preview must remain renderable before human creative review exists. Therefore a Gold-target preview can pass technical QA while remaining blocked by:

`GOLD_CREATIVE_REVIEW_REQUIRED`

The quality report records:

`qualityStage: "TARGET_PENDING"`

This is not FINAL and does not authorize publication.

## 4. Pending creative evidence is generated automatically

`build-render-preview-package.mjs` now writes a pending evidence skeleton by default:

`build/gold-creative-quality-pending.json`

You may override its location with:

```text
--creative-quality-template <path>
```

The pending template uses:

- schema: `toolradar.creative-quality-evidence.v1`;
- profile: `video.production.gold-baseline.v1`;
- `status: PENDING_HUMAN_REVIEW`;
- null scores and `PENDING` review fields rather than fabricated passes.

A second, fully populated reference shape remains available at:

`apps/remotion-video/props/gold-creative-quality.example.json`

Do not fabricate scores. If a human review has not happened, the evidence must remain pending.

## 5. Evaluate the Gold review

The quality worker accepts:

```text
--creative-quality <creative-quality-evidence.json>
```

Example:

```bash
node apps/worker/src/run-video-quality-gate.mjs \
  --package build/render-package.json \
  --receipt build/render-receipt.json \
  --video build/preview.mp4 \
  --creative-quality build/creative-quality-evidence.json \
  --output build/video-quality-report.json
```

When a Gold-target render supplies creative evidence, the quality report changes to:

`qualityStage: "REVIEW_EVALUATED"`

and executes the Gold creative checks.

If the final candidate explicitly sets `goldBaselineRequired=true`, the stage becomes:

`qualityStage: "FINAL_ENFORCED"`

Missing evidence then fails closed.

## 6. Gold checks

Gold evaluation covers:

- camera shake = 0;
- no random drift / sin-cos micro-wobble / unintended simple-move reversals;
- real motion events and no camera-only finished motion;
- `world-space` infographic mode, with `product-ui-native` permitted for genuine UI-product shots;
- object/path binding and no forbidden PPT treatment;
- subtitle/world-label mobile readability floors;
- human-reviewed voice naturalness and no narration time-stretch;
- sound-design score, synchronous sound events and loudness evidence;
- visual quality, consistency, material realism, motion quality, camera stability and caption readability;
- full-watch review;
- technical QC;
- approved production asset adoption.

Any failed creative check produces `GOLD_BASELINE_QA_FAILED` and fails automated QA when Gold evaluation is being executed.

## 7. Legacy compatibility

Historical artifacts without `qualityProfile` or `goldBaselineTarget` continue through the legacy technical gate.

The default changed at the **Video Operation worker production path**, not by rewriting old stored artifacts.

This means:

- old checked-in fixtures remain reproducible;
- existing callers of canonical builder functions are not broken;
- newly generated Video Operation projects start with Gold automatically.

## 8. Non-regression checks

Run:

```bash
npm test
npm --prefix apps/remotion-video run check
```

The root suite includes `packages/video-gold-profile/test/*.test.mjs`.

The Remotion suite protects both the Gold contract and worker wiring.

For the focused Gold contract:

```bash
npm --prefix apps/remotion-video run check:gold
```

## 9. Ownership boundary

Gold Baseline governs production quality. It does not own social publication, account credentials, platform posting or analytics actions. Those remain outside Shared Media rendering and continue to require their existing human/publication controls.
