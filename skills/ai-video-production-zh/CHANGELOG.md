# CHANGELOG

## 2.0.0 — 2026-08-11

基线：1.0.0。

### Added
- `media.asset.promotion.v1`
- `media.shot.asset-binding.v1`
- `media.asset.usage-receipt.v1`
- Production Asset Preservation
- format upgrade policy: SVG / PNG / WebP / 2.5D / GLB·glTF / Blender / Native UI
- 3D execution boundary
- Voice Casting + human listening gate
- real-audio timing lock
- render preflight fail-closed
- strict Preview / Review Build / Final states
- visual clarity gate independent of nominal resolution
- required asset verification in final MP4

### Changed
- Storyboard is visual direction by default, not automatically a final render source.
- Remotion is compositor/timeline authority, not a low-fidelity hero-asset redraw layer.
- Final requires evidence, not merely a playable MP4.

### Retired
- `1.1.0-chat-draft` — temporary conversation artifact; never canonical.
