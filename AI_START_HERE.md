# AI_START_HERE — 下一次会话第一读

> 这是 `global-tool-radar` 的跨会话执行记忆入口。新的 AI / 窗口继续项目之前，**先读本文件，再重新读取 GitHub 最新 `main`、开放 PR、changed files、CI 和 artifact 状态**。这里的 SHA/PR 只记录最近交接点，不得替代实时核验。

## 1. 每轮固定启动顺序

1. 先读本文件。
2. 刷新 `main` 最新 SHA、开放 PR、活跃分支、changed files / ownership / mergeability，避免与并发窗口冲突。
3. 当前业务顺序：M9 真成片 → M10 成片质量/业务适配真人审核 → M11 抖音/Bilibili 真发布 → M12 真数据反馈。
4. 每轮必须产生可验证实际进展：代码、测试、workflow、receipt、commit、PR、merge、artifact 或真实媒体之一；不能只写计划。
5. 人工登录、验证码、账号授权、人工审核、付款等边界，只自动化到边界前，绝不伪造已完成。

## 2. 防跑偏硬规则

默认判定为跑偏，除非是解除当前 M9→M12 阻塞的直接必要条件：

- 新增与当前成片闭环无关的基础设施、抽象层、runner/orchestration/receipt 框架；
- 已有可用链路时继续造第二套同类链路；
- 为“以后可能有用”而新增与当前成片、质检、发布、数据回收无直接关系的代码；
- 把测试、mock、preview、receipt、技术 render 当成真人批准或真实发布；
- 在 M10 未通过时提前做 M11/M12 的形式完成；
- 把“技术可播 / 教学清楚”的课件式视频误当成社交平台原生内容。

发现跑偏时：记录下来 → 停止扩大 → 回到最早未完成业务步骤。

## 3. 永久真实性边界

绝不伪造或暗示：

- 真实录屏 / 真人素材 / 真实旁白文件；
- 最终 MP4（除非真实文件 + hash / ffprobe 等证据存在）；
- 真人 M10 已看完 / 已批准；
- 抖音或 Bilibili 已登录、上传、发布；
- 平台内容 ID / URL / 发布时间 / API 验证；
- 播放、点赞、评论、收藏、完播等真实指标；
- 本地模型或第三方工具实际运行（除非有真实运行证据）。

## 4. 已确认的产品方向

### Training OS / 教材培训视频

已验证的 `Remotion + 晓晓旁白 + PPT/界面演示` 路线是有效资产，适合课程、教材、培训、SOP、产品说明、结构化教学。目标是：**清楚、稳定、可控、低成本批量生产**。

### ToolRadar / 社交视频运营

旧 PPT/课件式候选即使技术和声音合格，也被真人明确判定**不适合直接作为抖音 / YouTube / Bilibili 社交运营成片发布**。

社交视频必须优先优化：

- 前 1–3 秒 hook；
- 冲突 / 挑战 / 实测 / 翻车 / 反转 / before-after；
- 人物、场景、动作、真实/自有素材、UI 道具等多来源画面；
- 更高镜头/构图/字幕/声音变化密度；
- 让人继续看、评论、收藏、转发，而不是先追求“完整讲清楚”。

用户已经看过第一支 social-native v1，并明确反馈：**比 PPT 版好很多，已经有抖音 / Bilibili / YouTube 味，方向没问题；下一步要显著提高画面细节、素材丰富度和整体制作质量。**

随后用户进一步建议采用高播放科学解释类视频常见的 **2.5D / 3D 卡通人物 + 场景叙事**。当前主方向因此更新为：

**Social-native story structure + 2.5D/3D character storytelling + richer scene/material layer + UI/motion graphics as supporting props.**

不要退回“更漂亮的 PPT”。

## 5. 当前 v1 基线（已验证方向，不是最终成片）

Draft PR `#87`：`M10 prototype the first social-native rescue short`

最近核验 exact candidate：

```text
head: ee8bb86ebbf909f8e73ad000d552891a473b43ce
run/job: 31168517146 / 92835967411
artifact: 8990169118
MP4 SHA-256: cd7771bd9bf8aedebb076a30a73eb909012ef96f1d188388aa592f9294290fc2
1080x1920 · 30fps · 860 frames · 28.666667s
voice: zh-CN-XiaoxiaoNeural +10%
time-stretch: false
black >=0.35s: 0
silence >=0.75s @ -45dB: 0
```

真人结论：**social-native 大方向成立，但制作质量/素材丰富度还需明显升级。** 因此 #87 保持 Draft，不作为发布候选直接进入 M11。

## 6. 当前 v2：2.5D 卡通人物样片（继续前必须实时重验）

Draft PR `#89`：`M10 prototype 2.5D character-driven social short`

最近核验 exact candidate：

```text
head: 40a3f765b862cd2e66ed94385a29ff275f9ef07e
workflow: M10 Social Native 2.5D Character v2
run/job: 31171870900 / 92845243900
artifact: 8991338966
artifact digest: sha256:ce2bcc7ff2eb67aff3e75bb0948183795feda90a7fde2d0833fda3c76a5cce7b
MP4: toolradar-social-native-25d-character-v2.mp4
MP4 SHA-256: bc4e4227469f542b5d58034b2d9a041a8bbc95b3795f860c5eb5c01f403b10f8
bytes: 7,508,143
1080x1920 · 30fps · 884 frames
video timeline: 29.466667s
container/audio: 29.525s
voice: zh-CN-XiaoxiaoNeural +10%
narrationTimeStretchApplied=false
procedural SFX: impact / whoosh / click
thirdPartyVisualAssetsUsed=false
```

v2 视觉模式：

- 可复用简化卡通主持人；
- 前/中/后景与透视；
- UI 是场景里的道具，不再承担整个视频；
- 人物参与震惊、推、砍卡片、收颜色、按 CTA、before/after 展示；
- camera push/pull、parallax、overlap / occlusion；
- 程序化 impact / whoosh / click。

真实节奏修复：最初 900 帧 render 在 scene 4→5 出现 `0.77375s` 的长静音，超过 social pacing gate `0.75s`。**没有放宽门槛。** 候选输出精确删除 authored frames `511..526` 共 16 帧 / `0.533333s` 的无语音尾部，将语音间隔从约 `0.91s` 收紧到约 `0.38s`，最终为 884 帧。

最终 exact-head checks：

```text
ci: 31171871341 SUCCESS
remotion-final-composition: 31171870721 SUCCESS
publication-feedback-report: 31171870720 SUCCESS
M10 Social Native 2.5D Character v2: 31171870900 SUCCESS
unresolved review threads: 0
black >=0.35s: 0
silence >=0.75s @ -45dB: 0
technicalMediaIntegrityPassed=true
socialPacingSilenceGatePassed=true
```

### v2 当前真实性状态

```text
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

**绝不能因为技术全绿就把 v2 当作 M10 真人批准或最终社交成片。**

## 7. v2 代表帧复核结论 / 下一质量目标

自动化和代表帧检查说明 2.5D 人物、透视 UI 道具、场景空间关系已经成立；但当前只是**视觉语言 prototype**，距离成熟高播放 2.5D/3D 科普/短视频制作还有明显差距：

- 角色造型仍偏简化，像程序化占位角色；
- 背景空间偏空，环境道具和生活/真实质感不足；
- 材质、灯光、阴影、景深、运动模糊还不够精细；
- 音效层已有，但完整 BGM / ducking / richer sound design 尚不足；
- 缺少真实/自有操作素材与角色动画的混合；
- 镜头仍可进一步增加局部特写、遮挡切换和镜头动机。

如果真人认可 v2 的“人物+场景”方向，**下一轮不要重写故事结构**，优先提高：

1. 角色美术与动作自然度；
2. 场景/道具丰富度；
3. 光影、材质、景深、运动细节；
4. BGM + 更细致 SFX + ducking；
5. 自有/真实素材与 2.5D 场景混合；
6. 最后才是更多特效。

优先级：**真实素材感 / 角色场景质感 > 声音设计 > 镜头丰富度 > 微细节 > 堆特效。**

## 8. 并发 PR 边界（继续前重验）

最近核验时开放 PR：

- `#87` — social-native v1 prototype，Draft；
- `#88` — shared `media.render.v1` contract，独立 owner；不要把视频样片工作混入；
- `#89` — 当前 2.5D character v2 prototype，Draft。

`#88` 与 #87/#89 当前无路径冲突。任何新窗口仍必须重新检查 changed files。

## 9. 跑偏 / 复盘记忆

- 项目曾多次向 runner/orchestration/receipt 基础设施扩张；以后新基础设施必须证明是当前成片闭环的直接必要条件。
- 旧 M10 曾把系统 TTS 强压固定时长导致声音断续；以后自然语音决定时间线，不使用全局硬拉伸。
- Ubuntu render 曾缺 CJK 字体导致中文 tofu 方框；真人审片前必须实际检查代表帧，不得只看 ffprobe/render success。
- AAC 尾部几十毫秒 padding 是正常编码现象；用有界校验，不用脆弱容器时长等式。
- **技术可播 ≠ 教学可用 ≠ 社交平台可运营。**
- v1 已证明 social-native 结构比 PPT 明显更对，但“有社交味”仍不等于“头部制作质量”。
- v2 当前最重要的判断不是“能不能播”，而是：**人物+场景是否值得作为下一阶段 ToolRadar 的长期视觉语言。**

## 10. 每轮结束格式

最终汇报尽量只用：

- `### 本轮实际完成`
- `### 验证证据`
- `### 最新主线 SHA`
- `### 整体进度变化`
- `### 下一阻塞点`

每轮生成一个新的、可点击的独立 HTML 进度文件放在 `/mnt/data`，并在最终回复给出链接。
