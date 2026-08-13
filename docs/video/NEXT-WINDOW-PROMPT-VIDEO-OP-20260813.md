# Next Window Prompt — Video Operation Cold Brew Premium Continuation

Copy/paste the block below into the next ChatGPT/Codex window. Do not shorten it before the next window has read the referenced repository files.

---

You are continuing the `Video Operation` project in repository `moseszhu999/global-tool-radar`.

## Mandatory startup sequence

Before changing anything:

1. Read `docs/video/coldbrew-premium-v44-handoff-20260813.md` on branch `agent/video-operation-v44-handoff-20260813`.
2. Read `skills/video-operation-premium-cinematic/SKILL.md` on the same branch.
3. Read `docs/video/video-operation-premium-v1.md` from the Premium branch.
4. Inspect current Draft PR #126 (`Add Video Operation Premium 95-105 escalation`) and its exact current head before making repo changes. Do not assume the old SHA is still current.
5. Preserve existing Gold/Premium contract behavior. Do not merge/deploy/publish.

## Human-review truth you must preserve

The user is reviewing a ~32s vertical 9:16 Chinese cold-brew café video (`北纬39° Coffee`) explaining why cold brew tastes smoother than iced Americano.

The user prefers action over planning. If they say `继续`, execute the next smallest useful production step and return a real reviewable artifact. Do not repeatedly ask for confirmation when the next step is clear.

### Camera

The user explicitly said of `Premium Camera Lock V3`: **“v3不抖了”**.

Therefore camera stability is a hard non-regression requirement:

- camera shake = 0;
- no generic whole-frame micro-translate;
- no oscillating whole-frame scale;
- no ambient rotate/warp;
- no `sin/cos` camera wobble;
- no random drift;
- no fake handheld micro-jitter.

If animation is needed, animate the **material/object**, not the camera.

### Local animation

The user then asked to expand V3 animation, especially water-drop-like motion.

A stronger drop test with obvious regular impact-wave/ripple graphics was rejected as unnatural. A revised `natural drop` version using local liquid brightness/refraction/caustic response and sparse particles was judged **better**.

Therefore:

- amplify natural physical response;
- avoid perfect rings and symmetric geometric wavefronts;
- avoid neon paths/portals;
- avoid repeated transition gimmicks;
- the viewer should notice the event, not notice “an effect layer”.

### Current major defect under repair

The user identified a visual hard defect near roughly **5s** and another near roughly **22s**.

The user clarified several times that the problem is **NOT the thin 39° arc line**.

The defect is:

- black/dark;
- diagonal;
- very wide;
- approximately **1/5 to 1/6 of frame width**;
- looks like a black hole / black wedge / missing composite region.

Do not misdiagnose it as a thin seam or brand arc.

Likely technical families:

- alpha/matte coverage hole;
- transparent region composited as black;
- transformed/cropped overlay leaving an uncovered wedge;
- premultiplied-alpha mismatch;
- diagonal mask or flow layer with empty region.

Do not hide it with blur/darkening. Remove invalid composite geometry or fall back to a known-good source window.

### Current latest conservative candidate

Latest working candidate produced in the previous window is called **V4.4 wedge fix**.

It keeps the broader V4.2 natural-motion improvements but replaces two suspect windows with stable V3 camera-lock source:

- about `4.35s–5.65s`
- about `21.35s–22.65s`

Previous-window filenames were:

- full: `V44_fix.mp4`
- short problem A/B: `V44_fix_AB.mp4`

The previous-window internal source names were:

- `/mnt/data/coldbrew-v44-wedge-fix/coldbrew-v44-wedge-fix-full.mp4`
- `/mnt/data/coldbrew-v44-wedge-fix/v44-problem-areas-reel.mp4`

Treat these paths as historical references only; a new runtime may not contain them. Do not claim they exist until verified.

V4.4 is **not final and not yet user-approved as perfect**.

### Five continuity intentions

Keep the creative direction but do not force it:

1. Pour → aroma: warm highlight/steam should emerge from the liquid, not open a glowing portal.
2. Aroma → cold drip: condensation may converge toward the drip axis.
3. Cold drip → flavor field: droplet impact may create short irregular local optical/liquid response; no perfect rings.
4. Flavor current → iced liquid: amber flow should become actual liquid contour/motion, not a pasted ribbon.
5. Iced liquid → hero glass: motion should settle into product highlight/ice/glass, not finish with another flashy wipe.

Guideline: `Shot N should create shot N+1` through energy/material/direction/sound/meaning, but a clean cut is better than a broken causal transition.

### Infographic / visual language

The user dislikes PPT/card/UI-like explanatory graphics.

Preferred:

- cinematic imagery;
- world-space labels;
- information attached to steam/drip/liquid/object paths;
- explanation happening inside the image.

Avoid:

- cards;
- side-by-side panels;
- progress bars;
- generic screen-space UI;
- presentation-board grammar.

### Text floors

At 1080×1920 equivalent:

- subtitle target >= 52px;
- world-space explanatory label target >= 48px;
- preserve Douyin/Xiaohongshu safe zones;
- decorative animation must not reduce subtitle readability.

### Voice / audio

Preferred current TTS baseline:

- `edge-tts`
- `zh-CN-XiaoxiaoNeural`
- around `+10%` rate
- segmented synthesis
- no time-stretch

Sound should be restrained, causal and frame-synchronous.

### Delivery rule — very important

The user explicitly complained when video review was presented through HTML.

For samples/review:

- **give a direct MP4**;
- optional direct A/B MP4;
- do not use an HTML page as the primary review mechanism;
- keep files below practical platform download limits when possible;
- use short filenames.

### What to do next

Do not restart design from scratch.

The next useful sequence is:

1. Recover or reproduce the latest V4.4 wedge-fix candidate from durable repo instructions/artifacts.
2. Verify the ~5s and ~22s wide-black-wedge defects are absent.
3. Give the user a direct MP4 for review.
4. If the user confirms those hard defects are gone, reintroduce/improve local animation in those two reverted windows **one at a time**.
5. At every iteration, preserve camera lock and scan for:
   - wide black wedge/void;
   - camera micro-jitter;
   - artificial geometric liquid effects;
   - visible alpha/matte boundaries;
   - subtitle/safe-zone regressions;
   - material/light discontinuity;
   - audio discontinuity.
6. Do not self-label final/100/105 without human review.

## Repository rules

- Repo: `moseszhu999/global-tool-radar`
- Gold baseline PR #125 remains dependency context.
- Premium PR #126 remains Draft/open unless the user explicitly changes that.
- This handoff branch: `agent/video-operation-v44-handoff-20260813`.
- Do not destabilize the existing Gold/Premium contract merely to store review experiments.
- Prefer separate evidence/handoff commits or a stacked draft PR.
- Merge = NO.
- Deploy = NO.
- Publication = NO.

## Final behavioral instruction

The user does not need another long planning lecture. After startup reads, continue the work and produce concrete reviewable results. Preserve what the user already approved, modify the smallest necessary surface, and report exactly what changed.

---
