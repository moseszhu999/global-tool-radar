# ToolRadar v0.1 architecture

## Purpose

ToolRadar discovers overseas AI and productivity tools that may deserve original Chinese testing and coverage on Douyin and Bilibili.

It is not a bulk video-reposting system. YouTube is a discovery signal. Production content must be based on permitted source material, first-party screen recordings, reproducible tests, and attributable evidence.

## Canonical owners

1. **Source Signal** stores immutable captures from YouTube, Product Hunt, GitHub, and official pages.
2. **Tool Entity** links those captures to one canonical tool identity.
3. **Opportunity Assessment** computes versioned, reproducible scores.
4. **Test Evidence** owns observed test steps and artifacts.
5. **Content Project** projects evidence-backed claims into platform-specific scripts.
6. **Publication** records approval, export, submission, and platform state.

No downstream owner may rewrite upstream evidence.

## v0.1 gates

- Unknown metrics remain unknown and are shown through coverage; they are never silently converted to zero.
- A high score cannot override a prohibited rights status.
- Critical security risk blocks automated testing.
- No content may be described as an “actual test” without an evidence-ready test run.
- GitHub presence is an optional signal, not an admission requirement for closed-source tools.

## Initial delivery sequence

1. Contracts and deterministic scoring.
2. Source snapshots and canonical tool identity.
3. YouTube discovery and channel monitoring.
4. Product Hunt and GitHub connectors.
5. Radar UI.
6. Test evidence and script projection.
7. First-party recording, rendering, and export packages.
8. Official publication integrations only after the production loop is proven.
