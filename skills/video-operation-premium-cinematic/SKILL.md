# Skill: Video Operation Premium Cinematic Iteration

Version: `v1.1`  
Scope: Video Operation / short-form vertical cinematic product-explainer production  
Primary quality target: Gold non-regression + selected Premium escalation  
Human review remains authoritative.

## Trigger

Use this skill when iterating a technically renderable Video Operation short to improve human-perceived quality through local motion, material realism, sound, typography and review discipline.

## Core doctrine

### 1. Camera lock before spectacle

A visually energetic video with micro-jitter is a regression.

Hard defaults:

- camera shake = 0;
- no generic whole-frame oscillation;
- no random camera drift;
- no `sin/cos` micro-wobble;
- no whole-frame scale/rotate/warp merely to avoid stillness.

Prefer a locked camera plus moving materials/objects.

### 2. Motion belongs to matter

Premium motion should be physically motivated:

- droplet falls because of gravity;
- liquid reacts because of impact;
- steam rises from heat;
- condensation forms/slides locally;
- highlights travel because glass/liquid/ice response changes;
- sparse particles follow a material event.

Do not add motion merely because a frame feels static.

### 3. Natural local animation > obvious effect layer

Good:

- irregular liquid brightness/refraction response;
- short caustic change;
- believable droplet trajectory;
- restrained steam/haze;
- specular travel on glass/ice;
- sparse physically tied particles.

Reject:

- perfect circular ripple rings;
- symmetric geometric waves;
- repeated transition gadgets;
- neon portals/paths;
- visual effects more noticeable than the coffee/product.

### 4. Hard cuts are the safe scene-boundary grammar

The prior failure family was a wide black wedge / black void caused by unsafe cross-shot compositing/transition geometry.

Permanent bans at scene boundaries:

- cross-shot composite;
- crossfade blend layers;
- alpha/matte transitions;
- diagonal-mask reveals;
- rotated/skewed coverage tricks;
- moving source-video footage at the boundary;
- any transition capable of exposing empty/black geometry.

A clean cut is preferable to a broken causal transition.

### 5. Distinguish defects correctly

Do not confuse:

- a thin intentional 39° brand arc;
- a one-pixel seam;
- a wide black wedge/void.

If a dark diagonal region is roughly 1/5–1/6 of frame width, investigate composite coverage first.

### 6. Infographic belongs in the world

Prefer world-space/object/path-attached explanation. Avoid PPT/card-first design, generic UI panels, progress bars and screen-space explanatory furniture.

At 1080×1920 equivalent:

- subtitles target >= 52px;
- world-space explanatory labels target >= 48px;
- preserve mobile platform safe zones.

### 7. Voice and sound

Current preferred Chinese baseline until human-approved replacement:

- `edge-tts`;
- `zh-CN-XiaoxiaoNeural`;
- roughly `+10%` rate;
- segmented synthesis;
- no narration time-stretch.

Sound stays restrained, causal and frame-synchronous.

### 8. Review discipline

For each candidate:

1. identify exactly what was human-approved and rejected;
2. preserve approvals as non-regression constraints;
3. change the smallest surface needed;
4. produce a real reviewable MP4 when a new candidate is authorized;
5. run hard-defect and technical checks before claiming improvement;
6. never self-label Final / 100 / 105 without human review.

## Hard QA checklist

Before handing a new candidate to the user, verify:

- [ ] no camera micro-jitter or accidental whole-frame transform;
- [ ] no wide black wedge/void at scene boundaries;
- [ ] no visible alpha/matte edge;
- [ ] no regular geometric liquid effect unless physically justified;
- [ ] subtitles remain legible and inside safe zones;
- [ ] no animation fights narration;
- [ ] liquid/glass/ice material continuity remains plausible;
- [ ] transition sound is synchronized and restrained;
- [ ] video decodes cleanly with stable timestamps/cadence;
- [ ] A/V durations align;
- [ ] no black tail or obvious audio drop/clipping;
- [ ] exact artifact SHA-256/identity is recorded;
- [ ] no merge/deploy/publication occurred without explicit permission.

## Current reference hierarchy — SourceReset truth

1. **Clean seam-free baseline:** `SourceReset0.mp4`. Human feedback: `至少那些讨厌的黑缝没了`. This is the authority for removing the prior wide-black-wedge defect family.
2. **Current review candidate:** `SourceReset1_Scene1Motion.mp4`.
   - SHA-256: `6dcedbe09a7859088c4c86a1e65a696c172cde32bf82629802ef2b3f8b6f3759`
   - durable Drive file ID: `1yDzWrtJxpkkme1tFwI9D1cYHsW9KAs_X`
   - only Scene 1 (`0–5.333s`) restores local material motion;
   - Scene 2–6 remain SourceReset0-clean/static;
   - Scene 1→2 remains a direct hard cut.
3. **Current gate:** `HUMAN_SCENE1_MOTION_REVIEW_REQUIRED`.
4. **Next-scene rule:** `SCENE2_MOTION=HOLD` until explicit human approval of Scene 1.
5. **Historical references only:** Premium Camera Lock V3, natural-drop experiments and V4.x patch candidates may retain useful learning, but they are not current continuation baselines and must not override SourceReset0/SourceReset1 truth.

Read `docs/video/coldbrew-premium-v44-handoff-20260813.md`, `docs/video/coldbrew-v44-artifact-manifest.json` and `docs/video/NEXT-WINDOW-PROMPT-VIDEO-OP-20260813.md` for exact continuation state.

## One-scene-at-a-time protocol

1. Human reviews SourceReset1 Scene 1 motion.
2. If approved, freeze Scene 1 as non-regression truth.
3. Animate Scene 2 only, using local material/object/light motion and preserving hard cuts.
4. Re-run technical and visual hard-defect checks.
5. Human reviews again.
6. Continue through Scene 6 one scene at a time.
7. Any regression returns to the latest human-approved SourceReset baseline.

While a scene is awaiting human review, do not fabricate approval or produce the next scene merely to keep activity going. Useful evidence/QC work is allowed if it does not alter the candidate or cross the gate.

## Repository/product boundaries

- Gold remains the default quality floor.
- Premium is explicit escalation and does not authorize publication.
- Human creative review is not replaceable by automated evidence.
- Current handoff/recovery owner is Draft PR #127; do not create a duplicate owner for the same continuation scope.
- Reuse Shared Media / `media.render.v1`; do not create a second render engine, receipt store or job registry.
- Merge=NO unless explicitly approved.
- Deploy=NO unless explicitly approved.
- Publication=NO unless explicitly approved.
