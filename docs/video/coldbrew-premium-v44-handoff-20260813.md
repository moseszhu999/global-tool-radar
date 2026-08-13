# Cold Brew Premium — Recovery Handoff (2026-08-13)

Status: **PATCH CHAIN REJECTED — RETURN TO EXACT CAMERA LOCK V3**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## 1. Human-review truth is authoritative

The user reported that the wide black-hole / black-wedge defects became more numerous and increasingly out of control across the V4.4 → V4.5 → V4.6 patch chain.

Therefore:

- V4.4 is rejected as a continuation baseline.
- V4.5 is rejected as a continuation baseline and also had a real technical regression: 946 video frames / 31.533333s video stream while audio remained 32.000s.
- V4.6 is rejected by human review as a continuation baseline.
- **Do not create V4.7 by patching these files.**

## 2. Sole valid baseline

Return to the last version the user explicitly approved:

- conceptual name: `Premium Camera Lock V3`
- expected file: `coldbrew-premium-camera-lock-v3.mp4`
- historical local path: `/mnt/data/coldbrew-premium-camera-lock/coldbrew-premium-camera-lock-v3.mp4`
- human feedback: **“v3不抖了。”**

A prior File Library review page titled `北纬39° Coffee｜Premium Camera Lock V3` exists and explicitly references:

- `coldbrew-premium-camera-lock-v3.mp4`
- `mature-v2-vs-camera-lock-v3.mp4`
- `evidence/contact-sheet.jpg`
- `evidence/camera-lock-manifest.json`
- `evidence/ffprobe.json`

The sibling MP4/evidence files were not durably retained in File Library.

## 3. Important negative evidence

A separate historical page titled `冷萃 V3 重建预览` explicitly says the original MP4 temporary path had already expired and that `coldbrew-v3-rebuilt-silent.mp4` was reconstructed from saved S01/S02 frames and a six-shot contact sheet. It also explicitly says that reconstruction is only a review preview and **must not be treated as the final HD master**.

Therefore `coldbrew-v3-rebuilt-silent.mp4` is permanently excluded as the exact V3 source of truth.

## 4. Exact Mac recovery paths

Historical Mac Remotion configuration records these real directories:

- project: `/Users/zhudapeng/Movies/RemotionActions/mac-remotion-action`
- runtime: `/Users/zhudapeng/Library/Application Support/MacRemotionAction`
- local service: `http://127.0.0.1:3210`

The old temporary Cloudflare URL is no longer a valid recovery path. GitHub does not contain a separate `mac-remotion-action` repository or the V3 binary.

## 5. Recovery search strategy

Do not search only by exact filename because the file may have been renamed by browser/download history.

When local filesystem access is available, recursively scan the two Mac directories above and other likely local folders for MP4 candidates. Rank candidates using:

1. exact filename match;
2. filename tokens: `coldbrew`, `premium`, `camera`, `lock`, `v3`, `mature`;
3. duration approximately `32s`;
4. frame size `1080×1920`;
5. modification time close to the known V3 review window around `2026-08-12 19:26Z`;
6. visual frame fingerprints at approximately `5s`, `15s`, `22s`, `28s`.

For any high-confidence candidate, compute SHA-256 and preserve the exact original bytes before doing any further editing.

## 6. Exact-binary rule

> Do not synthesize, reconstruct, re-edit, or relabel another derivative as V3.

Resume creative work only after the exact original `coldbrew-premium-camera-lock-v3.mp4` binary is recovered or a renamed local file is positively identified by metadata/visual review as that exact delivered binary.

## 7. Stop rules

Until exact V3 recovery:

- no V4.7;
- no more edits to V4.4/V4.5/V4.6;
- no new transition experiments;
- no matte/alpha fixes;
- no hard-cut diagnostic derivatives;
- no claim that the black-hole defect is solved;
- no Final / 100 / 105 labels.

## 8. After exact V3 recovery

Only then:

1. deliver the recovered V3 MP4 to the user first;
2. establish its hash/spec as durable source of truth;
3. store exact binary durably (Drive/Release/LFS/artifact) and verify re-download hash;
4. inspect whether any black-hole defect exists in V3 itself;
5. if clean, add **one** local animation change at a time;
6. every candidate must A/B directly against exact V3;
7. if any black wedge, camera instability, alpha hole, or geometry regression appears, reject immediately and return to exact V3.

## 9. Camera and creative constraints after recovery

Camera stability remains permanent non-regression:

- camera shake = 0
- no whole-frame oscillation
- no random drift
- no fake handheld micro-jitter
- no ambient rotate / warp
- no `sin/cos` camera wobble

Preserve:

- natural local physics;
- droplets / steam / liquid / ice / highlights / refraction carry motion;
- no perfect circular ripple rings;
- no geometric wavefronts;
- no neon portal transitions;
- cinematic world-space explanation, not PPT/card/UI overlays;
- subtitles >= 52px equivalent at 1080×1920;
- world-space explanatory labels >= 48px equivalent;
- restrained causal sound;
- `edge-tts` / `zh-CN-XiaoxiaoNeural` / roughly `+10%` / segmented synthesis / no narration time-stretch.

## 10. Review delivery

Primary review deliverable remains a **direct MP4**.

HTML may exist only as a secondary recovery/status/evidence tool.

## 11. Repository boundaries

Repository: `moseszhu999/global-tool-radar`

- Gold baseline PR `#125` remains dependency background.
- Premium PR `#126` remains separate Draft/open runtime-contract work.
- Handoff Draft PR `#127` remains the recovery/evidence branch.

Do not alter Gold/Premium runtime contracts for this recovery.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
