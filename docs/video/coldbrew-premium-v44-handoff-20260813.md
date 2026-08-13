# Cold Brew Premium — Current Handoff (V4.5, 2026-08-13)

> Legacy filename retained for continuity. Current best-known review candidate is **V4.5**, not V4.4.

Status: **working review candidate; not final**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## Current human-review truth

- `Premium Camera Lock V3` remains the permanent stability baseline. User feedback: **“v3不抖了。”**
- Camera shake is therefore a non-regression: no whole-frame wobble, random drift, fake handheld, ambient rotate/warp, or oscillating translate/scale.
- Natural local animation direction remains approved relative to the earlier geometric ripple version: amplify liquid/light/refraction/particles, not obvious VFX geometry.
- Wide black wedge/void means a **broad diagonal dark region around 1/5–1/6 frame width**, not the thin 39° brand arc.
- User review of V4.4 on 2026-08-13:
  - **~5s first wide black wedge: confirmed removed.**
  - **~22s second wide black wedge: user said it appeared to remain.**

## Current best-known review candidate — V4.5

Canonical review filename:

- `V45_22fix.mp4`
- SHA-256: `1033d27a9e155dac4e391d8fbbf263c441bfbd6cff93a0879c71ee86d060a588`
- size: `16,553,692 bytes`
- duration: `32.000s`
- video: H.264, `1080×1920`, `30fps`
- audio: AAC, `48kHz`, stereo

Durable exact binary:

- Google Drive file ID: `1Q_5ep-SkAws1sVz_bWs7cqqcjkeSrYse`
- file: `VideoOperation-ColdBrew-V45-22fix-20260813.mp4`
- durable copy was re-downloaded after upload and verified byte-for-byte identical to the local master; SHA-256 matched exactly.

`docs/video/coldbrew-v44-artifact-manifest.json` remains the canonical machine-readable artifact identity record and has been updated to V4.5.

## What changed from V4.4 to V4.5

Only the second hard-defect area was changed.

V4.4 already fixed the first ~5s defect, so that area is preserved unchanged.

For the second defect, V4.5 removes the unreliable composite transition interval around:

- approximately `21.966667s–22.466667s`

Instead of trying to hide or cosmetically soften the defect, the suspect transition frames were removed from the visual path and replaced with stable boundary-frame holds separated by a **clean hard cut**. The complete 32-second timeline is preserved and the V4.4 audio stream is copied unchanged.

Reason: **a clean cut is preferable to an ambitious transition with a visible alpha/matte/composite failure.**

No new whole-frame camera transform was introduced.

## Hard visual rules

### Camera

- camera shake = `0`
- no meaningless whole-frame micro-translation
- no continuous scale oscillation
- no ambient rotate / warp
- no generic `sin/cos` wobble
- no random drift
- no fake handheld micro-jitter

Motion should come from droplets, steam, liquid, ice, particles, highlights, refraction, condensation, or real object motion.

### Local liquid animation

Prefer:

- believable droplet approach/impact;
- irregular local brightness response;
- short non-symmetric caustic/refraction response;
- sparse physically carried particles;
- specular travel on glass/ice/liquid.

Reject:

- perfect circular ripple rings;
- symmetric geometric wavefronts;
- neon portal/path transitions;
- repeated identical gimmicks across shots.

Rule: **the viewer should notice the event, not the effect layer.**

### Wide black wedge / void

Treat any broad diagonal dark polygon/void as a hard failure. Investigate alpha/matte coverage, source crop/transform mismatch, rotated/skewed layer coverage, premultiplied-alpha mismatch, or incomplete wipe/flow geometry.

Do not blur, fog, or darken the area to hide it. Remove the invalid geometry or use a clean cut / known-good source.

## Cinematic continuity target

Keep the five intended causal transitions only when they remain clean:

1. Pour → aroma: highlight/steam emerges from liquid, no glowing portal.
2. Aroma → cold drip: condensation/steam converges naturally toward drip axis.
3. Cold drip → flavor field: irregular local optical/liquid response, no perfect ring.
4. Flavor current → iced liquid: amber motion should read as material/liquid, not pasted ribbon.
5. Iced liquid → Hero Glass: energy settles into glass/ice/highlight/product, no flashy wipe required.

Principle: **Shot N should create Shot N+1 through energy, material, direction, sound, or meaning — but a clean cut beats a broken transition.**

## Information design and text

Keep explanation inside the cinematic world rather than PPT/card/UI overlays.

At 1080×1920:

- subtitle target `>=52px`;
- world-space explanatory label equivalent `>=48px`;
- keep Douyin/Xiaohongshu safe zones;
- decorative motion must not reduce subtitle readability.

## Voice and sound

Preferred production baseline remains:

- `edge-tts`
- `zh-CN-XiaoxiaoNeural`
- rate around `+10%`
- segmented synthesis
- no narration time-stretch

Sound remains restrained, causal and frame-synchronous. Do not use audio to disguise visual defects.

## Review delivery

Primary review deliverable is always a **direct MP4**. A supplementary HTML/evidence page may exist, but must not replace the direct MP4 review path.

Do not label V4.5 Final / 100 / 105 until human review confirms it.

## Next action after human review

First ask the user only to judge whether the ~22s wide black wedge is actually gone in `V45_22fix.mp4` and whether camera stability remains intact.

If confirmed, reintroduce natural local animation into reverted/stabilized windows **one window at a time**. Do not simultaneously modify both the ~5s and ~22s regions.

Every candidate must check:

- camera micro-jitter;
- wide black wedge/void;
- alpha/matte boundary;
- artificial geometric liquid effect;
- subtitle/safe-zone;
- material/light continuity;
- audio continuity.

## Repository state / boundaries

Repository: `moseszhu999/global-tool-radar`

- Gold baseline PR `#125` remains dependency background.
- Premium PR `#126` remains Draft/open; do not assume an old SHA without re-reading it in a new window.
- Handoff Draft PR `#127` uses branch `agent/video-operation-v44-handoff-20260813`.
- This handoff/manifest work must not alter the validated Gold/Premium runtime contract.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
