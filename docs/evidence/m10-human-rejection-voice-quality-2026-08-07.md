# M10 human rejection — voice continuity / quality

Date: 2026-08-07

## Decision

The human review gate **rejected** the current AI-design release candidate because the narration is audibly intermittent, incoherent, and substantially below publishable quality.

Human feedback received in the active review:

> 语音质量太差了，时断时续的，就是根本就不连贯，很差很差，质量太差。

This is a blocking M10 rejection. The candidate must not be advanced to M11.

## Exact rejected media lineage

Review candidate presented for M10:

```text
file: toolradar-ai-design-release-candidate.mp4
sha256: e3e02798dc8b29e356d70a0496aaed624fbd61dbdc96111d1675779a2b01c224
```

That candidate copied the H.264 video stream from the real M9 render and changed only audio loudness. Its narration therefore preserves the continuity/cadence defects of the source render:

```text
source final mp4 sha256: 56f637621c04436e1de937e4b5a2a0f2daa34996b7e6dfe2ac9099ce0573d549
source voiceover sha256: 77cbc55b00d1cb402c266d0eb49a63d45ed7361a1900800026cbf40df3e94c9d
```

## Reproduced voice-generation facts

The real Mac render job `92774172385` in workflow run `31148881467` recorded:

```text
selected_zh_CN_voice=Eddy (中文（中国大陆）)
raw_duration=103.774558
tempo_ratio=1.166006269663
aligned_duration=89.000000
```

The workflow generated all seven narration shots as one monolithic `say` invocation and then applied a global ffmpeg `atempo=1.166006269663` transform to force the 103.77-second source into the fixed 89-second timeline.

The same Mac also reported a dedicated Mandarin voice `Tingting` as available, but the previous workflow chose the first `zh_CN` entry instead of selecting a voice by an explicit quality contract.

These facts do not by themselves prove every audible defect's DSP cause, but they establish that the rejected candidate used an arbitrary voice choice plus global time compression. That pipeline is now retired for the replacement candidate.

## Replacement requirements

The next voice candidate must fail closed unless all of these are true:

1. each of the seven storyboard narration shots is synthesized separately;
2. `Tingting` is selected explicitly when available;
3. no `atempo`, global time stretching, or fixed-89-second compression is applied;
4. only short deliberate inter-shot pauses are inserted;
5. loudness normalization may be applied only after natural narration timing is complete;
6. per-shot and total durations are measured and preserved in a machine-readable receipt;
7. the video timeline is later adapted to the accepted natural narration duration instead of forcing speech into the old timeline;
8. the replacement audio is human-listened and explicitly accepted before a new full video render is treated as an M10 candidate.

## Truth boundary

```text
realFinalMp4Exists = true
technicalMediaIntegrityPassed = true
humanVoiceReviewOccurred = true
humanWatchedFullVideo = not_claimed
humanQualityDecision = REJECTED
humanQualityApproved = false
rejectedCandidateSha256 = e3e02798dc8b29e356d70a0496aaed624fbd61dbdc96111d1675779a2b01c224
publicationAllowed = false
publicationPerformed = false
analyticsObserved = false
```

No platform login, upload, publish action, platform identifier, public URL, analytics observation, or publication result is claimed by this receipt.
