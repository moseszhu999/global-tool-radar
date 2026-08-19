# 严格质量门

## Visual
- 1080×1920 只是容器尺寸，不代表画质。
- 摄影/复杂插画必须有独立高分辨率源。
- 禁止从大故事板裁小图充当 Final。
- 关键字体/图形优先原生矢量或 Native UI。
- 代表帧需要 100% / 200% 检查。

## Motion
- 不允许死空档。
- 不允许便宜模板替代批准的视觉。
- 运动必须服务叙事和视觉层级。

## Voice
- 完整音频生成成功 ≠ Voice Gate PASS。
- 必须有可试听候选和人耳选择。

## Technical
- ffprobe
- aspect ratio
- fps
- codec
- duration
- audio track
- no black frames / clipping

## Final Render Evidence
Final / FINAL_CANDIDATE 不能只记录“render success”。QC 必须引用既有 Shared Media `media.render.v1` render result / render evidence，而不是复制第二套 render engine，并绑定同一个最终 MP4 的：
- exact artifact path + SHA-256
- ffprobe 结果、真实宽高 / fps / video codec / audio codec / duration
- artifact manifest ref
- input manifest digest
- render-log SHA-256
- terminal render status

`artifact_identity_status`、`ffprobe_status` 或 `terminal_status` 任一未证明时，`artifact_record` / `technical` gate 不得 PASS，`final_ready` 必须保持 false。CI green、preview success、review binary SHA 都不能代替 canonical terminal render evidence。

## Final Human Review Evidence
Final / FINAL_CANDIDATE 还必须复用仓库现有的人审链，而不是另造 review runtime：

`toolradar.video-quality-report.v1` → `toolradar.final-human-review-receipt.v1`

机器证据必须至少绑定：
- quality report ref + quality report 中的 exact media SHA-256；
- `automatedGate=PASS`；
- final human-review receipt ref + receipt 中的 exact media SHA-256；
- quality report、human-review receipt 与 `final_render_evidence.artifact_sha256` 三者必须指向同一个最终 MP4；
- human review decision 必须为 `APPROVED_FOR_RELEASE_HANDOFF`，且 `release_handoff_allowed=true`；
- human-review receipt 的 `publication_allowed` 必须保持 false；正式发布授权属于后续独立边界。

`FINAL_HUMAN_REVIEW_AUTOMATED_GATE_REQUIRED` 是显式 fail-closed blocker：只要 `automated_gate_status` 未证明为 PASS，正式 human-review gate 不得被接受为通过，即使 quality report、媒体 SHA 或人工 decision 字段已经存在。

任一 media identity 未证明、automated gate 未 PASS、human review 未批准或 receipt 仍有 blocker 时，`human_review` gate 不得 PASS，`final_ready` 必须保持 false。人工口头认可、PR comment、CI green 或 review-binary SHA 都不能替代正式 human-review receipt。

## Evidence
- asset provenance
- SHA
- contact sheet
- usage receipt
- `media.render.v1` result/evidence refs
- final artifact manifest + input manifest digest + render-log SHA
- `toolradar.video-quality-report.v1` exact-media report
- `toolradar.final-human-review-receipt.v1` exact-media receipt

所有 Gate PASS 才是 FINAL。
