# AI_START_HERE — Video Operation 会话交接入口

> `AGENTS.md` 是仓库级 AI operating context 的 canonical entrypoint；本文件只保存 Video Operation / ToolRadar 的跨会话执行交接，不得覆盖 `AGENTS.md` 的 owner、Shared Media、权限或真实性边界。新 AI / 新窗口继续项目时：若当前 ref 已存在 `AGENTS.md`，先读 `AGENTS.md`，再读本文件；若当前 main 尚未包含 `AGENTS.md`，则本文件继续承担临时第一读职责，直到 #128 的 canonical entrypoint 落地。无论哪种情况，都必须实时刷新 GitHub `main`、开放 PR、changed files、CI、artifact 和 owner；本文中的 SHA/PR 只记录历史交接点，不能替代当前 tick 的实时状态。

## 1. 固定启动顺序

1. 若当前 ref 存在 `AGENTS.md`，先读 `AGENTS.md`；否则读本文件作为尚未落地 #128 前的临时入口。
2. 读本文件中的 Video Operation 会话交接；再读 `.agents/skills/toolradar-video-creative-director/SKILL.md`；涉及产品/UI 设计帧时再读 `toolradar-video-ui-director`。
3. 刷新 latest main exact SHA、open PR exact heads、changed paths、owner、mergeability、CI 和真实媒体 artifact。
4. 当前业务顺序保持：**M9 真成片 → M10 成片质量/业务适配真人审核 → M11 抖音/Bilibili 真发布 → M12 真数据反馈**。
5. 每轮必须产生可验证实际进展；禁止为了“有进展”制造第二 owner、cosmetic commit 或无关基础设施。
6. 如本文件与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准；本文件只允许补充当前 Video Operation 会话交接事实。

## 2. 历史交接快照（2026-08-09，仅供定位，不是当前真相）

当时观察到的 main：

```text
7f86239d6e56522d2cec2138defae32116380dc9
video: import verified rendered candidates into canonical M10 lifecycle (#108)
```

重要收口：

- PR #90 已 squash merge：ToolRadar Video Creative Director、Video UI Director、creative-quality gate、bounded ComfyUI policy、Shared Media MCP guardrails 正式进入 main。
- PR #104 已 squash merge：将 promoted explainer v2 的 14 个文件按 immutable blob rebased 到现代 main；exact-head 12/12 observed workflows SUCCESS 后合并。
- PR #106 已合并：M10 bounded social-native review profile 可被 canonical quality approval 正确处理。
- PR #107 已合并：canonical evidence 绑定 exact render provenance snapshot。
- PR #108 已 squash merge：允许已验证的 GitHub Actions render 以 `render_execution_evidence` 进入 canonical M10 lifecycle，同时明确 `originalRenderGateProven=false`、`historicalStagesProven=false`、`publicationAllowed=false`；公开 event API 绕过已 fail-closed 修复。
- 该快照当时记录 open PR = 0；**这个数量现在已经过时，任何新窗口都必须重新读取当前 open owner topology。**

## 3. 历史 M10 exact candidate 快照

该历史方向是 **flat-geometric explainer + deterministic real Workspace proof + four bounded Radar Scout cameos + true-alpha production typography/micro-motion polish v2**。

历史 exact render evidence：

```text
source exact head: a5ac58e0ea05c5d8d8ca6861e1001b044bde44e0
workflow: M10 Explainer Production Polish Alpha A-B v2
workflow run: 31304399179
artifact id: 9035504064
artifact name: toolradar-explainer-production-polish-alpha-ab-v2
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

Fresh controller re-verification receipt at that handoff:

```text
docs/video/evidence/m10-explainer-v2-controller-reverification-2026-08-09.md
```

That receipt records a GitHub Actions artifact retrieval, recomputed MP4 SHA-256, ffprobe, artifact receipt inspection, and ten-point controller frame sampling. It remains controller-level evidence only and does not supersede newer Gold/SourceReset/current-owner truth.

## 4. Canonical M10 lifecycle state at that handoff

PR #108 committed project-bound evidence:

```text
docs/video/evidence/m10-explainer-v2-render-completed-import-ledger.json
docs/video/evidence/m10-explainer-v2-quality-review-pack.json
```

The exact candidate was truthfully lifecycle-bound at `RENDER_COMPLETED` without pretending the historical render authorization path ran through MacRunner.

The quality-review pack was derived from the canonical render-completed ledger and kept all ten human-review verdicts unset until real review.

Do not confuse any of the following layers:

```text
product fact
creative framing
technical render evidence
controller creative/visual judgment
human creative approval
publication authorization / publication action
observed analytics
```

## 5. 人工审片边界

Historical M10 truth was:

```text
humanWatchedFullCandidate=false
socialPlatformBusinessFitApprovedByHuman=false
publicationAllowed=false
publicationPerformed=false
analyticsObserved=false
```

Current human-review truth must be re-fetched from the active Gold / SourceReset / authored-asset owners; never infer approval from this historical block.

### 若某个当前 exact candidate 获得真人 ACCEPT

- 记录 exact artifact / MP4 SHA 与人工接受结论；
- 只推进该 candidate 对应的 canonical lifecycle；
- 真正登录、上传、发布仍是独立 consequential action，不能从 CI/render/merge 自动推断授权。

### 若 REJECT

- 只针对具体反馈选择一个最主要缺陷层；
- 按 Creative Director Skill 先分类：story/hook、static visual development、product UI hierarchy、storyboard/coverage、motion/timing、sound、render/evidence infrastructure；
- 从最便宜验证阶段开始，尽量单变量 A/B；
- 不新增另一套候选 owner，不盲目堆 glow、particles、camera movement 或更多 Remotion code。

## 6. Shared Media 当前可复用能力边界

Shared Media 主线覆盖的方向包括：

```text
media.render.v1 canonical contract
→ Shared Media MCP adapter
→ canonical render-plan compiler
→ preparation manifest
→ authorized preparation executor
→ prepared media qualification
→ Remotion materializer
→ Mac staging bridge
→ fail-closed Mac compatibility
→ canonical Evidence Collector / terminal evidence contracts
```

这些是共享技术能力，不拥有 ToolRadar creative / human approval / publication / analytics 真相。不要再造第二套 render schema、TTS、caption timing、Mac transport、artifact registry、terminal receipt store 或 evidence collector。具体当前版本与 rollout 状态必须从 latest main/open owner 实时刷新。

## 7. 防跑偏硬规则

除非直接解除当前最早业务阻塞，否则默认不做：

- 新 runner/orchestration/receipt 框架；
- 第二套 Shared Media/render/Mac 实现；
- 与当前候选、人审、发布或反馈闭环无关的“以后可能有用”抽象；
- 把 mock、Preview、CI、render success、controller review 当真人批准；
- 在人工门未通过时假装完成后续发布/反馈闭环；
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
