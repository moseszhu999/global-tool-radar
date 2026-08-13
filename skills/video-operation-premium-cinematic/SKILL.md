# Skill: Video Operation Premium Cinematic Iteration

Version: `v1.0`  
Scope: Video Operation / short-form vertical cinematic product-explainer production  
Primary quality target: Gold non-regression + selected Premium escalation  
Human review remains authoritative.

## Trigger

Use this skill when iterating a Video Operation short that is already technically renderable and the task is to raise human-perceived quality through cinematic continuity, local motion, material realism, sound, typography, and review discipline.

Especially use it when the user says things like:

- “继续” after reviewing a video;
- “不抖了，但是动画可以更强”;
- “这个动画不自然”;
- “这里有缝/黑洞/黑块”;
- “别用页面，直接给视频”;
- “做到更成熟/更高级”。

## Core doctrine

### 1. Camera lock before spectacle

A visually energetic video with micro-jitter is a regression.

Hard defaults:

- camera shake = 0;
- ban generic whole-frame oscillation;
- ban random camera drift;
- ban `sin/cos` micro-wobble used as visual life support;
- do not animate whole-frame scale/rotate/warp merely to avoid stillness.

If camera motion is needed, it must be deliberate, monotonic, eased, and shot-motivated. Prefer locked camera plus moving materials/objects.

### 2. Motion belongs to matter

Premium motion should be caused by something:

- droplet falls because of gravity;
- liquid reacts because of impact;
- steam rises from heat;
- condensation converges into a drop;
- highlight travels because glass/liquid geometry changes;
- particles are carried by a flow;
- text inherits a real object/path motion.

Do not add motion merely because the frame feels static.

### 3. Natural local animation > obvious post effect

Good local amplification:

- irregular liquid brightness response;
- short caustic/refraction change;
- sparse carried particles;
- subtle steam/haze;
- believable droplet trajectory;
- specular travel on glass/ice;
- liquid contour continuation.

Bad amplification:

- perfect circular ripple rings;
- symmetric geometric wavefronts;
- repeated identical transition gadgets;
- neon paths that look pasted on;
- generic glow portals;
- transitions whose geometry is more noticeable than the physical event.

Human heuristic:

> The viewer should notice the event, not the effect layer.

### 4. Shot N should create shot N+1

Use causal continuity where it survives cleanly:

- energy carry;
- direction carry;
- material carry;
- optical carry;
- sound carry;
- semantic carry.

Examples:

- pour highlight becomes steam;
- steam condenses toward a drip;
- drip impact becomes local liquid response;
- amber current becomes iced-liquid contour;
- liquid/specular energy settles into hero-glass highlight.

Do not force continuity if the composite becomes dirty. A clean cut is better than a broken causal transition.

### 5. Never create visible composite holes

Named hard defect: **wide black wedge / black void**.

Reject any transition frame containing a dark diagonal/polygonal region that is not scene-authentic, especially when it is roughly 1/5–1/6 of frame width.

Possible causes:

- incomplete matte coverage;
- transparent overlay interpreted as black;
- crop/transform mismatch;
- rotated/skewed layer exposing background;
- premultiplied-alpha mismatch;
- diagonal wipe/flow mask with empty area.

Fix by repairing/removing invalid composite geometry or reverting to a known-good source window. Do **not** blur/darken it to hide it.

### 6. Distinguish defects correctly

Do not confuse:

- a thin intentional 39° brand arc;
- a one-pixel seam;
- a wide black wedge/void.

Human feedback is literal. If the user says “黑的东西，很宽，斜着，大概五分之一画面”, investigate the large dark region first.

### 7. Infographic belongs in the world

Preferred:

- world-space labels;
- object/path-attached information;
- number/keyword emerging from measured object;
- explanation expressed through material change.

Avoid:

- PPT/card-first design;
- side-by-side UI panels;
- generic progress bars;
- screen-space explanatory furniture.

Principle:

> Do not explain the image on top of the image; make the explanation happen inside the image.

### 8. Mobile readability floors remain mandatory

At 1080×1920 equivalent:

- subtitles target >= 52 px;
- world-space labels target >= 48 px;
- preserve platform safe zones;
- do not let particles/highlights collide with subtitles;
- semantic labels must match narration.

### 9. Voice and sound

Current preferred Chinese production baseline:

- `edge-tts`;
- `zh-CN-XiaoxiaoNeural`;
- roughly `+10%` rate;
- segmented synthesis;
- no narration time-stretch.

Sound design:

- restrained;
- event-synchronous;
- causal;
- recurring motif is allowed;
- no impact spam;
- no sound used to disguise visual defects.

### 10. Review delivery is part of quality

For this user/workflow:

- primary deliverable = direct MP4;
- optional secondary = direct A/B MP4;
- keep downloadable files small enough for the client/platform;
- short filenames are preferred;
- **do not use an HTML page as the primary video review path**.

HTML may be generated for evidence/metadata only when useful, but it must not be the thing the user is told to open to watch the sample.

## Iteration protocol

When the user says “继续” after review:

1. Identify exactly what was approved and what was rejected.
2. Preserve approved aspects as non-regression constraints.
3. Change only the smallest surface needed for the next hypothesis when possible.
4. Produce an actual reviewable MP4, not only a plan.
5. Compare against the latest human-approved baseline.
6. Run hard-defect checks before claiming improvement.
7. Deliver direct MP4 and concise notes.
8. Wait for human review before labeling final/100/105.

## Hard QA checklist

Before handing a new candidate to the user, inspect:

- [ ] camera does not micro-jitter;
- [ ] no whole-frame accidental translate/scale/rotate/warp;
- [ ] no wide black wedge/void at transitions;
- [ ] no obvious alpha/matte edge;
- [ ] no regular geometric liquid effect unless physically justified;
- [ ] subtitles remain legible and safe;
- [ ] no animation fights narration;
- [ ] liquid/glass/ice material continuity is plausible;
- [ ] transition sound is synchronized and restrained;
- [ ] direct MP4 is downloadable;
- [ ] file size is practical;
- [ ] no merge/deploy/publication occurred without explicit permission.

## Current reference hierarchy (2026-08-13)

1. **Stability truth:** Premium Camera Lock V3 — user explicitly said it no longer shakes.
2. **Natural animation direction:** revised natural-drop approach — user said it was better than the geometric-wave version.
3. **Latest conservative full-film candidate:** V4.4 — V4.2 improvements retained except suspect ~5s and ~22s windows reverted to stable V3 source to remove wide-black-wedge hard defects.

Read `docs/video/coldbrew-premium-v44-handoff-20260813.md` for exact continuation state.

## Repository/product boundaries

- Gold remains the default quality floor.
- Premium is explicit escalation.
- Premium does not authorize publication.
- Human creative review is not replaceable by automated evidence.
- Merge = NO unless explicitly approved.
- Deploy = NO unless explicitly approved.
- Publication = NO unless explicitly approved.
