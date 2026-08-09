---
name: toolradar-video-ui-director
description: Build or revise ToolRadar video UI design frames from canonical product state using Figma design-system structure. Use when a social-video scene needs better UI hierarchy, spacing, typography, component consistency, storyboard/design frames, or code-to-canvas comparison. Do not use for product feature implementation, final Remotion animation/rendering, ComfyUI environment generation, or social publishing.
compatibility: Requires the Figma MCP server for Figma execution. Load the client’s Figma write skill (for example figma-use) before any write-to-canvas call.
metadata:
  mcp-server: figma
---

# ToolRadar Video UI Director

Use this skill to turn truthful product UI into professional, video-ready design frames without letting generated visuals rewrite product facts.

## When to use

Use this skill when:
- a ToolRadar video scene is structurally correct but still looks like a rough prototype or slide;
- typography, spacing, card hierarchy, CTA emphasis, or component consistency needs a design pass before animation;
- the team needs storyboard/design frames in Figma before committing to a Remotion implementation;
- real ToolRadar UI should be captured into Figma and compared with a design-system-native reconstruction;
- a Figma frame must become the visual reference for a bounded Remotion or ComfyUI experiment.

Do not use this skill when the task is only:
- implementing or changing ToolRadar product behavior;
- final animation timing, TTS, captions, rendering, hashing, or media inspection;
- generating backgrounds, characters, textures, or B-roll with ComfyUI;
- publishing or analytics;
- creating a generic Figma design unrelated to a ToolRadar video scene.

## Skill relationship

This is a specialist child skill of `toolradar-video-creative-director`.

The creative director decides whether a scene needs a Figma/UI-design pass. This skill owns the design-frame work. Hand final motion timing and exact rendering back to Remotion / Shared Media.

For any Figma write operation, first load the MCP client’s dedicated Figma execution skill and obey its Plugin API rules. Do not improvise around the Figma MCP server.

## Core principle

Use this source-of-truth order:

1. real running product state / canonical product code;
2. existing ToolRadar Figma components, variables, styles, and Code Connect mappings;
3. existing approved design frames;
4. deterministic reconstruction from product truth;
5. generated decorative treatment only after structure is approved.

A visually attractive Figma frame is invalid if it changes what the product actually says or does.

## Required inputs

Resolve or explicitly mark unknown:
- video scene purpose and target payoff;
- canonical UI state/copy that must remain true;
- current product route/component/source where relevant;
- target format and safe area, usually 9:16 for the current social workflow;
- existing Figma file/selection if one exists;
- current design-system components, variables, styles, and Code Connect coverage;
- baseline screenshot/frame used for comparison.

## Instructions

### 1. Re-establish repository and design ownership

Before repository writes, fetch latest main, open PRs, branches, current owner scope, and the exact video candidate when applicable.

Before Figma writes, identify the target file/page/selection and whether it is a disposable/example design surface or an important working file. Prefer a duplicate/scratch page for experiments.

Do not create a second UI/Skill implementation owner for an occupied scope.

### 2. Lock product truth before styling

Create a short truth ledger for the scene:
- exact visible copy;
- product state;
- counts/rankings/metrics that are factual;
- CTA meaning;
- which elements are decorative only.

Do not ask image generation to reproduce canonical UI text, ranking, scores, or labels.

If code and Figma disagree on product state, treat the running/canonical product as factual truth and record the design mismatch instead of silently choosing the prettier version.

### 3. Capture the real UI when possible

For a browser-renderable ToolRadar state, prefer a code-to-canvas capture into a scratch/target Figma file as a visual reference.

Capture the exact state needed for the video beat, not a generic homepage.

Use captured UI as:
- spacing/sizing reference;
- image/icon source where appropriate;
- evidence of real product state;
- visual baseline for the designed frame.

Do not treat a capture as the final design-system-native frame if it is only a flattened or code-derived representation.

### 4. Inspect the design system before creating primitives

Before drawing new UI:
1. inspect Code Connect mappings for needed components;
2. inspect existing screens using the same components;
3. inspect linked/published component libraries;
4. inspect variables for color, spacing, radius, and typography;
5. inspect text/effect styles;
6. identify the actual product font instead of defaulting to a convenient font.

Prefer real component instances and tokens over rectangles plus hardcoded hex/pixel values.

If a repeated UI pattern has no existing component, record that gap. Do not silently fabricate a competing design system inside the video file.

### 5. Build a video design frame with native Figma structure

Use native Figma structure:
- components / instances for repeated UI;
- Variables for semantic colors, spacing, radii, and other available tokens;
- Auto Layout for structurally related children;
- semantic layer/component names;
- existing text/effect styles when available.

Avoid absolute positioning for relationships that should be expressed by layout. Absolute canvas positioning is acceptable for the top-level video frame and intentional cinematic overlays.

The design frame should remain editable and inspectable, not merely look correct as a screenshot.

### 6. Adapt product UI for video without changing product truth

The video frame may change presentation hierarchy while preserving factual state.

Allowed video-specific changes include:
- crop/focus on the relevant panel;
- larger type for a key number/label;
- de-emphasis of irrelevant controls;
- grouping/spacing changes for legibility;
- a deterministic title or callout outside the product UI;
- a before/after or state-transition framing device.

Do not falsify product features, labels, rankings, or outcomes for visual convenience.

Prefer one obvious focal point per beat. If title, UI card, character, cursor, and background all compete equally, simplify before motion is added.

### 7. Validate structure and visuals separately

After meaningful writes:
- inspect node/component structure;
- verify variables/styles/component instances are actually bound;
- verify fonts load and text is readable;
- take a screenshot of the relevant frame;
- compare against the real product capture and previous video baseline.

A frame can be structurally valid and visually weak, or visually attractive and structurally wrong. Record both dimensions.

### 8. Produce a Remotion handoff contract

For every promoted video design frame, record:
- Figma file key / page / frame node ID;
- frame name and intended video beat;
- target aspect ratio / pixel profile;
- canonical UI copy ledger;
- component/variable/style dependencies;
- exported visual asset identifiers if any;
- screenshot/reference artifact;
- source product route/component or exact source reference;
- whether the frame is approved only as a design reference or as an exact visual source.

Remotion owns time, motion, captions/TTS synchronization, exact render, and media evidence. Do not encode final motion timing as undocumented Figma guesswork.

### 9. Gate generated polish behind the approved frame

If ComfyUI or another generator is used after the Figma design frame is correct:
- use the approved Figma/deterministic frame as reference;
- keep canonical UI/text deterministic and composited separately;
- prefer bounded/reference-guided treatment;
- compare generated treatment with the non-generated baseline;
- reject semantic drift or reduced readability.

### 10. Return evidence to the creative director

Report:
1. what product truth was locked;
2. what design-system assets were reused;
3. what was changed specifically for video legibility;
4. Figma frame/file identifiers;
5. baseline-vs-designed screenshot verdict;
6. unresolved design-system gaps;
7. whether the frame is ready for motion prototyping.

Never infer human approval from tool success.

## Example

User intent:

> The 14→5 shot is accurate now, but the dashboard still looks like a coded prototype. Make the UI feel professionally designed before we animate it again.

Expected behavior:
1. keep the 14→5 factual transformation and visible labels deterministic;
2. capture or inspect the corresponding real ToolRadar state;
3. inspect Figma/Code Connect/components/tokens before creating anything new;
4. build a 9:16 design frame using real components, Auto Layout, product font, and semantic variables;
5. enlarge only the video-critical hierarchy without inventing product states;
6. validate structure and screenshot;
7. hand the promoted frame to Remotion as a design reference;
8. only then consider bounded ComfyUI material/light polish.

## Common edge cases

### No Figma file exists

Do not scatter UI decisions across Remotion code by default. Create or designate a disposable Figma design surface only when a real design-frame pass is valuable; otherwise keep the deterministic baseline and report the missing design layer.

### Figma exists but has no useful design system

Use real product capture/code as truth, document the gap, and avoid inventing a full library inside a single video scene. Escalate design-system creation to a dedicated design-system workflow.

### Component exists in code but not in Figma

Prefer product truth from code. Use Code Connect/design-system reconciliation rather than drawing an unrelated visual clone and pretending it is canonical.

### Figma component exists but code differs

Do not use the old design state as factual UI. Record the mismatch and either capture current code or update the design-system mapping in the appropriate owner scope.

### Generated design looks better than real UI

Generated decoration may inspire treatment, but it cannot replace canonical product copy or state. Keep generated material behind deterministic UI layers.

### Font unavailable

Do not silently substitute a random font and call the frame final. Verify the product font; if unavailable, mark the fallback explicitly and keep the frame non-final.

### Large one-shot canvas mutation

Avoid it. Inspect first, write incrementally, return every affected node ID, and validate after each meaningful step using the client’s Figma execution skill.

## Testing this skill

Read `references/figma-video-ui-policy.md` and `references/skill-evals.md`.

Test in a duplicate/example Figma file or scratch page, never an irreplaceable production design surface.

A skill revision is not ready merely because the agent created visually plausible frames. It must also route correctly, preserve product truth, reuse the design system where available, and hand off deterministic evidence to the motion pipeline.
