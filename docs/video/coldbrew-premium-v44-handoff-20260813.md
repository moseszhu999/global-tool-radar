# Cold Brew Premium — Current Handoff (V4.6 transition-clean, 2026-08-13)

> Legacy filename retained for continuity. Current working review candidate is **V4.6 transition-clean**, not V4.4/V4.5.

Status: **working review candidate; not final**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## 1. Current human-review truth

- `Premium Camera Lock V3` remains the permanent stability baseline. User feedback: **“v3不抖了。”**
- Camera shake remains a hard non-regression: no whole-frame wobble, random drift, fake handheld, ambient rotate/warp, oscillating translate/scale, or `sin/cos` camera wobble.
- Natural local motion direction remains preferred: liquid/light/refraction/particles should look physical, not like geometric VFX.
- A wide black wedge/void means a **broad diagonal dark region roughly 1/5–1/6 of frame width**, not the thin 39° brand arc.
- Latest human review of V4.5: the user reported that **both the ~5s and ~22s black holes were still visible** in the full 32-second review video, and that there appeared to be **another new one later**.
- Therefore prior claims that V4.4/V4.5 had removed those defects must not be treated as human-approved truth.

## 2. Important V4.5 technical regression

V4.5 must not be used as the base for further work.

For `V45_22fix.mp4`:

- container duration reported `32.000s`;
- audio stream duration was `32.000s`;
- **video stream duration was only `31.533333s`**;
- video frame count was only **946 frames**, not the required 960 at 30fps.

This was a real regression introduced while attempting the 22s repair and is a plausible source of the user's report that another later defect appeared.

Do not patch V4.5 further.

## 3. Current working review candidate — V4.6 transition-clean

Canonical review filename:

- `V46_clean.mp4`
- SHA-256: `2c9e698603f7e1483ecd030ffed88505b71a9e0cd47414c86def876e1b4efaa3`
- size: `9,229,392 bytes`
- duration: `32.000s`
- video: H.264, `1080×1920`, `30fps`, **960 frames**
- audio: AAC, `48kHz`, stereo, `32.000s`

Durable exact binary:

- Google Drive file ID: `18Xy90wtb26WzoNgprhHUj2cqhEBZagNj`
- file: `VideoOperation-ColdBrew-V46-clean-transitions-20260813.mp4`
- the Drive copy was re-downloaded and verified byte-for-byte identical;
- re-download SHA-256 matched exactly: `2c9e698603f7e1483ecd030ffed88505b71a9e0cd47414c86def876e1b4efaa3`.

`docs/video/coldbrew-v44-artifact-manifest.json` is the machine-readable source of truth for this exact artifact.

## 4. V4.6 construction strategy

V4.6 deliberately stops trying to rescue ambitious cross-shot composite transitions.

Base:

- exact V4.4 master from Drive;
- verified V4.4 source has `960` video frames / `32.000s` video and `32.000s` audio.

V4.6 keeps V4.4 imagery outside transition windows but **temporarily neutralizes all five complex cross-shot transitions**. The suspect composite/blend frames are removed from the review path and replaced by short stable boundary-frame holds separated by a clean hard cut.

Neutralized windows:

1. approximately `5.00s–5.45s`
2. approximately `10.10s–10.45s`
3. approximately `15.60s–16.10s`
4. approximately `22.00s–22.38s`
5. approximately `26.70s–27.20s`

Reason:

> A plain clean cut is preferable to any transition that can expose a black wedge, alpha/matte hole, crop mismatch, or premultiplied-alpha failure.

No blur, darkening, fog, new mask, or decorative overlay is used to hide the problem.

## 5. What local QA actually established

For V4.6:

- video stream = `32.000s` / `960` frames;
- audio stream = `32.000s`;
- all five transition windows were inspected as dense contact sheets after the complex transition frames were neutralized;
- the broad diagonal transition-composite wedge seen clearly around ~5s in V4.5 is absent from the V4.6 transition path;
- the ~22s composite transition is also absent from the V4.6 transition path;
- the late fifth transition is neutralized as well, specifically to avoid another later black-hole regression.

This is **local QA only**. Human review remains authoritative. Do not call the defects solved until the user confirms them in the delivered MP4.

## 6. Hard camera rule

- camera shake = `0`
- no meaningless whole-frame micro-translation
- no continuous scale oscillation
- no ambient rotate / warp
- no generic `sin/cos` wobble
- no random drift
- no fake handheld micro-jitter

Motion should come from droplets, steam, liquid, ice, particles, highlights, refraction, condensation, or real object motion.

## 7. Natural local animation rule

Prefer:

- believable droplet approach/impact;
- irregular local liquid brightness response;
- short non-symmetric caustic/refraction response;
- sparse physically carried particles;
- specular travel on glass/ice/liquid.

Reject:

- perfect circular ripple rings;
- symmetric geometric wavefronts;
- neon portal/path transitions;
- repeated identical transition gimmicks;
- any effect whose geometry is more visible than the physical event.

Rule: **the viewer should notice the event, not the effect layer.**

## 8. Cinematic continuity target remains, but is temporarily subordinate to correctness

Long-term transition intents remain:

1. Pour → aroma: highlight/steam emerges from liquid, no glowing portal.
2. Aroma → cold drip: condensation/steam converges naturally toward drip axis.
3. Cold drip → flavor field: irregular local optical/liquid response, no perfect ring.
4. Flavor current → iced liquid: amber motion reads as material/liquid, not pasted ribbon.
5. Iced liquid → Hero Glass: energy settles into glass/ice/highlight/product, no flashy wipe required.

But V4.6 intentionally uses clean cuts as a diagnostic/conservative baseline. **Do not reintroduce any complex transition until the user first confirms the black-hole family is gone.**

After confirmation, restore only one transition/window at a time and preserve a direct A/B against V4.6.

## 9. Information design / text / sound

Keep explanation inside the cinematic world rather than PPT/card/UI overlays.

At 1080×1920:

- subtitle target `>=52px`;
- world-space explanatory label equivalent `>=48px`;
- keep Douyin/Xiaohongshu safe zones;
- decorative motion must not reduce subtitle readability.

Preferred voice baseline:

- `edge-tts`
- `zh-CN-XiaoxiaoNeural`
- rate around `+10%`
- segmented synthesis
- no narration time-stretch

Sound remains restrained, causal and frame-synchronous.

## 10. Review delivery

Primary review deliverable is a **direct MP4**.

For V4.6 provide:

- full `V46_clean.mp4`;
- optional `V46_transitions.mp4` containing the five transition windows back-to-back for fast defect checking;
- HTML may exist as a supplementary clickable index, but never as the only/primary video review path.

Do not label V4.6 Final / 100 / 105 until human review confirms it.

## 11. Next action

Ask the user to check the full V4.6 and/or the short transition compilation for:

- ~5s wide diagonal black wedge;
- ~22s wide diagonal black wedge;
- any later/new black wedge or void;
- camera stability.

If the user confirms the black-hole family is gone, preserve V4.6 as the clean transition baseline and restore natural local transition behavior **one boundary at a time**.

Every future candidate must check:

- exact video frame count and video-stream duration, not only container duration;
- camera micro-jitter;
- wide black wedge/void;
- alpha/matte boundary;
- artificial geometric liquid effect;
- subtitle/safe-zone;
- material/light continuity;
- audio continuity.

## 12. Repository boundaries

Repository: `moseszhu999/global-tool-radar`

- Gold baseline PR `#125` remains dependency background.
- Premium PR `#126` remains separate Draft/open runtime-contract work.
- Handoff Draft PR `#127` uses branch `agent/video-operation-v44-handoff-20260813`.
- Handoff/manifest updates must not alter the validated Gold/Premium runtime contract.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
