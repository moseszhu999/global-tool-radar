# Video Operation Premium v1

Status: **candidate escalation profile**  
Profile: `video.production.premium.v1`  
Extends: `video.production.gold-baseline.v1`  
Target band: **95–105**

## Purpose

Gold exists to stop repeatable quality failures and make 85–95 the default floor. Premium exists for selected videos that are worth pushing beyond “very good” toward benchmark-grade work.

Premium is **not the default for every video**. It is an explicit escalation after Gold targeting is already present.

The governing idea is simple:

> Gold removes obvious defects. Premium creates continuity, material credibility, performance and brand memory.

## 1. What changes from 95 to 105

A 95-point short can already be clean, stable, readable and attractive. It often still feels assembled from good individual shots.

A Premium short should feel like one designed event system:

- the end of one shot causes the next shot;
- motion has physical or semantic provenance;
- light/material behavior remains coherent;
- recurring brand motifs appear before the logo;
- voice performance has intentional prosody rather than merely natural TTS;
- sound explains and connects events, not only fills silence;
- the whole cut survives direct human comparison with multiple external references.

## 2. Continuity: shot N must create shot N+1

Minimum Premium target:

- at least 60% of shot boundaries use physical or semantic carry;
- continuity human score >= 90;
- cross-shot event carry is required;
- crossfade-only transition grammar is not sufficient.

Examples:

- falling drop becomes a circular time ring;
- ring collapses into particle field;
- particles align into a liquid streamline;
- streamline becomes a glass highlight;
- highlight becomes the CTA brand arc.

The transition should reuse energy, shape, direction, material, sound or meaning from the previous shot.

## 3. Advanced motion: causal, not decorative

Premium requires at least two advanced motion families:

- physical — liquid, collision, gravity, steam, fabric, object mechanics;
- spatial — depth, parallax with real scene logic, 3D path or world-space geometry;
- procedural — data/particle systems driven by narrative state;
- material — reflections, refraction, specular changes or surface response caused by motion;
- product-ui-native — real UI state transitions for software products.

The motion must be causal. More motion is not automatically better.

Banned Premium behavior:

- continuous ambient wobble with no narrative cause;
- background drift added merely to avoid stillness;
- `Math.sin(frame)` / `Math.cos(frame)` used as generic visual life support;
- camera motion added because the underlying scene has no event.

Periodic functions may be used for physically motivated phenomena such as a controlled oscillator, wave, breathing light or procedural simulation, but the cause must be explicit and the camera must remain stable unless intentionally handheld.

## 4. Material and optical credibility

Premium raises the material floor:

- material realism >= 92;
- lighting continuity >= 92;
- optical interaction >= 90;
- hero shot must contain a meaningful material interaction.

For product/food/liquid work this can include:

- refraction through glass;
- ice/liquid contact;
- condensation response;
- realistic specular travel;
- steam/light interaction;
- shadow contact and surface response.

For software/UI work, material credibility means spatial hierarchy, compositing, display/light consistency and motion that respects the product surface rather than floating presentation cards above it.

## 5. Brand world before logo

Premium brand score >= 90.

At least two motifs should recur through at least 60% of relevant shots. A motif may be:

- a curve/arc;
- a direction of movement;
- a material;
- a light behavior;
- a sound gesture;
- a typographic behavior;
- a transition shape.

Logo-only branding is not Premium branding.

## 6. Voice becomes performance

Gold asks: “does the voice sound natural?”  
Premium asks: “does the voice perform the edit?”

Premium targets:

- performance score >= 92;
- intentional prosody coverage >= 90%;
- human review required;
- no narration time-stretch.

Direction should identify where the voice:

- hooks;
- accelerates;
- creates contrast;
- leaves silence for a visual payoff;
- lands the conclusion;
- changes warmth/energy for the CTA.

A premium neural voice may be acceptable; the criterion is performance, not vendor prestige.

## 7. Sound becomes narrative

Premium sound narrative score >= 92.

Required:

- bespoke recurring sound motif;
- frame-synchronous event sound;
- loudness evidence;
- sound that carries at least some transitions.

Good Premium sound design can make a visual transition intelligible before the eye fully resolves it.

## 8. Typography becomes choreography

Gold mobile floors remain mandatory. Premium adds hierarchy quality >= 92.

Text should enter because the scene creates a reason for it. Avoid paragraph dumps and a permanent overlay shelf dominating every shot.

Useful techniques:

- text following a world-space path;
- a number emerging from the object it measures;
- a label inheriting velocity/direction from the event;
- a keyword becoming a transition object.

## 9. Benchmark discipline

Premium requires direct human comparison with at least two references.

The comparison must state what each reference is used for, e.g.:

- material realism;
- transition continuity;
- typography;
- voice performance;
- sound design;
- brand grammar.

Reference copying is prohibited. Benchmarking is for capability comparison, not stylistic cloning.

Overall human review must reach >= 95 and Gold non-regression must still pass.

## 10. Existing internal benchmark assets are not automatically Premium-safe

See:

`apps/remotion-video/props/premium-benchmark-audit.v1.json`

Current findings:

- `toolradar-explainer-14to5-benchmark-v1.tsx` — useful payoff/evidence/timing patterns, but legacy continuous signal wobble means `LEGACY_REFERENCE_ONLY`;
- `toolradar-explainer-19s-animatic-v1.tsx` — useful narrative anchors, but background/signal oscillation and panel-heavy comparison grammar mean `LEGACY_REFERENCE_ONLY`;
- `toolradar-explainer-production-polish-alpha-overlay-v2.tsx` — useful non-overlapping beat ownership, headline hierarchy and event-bounded pulses; use as `PATTERN_SOURCE_ONLY`, not a final visual template.

A filename containing `benchmark` is not proof of benchmark quality.

## 11. Premium evidence

Pending evidence schema:

`toolradar.premium-quality-evidence.v1`

The Premium adapter generates null/PENDING evidence rather than invented approval.

The canonical quality worker accepts:

```text
--creative-quality <gold-evidence.json>
--premium-quality <premium-evidence.json>
```

Premium final requires both. Gold remains the inherited floor.

## 12. Premium stage model

- `PREMIUM_TARGET` — Gold render package explicitly escalated;
- `PREMIUM_TARGET_PENDING` — technical render can exist, Gold/Premium human evidence incomplete;
- `PREMIUM_REVIEW_EVALUATED` — both evidence layers supplied and evaluated;
- `PREMIUM_FINAL_ENFORCED` — missing/failed Gold or Premium evidence fails closed.

Premium does not authorize publication. Existing human/publication controls remain separate.

## 13. World Benchmark 105+ remains a different frontier

Premium v1 deliberately stops at 95–105.

105+ typically requires one or more of:

- genuinely excellent live-action or high-end CG/simulation;
- continuous multi-shot choreography;
- actor-level voice performance;
- bespoke sound identity;
- sophisticated color/material pipeline;
- unmistakable brand language;
- art direction that is difficult to reproduce from generic templates.

Do not label a video “world benchmark” merely because it passes Premium gates.
