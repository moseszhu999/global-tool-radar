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

## 4. 已确认产品方向

### Training OS / 教材培训视频

`Remotion + 晓晓旁白 + PPT/界面演示` 已验证适合课程、教材、培训、SOP、产品说明、结构化教学。目标是清楚、稳定、可控、低成本批量生产。

### ToolRadar / 社交视频运营

旧 PPT/课件式候选被真人明确判定不适合直接作为抖音 / YouTube / Bilibili 社交运营成片。ToolRadar 当前方向已经明确为：

**Social-native story structure + 2.5D/3D character storytelling + richer scene/material layer + UI/motion graphics as supporting props.**

不要退回“更漂亮的 PPT”。

社交视频优先级：

1. 前 1–3 秒 hook；
2. 冲突 / 挑战 / before-after / 反转；
3. 人物、场景、动作、真实/自有素材、UI 道具等多来源画面；
4. 角色与场景质感；
5. BGM / SFX / ducking / 声音变化；
6. 镜头密度与遮挡切换；
7. 最后才是更多特效。

## 5. 历史 social-native 基线

### v1

旧 Draft PR `#87` 证明：social-native 结构比 PPT 明显更对，但制作质量/素材丰富度不足。它不作为发布候选。

### v2

Draft PR `#89` 早期 v2 首次加入卡通主持人、前中后景、透视 UI 道具、人物参与砍卡片/收颜色/按 CTA、camera push/pull、parallax、impact/whoosh/click。

v2 曾真实发现 scene 4→5 `0.77375s` 长静音，超过 `0.75s` social pacing gate。没有放宽门槛，而是候选输出删除 authored frames `511..526` 共 16 帧 / `0.533333s`，最终 884 帧。这个节奏修复已在 v3 正式写回 source timeline，不再依赖后处理删除。

## 6. 当前 M10 候选：richer 2.5D character studio v3

当前 Draft PR：`#89` — `M10 prototype richer 2.5D character studio social short v3`

最近核验 exact candidate：

```text
head: 251e49fba80cd1e1b1274b7563a51dfa56277ccf
workflow: M10 Social Native 2.5D Character v3
run/job: 31177464501 / 92862559618
artifact: toolradar-social-native-25d-character-v3
artifact id: 8993462487
artifact digest: sha256:7eaa329cbce7b0fa9540a099453d26e229d4a7419cf62a2f2ddb88f08372a7ed
MP4: toolradar-social-native-25d-character-v3.mp4
MP4 SHA-256: 71cafe38e9cb10028fd19e0520df67e350aff3f63988971cf234e52aa7598e9f
bytes: 24,511,322
1080x1920 · 30fps · 884 frames
video timeline: 29.466667s
container/audio: 29.525333s
voice: zh-CN-XiaoxiaoNeural +10%
narrationTimeStretchApplied=false
authoredDeadAirCutBakedIntoTimeline=true
proceduralMusicIncluded=true
procedural SFX: impact / whoosh / click / sparkle
thirdPartyVisualAssetsUsed=false
```

v3 相比 v2 的真实升级：

- 角色增加眉眼、眨眼、口型变化、耳朵/鼻子、夹克层次、鞋和边缘光；
- 空舞台升级为持续存在的 `ToolRadar Design Rescue Lab` 环境；
- 增加实验室招牌、工具架、植物、地面透视、灯光扫射、空气粒子和更厚的空间阴影；
- 前景/中景/后景、遮挡、透视和飞出镜头的卡片更明显；
- 原创程序化 116 BPM 轻电子 BGM；
- impact / whoosh / click / sparkle 四层 SFX；
- 16 帧节奏修复直接 baked into 884-frame authored timeline。

技术/节奏检查：

```text
ci: 31177464459 SUCCESS
remotion-final-composition: 31177464462 SUCCESS
publication-feedback-report: 31177464469 SUCCESS
M10 Social Native 2.5D Character v3: 31177464501 SUCCESS
black >=0.35s: 0
silence >=0.75s @ -45dB: 0
technicalMediaIntegrityPassed=true
socialPacingSilenceGatePassed=true
measured integrated loudness: -19.71 LUFS
measured true peak: -6.37 dBTP
```

代表帧第一次复核时真实发现：`三个问题`、`看前后`、`AI 不替你审美` 三处未显式设色，浏览器默认黑色导致深背景可读性差。该 artifact 不作为当前候选。source 随后在 exact head `251e49f...` 修为根容器继承浅色文字，重新 render 后代表帧已复核，三处均清楚可见。

## 7. 当前真实性状态 / M10 边界

即使 v3 technical CI 全绿、代表帧已复核，也仍然不能宣称真人 M10 通过：

```text
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

当前真正的下一阻塞点：**真人完整观看 exact v3 MP4，并明确接受或拒绝。**

如果接受：

- 把 #89 的一次性 render carrier 清理掉，只保留可复用 production code / evidence；
- 再决定是否进入 M11 真发布。

如果拒绝：

- 只按真人反馈改画面/角色/声音/节奏，不另造基础设施；
- 继续保持 M11 blocked。

## 8. 并发 PR 边界（继续前实时重验）

最近核验开放 PR：

- `#88` — shared `media.render.v1` contract，独立 owner；不要把视频样片工作混入；
- `#89` — 当前 ToolRadar social-native 2.5D v3，Draft。

最近核验 #88 与 #89 无 changed-file overlap。任何新窗口仍必须重新检查。

## 9. 跑偏 / 复盘记忆

- 项目曾多次向 runner/orchestration/receipt 基础设施扩张；以后新基础设施必须证明是当前成片闭环的直接必要条件。
- 旧 M10 曾把系统 TTS 强压固定时长导致声音断续；以后自然语音决定时间线，不使用全局硬拉伸。
- Ubuntu render 曾缺 CJK 字体导致中文 tofu 方框；真人审片前必须实际检查代表帧，不得只看 ffprobe/render success。
- AAC 尾部几十毫秒 padding 是正常编码现象；用有界校验，不用脆弱容器时长等式。
- 技术可播 ≠ 教学可用 ≠ 社交平台可运营。
- 代表帧检查确实抓到过 CI 无法发现的黑字/深背景可读性问题，因此后续每个发布候选都必须保留视觉帧复核。
- 当前最重要的判断不是“能不能播”，而是：**v3 的 richer character + studio environment 是否达到真人愿意继续精修并最终发布的方向。**

## 10. 每轮结束格式

最终汇报尽量只用：

- `### 本轮实际完成`
- `### 验证证据`
- `### 最新主线 SHA`
- `### 整体进度变化`
- `### 下一阻塞点`

每轮生成一个新的、可点击的独立 HTML 进度文件放在 `/mnt/data`，并在最终回复给出链接。
