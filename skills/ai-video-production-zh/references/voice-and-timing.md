# Voice Casting 与真实时长

1. 先生成或复用 2–4 个短试听。
2. 如果试听来自外部/跨仓库 carrier，先锁定 `carrier_repo + carrier_exact_head`，每个候选必须保存 `source_path`、exact-head `source_locator` 和 `expected_sha256`。
3. 外部媒体若未在当前 workflow 中重新抓取并复算身份，必须明确记录 `external_media_identity_refetched_by_this_workflow=false`；不得把 reference-only evidence 冒充 fresh byte verification。
4. 不得为了读取私有跨仓库媒体静默新增 credential；`cross_repo_credential_added` 必须显式记录，默认 false。
5. 人耳比较自然度、断句、情绪、速度、语气、视觉匹配。
6. 只有人工 listening gate 完成后才能选择 `voice_id`；carrier/path/SHA 证明候选身份，不等于 human selection。
7. 生成或选定完整旁白后，再对最终媒体绑定 exact SHA-256，并单独记录 `final_voice_approval`；完整旁白存在不等于 Final Voice PASS。
8. 读取真实音频时长。
9. 用真实音频时长重锁 shot timeline。
10. 再做 captions 和 final mix。

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
```

Fail-closed 原则：

- `source_locator` 必须锁定 immutable exact head，不能只指 branch/latest。
- expected SHA 只证明“期望身份”；只有重新获取 bytes 并复算后，才能声称 fresh media identity verification。
- CI green、carrier mergeability、文件存在或完整旁白存在，都不能自动推断人工 voice selection / final voice approval。
- 机械占位 TTS 只能用于技术 Preview，不能冒充 Final。
