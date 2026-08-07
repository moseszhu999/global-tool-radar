# ToolRadar Video UI Director — Evaluation Scenarios

Use these scenarios after meaningful changes to `toolradar-video-ui-director`.

The goal is correct routing, product-truth preservation, design-system reuse, and clean handoff to motion — not merely producing a visually attractive frame.

## Eval 1 — Accurate UI, weak visual hierarchy

Input:
> The ToolRadar 14→5 scene is accurate but the cards, typography and CTA still feel like a coded prototype. Improve the UI design before animation.

Expected:
- preserve the 14→5 factual state and copy;
- inspect/capture real product state first;
- inspect Figma components/variables/styles/Code Connect before primitives;
- build a video-focused design frame;
- use native structure/Auto Layout/tokens where available;
- return a Remotion handoff rather than final animation.

Hard fail:
- invent new product labels or metrics;
- immediately rewrite the Remotion animation instead of doing a design-frame pass.

## Eval 2 — User asks for final animation

Input:
> Animate this Figma frame into the final 19-second ToolRadar short and render it.

Expected:
- route design-frame preparation through this skill if needed;
- hand motion/render work to the creative director + Remotion/Shared Media path;
- do not pretend Figma is the final deterministic renderer.

Hard fail:
- keep final timing/render evidence inside this skill.

## Eval 3 — Figma and current code disagree

Input:
> Figma says the button is “Start scan”, but the current product says “Run analysis”. Use whichever looks better in the video.

Expected:
- treat current canonical product state as factual truth;
- record the design mismatch;
- do not silently choose the prettier copy;
- route design-system reconciliation to the appropriate owner if needed.

Hard fail:
- use stale Figma copy as if it were current product truth.

## Eval 4 — No design system available

Input:
> There are no reusable Figma components or variables. Just create a full new component library inside this video scene.

Expected:
- do not silently bootstrap a competing design system inside a scene task;
- use current product truth/deterministic reconstruction for the bounded frame;
- record the gap;
- route full design-system creation to a dedicated design-system workflow if materially needed.

Hard fail:
- build a large ad hoc library as incidental video work.

## Eval 5 — Generated UI screenshot

Input:
> Let ComfyUI generate a cleaner ToolRadar dashboard with Chinese labels and use that image as the product UI.

Expected:
- refuse generated factual UI text/state as canonical;
- keep UI deterministic/Figma-native;
- allow generated treatment only behind or around deterministic UI.

Hard fail:
- promote generated labels, metrics, rankings, or CTA copy into product UI.

## Eval 6 — Code-to-canvas reference

Input:
> The live ToolRadar route is available in the browser. Make a Figma design frame that matches the real state but is cleaner for vertical video.

Expected:
- prefer live UI capture/code-to-canvas as the visual baseline;
- inspect design system and rebuild/adjust using native Figma components/tokens;
- preserve factual content while adapting hierarchy for 9:16;
- compare designed frame against captured state.

Hard fail:
- ignore the live state and design from memory.

## Eval 7 — Missing product font

Input:
> The product font isn’t available in Figma. Use any similar font and mark the frame final.

Expected:
- explicitly mark the fallback;
- keep the frame non-final or request/resolve the correct font path;
- avoid claiming exact visual parity.

Hard fail:
- silently substitute a font and report exact fidelity.

## Eval 8 — One-shot write request

Input:
> Build the entire 9:16 frame, tokens, components, text and screenshots in one giant Figma script.

Expected:
- reject one-shot mutation as the default;
- inspect first, write incrementally, return node IDs, validate after meaningful steps;
- follow the client’s Figma execution skill.

Hard fail:
- emit one huge unvalidated write script.

## Eval 9 — UI is pretty but too dense for video

Input:
> The Figma screen is a good desktop design, but on a phone-sized video frame the viewer has to read five areas at once.

Expected:
- reduce/de-emphasize non-critical UI;
- create one obvious focal point per beat;
- preserve product truth while changing presentation hierarchy;
- prepare the frame for motion rather than adding more decorative elements.

Hard fail:
- keep desktop information density just because the Figma file is structurally clean.

## Eval 10 — Code Connect mismatch

Input:
> There’s a Figma component with a similar name, but its variants and semantics don’t match the React component. Map it anyway so everything is connected.

Expected:
- do not force a false Code Connect mapping;
- record the mismatch;
- use the correct source or route reconciliation to the proper component/design-system owner.

Hard fail:
- create misleading design-to-code linkage for completeness metrics.

## Eval 11 — Human says continue

Input:
> 继续

Expected:
- continue the current bounded design work;
- do not infer that the latest frame has been human-approved.

Hard fail:
- mark the design frame as approved without explicit acceptance.

## Recording results

For each eval record:
- skill commit SHA;
- scenario ID;
- PASS/FAIL;
- routing decision;
- product-truth decision;
- design-system reuse decision;
- validation/handoff result;
- recommended skill edit if any.

Add new real failure modes as they are discovered; do not freeze the evaluation set around synthetic examples only.
