# Voice Casting 与真实时长

1. 先生成或复用 2–4 个短试听。
2. 如果试听来自外部/跨仓库 carrier，先锁定 `carrier_repo + carrier_exact_head`，每个候选必须保存 `source_path`、exact-head `source_locator` 和 `expected_sha256`。
3. 外部媒体若未在当前 workflow 中重新抓取并复算身份，必须明确记录 `external_media_identity_refetched_by_this_workflow=false`；不得把 reference-only evidence 冒充 fresh byte verification。
4. 不得为了读取私有跨仓库媒体静默新增 credential；`cross_repo_credential_added` 必须显式记录，默认 false。
5. 人耳比较自然度、断句、情绪、速度、语气、视觉匹配。
6. 只有人工 listening gate 完成后才能选择 `voice_id`；carrier/path/SHA 证明候选身份，不等于 human selection。
7. 生成或选定完整旁白后，再对最终媒体绑定 exact SHA-256，并单独记录 `final_voice_approval`；完整旁白存在不等于 Final Voice PASS。
8. 对最终旁白执行 ffprobe，至少保存 codec、sample rate、channels 和真实 duration；`ffprobe_status` 未证明时不得锁定最终 timeline。
9. `final_audio_evidence.sha256` 必须与 `final_voice_approval.approved_media_sha256` 指向同一媒体；最终审批不能指向 A，而 timeline 用 B。
10. 只有最终音频身份、ffprobe 和人工 final voice approval 都闭合后，才能把 `timing_lock.status` 提升为已证明，并用 `final_audio_evidence.duration_sec` 重锁 shot timeline。
11. timeline 重锁后再 retime captions，并重建 final mix；三者必须分别记录 `timeline_relocked`、`captions_retimed`、`final_mix_rebuilt`，不能从音频存在自动推断。

推荐机器证据最小形态：

```text
carrier_repo
+ carrier_exact_head
+ carrier_exact_head_locked=true
+ candidate.source_path
+ candidate.source_locator=github://<repo>@<exact-head>/<path>
+ candidate.expected_sha256
+ external_media_identity_refetched_by_this_workflow
+ cross_repo_credential_added
+ human_listening_gate
+ final_voice_approval
+ final_audio_evidence.sha256
+ final_audio_evidence.ffprobe_status
+ final_audio_evidence.codec
+ final_audio_evidence.sample_rate_hz
+ final_audio_evidence.channels
+ final_audio_evidence.duration_sec
+ timing_lock.status
+ timing_lock.duration_source=final_audio_evidence.duration_sec
+ timing_lock.timeline_relocked
+ timing_lock.captions_retimed
+ timing_lock.final_mix_rebuilt
```

Fail-closed 原则：

- `source_locator` 必须锁定 immutable exact head，不能只指 branch/latest。
- expected SHA 只证明“期望身份”；只有重新获取 bytes 并复算后，才能声称 fresh media identity verification。
- CI green、carrier mergeability、文件存在或完整旁白存在，都不能自动推断人工 voice selection / final voice approval。
- 最终音频没有 exact SHA + ffprobe，就不能作为 Final timeline 的真实时长 authority。
- `approved_media_sha256` 与 `final_audio_evidence.sha256` 不一致时，timeline/captions/final mix 必须 fail closed。
- 机械占位 TTS 只能用于技术 Preview，不能冒充 Final。
