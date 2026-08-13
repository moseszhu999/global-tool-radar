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

The current Scene 1 motion is deliberately subtle. Automated freeze/salience diagnostics indicate low whole-frame motion salience, so do not self-label the creative motion as passed. Human review remains authoritative.

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
5. once Scene 1 is explicitly approved, change only Scene 2 and keep all shot boundaries as hard cuts;
6. run black-wedge, camera-stability, alpha/matte, safe-zone, material-continuity, audio-continuity and technical artifact checks before presenting a new candidate;
7. update handoff + manifest whenever a new candidate becomes the best-known human-approved or active review version;
8. never self-label Final / 100 / 105 without human review.

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
