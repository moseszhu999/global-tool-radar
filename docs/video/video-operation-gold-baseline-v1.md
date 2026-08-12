# Video Operation Gold Baseline v1

Status: **candidate baseline / default target for new Video Operation worker-generated projects**  
Owner surface: `apps/remotion-video` + Shared Media render/audio/evidence contracts  
Derived from: 2026-08-12 cold-brew iterative production review, which moved from roughly 60-point output to a user-rated ~95-point review build.

## Purpose

This baseline turns the successful production lessons into default rules for future Video Operation work. It is not a style guide for one coffee video. It is a quality floor for any new short-form AI-assisted video produced through the Video Operation worker chain and intended for Remotion or the shared media runtime.

The target is: **start near 85–95 quality instead of rediscovering the path from 60**.

Legacy stored artifacts and direct older canonical-builder callers remain backward-compatible; new worker-generated projects receive Gold as their default quality target through `packages/video-gold-profile`.

## Canonical production order

`Idea/Source → Story → Script → Character/Style Lock → Shot List → Storyboard → Production Assets → Motion Plan → Cinematic Infographic → Real Motion → Voice Direction → Sound Design → Remotion/Render → Full-watch QC`

Storyboard and design boards are planning artifacts only. They are never final production assets.

## 1. Camera rule: stable by default

Hard rule: **camera shake = 0** unless a shot explicitly calls for intentional handheld language.

For normal product/explainer work:

- no random camera drift;
- no sinusoidal `sin/cos` micro-wobble;
- no back-and-forth 1–2 px oscillation;
- no direction reversal inside a simple push/rail/dolly shot;
- use one monotonic camera move: push-in, pull-back, rail, dolly, or controlled orbit;
- calculate transforms in a higher-resolution working raster when needed to avoid crop quantization jitter.

The scene may move. The camera must not look like a hand is trembling.

## 2. Motion rule: objects move, not only the crop

A high-resolution still with Ken Burns motion is not sufficient for a final-quality hero shot.

At least one meaningful physical event must exist for each major narrative beat, for example:

- ice collision;
- coffee/liquid flow;
- steam evolution;
- drip motion and liquid impact;
- condensation movement;
- particle transformation;
- lighting/specular movement caused by object motion;
- world-space typography or graphic motion tied to the physical event.

Camera-only motion cannot be the sole source of energy for the finished film.

## 3. Cinematic Infographic rule

Do not choose between “cinema” and “diagram”. The default is **Cinematic Infographic**.

Good infographic behavior:

- information is attached to an object, path, surface, liquid, steam, glass, or particle system;
- graphics obey perspective and scene motion where practical;
- information may be partially occluded by real materials/highlights;
- a physical action causes the explanatory graphic to appear or transform;
- the explanation remains understandable even when the text is minimal.

Avoid PPT/UI language unless the product itself is a UI:

- full-screen cards;
- comparison panels;
- dashboard blocks;
- generic horizontal meters;
- fixed-corner labels unrelated to the object;
- large explanatory paragraphs over a passive background.

Heuristic: when paused, the viewer should first see a cinematic shot and only then notice the explanatory layer. If the paused frame reads as a complete slide, the treatment is too page-like.

For genuine software/UI product shots, `product-ui-native` treatment is allowed: information should bind to real controls, paths or UI state changes rather than adding a second PPT-like presentation layer.

## 4. Typography and mobile readability

For 1080×1920 delivery:

- subtitle hard minimum: **52 px**;
- subtitle target: **56 px or larger** when copy length allows;
- world-space explanatory label hard minimum: **48 px equivalent** after final scaling;
- keep subtitles inside mobile-safe margins and clear of platform UI;
- use outline/shadow/contrast sufficient for fast mobile viewing;
- world-space labels are the first explanation layer; bottom subtitles preserve full linguistic meaning and should not compete for attention.

Readability is judged on the final exported 9:16 video, not only in a desktop preview.

## 5. Voice direction

- approved neural voice or human voice only for final;
- natural duration; **no narration time-stretch**;
- generate/record important lines independently when needed;
- allow per-line timing, gain, EQ and compression;
- preserve natural pauses and breathing room;
- final voice naturalness gate: **>= 85/100 human review**.

Local/reference/mechanical TTS is preview-only.

## 6. Sound design

Final-quality work must not be voice + generic BGM only.

- minimum 6 meaningful frame-synchronous sound events for a ~30 s short when the visuals support them;
- use physical Foley: liquid, glass, ice, drip, steam, impact, whoosh, room tone;
- music supports rhythm but does not create all of the perceived motion;
- duck music/ambience under voice;
- no long accidental silence;
- verify loudness/true peak and inspect the exported file.

## 7. Asset quality and material realism

- approved assets must appear in the final MP4;
- do not hide low-resolution assets by enlarging them full screen;
- hero scenes should use production-resolution imagery/video/CG;
- product films should prioritize glass, ice, liquid, condensation, steam, surface detail, reflections, refraction and lighting continuity;
- if a still is used, it should be designed for the intended camera path and infographic composition rather than treated as a generic background.

## 8. Physical continuity between shots

Prefer transitions in which an event in shot N becomes the transition grammar of shot N+1:

`drop → time ring → particle → liquid streamline → highlight → hero glass`

A crossfade may support the transition, but should not be the only continuity mechanism for benchmark-oriented work.

## 9. Brand world

The brand cannot appear only in the last CTA.

Establish recurring visual grammar from shot 1, such as:

- a signature angle/arc/line;
- color and lighting system;
- material language;
- motion motif;
- sound motif;
- typography behavior.

The long-term benchmark is recognizability before the logo appears.

## 10. Gold stages and release gates

Gold is applied in stages rather than fabricating a final-quality pass during preview:

- `PREVIEW_TARGET`: the project is designed toward Gold, but creative review evidence is not yet complete;
- `TARGET_PENDING`: technical QA may pass, but release remains blocked by `GOLD_CREATIVE_REVIEW_REQUIRED`;
- `REVIEW_EVALUATED`: creative evidence has been supplied and Gold checks are evaluated;
- `FINAL_ENFORCED`: final candidate requires complete evidence and fails closed on any missing/failed Gold check.

A final render is **PREVIEW_ONLY / QUALITY_FAIL** unless all applicable gates pass:

- `Voice_Naturalness >= 85`
- `Visual_Quality >= 85`
- `Visual_Consistency >= 88`
- `Material_Realism >= 85`
- `Motion_Quality >= 85`
- `Camera_Stability >= 95`
- `Sound_Design >= 85`
- `Caption_Readability >= 90`
- `Full_Watch_Review == PASS`
- `Technical_QC == PASS`
- all approved production assets used in the final render

No automated gate may silently promote a video to FINAL without a full-watch human review.

## 11. Required review artifacts

Each serious review build should provide:

1. clickable HTML review page;
2. final/preview MP4;
3. actual rendered contact sheet/key frames;
4. technical probe evidence (`ffprobe` or equivalent);
5. loudness/silence evidence when audio is present;
6. asset manifest / evidence that approved assets are used;
7. explicit status: `PREVIEW_ONLY`, `REVIEW_BUILD`, `RC`, or `FINAL`.

The review page is a first-class deliverable, not an optional convenience.

## 12. Benchmark escalation path

Use three quality bands:

- **85–95 Gold Baseline:** stable camera, cinematic infographic, real motion events, strong mobile typography, directed neural voice, synchronized sound and technical QC.
- **95–105 Premium:** stronger real/CG motion, physically continuous transitions, more sophisticated voice performance, tighter brand world.
- **105+ World Benchmark:** production-grade CG/simulation or excellent live-action hybrid, continuous shot choreography, actor-level voice, bespoke sound design and unmistakable brand language.

Do not spend repeated cycles polishing a 95-point film by 1–2 points when the reusable system has not yet been adopted by the next video.

## Non-regression rules

The following are now known failure modes and should be treated as regressions:

- continuous camera micro-shake;
- static image + camera crop as the only motion language;
- infographic panels that read as PPT slides;
- infographic text that is too small on a phone;
- subtitles below the mobile readability floor;
- voice time-stretch;
- final video that omits approved visual assets;
- claiming FINAL before human full-watch approval.

## Adoption

This document is paired with:

- `packages/video-gold-profile/src/index.mjs` — default Gold adapter for new Video Operation worker output;
- `apps/remotion-video/props/gold-baseline.v1.json` — machine-readable baseline contract;
- `apps/remotion-video/test/gold-baseline.test.mjs` — contract non-regression tests;
- `apps/remotion-video/test/gold-runtime-wiring.test.mjs` — worker/workflow wiring non-regression tests;
- `docs/video/video-operation-gold-baseline-adoption.md` — operational adoption path.

New worker-generated Video Operation projects start at the Gold target. Historical artifacts remain reproducible and are not rewritten in place.
