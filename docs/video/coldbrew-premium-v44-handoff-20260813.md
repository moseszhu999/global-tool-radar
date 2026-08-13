# Cold Brew Premium — Source Reset Handoff (Scene 1 Motion Study, 2026-08-13)

Status: **SourceReset1 human review candidate; not final**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## 1. Human-approved truth

The user reviewed `SourceReset0.mp4` and said:

> **“至少那些讨厌的黑缝没了”**

This is now the critical baseline truth: the source-reset construction successfully removed the previously recurring black-seam / black-hole defect family.

Therefore SourceReset0 is the clean seam-free baseline. Never reintroduce the mechanisms that caused the prior failures.

## 2. Permanent transition ban

Across scene boundaries, forbid:

- cross-shot composite;
- crossfade used as a hidden blend layer;
- alpha/matte transition;
- diagonal-mask reveal;
- rotated/skewed coverage tricks;
- moving source-video frames near a scene boundary;
- any effect that can expose empty/black geometry.

Scene changes are hard cuts only until a future transition family is separately proven safe. A clean cut is not a temporary compromise; it is the default safe grammar.

## 3. Benchmark learning before restoring motion

The next pass studied mature coffee/product motion references rather than inventing another gimmick.

Key references:

- Illy Iperespresso: coffee-fluid behavior is itself the narrative; macro material events carry the visual story.
- NESCAFÉ Classic cinematic product commercial: organic texture, pour quality, brand reveal; product remains visually legible.
- Lavazza Coffee 3D Motion: motion comes from coffee beans, extraction, smoke/steam and liquid simulation.
- Aroma Dance / Nespresso-inspired CGI: stable product identity with movement assigned to objects/light/rhythm rather than camera shake.

Shared lesson:

> **Keep the camera/product anchor stable; put motion into material, light, droplets, condensation, particles and physical events.**

This matches the user's earlier preference for natural local animation and rejection of geometric effectiness.

## 4. Current review candidate — SourceReset1

Filename:

- `SourceReset1_Scene1Motion.mp4`
- SHA-256: `6dcedbe09a7859088c4c86a1e65a696c172cde32bf82629802ef2b3f8b6f3759`
- size: `3,455,476 bytes`
- duration: `32.000s`
- video: H.264, `1080×1920`, `30fps`, **960 frames**
- audio: AAC, `48kHz`, stereo, `32.000s`

Durable exact binary:

- Google Drive file ID: `1yDzWrtJxpkkme1tFwI9D1cYHsW9KAs_X`
- filename: `VideoOperation-ColdBrew-SourceReset1-Scene1Motion-20260813.mp4`

## 5. What changed

Only Scene 1 (`0.000s–5.333s`) changed.

Scenes 2–6 remain byte-content-equivalent in visual intent to SourceReset0: static clean source-reset frames with hard cuts.

Scene 1 still uses a locked whole-frame image. There is **no camera transform**. Local motion is added only inside material regions:

1. a single controlled specular travel down the existing coffee stream;
2. short asymmetric ice caustic flickers;
3. three small condensation droplets that slide only a few pixels on the glass wall;
4. one soft amber caustic travel through the lower liquid body;
5. all local motion settles before the Scene 1 → Scene 2 hard cut.

No looping wobble, no global push/zoom, no geometric ring, no portal, no transition layer.

## 6. Scene 1 → Scene 2 boundary QA

The boundary at approximately `5.333s` was extracted densely on both sides.

Observed locally:

- last Scene 1 frames remain the original clean coffee-pour composition;
- first Scene 2 frame is the clean HOT / FAST vs COLD / TIME composition;
- there is a direct hard cut;
- no blended frame, alpha hole, diagonal mask or wide black wedge appears in the boundary sequence.

This is local QA only. Human review remains authoritative.

## 7. One-scene-at-a-time rule

Do **not** animate Scene 2 yet.

The production sequence is now:

1. human reviews SourceReset1 Scene 1 motion;
2. if approved, freeze Scene 1;
3. animate Scene 2 only;
4. review again;
5. proceed one scene at a time through Scene 6.

Any regression immediately returns to the latest human-approved SourceReset baseline.

## 8. Motion grammar going forward

Preferred:

- liquid specular travel;
- believable droplet/condensation behavior;
- ice highlights and refraction;
- steam/aroma only where physically meaningful;
- sparse particles tied to material motion;
- small object-level motion;
- restrained timing with a clear start/settle.

Reject:

- whole-frame camera shake/zoom drift;
- continuous oscillation;
- perfect circular ripple rings;
- symmetric geometric waves;
- neon portal paths;
- transition gimmicks crossing shot boundaries;
- effect layers more visible than the coffee itself.

## 9. Review delivery

Primary review deliverables:

- full `SourceReset1_Scene1Motion.mp4`;
- Scene-1-only `Scene1_StudyPass1.mp4` for fast A/B review;
- HTML review page as secondary aid.

Do not label Final / 100 / 105 until human review.

## 10. Repository boundaries

- Gold baseline PR `#125` remains dependency background.
- Premium PR `#126` remains separate Draft/open runtime-contract work.
- Handoff PR `#127` remains Draft/open.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
