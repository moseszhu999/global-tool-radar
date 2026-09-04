# Global Tool Radar / Video Operation Agent Context

This file is the canonical repository-level entrypoint for AI agents working in `moseszhu999/global-tool-radar`.

Before material work, read:

- `README.md`
- `docs/architecture/toolradar-v0.1.md`
- `docs/architecture/cross-project-ownership-map.md`
- the relevant Shared Media / Video Operation architecture contract for the scope being changed

## Repository role

Global Tool Radar / Video Operation owns the product workflow for discovering tools/opportunities and turning verified source material into evidence-backed original content operations.

This repository also contains product-neutral Shared Media infrastructure where a contract or runtime is explicitly defined as reusable across products.

The repository does **not** become the owner of TrainingOS education truth, TradeOS trade truth, AI Native Platform Workspace/Case truth, or AIEXE execution-control truth merely because those projects consume media/content capabilities.

## Mandatory startup protocol

Before writing:

1. Fetch current `main` and inspect relevant open PRs / branches / owner scopes.
2. Identify whether the scope belongs to ToolRadar/Video Operation product logic or product-neutral Shared Media infrastructure.
3. Do not create a second render/TTS/timeline/evidence owner if one already exists.
4. If another repository consumes or owns the affected contract, read its `AGENTS.md` / `CLAUDE.md` and current owner scope first.
5. Keep parallel windows independent; do not reset/rebase/cherry-pick/force-push/take over another active owner.
6. Preserve rights, privacy, source provenance, human-review, publication and authority boundaries.
7. Distinguish source/contract/test/render/browser/publication evidence levels; do not turn a render success into a publishing claim.
8. Treat short-lived CI artifacts as retention-bounded evidence, not durable canonical persistence. If a final MP4/evidence artifact matters beyond the workflow retention window, converge it through the already-owned Shared Media canonical persistence path (for example `media.render.v1` terminal receipt/evidence refs) rather than creating a second artifact registry, receipt database, render engine, or job store.
9. Do not merge, deploy, publish externally, mutate production services, or perform paid/external actions without explicit authorization.

## Product vs shared-infrastructure boundary

Video Operation keeps product-specific concerns such as social hooks, platform-native wording, title/caption/CTA, channel packaging, publishing workflow, and analytics/feedback.

Shared Media should keep product-neutral concerns such as voice/TTS interfaces, captions/timeline, render request/result contracts, media inspection, artifact digests and render evidence.

Do not copy TrainingOS or TradeOS business logic into Shared Media.

## Cross-project ownership

Use `docs/architecture/cross-project-ownership-map.md` as the sibling-project index. Cross-project integration should happen through versioned contracts/adapters and exact-head compatibility evidence rather than copied implementations.

## Tool-specific entrypoints

`AGENTS.md` is canonical for repository-level AI operating context. `CLAUDE.md` and other tool-specific files should point here rather than maintain a second strategy copy.
