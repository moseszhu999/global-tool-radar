# M9 owned-media bootstrap receipt — 2026-08-07

This receipt records actual progress after the bounded real-Mac absence scan in `docs/evidence/m9-real-asset-discovery-2026-08-07.md`.

## Source lock

- ToolRadar exact main used by both Mac runs: `34cc708728656305c7366a2be654c786da894a31`
- physical self-hosted runner: `zhudapengdeMacBook-Air-3`
- persistent operator staging root: `/Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design`

No Replit authentication, screen recording, authenticated Remotion request, platform publication, or analytics write was performed by either run.

## Real voiceover candidate generated

TrainingOS carrier run `31144911117`, job `92762246628`, completed successfully on the real Mac.

The run read the repository-owned approved Chinese script and generated one actual WAV candidate with macOS `say`:

- generator: `macOS say`
- voice: `Eddy (中文（中国大陆）)`
- rate: `148` words per minute
- media duration: `82.560688` seconds
- size: `15,851,730` bytes
- SHA-256: `6e1c2f4913bfb743bbe5b92997026431a63593f2212ee853b87980407dec2122`
- persistent path: `/Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-design-voiceover.wav`
- codec: `pcm_s16le`
- sample rate: `48000`
- channels: `2`

The candidate is deliberately **not** treated as verified media:

- `humanApprovalRequired=true`
- `licenseReviewRequired=true`
- `humanVerified=false`
- `finalRenderAllowed=false`
- truth boundary: `unverified_tts_candidate_only`

A 30-day workflow artifact was also produced:

- artifact ID: `8981190483`
- artifact ZIP SHA-256: `d344e9e1698a9bd58229db3172b0a437f4856586515aa72f72d781785782e131`
- artifact size: `8,570,006` bytes

The artifact contains the candidate WAV, approved script, extracted capture plan, candidate receipt, and the available macOS voice list.

## Persistent capture handoff prepared

TrainingOS carrier run `31145576504`, job `92764188740`, completed successfully on the same Mac.

It extracted the existing canonical Replit test card from `apps/web/replit-test.html` and the two capture tasks from `apps/web/data/replit-design-storyboard-package.json`, then persisted these helper files under the staging root:

- `CAPTURE-INSTRUCTIONS.txt`
- `canonical-prompt.txt`
- `replit-prefilled-launch-url.txt`
- `OPEN-REPLIT-DESIGN.command`
- `CHECK-M9-MEDIA.command`
- `capture-staging-receipt.json`

The canonical Chinese prompt is 529 characters and remains owned by the already-merged Replit real-test flow. `OPEN-REPLIT-DESIGN.command` only opens the existing prefilled Replit URL. It does not handle credentials or claim authentication.

`CHECK-M9-MEDIA.command` only reports presence, media metadata, file size and SHA-256. It never approves a file and never authorizes rendering.

## Current real staging state

The checker executed during run `31145576504` and observed:

| Canonical input | Actual staging state |
| --- | --- |
| `replit-design-owned-recording.mp4` | `MISSING` |
| `replit-build-limit-owned-recording.mp4` | `MISSING` |
| `replit-design-voiceover.wav` | `PRESENT_UNVERIFIED` |

The voiceover metadata observed by the staging checker exactly matched the generation receipt:

- SHA-256 `6e1c2f4913bfb743bbe5b92997026431a63593f2212ee853b87980407dec2122`
- duration `82.560688`
- `pcm_s16le`, 48 kHz, stereo

Therefore the truthful status is no longer “0/3 files exist.” It is:

```text
2 recordings: missing
1 voiceover candidate: present but not human-approved
0 / 3 inputs: verified
```

## Remaining screen-recording boundary

The canonical storyboard requires two owned recordings.

### Design-flow recording

Human boundary: `Replit authentication must be completed by a human in a normal browser`.

After authentication, the bounded test steps are:

1. open the existing isolated Replit test project;
2. confirm no personal or production data is visible;
3. submit the canonical Chinese prompt once;
4. record the first complete desktop result;
5. switch to the 390px view and record the mobile result;
6. perform one harmless visual edit and record the change.

The resulting file must be staged as:

`/Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-design-owned-recording.mp4`

### Build-limit recording

Human boundary: use only the existing test project and do not deploy or purchase anything.

Steps:

1. switch from Design to Build;
2. record the visible no-preview state;
3. do not infer code generation or deployment success.

The resulting file must be staged as:

`/Users/zhudapeng/Movies/ToolRadarM9Staging/replit-design/replit-build-limit-owned-recording.mp4`

Both recordings require redaction and explicit human confirmation of the exact final file.

## Next transition after the human boundary

Once the two recordings exist and a human has reviewed all three exact media files, the existing repository automation owns the rest:

```text
CHECK-M9-MEDIA.command
→ owned-media preflight
→ RESUME_PROJECT
→ VERIFY_ASSETS
→ ASSETS_VERIFIED
→ AUTHORIZE_RENDER
→ RENDER_AUTHORIZED
→ authenticated POST /v1/render on the live 3210 Mac Remotion service
→ terminal polling and concrete final-video evidence
→ exact output-path binding
→ SHA-256 + ffprobe final MP4 verification
→ COMPLETE_RENDER
→ M10 human quality review
```

This receipt does not assert that any of those downstream transitions have occurred.
