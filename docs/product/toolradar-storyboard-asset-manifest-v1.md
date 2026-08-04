# ToolRadar Storyboard and Asset Manifest v1

## Business milestone

```text
complete original script
→ contiguous shot timeline
→ on-screen copy and visual instructions
→ owned/generated asset manifest
→ isolated human capture tasks
```

The first Replit Design case produces a continuous 89-second timeline with seven shots, eleven asset records, and two explicit human browser-capture tasks.

## Ownership boundary

Every required asset must be one of:

- `owned_generated` — title cards, evidence cards, callouts, subtitles, and TTS voiceover generated from repository-owned data and scripts;
- `owned_recording` — screen recordings made during the independent test;
- `licensed_or_original_only` — optional music with a valid license or original authorship.

Official YouTube footage is not an allowed asset type. Source-video download, copying, watermark removal, or reuse remains disabled.

## Human boundary

Replit authentication and browser recording must be completed by a human in a normal browser. The capture tasks require an isolated test account, no production data, no payment, no deployment, and mandatory redaction of any sensitive UI.

## Commands

```bash
npm run production:storyboard:replit
npm run check
npm test
```

## Next milestone

`OWNED_ASSET_CAPTURE_AND_RENDER`

Rendering remains blocked until the required screen recordings exist and the storyboard is reviewed.
