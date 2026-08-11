---
name: ai-video-production-zh
description: 将主题、来源摘要、文章、故事创意或已有脚本转换为可生产、可审计的中文 AI 视频包：创意简报、故事/论证弧、脚本、角色与风格锁定、分镜、正式视觉资产晋级、Asset Promotion、2D/2.5D/3D 资产绑定、Voice Casting、Motion Plan、Remotion 渲染交接、Final Gate 与证据回执。适用于 Video Operation、抖音、YouTube Shorts、Bilibili 等中文 AI 视频生产。
version: 2.0.0
language: zh-CN
status: canonical-candidate
supersedes: 1.0.0
retired_versions:
  - 1.1.0-chat-draft
---

# AI 视频生产 Skill（中文版）v2.0.0

## 0. 版本定位

v1.0.0 是 2026-08-11 上午安装的真实基线。v2.0.0 是在真实端到端生产、V2/V3.1 严格审片和资产保真复盘后形成的重大升级。

v2.0.0 的核心新增合同：

1. 概念图不是最终生产资产。
2. 被批准视觉必须经过 Asset Promotion，并绑定具体 Shot。
3. required asset 必须能在最终 MP4 中被证明真实使用。
4. 视觉格式按用途选择 SVG / PNG / WebP / 分层 2.5D / GLB·glTF / Blender Scene / Native UI，禁止所有素材机械转 SVG。
5. 高质量视觉资产本体就是 authority；Remotion 不得把 hero asset 低保真重画。
6. Voice Casting 必须先试听并通过人耳 Gate；机械占位 TTS 不能冒充 Final。
7. 1080×1920 文件尺寸不等于视觉清晰。
8. Preview / Review Build / Final 严格分级。

## 1. Canonical 生产链

Source / Idea
→ Creative Brief
→ Story / Argument Arc
→ Script
→ Character Bible（需要时）
→ Style Bible
→ Shot List
→ Visual Development
→ Candidate Generation
→ Art Direction / Selection
→ Asset Promotion
→ Production Format Upgrade
→ Shot Binding
→ Voice Casting
→ Real Audio Timing Lock
→ Motion Plan
→ Render Preflight
→ Remotion / 3D Runtime
→ Preview QC
→ Final Render
→ Asset Usage Verification
→ Final QC
→ Evidence Receipt

## 2. 输入合同

尽量收集或合理推断：

- source
- goal
- audience
- platform
- target_duration_sec
- language
- aspect_ratio
- visual_style
- character_mode
- voice_style
- cta
- constraints

少量非关键字段缺失时采用合理默认值，不阻塞生产。

## 3. Prompt 结构

主要模型调用使用：

Role + Task + Output Format + Constraints + Gate

不要使用无法验收的模糊指令。

## 4. Creative Brief

输出 `creative_brief.json`。

必须明确观众、目标、平台、时长、画幅、视觉语言、CTA 和约束。

## 5. 先故事，再脚本

剧情类：
设定 → 目标 → 阻碍 → 转折 → 解决 → Payoff。

解释类：
Hook → 问题 → 机制 → 示例/证据 → 结论 → CTA。

故事/论证弧未通过前，不进入正式脚本。

## 6. 真实音频是最终时间 authority

中文字数只用于早期估算。

正式生产：
1. 锁旁白。
2. 做 Voice Casting。
3. 选择正式 voice。
4. 生成完整旁白。
5. 读取真实音频时长。
6. 重分配 shot。
7. 再锁 timeline。

## 7. Character Bible

重复角色输出 `character_bible.json`。

身份字段跨镜稳定；角色身份与场景动作分开；优先参考图和局部修复；至少三个差异明显场景仍可识别同一角色。

需要大幅转身、绕拍、骨骼动作、长期复用的角色/产品，可晋级 GLB / glTF / Blender Scene。

3D 是视觉执行器，不取代 Remotion 总时间线。

## 8. Style Bible

输出 `style_bible.json`，锁定 medium、render language、lighting、camera language、lens feel、texture、color logic、environment rules、forbidden drift、references。

## 9. Shot List

输出 `shotlist.json`。

每镜至少包含：
shot_id、purpose、duration、narration、subject、action、location、composition、camera、lighting、emotion、character_ids、style_id、continuity、asset_requirements、transition。

每镜必须有叙事或解释用途。

## 10. Visual Development / Storyboard

Storyboard 默认是视觉方向和镜头决策工具，不自动等于 Final render source。

三种模式：
- Direct
- Description Optimization（默认）
- Director Visualization（重点镜头）

Prompt 分离 identity、action、environment、composition、camera、lighting、style、continuity、negative constraints。

## 11. Candidate Generation / Art Direction

重点镜头不要生成一张就进成片。

流程：
多个候选 → 视觉选片 → SELECTED → 局部修复 → 质量 Gate → Promotion。

检查主体、身份、构图、材质、光影、边缘、纹理、几何、手/道具、文字，以及放大后是否成立。

禁止拿大故事板裁小图充当 Final 摄影源。

## 12. Production Asset Preservation

高质量视觉资产本体就是 authority。

如果 hero asset 已经很好：
- 不要只作参考。
- 不要在 Remotion 里用廉价 div/CSS/简单几何重新画。
- 晋升为 durable source asset。
- 记录 provenance / SHA。
- Remotion 主要做位置、缩放、裁切、遮罩、相机、时间、字幕、音频、合成和渲染。

Native UI、字幕、数字、参数化信息图可以 deterministic 重建，但不应替代高质量 hero visual。

## 13. Asset Promotion Contract

正式生命周期：

CONCEPT → SELECTED → PROMOTED → BOUND → RENDERED → VERIFIED

禁止：
- SELECTED 直接 Final Render
- PROMOTED 但未 BOUND 进入 Final
- required asset 缺失时静默 placeholder
- 无使用证据却标 VERIFIED

`asset_manifest.json` 使用 `media.asset.promotion.v1`。

Promoted asset 至少包含 asset_id、source、sha256、promotion、production class/format、components、animation_profile、must_appear_in_render。

## 14. Production Format Upgrade

禁止所有 PNG 机械强转 SVG。

- Logo / icon / UI 几何 / 线稿 → SVG
- 照片 / 复杂 AI 插画 / 电影背景 → PNG / WebP
- 主体前景背景可拆 → 分层 PNG/WebP + Depth（2.5D）
- 需要绕拍 / 骨骼 / 空间运动 → GLB / glTF / Blender Scene
- 标题 / 字幕 / 数字 / 标签 → React / HTML / CSS Native UI

格式服务于视觉保真和动画需求。

## 15. Shot Binding

输出 `shot_asset_binding.json`，合同 `media.shot.asset-binding.v1`。

每个 required visual 必须绑定：
shot_id、frame/time range、asset_id、role、layer、required、animation、camera/crop、fallback policy。

Final 默认：
- fail_if_required_asset_missing = true
- fail_if_asset_unpromoted = true
- allow_placeholder_in_final = false

## 16. Voice Casting Gate

输出 `voice_casting.json`。

1. 生成 2–4 个短试听。
2. 提供可试听文件。
3. 人耳比较自然度、断句、情绪、速度、语气、视觉匹配。
4. 选择正式 voice_id。
5. 生成完整旁白。
6. 按真实时长锁 timeline。

明显机械占位音只能用于 PREVIEW_ONLY。

完整音频生成成功也不等于 Voice Gate PASS。

## 17. Motion Plan

输出 `motion_plan.json`。

每镜包含 source asset IDs、duration、entrance/exit、camera、parallax、character/object motion、text overlays、captions、sound cues、transition、safe area。

- 信息型/品牌型：优先 Remotion 确定性动画。
- 人物自然表演：可选择 I2V 或 3D。
- 2.5D：分层透明图 + depth + parallax。
- 3D：Blender/glTF runtime 输出透明序列、视频层或约定 artifact，再交给 Remotion。

## 18. Render Preflight（Fail Closed）

Final 前验证：

- 所有 SELECTED 已 PROMOTED
- 所有 required PROMOTED 已 BOUND
- required asset 文件存在
- provenance / SHA 可读
- 不使用低清 proxy
- 摄影/插画视觉 Gate 通过
- Voice Gate 通过
- timeline 按真实音频锁定
- captions 就绪
- Final placeholder 禁止

任何失败：render_authorized=false，状态保持 REVIEW_BUILD。

## 19. Remotion Handoff

输出 `render_spec.json`。

Remotion 是最终时间线与合成总控：
2D + 2.5D + 3D render layers + captions + native UI + audio + transitions → MP4。

要求：
- 通过 asset_id 消费 promoted asset。
- 不静默换 placeholder。
- 不把批准的 hero asset 低保真重画。
- 可使用 staticFile / Img / video plate / transparent sequence / 3D render layer 等直接 ingestion。
- render log 记录 shot → asset IDs → frame/time range。

## 20. Visual Quality Gate

分辨率 ≠ 清晰度。

摄影/复杂插画：
- 使用独立高分辨率源。
- 代表帧 100% / 200% 检查。
- 禁止大板裁小图作 Final。

字体/图形/UI：
- 原生 React / SVG / vector 优先。
- 放大仍清晰。
- 关键可变文字不烘焙进图。

角色/3D：
- identity
- silhouette
- material
- geometry/rig
- edge/lighting
- camera/action continuity

## 21. 状态分级

PREVIEW_ONLY：
技术路径验证、占位音、未完成视觉/motion。

REVIEW_BUILD：
正式资产已进入生产，但仍有 HOLD Gate。

FINAL_CANDIDATE：
内容 Gate 已过，等待完整技术/证据闭环。

FINAL：
所有 Gate PASS + Evidence PASS。

## 22. Final QC

`qc_report.json` 至少覆盖：

- Story Gate
- Continuity Gate
- Visual Quality Gate
- Asset Promotion Gate
- Asset Binding Gate
- Voice Gate
- Caption Sync Gate
- Motion Gate
- Technical Gate
- Evidence Gate

Technical Gate 包括 aspect ratio、fps、duration、codec、audio track、black frames、clipping。

## 23. Asset Usage Receipt

输出 `asset_usage_receipt.json`，合同 `media.asset.usage-receipt.v1`。

Final 必须能回答：

“这个批准素材在哪个镜头、哪个时间段、通过哪个 asset_id 进入最终 MP4？”

usage receipt 至少包含 render_id、output SHA、asset_id、shot_id、visible_frames/time range、VERIFIED status，以及 required/promotion/binding checks。

## 24. Evidence Pack

Final 建议保留：

- creative_brief.json
- script.md
- character_bible.json（如适用）
- style_bible.json
- shotlist.json
- asset_manifest.json
- shot_asset_binding.json
- voice_casting.json
- motion_plan.json
- render_spec.json
- qc_report.json
- asset_usage_receipt.json
- evidence/asset-provenance.json
- evidence/ffprobe.json
- evidence/SHA256SUMS.txt
- evidence/contact-sheet.png

## 25. Final 判定

“能生成 MP4”永远不等于“Final 完成”。

只有所有 Gate PASS 且 Evidence PASS：
final_ready=true，status=FINAL。

否则：
final_ready=false，状态只能是 PREVIEW_ONLY / REVIEW_BUILD / FINAL_CANDIDATE。

## 26. 架构边界

Video Operation：
选题、中文原创/改写脚本、Story、Hook、CTA、Storyboard、SELECTED 创意决策。

Shared Media：
Asset Promotion、Shot Binding、TTS、Captions、Timeline、Render Contract、Artifact Inspect、Usage Receipt、Evidence、通用 QC。

Blender / 3D Runtime：
Shared Media 的视觉执行器，不是第二套视频系统。

Remotion：
最终时间线总控和合成器。

## 27. 轻量模式

单镜 meme、talking-head 字幕、屏幕录制教程、简单产品卡、已有素材混剪可跳过不必要的 Character Bible / Storyboard。

但不能跳过：
- required asset binding
- no silent placeholder
- Voice Gate（有旁白时）
- Final QC
- Evidence Gate
- Preview ≠ Final
