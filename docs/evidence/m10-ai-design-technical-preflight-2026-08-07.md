# M10 AI Design Technical Preflight — 2026-08-07

## Purpose

This is a machine-assisted technical preflight of the real M9 final MP4. It is **not** a human quality approval and cannot set `humanQualityApproved=true`.

Source final MP4:

- `toolradar-ai-design-final.mp4`
- SHA-256: `56f637621c04436e1de937e4b5a2a0f2daa34996b7e6dfe2ac9099ce0573d549`
- source receipt: `docs/evidence/m9-ai-design-final-render-receipt-2026-08-07.md`

## Media integrity

`ffprobe` on the real MP4:

```text
video codec: h264
width: 1080
height: 1920
pixel format: yuvj420p
frame rate: 30/1
frame count: 2670

audio codec: aac
sample rate: 48000 Hz
channels: 2 / stereo

duration: 89.045333 s
size: 7180374 bytes
bit rate: 645098 bps
```

Integrity result: PASS.

## Black-frame and silence probes

Technical probes used:

```text
blackdetect: d=0.5, pix_th=0.10
silencedetect: noise=-45dB, d=1.0
```

Observed:

- black segments >= 0.5 s: none detected
- audio silence >= 1.0 s below -45 dB: none detected

These checks do not prove subjective visual or audio quality; they only reject obvious technical defects.

## Representative visual spot-check

Representative frames were extracted at approximately 5, 15, 30, 44, 57, 71 and 84 seconds. The generated UI scenes were present across the full timeline and no obvious edge clipping or missing scene content was observed in the sampled frames.

This spot-check remains machine-assisted / operator-assisted and does not substitute for watching the entire video in real time.

## Audio loudness finding

Original final MP4 loudness analysis:

```text
integrated loudness: -22.28 LUFS
true peak: -5.17 dBTP
loudness range: 2.00 LU
mean volume: -24.9 dB
max volume: -5.2 dB
```

The audio is technically valid but conservative in level for a spoken-word social release candidate.

A non-destructive release candidate was therefore produced by copying the original H.264 video stream without re-encoding it and normalizing only the AAC speech track to a bounded spoken-word target.

## M10 release candidate

Local release candidate:

- file: `toolradar-ai-design-release-candidate.mp4`
- video stream: copied unchanged from the real M9 final MP4
- audio: normalized to approximately `-16 LUFS`, true-peak target `-1.5 dBTP`
- SHA-256: `e3e02798dc8b29e356d70a0496aaed624fbd61dbdc96111d1675779a2b01c224`
- duration: `89.100000` s
- size: `5569987` bytes
- video: H.264, 1080x1920
- audio: AAC, 48 kHz, stereo

Measured release-candidate loudness:

```text
integrated loudness: -16.04 LUFS
true peak: -1.31 dBTP
loudness range: 1.90 LU
```

Release-candidate black/silence probes:

- black segments >= 0.5 s: none detected
- audio silence >= 1.0 s below -45 dB: none detected

The release candidate is a technical derivative only; it is not yet a canonical published artifact and has not received human quality approval.

## M10 gate state

```text
realFinalMp4Exists = true
technicalMediaIntegrityPassed = true
representativeFrameSpotCheckPassed = true
technicalAudioLevelImproved = true
humanWatchedFullVideo = false
humanQualityApproved = false
publicationAllowed = false
```

## Remaining human decision

The next non-automatable action is a full human watch of the actual release candidate, including listening to the generated Chinese voice. The reviewer must explicitly approve or reject:

- narration intelligibility and naturalness;
- text readability on a phone-sized viewport;
- scene pacing and transitions;
- factual wording and tone;
- absence of distracting visual defects;
- overall willingness to publish this exact file.

Until that explicit review exists, M10 is not complete and M11 publication remains blocked.
