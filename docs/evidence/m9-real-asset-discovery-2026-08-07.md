# M9 real-asset discovery receipt — 2026-08-07

## Scope

This receipt records a read-only real-Mac search for the three canonical M9 owned-media inputs against exact ToolRadar main:

```text
22150d2f10fee9433b8ef723f75f92c47ee51db0
```

No media was created, copied, uploaded, altered, human-verified or rendered by this probe.

## Execution evidence

Carrier repository:

```text
moseszhu999/training-learning-rails
```

Temporary carrier PR:

```text
#539 ci(trainingos): one-shot ToolRadar M9 real asset discovery
```

The carrier PR was closed without merge after the receipt was captured.

GitHub Actions:

```text
run: 31143382489
job: 92757760311
workflow: ToolRadar M9 Real Asset Discovery v1
conclusion: SUCCESS
```

Physical runner:

```text
zhudapengdeMacBook-Air-3
runner version: 2.336.0
```

The run checked out exact ToolRadar head `22150d2f10fee9433b8ef723f75f92c47ee51db0` before discovery. `ffprobe` was available at `/opt/homebrew/bin/ffprobe`.

## Bounded search roots

Only the exact target filenames were searched under:

```text
exact ToolRadar checkout
$HOME/Movies
$HOME/Downloads
$HOME/Desktop
$HOME/Documents
$HOME/Projects
/Users/Shared
```

No `.env`, token, credential or unrelated file contents were read.

## Result

### design recording

Expected repository path:

```text
apps/remotion-video/public/assets/replit-design-owned-recording.mp4
```

Observed:

```text
candidate_count=0
presence=MISSING
```

### build-limit recording

Expected repository path:

```text
apps/remotion-video/public/assets/replit-build-limit-owned-recording.mp4
```

Observed:

```text
candidate_count=0
presence=MISSING
```

### voiceover

Expected repository path:

```text
apps/remotion-video/public/assets/replit-design-voiceover.wav
```

Observed:

```text
candidate_count=0
presence=MISSING
```

## Truth boundary

The real-Mac result is therefore:

```text
required_assets_found = 0 / 3
human_verification_claimed = false
render_submission_performed = false
platform_action_performed = false
M9_real_render_allowed = false
```

This receipt does not prove the files do not exist on every possible device or storage location. It proves they were absent from the exact ToolRadar checkout and the bounded operator Mac search roots at the time of run `31143382489`.

## Next business action

M9 cannot advance to authenticated `POST /v1/render` until all three real files are supplied and explicitly human-verified. Once present, the existing chain must be used without bypass:

```text
owned-media preflight
→ ASSETS_VERIFIED
→ final render authorization
→ authenticated Mac Remotion submission
→ runner completion with concrete final-video evidence
→ exact expected-output-path binding
→ SHA-256 + ffprobe final-video verification
→ M10 human quality review
```
