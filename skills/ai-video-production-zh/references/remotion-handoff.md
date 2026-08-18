# Remotion Handoff

Remotion 是最终时间线总控，不是低保真重画器。

## 输入
- asset_manifest.json
- shot_asset_binding.json
- motion_plan.json
- render_spec.json
- voice_casting.json 中已经人工批准且完成媒体身份校验的 final_audio_evidence
- 与 final_audio_evidence.duration_sec 绑定并已完成 timeline_relocked / captions_retimed / final_mix_rebuilt 的 timing_lock
- captions
- approved assets / 3D render layers

## Final Voice / Timing 绑定
Final render 不能只接受一个 narration 文件路径。必须同时证明：
- final_voice_approval.status 已由真实人工选择闭合，不得从候选媒体存在性自动推断
- render_spec.audio.final_audio_evidence_ref 指向 voice_casting.json#final_audio_evidence
- render_spec.audio.timing_lock_ref 指向 voice_casting.json#timing_lock
- final_audio_evidence.sha256 是最终旁白媒体的 exact identity
- final_audio_evidence.ffprobe_status 已证明，duration_sec 来自真实媒体而非字符数估算
- timing_lock.duration_source = final_audio_evidence.duration_sec
- timing_lock.timeline_relocked = true
- timing_lock.captions_retimed = true
- timing_lock.final_mix_rebuilt = true
- render 使用的 narration 必须与上述 final audio SHA 属于同一媒体

若任一项未证明，Final / FINAL_CANDIDATE render preflight 必须 fail closed；不得以试听候选、旧旁白、CI green 或 render success 代替这些证据。

## Fail Closed
Final 模式：
- required asset 缺失 → FAIL
- asset 未 PROMOTED → FAIL
- required asset 未 BOUND → FAIL
- placeholder → FAIL
- Voice Gate 未通过 → FAIL
- final voice approval 未证明 → FAIL
- final audio identity / ffprobe 未证明 → FAIL
- timeline 未按最终音频真实时长重锁 → FAIL
- captions 未按最终音频重定时 → FAIL
- final mix 未基于最终音频重建 → FAIL

## 证据
render log 应记录：
shot_id → asset_ids → frame/time range

音频相关 render evidence 还应记录：
- final narration SHA-256
- final narration ffprobe / duration
- voice_casting contract ref
- timing_lock ref / status
- captions retime status
- final mix rebuild status

最终输出后生成：
- ffprobe
- SHA-256
- contact sheet
- asset usage receipt
