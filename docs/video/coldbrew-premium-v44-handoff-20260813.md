# Cold Brew Premium — Recovery Handoff (2026-08-13)

Status: **PATCH CHAIN REJECTED — RETURN TO EXACT CAMERA LOCK V3**  
Merge: **NO**  
Deploy: **NO**  
Publication: **NO**

## 1. Human-review truth is authoritative

The user has now reported that the wide black-hole / black-wedge defects became **more numerous and increasingly out of control** across the V4.4 → V4.5 → V4.6 patch chain.

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

Camera stability remains permanent non-regression:

- camera shake = 0
- no whole-frame oscillation
- no random drift
- no fake handheld micro-jitter
- no ambient rotate / warp
- no `sin/cos` camera wobble

## 3. Exact-binary recovery rule

A prior File Library review page titled `北纬39° Coffee｜Premium Camera Lock V3` has been recovered. It explicitly references:

- `coldbrew-premium-camera-lock-v3.mp4`
- `mature-v2-vs-camera-lock-v3.mp4`

However, in the current runtime the exact V3 MP4 binary itself has **not yet been recovered** from a durable binary store.

This means:

> Do not synthesize, reconstruct, re-edit, or relabel another derivative as V3.

Resume creative work only after the exact original `coldbrew-premium-camera-lock-v3.mp4` binary is recovered and directly reviewable as MP4.

## 4. Stop rules

Until exact V3 recovery:

- no V4.7;
- no more edits to V4.4/V4.5/V4.6;
- no new transition experiments;
- no matte/alpha fixes;
- no hard-cut diagnostic derivatives;
- no claim that the black-hole defect is solved;
- no Final / 100 / 105 labels.

## 5. After exact V3 recovery

Only then:

1. deliver the exact V3 MP4 to the user first;
2. establish its hash/spec as durable source of truth;
3. inspect whether any black-hole defect exists in V3 itself;
4. if clean, add **one** local animation change at a time;
5. every candidate must A/B directly against exact V3;
6. if any black wedge, camera instability, alpha hole, or geometry regression appears, reject immediately and return to exact V3.

## 6. Creative direction remains unchanged

After recovery, preserve the already-approved direction:

- stable camera;
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

## 7. Review delivery

Primary review deliverable remains a **direct MP4**.

HTML may exist only as a secondary status/evidence page.

## 8. Repository boundaries

Repository: `moseszhu999/global-tool-radar`

- Gold baseline PR `#125` remains dependency background.
- Premium PR `#126` remains separate Draft/open runtime-contract work.
- Handoff Draft PR `#127` remains the recovery/evidence branch.

Do not alter Gold/Premium runtime contracts for this recovery.

Merge = **NO**  
Deploy = **NO**  
Publication = **NO**
