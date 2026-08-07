# M9 Voiceover Retime v2 — real Mac receipt

This immutable evidence records one bounded, real-Mac M9 progress step after the previously generated Chinese TTS candidate was found to be shorter than the canonical 89-second storyboard timeline.

## Source binding

- ToolRadar exact main: `e7d9670263509e620c8fade22d31662ea39b524f`
- carrier repo: `moseszhu999/training-learning-rails`
- temporary carrier PR: `#542` (closed without merge)
- carrier head: `d842dbae00bccaeb5b8877f3965f95df890d9fca`
- workflow run: `31146303970`
- Mac job: `92766344346`
- real runner: `zhudapengdeMacBook-Air-3`
- artifact ID: `8981601510`
- artifact digest: `sha256:8d79f8cb74f51a7bdd7ee5cb20d7a0bc9283e054f2d99fb60a4b0878ea65f858`

## Before

```text
path: /Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-design-voiceover.wav
durationSeconds: 82.560688
sha256: 6e1c2f4913bfb743bbe5b92997026431a63593f2212ee853b87980407dec2122
humanVerified: false
finalRenderAllowed: false
```

The original candidate was preserved at:

```text
/Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-design-voiceover-v1-82.56s.wav
```

## Real transformation

The existing unverified voice candidate was retimed with `ffmpeg` using the deterministic tempo ratio:

```text
atempoRatio = 82.560688 / 89.0
             = 0.927648179775
```

The result was normalized to the exact canonical storyboard duration without adding new spoken content.

## After

```text
canonicalPath: /Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-design-voiceover.wav
targetDurationSeconds: 89.0
candidateDurationSeconds: 89.0
bytes: 17088078
sha256: c97e2917300569b8cfa99b8c9590ea9f46d8ad974aea7005086539e33e24308a
humanVerified: false
licenseReviewRequired: true
finalRenderAllowed: false
truthBoundary: duration_aligned_unverified_tts_candidate_only
```

## Truth boundary

This is real media processing on the persistent operator Mac, but it does **not** claim:

- human listening approval;
- license suitability approval;
- either required Replit owned screen recording exists;
- all three M9 assets are verified;
- a Remotion render was submitted;
- a final MP4 exists;
- M10 quality approval;
- M11 publication;
- M12 analytics observations.

The remaining earliest M9 blocker is still the two Replit owned screen recordings, whose canonical storyboard explicitly requires human authentication in a normal browser and explicit redaction/review. The retimed voiceover candidate also still requires human listening and license review before the existing owned-media preflight may treat it as verified.
