# ToolRadar Render Preview Runtime v1

## Milestone

This runtime advances the first real production case from storyboard to an auditable video artifact:

```text
storyboard package
→ render preview package
→ generated 9:16 cards
→ Mandarin preview voice
→ visible subtitle copy
→ FFmpeg segments
→ MP4 preview
→ SHA-256 render receipt
```

## What the preview proves

A successful run proves that the repository can automatically:

- cover the full 89-second storyboard timeline;
- produce seven 1080×1920 video segments;
- synthesize a bounded Mandarin preview voice;
- render visible Chinese text with a repository-defined layout;
- concatenate the segments into one MP4;
- produce SRT subtitles and a machine-readable receipt;
- bind the output to its source storyboard and exact workflow run.

## What it does not prove

Three storyboard shots still require independently recorded Replit browser footage. Until those assets are supplied, the preview must show an explicit replacement label.

The preview is therefore not:

- a final video;
- proof that Replit generated production code;
- approved narration quality;
- a platform-ready publication artifact;
- permission to upload to Douyin or Bilibili.

## Runtime dependencies

The GitHub workflow installs a deterministic media runtime on Ubuntu:

- FFmpeg / ffprobe;
- espeak-ng;
- librsvg2-bin;
- Noto CJK fonts.

No platform credential, database secret, source-video download, browser cookie, paid API, or external media file is required.

## Artifact contents

The `toolradar-replit-design-render-preview` Artifact contains:

- `replit-design-preview.mp4`;
- `replit-design-preview.srt`;
- `replit-design-render-preview-package.json`;
- `replit-design-render-receipt.json`.

## Promotion gate

The render receipt is fixed to:

```text
finalRender=false
publicationAllowed=false
humanQualityReviewRequired=true
```

The next milestone is replacing the three placeholder shots with owned recordings and running final video QA.
