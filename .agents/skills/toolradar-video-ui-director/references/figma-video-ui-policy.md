# Figma Video UI Policy

## Purpose

Use Figma as the structured design/review layer between truthful product UI and the motion/render pipeline.

Figma is not a license to redesign product facts for visual convenience. It is where hierarchy, spacing, typography, components, tokens, and video framing become explicit and reviewable before motion.

## Source-of-truth order

Prefer, in order:
1. current running/canonical product state;
2. product source code and component props;
3. current Figma design-system components, variables, styles, and Code Connect mappings;
4. approved video design frames;
5. generated decorative treatment.

When sources disagree, separate factual truth from visual-system truth. Code/runtime controls what the product currently does; Figma may expose intended component/token structure but must not silently override current product behavior.

## Code-to-canvas rule

When the relevant ToolRadar UI can be rendered in a browser, a live UI capture to Figma is a strong reference for:
- exact spacing and geometry;
- current copy and state;
- visible images/icons;
- side-by-side review of multiple states.

Use the capture as a comparison surface, not automatically as the final design-system-native frame.

For a professional design frame, combine the capture's visual accuracy with native component instances, variables, styles, and Auto Layout where the design system supports them.

## Design-system-first rule

Before creating primitives:
- check Code Connect for the needed component;
- inspect existing screens;
- inspect linked/published libraries;
- inspect variables and styles;
- identify the actual product font.

Repeated buttons, cards, inputs, nav items, status pills, and similar UI should be components when the design system provides them.

Use Variables for available design tokens such as:
- semantic color;
- spacing/gap;
- radius;
- sizing where applicable.

Use Auto Layout to communicate child relationships. Avoid recreating a layout with dozens of unrelated absolute coordinates when it is structurally a row, column, stack, or aligned group.

## Video-frame rules

A video design frame may be more focused than the full application screen.

It may:
- crop or isolate a panel;
- enlarge a key value or label;
- reduce visual weight of irrelevant controls;
- use an external headline/callout;
- stage before/after states;
- create a clear hierarchy for a 9:16 frame.

It may not:
- invent UI labels;
- invent metrics/rankings;
- change CTA meaning;
- claim a feature state not present in the product;
- bake generated text into a factual UI image.

## Readability and staging

For every beat, identify one intended focal point.

Check:
- key text is legible at phone-size viewing;
- important UI is not hidden behind caption-safe areas;
- title, UI, character/cursor, and background do not compete equally;
- hierarchy still works when viewed briefly rather than studied as a design mockup;
- state transitions have visible continuity for the later motion pass.

## Structure validation

Before handoff verify:
- expected component instances are used;
- semantic variables/styles are bound where available;
- Auto Layout is used for structural relationships;
- node/layer names communicate intent;
- product font is correct or fallback is explicitly marked;
- no accidental placeholder/shimmer or partial state remains;
- the frame screenshot visually matches the intended product state.

## Figma execution discipline

When using write-to-canvas MCP tooling:
- load the client’s Figma execution skill first;
- inspect before mutating;
- write incrementally rather than in one huge script;
- return all created/mutated node IDs;
- validate each meaningful step;
- stop and diagnose on an execution error instead of blindly retrying;
- test in duplicate/example files or scratch pages.

## Code Connect policy

Use Code Connect when published Figma components correspond to code components and the mapping is available/appropriate.

The goal is to reduce guessing between design and code, not to create mappings for every decorative element.

If a Figma component and code component do not semantically match, do not force a mapping to make the pipeline look complete.

## Handoff to Remotion

A promoted design frame should provide enough information for Remotion to reproduce the intended visual without guessing:
- file/page/frame identity;
- screenshot/reference;
- target aspect ratio and safe areas;
- canonical text/state ledger;
- component/token/style dependencies;
- export asset IDs where applicable;
- intended focal hierarchy;
- explicit note about which parts are product UI vs external video overlay.

Remotion owns animation timing, sequencing, captions, TTS synchronization, and final exact rendering.

## Relationship to ComfyUI

ComfyUI should normally come after UI structure is correct.

Preferred order:

```text
product truth
→ Figma/deterministic design frame
→ visual validation
→ optional bounded generated polish
→ deterministic UI composite
→ Remotion motion/render
```

If generated treatment reduces UI readability, introduces irrelevant objects, or changes semantic cues, reject it and keep the deterministic/Figma baseline.
