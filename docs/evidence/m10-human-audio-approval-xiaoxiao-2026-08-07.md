# M10 human audio approval — Xiaoxiao natural narration

Date: 2026-08-07

## Human decision

The human reviewer listened to both real neural-TTS audition tracks and stated that both were acceptable, then explicitly agreed to use the assistant-selected **A / Xiaoxiao** candidate for the next video render.

This receipt approves the exact audition artifact below as the narration source for the replacement M10 candidate. It does **not** approve any full video that has not yet been rerendered and watched.

## Approved exact audio lineage

```text
engine: edge-tts
voice: zh-CN-XiaoxiaoNeural
rate: -2%
source ToolRadar head: 1a32260cb6bd84542d3a3f306e915e0ab003c36d
audition workflow run: 31151796004
artifact id: 8983585168
artifact digest: sha256:597596d9668aec02c1ab399c5b4b1605710d651258ef0eb3c91d83e375ea1119
M4A sha256: a2d0e3084457caf5ee3e807d84f6efae0fa071b60bf5a234819788a0d50fc423
WAV sha256: 816d9ce2f2ea8090f1eb1940f30b7ad19e9d53ae388fbaa0346b063f2c45ac9e
natural duration: 102.624 seconds
```

Per-shot natural narration durations:

```text
01  14.040 s
02  15.312 s
03  14.952 s
04  13.584 s
05  12.144 s
06  16.824 s
07  15.168 s
```

The approved audition was synthesized as seven independent shots with 0.10-second deliberate inter-shot padding. No `atempo`, global time stretch, or fixed-89-second target was applied.

## Replacement render contract

The replacement composition must:

1. stage the exact approved Xiaoxiao WAV identified above;
2. use a 102.624-second natural audio timeline, frame-aligned to 3079 frames at 30 fps;
3. align the seven visual scene windows to the approved per-shot narration durations rather than compressing the narration;
4. use a distinct output filename so the rejected candidate cannot be confused with the replacement;
5. run media-integrity checks after render;
6. remain blocked from M11 until the human reviewer watches the new full video and explicitly approves it.

## Truth boundary

```text
humanAudioReviewOccurred = true
humanAudioApproved = true
selectedVoice = zh-CN-XiaoxiaoNeural
selectedAudioSha256 = a2d0e3084457caf5ee3e807d84f6efae0fa071b60bf5a234819788a0d50fc423
replacementFullVideoRendered = false
replacementFullVideoWatched = false
humanQualityApproved = false
publicationAllowed = false
publicationPerformed = false
analyticsObserved = false
```

No platform login, upload, publish action, public URL, platform identifier, or analytics observation is claimed by this receipt.
