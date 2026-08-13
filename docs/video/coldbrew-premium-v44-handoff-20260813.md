# Cold Brew Premium V4.4 — Window Handoff (2026-08-13)

Status: **working best-known review candidate; not final**  
Publication: **NO**  
Merge: **NO**  
Deploy: **NO**

This document exists so a new ChatGPT/Codex/agent window can continue the current Video Operation work without losing the production lessons discovered through repeated human review.

## 1. User-reviewed direction

The current creative direction is correct: cinematic vertical food/product short, causal motion inside the shot, integrated explanatory graphics, stable camera, restrained premium sound, and natural local animation.

The most important human feedback accumulated in this iteration is:

- V3 camera-lock version: **user explicitly confirmed it no longer shakes**.
- Local animation can be expanded, especially liquid/drop behavior, **but only if it remains physically plausible**.
- A first amplified drop experiment was rejected because a second added animation looked unnatural; the culprit was regular/geometric-looking impact-wave behavior.
- The revised natural-drop approach was judged **better**.
- The following full-film pass improved most areas, but the user identified visual defects around roughly 5s and later around roughly 22s: a **wide, diagonal dark/black wedge or void**, about 1/5–1/6 of frame width. Do not misread this as the thin 39° brand arc. The user repeatedly clarified the defect is the **wide black thing**, not the arc line.
- Current V4.4 is a conservative remediation candidate that replaces the two suspect windows with stable V3 source material while preserving the rest of the improved pass. It is **not yet human-approved as perfect**.

## 2. Current local review candidate

Current review file produced in the 2026-08-13 window:

- `V44_fix.mp4`
- source local path in that window: `/mnt/data/V44_fix.mp4`
- full internal path before short-name copy: `/mnt/data/coldbrew-v44-wedge-fix/coldbrew-v44-wedge-fix-full.mp4`
- review A/B short file: `/mnt/data/V44_fix_AB.mp4`

The local binary is not represented by this Markdown file. Preserve/attach the MP4 as a durable artifact whenever a binary-upload-capable GitHub path is available. Do not claim the binary is in Git merely because this manifest exists.

### V4.4 construction

V4.4 uses the V4.2 natural-motion pass except for two defect windows reverted to the stable V3 camera-lock source:

- approximately `4.35s–5.65s`
- approximately `21.35s–22.65s`

The intent is not to improve creative animation in those windows yet; the intent is to remove the wide black wedge hard defect without regressing camera stability elsewhere.

## 3. Canonical stable baseline

Use this as the **camera stability baseline** unless a newer human-approved baseline is recorded:

- conceptual name: `Premium Camera Lock V3`
- prior local source: `/mnt/data/coldbrew-premium-camera-lock/coldbrew-premium-camera-lock-v3.mp4`
- user feedback: **“v3不抖了”**

Do not replace this baseline with an older RC/mature version just because it has stronger effects. Several older passes reintroduced global micro-jitter.

## 4. Hard camera rule — non-negotiable

Camera stability is a permanent non-regression constraint:

- camera shake = `0`
- whole-frame animated translate = forbidden unless an explicitly designed monotonic camera move is required by the shot
- whole-frame oscillating scale = forbidden
- whole-frame rotate/warp = forbidden as an ambient-life technique
- no generic `sin/cos` camera wobble
- no random drift
- no micro-handheld simulation

Allowed movement should preferentially come from **objects/materials inside a locked or deliberately smooth camera**:

- falling droplets
- steam
- liquid currents
- particles tied to physical events
- highlights/specular travel
- refraction/condensation
- object mechanics

A Premium effect is not allowed to purchase visual energy by reintroducing camera instability.

## 5. Natural local animation rule

The successful direction is: **amplify local physics, not graphic effects**.

Good:

- a droplet becomes more visible before impact;
- local liquid brightness changes on impact;
- short irregular refraction/caustic response;
- sparse particles carried by the liquid event;
- steam/haze that emerges from the actual hot object/stream;
- condensation that converges into a drop;
- amber flow that follows liquid/material trajectories;
- hero highlight that resolves onto the glass/product.

Bad:

- perfect circular ripple rings;
- symmetric geometric impact waves that look drawn in post;
- repeated identical transition gimmicks across shots;
- obvious screen-space wipes/cards/panels;
- animation that reads as an overlay instead of material behavior.

Human-review heuristic:

> The viewer may notice that something happened, but should not immediately notice “an effect was added here.”

## 6. The wide-black-wedge defect

This is a named hard defect for future QA.

Visual description from human review:

- diagonal orientation;
- dark/black void or wedge;
- **wide** — approximately 1/5 to 1/6 of frame width;
- observed around the first major cut near 5s and again later around 22s;
- much larger than a one-pixel seam;
- not the thin 39° arc/brand motif.

Likely source families to investigate:

- alpha/matte coverage hole;
- rotated/skewed overlay with uncovered background;
- blend/composite layer whose transparent area was treated as black;
- transition/source crop mismatch;
- diagonal wipe/flow layer with incomplete fill;
- premultiplied-alpha vs straight-alpha mismatch.

QA rule:

> At every transition window, inspect the entire frame for any large low-luminance polygon/wedge whose shape or movement does not belong to the scene. Do not limit seam QA to thin edges.

Do not “fix” this by blurring or darkening the area. Remove the invalid composite geometry or fall back to a known-good source window.

## 7. Five transition/event intents

The full-film continuity idea remains valuable, but each boundary must use native physics instead of a repeated template:

1. **Pour → aroma**: warm highlight/steam may rise from the liquid itself. Do not create an obvious glowing portal/path.
2. **Aroma → cold drip**: steam/condensation may converge toward the drip axis; keep it subtle and believable.
3. **Cold drip → flavor field**: droplet impact can create irregular local optical/liquid response. Avoid perfect rings.
4. **Flavor current → iced liquid**: amber streamline should become actual liquid motion/contour, not a luminous ribbon pasted over the frame.
5. **Iced liquid → hero glass**: energy should settle into product highlight/ice/glass, not end with another flashy wipe.

The transition grammar is:

> Shot N should create shot N+1 through energy, material, direction, sound, or meaning.

But **causal continuity does not justify visible compositing defects**. Clean continuity beats ambitious broken continuity.

## 8. Integrated infographic rules

The user strongly prefers cinematic/world-space information over PPT/UI graphics.

Use:

- information attached to physical paths;
- labels embedded in steam/drip/liquid/object space;
- object-native number/keyword reveals;
- explanatory change that happens inside the image.

Avoid:

- cards;
- side-by-side panels;
- progress bars;
- generic screen-space UI;
- presentation-board grammar.

Guiding line:

> Do not explain the image on top of the image; make the explanation happen inside the image.

## 9. Text/readability/safe-zone rules

Preserve Gold floors:

- mobile subtitle target >= 52 px at 1080×1920 equivalent;
- world-space explanatory label equivalent >= 48 px;
- respect Douyin/Xiaohongshu safe zones;
- do not let decorative motion reduce subtitle readability;
- semantic labels must match narration; do not add extra claims solely because they look good.

## 10. Voice and sound

Current preferred Chinese TTS direction from this production:

- `edge-tts`
- voice: `zh-CN-XiaoxiaoNeural`
- rate approximately `+10%`
- segmented synthesis
- **no narration time-stretch**

Sound should be restrained and causal:

- frame-synchronous droplet/ice/liquid events;
- no trailer-like impact spam;
- transition sound may carry continuity;
- do not use sound to disguise a visual composite defect.

## 11. Review delivery rule

The user explicitly corrected this multiple times:

> **For samples/review, give direct MP4 files. Do not use an HTML page as the primary review mechanism.**

Preferred delivery:

- direct full MP4;
- optional direct A/B MP4;
- keep each downloadable file below the platform limit when possible (historically 25 MB was a practical limit in this workflow);
- short simple filenames help (`V44_fix.mp4`, `V44_fix_AB.mp4`).

HTML may exist as secondary evidence, but do not tell the user to use it for primary video review.

## 12. Production sequence for next window

Next window should **not restart from concept design**. Continue from this state:

1. Read this handoff and `docs/video/video-operation-premium-v1.md`.
2. Treat V3 camera-lock as stability truth and V4.4 as the latest conservative full-film candidate.
3. Ask for no unnecessary confirmation; user prefers execution and reviewable outputs.
4. First verify whether the two wide black wedges are gone in V4.4 using direct MP4 review or extracted frames.
5. If user confirms the hard defect is gone, reintroduce local animation in the reverted 5s and 22s windows **one window at a time**, using physically plausible local motion only.
6. At each iteration, run a non-regression review for:
   - camera stability;
   - wide black wedge/void;
   - geometric/artificial animation;
   - subtitle/safe-zone readability;
   - material continuity;
   - audio continuity.
7. Deliver direct MP4. Do not lead with HTML.
8. Never self-label final/100/105 without human review.
9. No merge/deploy/publication without explicit user instruction.

## 13. Repository state at handoff creation

Repository: `moseszhu999/global-tool-radar`

Current Premium PR observed on 2026-08-13:

- Draft PR `#126` — `Add Video Operation Premium 95-105 escalation`
- state: open, draft, not merged
- base: `agent/video-operation-gold-baseline-v1-20260812`
- current observed head branch: `agent/video-operation-premium-v1-20260812`
- current observed head SHA at handoff creation: `f9f15b0f52d1b477add091e2eac8b1b8979e9b6e`

This handoff is intentionally persisted on a separate branch so it does not destabilize the already-validated Gold/Premium contract work.

## 14. Explicit boundaries

- Merge = NO
- Deploy = NO
- Publication = NO
- Do not alter social accounts
- Do not silently change the user-approved camera-lock baseline
- Do not claim a local binary is in GitHub unless binary upload is actually verified
