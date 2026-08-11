# Remotion Handoff

Remotion 是最终时间线总控，不是低保真重画器。

## 输入
- asset_manifest.json
- shot_asset_binding.json
- motion_plan.json
- render_spec.json
- selected narration
- captions
- approved assets / 3D render layers

## Fail Closed
Final 模式：
- required asset 缺失 → FAIL
- asset 未 PROMOTED → FAIL
- required asset 未 BOUND → FAIL
- placeholder → FAIL
- Voice Gate 未通过 → FAIL

## 证据
render log 应记录：
shot_id → asset_ids → frame/time range

最终输出后生成：
- ffprobe
- SHA-256
- contact sheet
- asset usage receipt
