# AI_START_HERE — Video Operation 当前第一读

> 这是 `global-tool-radar` 的跨会话执行入口。新 AI / 新窗口继续项目之前，先读本文件，再实时刷新 GitHub `main`、开放 PR、changed files、CI、artifact 和 owner。本文中的 SHA/PR 只记录最近交接点，不能替代当前 tick 的实时状态。

## 1. 固定启动顺序

1. 读本文件。
2. 读 `.agents/skills/toolradar-video-creative-director/SKILL.md`；涉及产品/UI 设计帧时再读 `toolradar-video-ui-director`。
3. 刷新 latest main exact SHA、open PR exact heads、changed paths、owner、mergeability、CI 和真实媒体 artifact。
4. 当前业务顺序保持：**M9 真成片 → M10 成片质量/业务适配真人审核 → M11 抖音/Bilibili 真发布 → M12 真数据反馈**。
5. 每轮必须产生可验证实际进展；禁止为了“有进展”制造第二 owner、cosmetic commit 或无关基础设施。

## 2. 当前最新交接（2026-08-09）

最近观察到的 main：

```text
0eb4a4ee1bdf27567edc4e2c6cf2dd6a5daa3a42
video: rebase promoted explainer v2 onto current main (#104)
```

重要收口：

- PR #90 已 squash merge：ToolRadar Video Creative Director、Video UI Director、creative-quality gate、bounded ComfyUI policy、Shared Media MCP guardrails 正式进入 main。
- PR #104 已 squash merge：将原 #93 的 14 个 explainer v2 文件按 immutable blob 原样 rebased 到现代 main；exact-head 12/12 workflows SUCCESS 后合并。
- PR #93 已关闭且未合并：被 #104 干净 successor 取代。
- PR #89 已关闭且未合并：旧 2.5D full-time-host 候选保留为历史比较/回滚证据，不再占当前 creative owner。

每个新窗口仍必须重新读取 open PR，不能仅凭以上交接判断 owner 空闲。

## 3. 当前 M10 内部候选

当前主干中的方向是 **flat-geometric explainer + deterministic real Workspace proof + four bounded Radar Scout cameos + true-alpha production typography/micro-motion polish v2**。

#104 exact-head render evidence：

```text
source exact head: a5ac58e0ea05c5d8d8ca6861e1001b044bde44e0
workflow: M10 Explainer Production Polish Alpha A-B v2
run: 31304399179
artifact: 9035504064
artifact ZIP digest: sha256:cbb0a4b97201a3999b819486682d023d0d93061f1d97920c13a8c34fe51e4a3b
MP4: toolradar-explainer-19s-production-polish-alpha-v2.mp4
MP4 SHA-256: 1de5e8a6e25b8e25ef4f7a7db8a628941794687432ba0420eb956fdc0ba6f598
bytes: 3,662,040
1080x1920 · 30fps · 576 frames · 19.2s
video: H.264
audio: AAC 48kHz stereo
integrated loudness: -16.0 LUFS
true peak: -1.5 dBTP
chromaKeyApplied=false
intermediateTransparency=vp9-alpha
fourCameoStrategyPreserved=true
productProofTextModified=false
generatedFactualUiUsed=false
thirdPartyVisualAssetsUsed=false
black >=0.35s: 0
silence >=0.75s @ -45dB: 0
```

同一 exact head 的 12 个 observed workflows 全部 SUCCESS：generic CI、publication-feedback-report、remotion-final-composition、14→5 benchmark、structural animatic、audio review、product proof、full review、Radar Scout warmth A/B、four-cameo A/B、production polish A/B、true-alpha production polish A/B v2。

## 4. 当前 creative/controller 结论

`toolradar-video-creative-director` 的原则已经成为主干规则：先诊断 story / static visual development / UI / storyboard / motion / sound / render infrastructure，再选择工具；不要用更多 glow、particles、camera movement 或 Remotion code 掩盖静态视觉问题。

当前 v2 已通过技术媒体检查；controller 对时间线抽样和关键 Human Gate / loop 窗口的动态复核未发现明显 headline flicker、Human Gate 语义丢失、portal→opening 断裂或 real Workspace proof 可读性回退。

这些结论只允许写成 controller-level technical/dynamic review，**不能升级成人类已完整观看或平台适配已批准**。

## 5. 现在唯一最早业务阻塞：M10 人工完整审片

当前 truth 必须保持：

```text
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

下一真实业务动作：由真人完整观看 exact MP4 `1de5e8...`，明确给出 ACCEPT 或 REJECT。

### 若 ACCEPT

- 记录 exact artifact / MP4 SHA 与人工接受结论；
- 将 M10 标记为人类通过；
- 才允许进入 M11 发布准备；
- 真正登录、上传、发布仍是独立 consequential action，不从 CI/render/merge 自动推断授权。

### 若 REJECT

- 只针对具体反馈选择一个最主要缺陷层；
- 按 Creative Director Skill 从最便宜验证阶段开始；
- 尽量单变量 A/B；
- 不新增另一套候选 owner，不盲目堆 v3 特效。

## 6. Shared Media 当前可复用主干能力

已合并主线覆盖：

```text
media.render.v1 canonical contract
→ Shared Media MCP adapter
→ canonical render-plan compiler
→ preparation manifest
→ authorized preparation executor
→ prepared media qualification
→ Remotion materializer v2
→ Mac staging bridge v1
→ fail-closed Mac compatibility
→ canonical Evidence Collector
```

这些是共享技术能力，不拥有 ToolRadar creative / human approval / publication / analytics 真相。不要再造第二套 render schema、TTS、caption timing、Mac transport 或 evidence collector。

## 7. 防跑偏硬规则

除非直接解除当前最早业务阻塞，否则默认不做：

- 新 runner/orchestration/receipt 框架；
- 第二套 Shared Media/render/Mac 实现；
- 与当前候选、人审、发布或反馈闭环无关的“以后可能有用”抽象；
- 把 mock、Preview、CI、render success、controller review 当真人批准；
- 在 M10 人工门未通过时假装完成 M11/M12；
- 把平台登录、上传、发布、账号、验证码、付款等 consequential action 当作普通代码步骤。

## 8. 永久真实性边界

绝不伪造或暗示：

- 真人完整观看/批准；
- 抖音、Bilibili、YouTube 登录/上传/发布；
- 内容 ID、URL、发布时间；
- 播放、点赞、评论、收藏、完播、转化等真实指标；
- 本地/第三方工具已执行，除非有真实执行证据。

## 9. 每轮结束格式

优先只汇报：

- `### 本轮实际完成`
- `### 验证证据`
- `### 最新主线 SHA`
- `### 整体进度变化`
- `### 下一阻塞点`

每轮生成一个新的、可点击的独立 HTML 进度/审片文件放在 `/mnt/data` 并给出链接。
