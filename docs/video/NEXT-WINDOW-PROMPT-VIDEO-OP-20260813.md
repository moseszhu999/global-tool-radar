# Next Window Prompt — Video Operation Cold Brew SourceReset Continuation

Use this as the continuation truth for `moseszhu999/global-tool-radar`.

## Mandatory startup

Before changing anything:

1. Read `docs/video/coldbrew-premium-v44-handoff-20260813.md` on branch `agent/video-operation-v44-handoff-20260813`.
2. Read `docs/video/coldbrew-v44-artifact-manifest.json` on the same branch; its SHA-256 and durable file IDs are artifact identity truth.
3. Read `skills/video-operation-premium-cinematic/SKILL.md` on the same branch.
4. Refresh current `main`, Draft PR #127 exact head, changed paths, CI and current media evidence. Do not reuse an older receipt as truth.
5. Preserve Gold/Premium contract behavior from PRs #125/#126. Merge=NO. Deploy=NO. Publication=NO.

## Current human-review truth

The user is reviewing a ~32s vertical 9:16 Chinese cold-brew café video (`北纬39° Coffee`).

### Clean baseline

`SourceReset0.mp4` is the human-confirmed seam-free reset baseline. The user said:

> 至少那些讨厌的黑缝没了

This approval is narrow but authoritative: the wide black wedge / black-hole defect family is gone in SourceReset0. Do not reintroduce the mechanisms that caused it.

Permanent scene-boundary bans:

- cross-shot composite;
- crossfade blend layers;
- alpha/matte transitions;
- diagonal-mask reveals;
- rotated/skewed coverage tricks;
- moving source-video footage at shot boundaries;
- any transition geometry capable of exposing empty/black regions.

Scene changes remain hard cuts unless a future transition family is separately proven safe.

### Current review candidate

The current candidate is **`SourceReset1_Scene1Motion.mp4`**.

Exact identity:

- SHA-256: `6dcedbe09a7859088c4c86a1e65a696c172cde32bf82629802ef2b3f8b6f3759`
- bytes: `3,455,476`
- duration: `32.000s`
- video: H.264, `1080×1920`, `30fps`, exactly `960` frames
- audio: AAC, `48kHz`, stereo, `32.000s`
- durable Drive file ID: `1yDzWrtJxpkkme1tFwI9D1cYHsW9KAs_X`
- durable filename: `VideoOperation-ColdBrew-SourceReset1-Scene1Motion-20260813.mp4`

Only Scene 1 (`0–5.333s`) differs from SourceReset0. Scenes 2–6 remain the clean static reset baseline.

Scene 1 has **no whole-frame camera transform**. Motion is confined to local material behavior:

- coffee-stream specular travel;
- asymmetric ice caustic flickers;
- tiny condensation droplet slide;
- soft amber liquid-body caustic travel.

Scene 1 → Scene 2 is a direct hard cut.

### Current technical evidence

The current SourceReset1 binary has already passed bounded technical checks including:

- exact SHA-256 identity against the durable Drive binary;
- H.264 1080×1920 / 30fps / 960-frame / 32s container verification;
- AAC 48kHz stereo / 32s duration alignment;
- full decode without decoder errors;
- monotonic video/audio PTS;
- stable 30fps cadence;
- no detected black-frame interval under the recorded blackdetect gate;
- bounded audio continuity / loudness / clipping / DC checks;
- full-960-frame structural scan without a recurrence of the prior wide black wedge;
- sampled Scene 1 and Scene 1→2 boundary visual checks.

These are technical and sampled-review facts. They do **not** replace human creative review.

### Current Scene-1 temporal-motion truth

The latest machine-readable `qa.temporalMotionEvidence` sharpens the earlier generic “low-salience” description. Fresh Farneback optical-flow analysis compared frame-to-frame motion in durable SourceReset1 against durable SourceReset0 on a `270×480` analysis surface.

```text
SCENE1_TEMPORAL_MOTION_EXISTS=PROVED_BOUNDED
SOURCE_RESET0_AVG_FLOW=0.000638_PX_PER_FRAME
SOURCE_RESET1_AVG_FLOW=0.001621_PX_PER_FRAME
SOURCE_RESET1_AVG_FLOW_RATIO=2.54X_BASELINE
SOURCE_RESET1_PEAK_FLOW=0.01494_PX_PER_FRAME_AT_0.87S
SOURCE_RESET1_0.5_TO_1.0S_FLOW_RATIO=12.8X_BASELINE
SOURCE_RESET1_1.0_TO_1.5S_FLOW_RATIO=5.17X_BASELINE
SOURCE_RESET1_AFTER_1.5S_FLOW_RATIO=1.08_TO_1.31X_BASELINE
```

Interpretation:

- real added temporal motion is concentrated mainly in approximately `0.5–1.5s`;
- after `1.5s`, the remaining Scene-1 motion stays close to the SourceReset0 temporal baseline;
- this explains why Scene 1 can still feel mostly static during the mid/late shot despite containing genuine local material animation.

This evidence does **not** approve the creative result. Human Scene-1 review remains mandatory.

### Current inherited footer / provenance truth

Do not attribute the bottom `北纬39° Coffee` footer clip to SourceReset1 motion. The same native Scene-1 edge scan found the footer touching the final canvas row in **160/160 frames in SourceReset0** and **160/160 frames in SourceReset1**.

```text
SCENE1_FOOTER_ORIGIN=INHERITED_FROM_SOURCERESET0_BASELINE
SCENE1_FOOTER_REGRESSION=NOT_INTRODUCED_BY_SOURCERESET1_MOTION
```

The footer still blocks any Final claim, but the current evidence does not identify the exact editable source/render owner that produced it. The artifact manifest intentionally fails closed:

```text
SOURCE_RESET1_BINARY_PROVENANCE=PROVED
SOURCE_RESET1_EDITABLE_SOURCE_PROVENANCE=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_RENDER_OWNER_PROVENANCE=MISSING_FROM_CURRENT_EVIDENCE
EXACT_EDITABLE_FOOTER_SOURCE_OWNER=NOT_PROVED
FOOTER_CORRECTION=BLOCKED_CHAT_ONLY_EXACT_SOURCE_NOT_LOCATED
```

Do not patch final MP4 pixels, add a parallel overlay renderer, or create another Shared Media/Remotion implementation. Any footer correction must happen only after the existing editable source/render owner is recovered from real durable evidence.

### Current canonical render-evidence truth

The durable SourceReset1 MP4 is a valid review binary, but it is **not yet proved** as canonical `media.render.v1` terminal evidence.

The artifact manifest fails closed on this separate evidence gap:

```text
SOURCE_RESET1_REVIEW_BINARY_IDENTITY=PROVED
SOURCE_RESET1_CANONICAL_MEDIA_RENDER_V1_TERMINAL_EVIDENCE=NOT_PROVED
SOURCE_RESET1_REQUEST_JOB_IDENTITY_BINDING=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_INPUT_MANIFEST_DIGEST_BINDING=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_RENDER_LOG_DIGEST=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_TERMINAL_RECEIPT_BINDING=MISSING_FROM_CURRENT_EVIDENCE
```

Do not equate review-binary SHA-256, ffprobe/container checks, or a handoff document with canonical terminal render evidence. Before any Final claim, the **existing Shared Media render owner** must provide the exact request/job/evidence identities, exact `inputManifestDigest`, render-log SHA-256, and canonical terminal receipt/result refs. Never infer/fabricate these fields, and do not create a second render engine, receipt store, or job registry to manufacture them.

### Current formal-review routing truth

The existing repository already owns the formal review/evidence path. Do **not** create another human-review or render-evidence implementation for SourceReset1.

Machine-readable routing truth from `formalReviewRouting`:

```text
SOURCE_RESET1_FORMAL_REVIEW_ROUTING=IDENTIFIED_NOT_READY
QUALITY_REPORT_CONTRACT=toolradar.video-quality-report.v1
FINAL_RENDER_EVIDENCE_INTAKE=packages/final-render-evidence-intake
FINAL_HUMAN_REVIEW=packages/final-human-review
SOURCE_RESET1_RENDER_COMMAND_MANIFEST_ID=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_QUALITY_REPORT_REF=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_QUALITY_REPORT_MEDIA_SHA256_BINDING=MISSING_FROM_CURRENT_EVIDENCE
SOURCE_RESET1_AUTOMATED_GATE=NOT_PROVED_FOR_SOURCE_RESET1
SOURCE_RESET1_FINAL_RENDER_EVIDENCE_INTAKE=NOT_READY
SOURCE_RESET1_FINAL_HUMAN_REVIEW_INPUT=NOT_READY
SOURCE_RESET1_RELEASE_HANDOFF=BLOCKED
```

Before formal Final human review, reuse the **existing** source/render/evidence/review owners and require:

1. real render execution bound to a non-empty `renderCommandManifestId`;
2. exact rendered output SHA matching the reviewed media;
3. valid technical media metadata;
4. a `toolradar.video-quality-report.v1` bound to the same media SHA with `automatedGate=PASS`;
5. existing `final-render-evidence-intake` readiness;
6. existing `final-human-review` input readiness.

A human statement that Scene 1 motion looks acceptable does not by itself satisfy formal Final review input readiness or release-handoff readiness. Never fabricate the missing bindings and never create a second render/review engine to manufacture them.

## Current gate

`HUMAN_SCENE1_MOTION_REVIEW_REQUIRED`

Do **not** animate Scene 2 yet.

One-scene-at-a-time production rule:

1. human reviews SourceReset1 Scene 1 motion;
2. if approved, freeze Scene 1 as non-regression truth;
3. animate Scene 2 only;
4. review again;
5. continue scene by scene through Scene 6;
6. any regression returns to the latest human-approved SourceReset baseline.

The current Scene 1 motion is deliberately subtle and temporally front-loaded. Automated evidence proves real added motion, but it is concentrated mainly in `0.5–1.5s`; after `1.5s`, frame-to-frame motion stays near the SourceReset0 baseline. Do not self-label the creative motion as passed. Human review remains authoritative.

## Motion grammar

Preserve camera/product stability. Put motion into matter and light:

Preferred:

- liquid specular travel;
- believable droplets/condensation;
- ice highlights/refraction;
- steam/aroma only where physically meaningful;
- sparse particles tied to material motion;
- restrained object-level motion with a clear start and settle.

Reject:

- camera micro-jitter or random drift;
- whole-frame scale/rotate/warp used as visual life support;
- continuous oscillation;
- perfect circular ripple rings;
- symmetric geometric waves;
- neon portal paths;
- transition gimmicks crossing shot boundaries;
- effect layers more visible than the coffee itself.

## Visual / text / audio non-regression

- Prefer cinematic imagery and world-space/object-attached explanation, not PPT/card/UI grammar.
- Subtitle target >= 52px at 1080×1920 equivalent.
- World-space explanatory label target >= 48px.
- Preserve platform safe zones.
- Current Chinese voice baseline remains `edge-tts` / `zh-CN-XiaoxiaoNeural` / about `+10%` / segmented synthesis / no time-stretch until a better human-approved voice exists.
- Sound stays restrained, causal and frame-synchronous.

## Review delivery

Primary video review should be a direct MP4. An HTML evidence page may accompany the run when useful, but it does not replace the direct video artifact.

## What to do next

Do not restart from V4.4, V4.5 or V4.6. Those are historical/rejected patch-chain artifacts, not continuation baselines.

For each new run:

1. refresh exact current PR #127 head and CI;
2. recover SourceReset1 by durable Drive ID and verify SHA-256 before using it;
3. keep Scene 2 motion HOLD until there is explicit human approval of Scene 1;
4. while blocked on human review, only perform useful evidence/technical-QC work that does not fabricate approval or generate an unauthorized next scene;
5. preserve the current temporal-motion truth: real added motion is concentrated mainly in `0.5–1.5s`; after `1.5s` motion remains near SourceReset0 baseline unless a later authorized Scene-1 revision changes that evidence;
6. treat the footer clip as an inherited SourceReset0 baseline defect, not a SourceReset1 motion regression;
7. do not attempt footer correction until an existing editable source/render owner is proved by durable source or render evidence;
8. do not claim Final until canonical `media.render.v1` terminal evidence from the existing Shared Media owner binds request/job/evidence identity, exact `inputManifestDigest`, render-log SHA-256 and terminal receipt/result refs;
9. before any formal Final human-review or release-handoff claim, require existing `final-render-evidence-intake` readiness plus a media-SHA-bound `toolradar.video-quality-report.v1` with `automatedGate=PASS`, then feed that into the existing `final-human-review` path;
10. once Scene 1 is explicitly approved, change only Scene 2 and keep all shot boundaries as hard cuts;
11. run black-wedge, camera-stability, alpha/matte, safe-zone, material-continuity, audio-continuity and technical artifact checks before presenting a new candidate;
12. update handoff + manifest whenever a new candidate becomes the best-known human-approved or active review version;
13. never self-label Final / 100 / 105 without human review and canonical render evidence.

## Repository boundaries

- Repo: `moseszhu999/global-tool-radar`
- Gold PR #125 remains dependency context.
- Premium PR #126 remains Draft/open dependency context.
- Current handoff/recovery owner: Draft PR #127, branch `agent/video-operation-v44-handoff-20260813`.
- Do not create a second owner for the same continuation scope.
- Do not duplicate Shared Media / `media.render.v1` engine, receipt store or job registry.
- Merge=NO.
- Deploy=NO.
- Publication=NO.
