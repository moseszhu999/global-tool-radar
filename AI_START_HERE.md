# AI_START_HERE — Video Operation 会话交接入口

> `AGENTS.md` 是仓库级 AI operating context 的 canonical entrypoint；本文件只保存 Video Operation / ToolRadar 的跨会话执行交接，不得覆盖 `AGENTS.md` 的 owner、Shared Media、权限或真实性边界。新 AI / 新窗口继续项目时：若当前 ref 已存在 `AGENTS.md`，先读 `AGENTS.md`，再读本文件；若当前 main 尚未包含 `AGENTS.md`，则本文件继续承担临时第一读职责，直到 #128 的 canonical entrypoint 落地。无论哪种情况，都必须实时刷新 GitHub `main`、开放 PR、changed files、CI、artifact 和 owner；本文中的 SHA/PR 只记录交接点，不能替代当前 tick 的实时状态。

## 1. 固定启动顺序

1. 若当前 ref 存在 `AGENTS.md`，先读 `AGENTS.md`；否则读本文件作为尚未落地 #128 前的临时入口。
2. 读本文件中的 Video Operation 会话交接；再读 `.agents/skills/toolradar-video-creative-director/SKILL.md`；涉及产品/UI 设计帧时再读 `toolradar-video-ui-director`。
3. 刷新 latest main exact SHA、open PR exact heads、changed paths、owner、mergeability、CI 和真实媒体 artifact。
4. 当前业务顺序保持：**真成片 → 成片质量/业务适配真人审核 → 发布准备 → 真发布 → 真数据反馈**。
5. 每轮必须产生可验证实际进展；禁止为了“有进展”制造第二 owner、cosmetic commit 或无关基础设施。
6. 如本文件与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准；本文件只允许补充当前 Video Operation 会话交接事实。

## 2. 当前交接快照（2026-09-09；下一轮仍必须 fresh refresh）

最近观察到的 main：

```text
23d92ffc4674f1581c4191e595d279a20008be53
P0: prepare exact-SHA Mac canonical receipt runtime patch
```

当前 open owner topology：

```text
#128 governance / AGENTS.md + CLAUDE.md + ownership map
#125 Gold baseline / exact final MP4 + caption/voice/render evidence
#126 Premium 95-105 / stacked on older Gold, reconciliation required
#127 SourceReset / scene-1-only material motion, Scene 2 HOLD
#112 authored / Blender 3D hero / preferred static baseline V45
#118 isolated Chinese voice casting / persisted candidate references
#122 ai-video-production-zh v2 canonical production contracts
#123 AIEXE runtime observation consumer proof
#124 bounded prepublication loop
issue #115 persistent canonical media.render.v1 terminal receipt rollout
```

当前 exact heads / observed CI：

```text
#128 e141d5a03d3e655ae24743b239b4ee513069af59 — 2/2 SUCCESS
#125 1a83beabc21a504e37dd6175324d1f278faa7b10 — 5/5 SUCCESS
#126 f9f15b0f52d1b477add091e2eac8b1b8979e9b6e — 6/6 SUCCESS
#127 55f239227af2b188333608c4a1106629ae9b939e — 2/2 SUCCESS
#112 d20f2783ecbfcf14797ab2b854319fbe3d1fa947 — 6/6 SUCCESS
#118 afbe71d950aabe89d07a5b0af84f28da39096157 — 3/3 SUCCESS
```

Green exact-head CI proves repository/workflow state only. It does not prove human approval, current-Gold non-regression for stacked owners, live Mac rollout, publication authority, or business outcome.

### Current Gold exact media identity

Current retained Gold owner #125 exact head:

```text
1a83beabc21a504e37dd6175324d1f278faa7b10
```

Current render/evidence artifact set from run `33711955915`:

```text
9877292745 toolradar-active-ai-design-render-preview
  expired=false
  ZIP bytes=12,479,556
  digest=sha256:599ea38261f85821a5564d666033a471767b110256c700b7bfa59479c5708680
  expires=2026-09-17T03:40:50Z

9877214839 toolradar-active-ai-design-gold-binding
  expired=false
  digest=sha256:ee0f2c80e79c7bc95180666663bf68c9c5ca35df783f92cb844f07d176eeedf1
  expires=2026-09-17T03:36:47Z

9877303383 historical fixture
  expired=false
  digest=sha256:2da7852177302af982a99280796c4604f7b304e0b33d034ce46c0cdc28f0f10a
  expires=2026-09-17T03:41:24Z
```

Current exact Gold MP4 identity already verified from retained artifact bytes:

```text
apps/remotion-video/out/toolradar-ai-design-preview.mp4
SHA-256=55d8f7ae23a928eefa91200d637a5321081be3c831b6b2ed75afbbf2f99929bb
bytes=14,709,675
H.264 1080x1920 @ 30fps
AAC 48kHz stereo
```

Do not conflate the GitHub Actions ZIP digest with the MP4 SHA-256.

### Current authored / 3D boundary

PR #112 current preferred static baseline is **V45**. Controller-level complete static visual gate passed, but human creative approval has not been proved:

```text
staticHeroCreativeApproved=false
humanSelectedForCanonical=false
riggingPerformed=false
animationPerformed=false
```

Therefore:

```text
HUMAN_STATIC_CREATIVE_SIGNOFF_V45_REQUIRED
V46=HOLD
rigging=HOLD
animation=HOLD
```

Current Gold still has not proved the canonical authored-asset chain for V45 final pixels:

```text
media.asset.promotion.v1
→ media.shot.asset-binding.v1
→ existing Gold / Remotion / Shared Media path
→ media.asset.usage-receipt.v1
→ exact final MP4 + ffprobe + SHA-256 + manifest / canonical receipt evidence
```

Do not create a second authored/3D owner.

### Current SourceReset boundary

PR #127 remains the existing clean-baseline/motion owner. Current review candidate:

```text
SourceReset1_Scene1Motion.mp4
SHA-256=6dcedbe09a7859088c4c86a1e65a696c172cde32bf82629802ef2b3f8b6f3759
```

Only Scene 1 contains restored local material motion; Scene 2 remains HOLD until explicit human review of Scene 1. Exact editable footer source/render owner remains not proved. Do not patch final MP4 pixels or add a parallel overlay renderer to bypass that source gap.

### Current voice boundary

PR #118 remains the single isolated Chinese voice-casting owner. Existing carrier evidence persists Flo / Shelley / Tingting candidates and one full Flo narration at an exact TrainingOS MacRunner carrier head. The current ToolRadar workflow is reference-only and exact-head validated; it does not synthesize a new voice, refetch private media, or select a winner.

Current truth:

```text
human listening/voice selection=NOT_PROVED
final voice approval=NOT_PROVED
publication authorization=NO
```

Do not create another carrier or TTS owner.

### Current persistent media.render.v1 boundary

Issue #115 remains the sole live persistence rollout owner. Repository-side source patch is merged to main, but live rollout remains fail-closed:

```text
sourcePatchMergedToMain=true
sourcePatchExactHead=23d92ffc4674f1581c4191e595d279a20008be53
liveMacMutationProved=false
serviceRestartProved=false
liveCanonicalReceiptWriteProved=false
restartRecoveryOfCanonicalReceiptProved=false
renderSubmitted=false
publicationAllowed=false
publicationPerformed=false
```

The next permitted #115 step is one bounded Mac rollout against audited runtime SHA `bb0de1478cd2ce48ce6bcf0c17c9b7f5e5e811131448b3555dfdcee3a4c8510f`, proving backup + exact-SHA patch + syntax + health + canonical write/read + restart recovery + rollback. Do not create a second database, service, renderer, artifact registry or job store.

### Current earliest fail-closed gates

```text
HUMAN_STATIC_CREATIVE_SIGNOFF_V45_REQUIRED
CURRENT_GOLD_AUTHORED_ASSET_PROMOTION_BINDING_USAGE_NOT_PROVED
HUMAN_SCENE1_MOTION_REVIEW_REQUIRED
VOICE_HUMAN_LISTENING_SELECTION_REQUIRED
PREMIUM_CURRENT_GOLD_NON_REGRESSION_NOT_PROVED
LIVE_PERSISTENT_CANONICAL_RECEIPT_LEDGER_ROLLOUT_NOT_PROVED
GOLD_DURABLE_BYTE_RETRIEVAL_BEYOND_ACTIONS_RETENTION_NOT_PROVED
```

If no gate changes in a future run, prefer evidence refresh / JOIN_STACK / NO_OP over creating a new owner.

## 3. 历史交接快照（2026-08-09，仅供定位，不是当前真相）

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

## 4. 历史 M10 exact candidate 快照

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

## 5. Historical canonical M10 lifecycle state

PR #108 committed project-bound evidence:

```text
docs/video/evidence/m10-explainer-v2-render-completed-import-ledger.json
docs/video/evidence/m10-explainer-v2-quality-review-pack.json
```

The exact candidate was truthfully lifecycle-bound at `RENDER_COMPLETED` without pretending the historical render authorization path ran through MacRunner.

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
