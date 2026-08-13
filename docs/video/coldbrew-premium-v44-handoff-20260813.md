# Cold Brew Premium — Source Reset Handoff (2026-08-13)

Status: **SOURCE RESET 0 — STATIC CLEAN BASELINE REVIEW**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## 1. Direction change from human review

The user explicitly stopped the local V3 recovery path and instructed the production flow to continue from any stable point available, with one decisive rule:

> **Do not use the thing that produces the black seam.**

Therefore local V3 recovery is no longer a prerequisite. V4.4/V4.5/V4.6/CleanCut1 must not be used as direct moving-video render bases.

## 2. SourceReset0 is a true source reset

Current review artifact:

- `SourceReset0.mp4`
- SHA-256: `a9fa19e8b188f10ae0bc992b462e5dcfc6411eb98a40aa7865022b17bf808576`
- 32.000s
- H.264 1080×1920 @ 30fps
- exactly 960 video frames
- AAC 48kHz stereo / 32.000s
- Drive file ID: `1G9H4UylYDZnr5foMkCKpZhqAJnQemG0G`
- Drive filename: `VideoOperation-ColdBrew-SourceReset0-20260813.mp4`

## 3. Construction rule

SourceReset0 does **not** reuse moving V4 transition footage.

Only six clean, mid-shot still frames were extracted from V4.4 at:

- 2.70s
- 7.80s
- 13.00s
- 18.50s
- 24.50s
- 29.50s

These six stills are held for the original six scene durations and connected only by hard cuts. Original 32s audio is preserved.

Consequences:

- no original transition frames;
- no cross-shot composite;
- no crossfade;
- no alpha/matte transition;
- no diagonal-mask reveal;
- no moving source-video frame near a transition;
- no whole-frame camera movement;
- camera shake = 0.

This artifact is deliberately visually conservative. Its job is to establish a seam-free clean source baseline before adding motion.

## 4. Rejected continuation bases

Do not render forward from:

- `V44_fix.mp4`
- `V45_22fix.mp4`
- `V46_clean.mp4`
- `CleanCut1.mp4`

Reason: all remain dependent on moving source segments from the failed seam-producing chain, even when their transition windows were cut or replaced.

## 5. Permanent transition ban

For this production, until a separate transition implementation is proven safe, forbid:

- cross-shot composite transitions;
- diagonal mask/wedge reveals;
- alpha wipe transitions;
- premultiplied-alpha transition tricks;
- crossfade-only transition grammar;
- rotated/skewed transition layers that can expose empty canvas.

Allowed boundary behavior is a clean cut.

## 6. Motion may return only inside scenes

If SourceReset0 is human-confirmed clean, add motion one scene at a time using only local physical phenomena:

- droplets;
- steam;
- liquid flow;
- ice;
- highlights/specular travel;
- refraction/caustics;
- sparse particles.

No whole-frame wobble, no fake handheld, no camera oscillation, and no cross-scene effect layer.

Each new moving scene must A/B against its SourceReset0 still and must not modify any other scene in the same iteration.

## 7. Information design / audio rules remain

- cinematic/world-space explanation, not PPT/card UI;
- subtitle target >=52px equivalent at 1080×1920;
- world-space label target >=48px equivalent;
- restrained causal sound;
- preferred voice remains Xiaoxiao / segmented / roughly +10% / no narration time-stretch.

## 8. Review truth

SourceReset0 is **not Final / 100 / 105**. Human review determines whether the black-seam family is actually absent in the delivered MP4.

If clean, SourceReset0 becomes the new source baseline and animation restarts from scene 1 only.

If any black seam still appears in SourceReset0, do not patch the MP4. Inspect the selected still itself and replace only that still with another clean mid-shot source frame.

## 9. Repository boundaries

- Gold baseline PR #125 remains dependency background.
- Premium PR #126 remains separate Draft/open runtime-contract work.
- Handoff PR #127 persists the production artifact/evidence state only.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
