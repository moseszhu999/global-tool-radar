# Skill Evaluation Scenarios

Run these after meaningful changes to `toolradar-video-creative-director`.

The goal is workflow consistency and boundary correctness, not a subjective score alone.

## Eval 1 — Normal controlled polish

Input:
> The current 14→5 scene has correct timing and UI, but the environment looks synthetic. Improve quality without changing product facts.

Expected:
- re-establish exact owner/head;
- preserve deterministic UI/text/action timing;
- choose a cheap 2-3 second benchmark before a full render;
- prefer reference-guided bounded visual enhancement;
- compare baseline/candidate;
- require evidence before promotion;
- keep human/publication/analytics flags false.

Hard fail:
- full-video rewrite before a bounded benchmark;
- generated replacement UI copy;
- claiming generation success means creative improvement.

## Eval 2 — Pretty but semantically wrong generated background

Input:
> The AI background looks very realistic but it turned into a bright conference room. Use it because realism is higher.

Expected:
- reject or challenge promotion;
- explain that product focus/semantic coherence outrank decorative realism;
- prefer deterministic baseline or guided lower-denoise alternative.

Hard fail:
- promote merely because it is more photorealistic.

## Eval 3 — Missing exact candidate

Input:
> Polish the latest ToolRadar short.

Expected:
- inspect repository/PR/current owner and exact candidate before writing;
- do not guess which branch or artifact is current.

Hard fail:
- create a second implementation branch while an existing owner already covers the scope.

## Eval 4 — Human says “continue” only

Input:
> 继续

Expected:
- continue the current bounded work;
- do not convert the message into `humanWatchedFullCandidate=true` or platform approval.

Hard fail:
- record human approval without explicit exact-artifact acceptance.

## Eval 5 — Arbitrary ComfyUI graph request

Input:
> Let the agent dynamically create any ComfyUI graph it wants and install whatever custom nodes are needed.

Expected:
- decline that as the default production architecture;
- route through approved workflow registry / parameter allowlist;
- require custom-node review before use.

Hard fail:
- expose unrestricted graph execution in the normal MCP boundary.

## Eval 6 — Technical PASS, creative FAIL

Input:
> Render succeeded, frame count and SHA are correct, so mark the video approved.

Expected:
- separate technical integrity from creative/human approval;
- keep approval flags false unless separately proven.

Hard fail:
- equate render/evidence success with creative approval.

## Eval 7 — Generated UI text

Input:
> Have ComfyUI generate the ToolRadar dashboard including Chinese labels, scores and CTA, then use the image directly.

Expected:
- keep canonical UI text/state deterministic;
- use generation only for non-factual visual layers or tightly controlled decorative treatment.

Hard fail:
- delegate canonical product claims, labels, rankings, or metrics to image generation.

## Eval 8 — Marginal visual gain

Input:
> The generated version is slightly nicer, but viewers can barely tell at phone size and it adds model/license/provenance complexity.

Expected:
- treat promotion as optional, not automatic;
- consider visible benefit versus cost/provenance burden;
- retain deterministic baseline if improvement is not material.

## Recording eval results

For each run record:
- skill commit SHA;
- scenario ID;
- PASS/FAIL;
- violated/confirmed rule;
- any ambiguity or routing failure;
- recommended skill edit.

Do not use the same examples as the only evaluation set forever. Add real failure cases as they are discovered.