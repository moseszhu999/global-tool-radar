# ToolRadar Figma Code-to-Canvas Evidence v1

## Purpose

Record the first real ToolRadar browser UI → Figma code-to-canvas → 9:16 video design-frame experiment so future video/UI work does not reconstruct the lessons from chat history.

This is evidence for the `toolradar-video-ui-director` workflow, not a claim that the resulting design is human-approved or production-ready.

## Exact product source

```text
repo: moseszhu999/global-tool-radar
exact source head: 1928e59f8309dea22b1fd4a4763f916d2f4c9854
server: apps/web/server.mjs
route: /workspace.html
source page: apps/web/workspace.html
page title: ToolRadar · Video Operations Workspace
```

The real Workspace contains the source product structure used in this experiment:
- Radar inbox;
- Sources;
- Candidates;
- Tools;
- Evidence & tests;
- Content studio;
- Production queue;
- Performance;
- Agent runs;
- Ask ToolRadar;
- snapshot metrics;
- Candidate inbox/detail state.

## Disposable Mac capture evidence

The official Figma code-to-canvas capture script was injected only into a temporary Mac checkout. It was never committed to ToolRadar.

TrainingOS was used only as a disposable self-hosted carrier because the physical Mac runner is registered there.

```text
carrier PR: training-learning-rails #568
carrier state: CLOSED WITHOUT MERGE
carrier head: 55ad7f4b43e85a8be9bb08357a377a6e8343ad32
workflow: ToolRadar Figma Code-to-Canvas Capture v1
run: 31229667657 SUCCESS
artifact: 9013321365
artifact digest: sha256:58d8ffd0d71e570e1327d4b0738cdcd1fd72417f8373019137e5e88f7c7761f8
```

The carrier:
1. checked out the exact ToolRadar source head;
2. locally injected `https://mcp.figma.com/mcp/html-to-design/capture.js` into `workspace.html`;
3. started ToolRadar on `127.0.0.1:4173`;
4. opened the real workspace in a local browser with the single-use Figma capture parameters;
5. uploaded sanitized evidence;
6. removed the temporary checkout.

No TrainingOS product code, ToolRadar product branch, database, provider, production deployment, or social account was modified.

## Figma capture identity

```text
file: ToolRadar Workspace Code-to-Canvas Scratch
fileKey: OEZpc8VggpVj860tGmImti
captureId: bcfed1de-2bc8-4176-a3a2-49447ab64d50
capture status: COMPLETED
captured root node: 1:2
captured root name: ToolRadar · Video Operations Workspace
```

The result was structured and editable rather than a single flat screenshot. Metadata inspection showed native Figma frames/text for:
- left product navigation;
- Radar inbox header;
- four snapshot metrics;
- Candidate inbox/search/empty state;
- detail pane;
- Ask ToolRadar drawer and prompt controls.

The capture also preserved truthful empty-state semantics. For example, product copy explicitly distinguishes missing/empty snapshot data from a factual zero.

## Why the captured desktop frame is not the video frame

The captured desktop UI is approximately 2880 px wide before the Ask ToolRadar drawer. Scaling that whole desktop state into 1080×1920 makes typography and hierarchy unsuitable for phone-speed social viewing.

Therefore the correct workflow is:

```text
real product capture
→ preserve product truth
→ redesign hierarchy for the video viewport
→ hand design frame to motion
```

not:

```text
desktop screenshot
→ scale down until it fits
```

This is an important distinction: source-of-truth fidelity and presentation hierarchy are separate concerns.

## Design-system and font discovery

The scratch file had access to several libraries. The relevant reusable web-oriented library was Figma's Simple Design System.

Observed reusable assets included:

```text
Card component set: a5bde480886231526d7dd890df3779dc15b52423
Button component set: cc8b558dc7d9684011b6b99ce8e6509399bc836b
Search component set: 715a105916909fcad1d649ed31db27dc26375edd
```

The experiment did not force Simple Design System's visual language onto ToolRadar. It used the library as evidence for structural design-system practices while retaining ToolRadar's source brand/copy.

No ToolRadar Code Connect mapping was found or claimed as installed.

Available relevant fonts included:

```text
Inter
Noto Sans SC
```

Noto Sans SC styles verified by the Figma runtime:

```text
Black
Bold
DemiLight
Light
Medium
Regular
Thin
```

The scratch 9:16 frame used `Noto Sans SC` for deterministic Chinese rendering instead of silently substituting an approximate font.

## Scratch 9:16 design frame

A separate video-specific frame was created in the same scratch file.

```text
root node: 3:2
name: ToolRadar · Video Frame 01 · SCRATCH · Real Workspace
size: 1080×1920
metric group: 5:2
Candidate inbox card: 5:25
Ask ToolRadar panel: 7:2
```

The design was built incrementally with Auto Layout and validated between meaningful stages.

### Preserved real product state

The video frame kept real captured state/copy instead of inventing more attractive values:

```text
候选: 0
数据覆盖: UNKNOWN
版权待审: 0
安全待审: 0
快照状态: 快照为空 · 等待导出或导入
Candidate state: 暂无匹配候选
Truth note: 缺失 ≠ 0
```

The product flow remains:

```text
发现 → 证据 → 权利/安全 → 原创生产
```

### Video-specific hierarchy changes

The frame does not attempt to show the entire desktop workspace at once. It instead uses:
- large `Radar inbox` title;
- readable 2×2 metric layout;
- one focused Candidate inbox card;
- explicit `缺失 ≠ 0` truth cue;
- a separate high-contrast Ask ToolRadar panel.

This preserves product semantics while making one reading order plausible on a 9:16 frame.

### Ask ToolRadar panel

The panel preserves real product framing:

```text
Ask ToolRadar
证据上下文 → proposal → 人工审核
DRAFT ONLY
为什么入选
缺失数据
实测计划
脚本提纲
你想完成什么？
只生成 draft，不下载、复制或发布源视频。
生成提议
```

It remains an agent-proposal surface, not a publication or autonomous execution claim.

## Real execution failure learned during Figma write

One write attempt tried to assign `description` to a normal `FRAME`. The Figma Plugin API returned:

```text
TypeError: node.description: no such property 'description' on FRAME node
```

The failed Figma script was atomic: no partial nodes were left behind. The next attempt removed the unsupported property and the complete Ask ToolRadar panel write succeeded with concrete returned node IDs.

Reusable lesson:
- stop on `use_figma` errors;
- read the exact API failure;
- do not blindly retry;
- rely on atomic rollback;
- mutate only properties supported by the concrete node type.

Component documentation metadata and ordinary frame workflow-state/evidence are different things. Do not force component-only metadata patterns onto generic frames.

## Visual validation state

A visual screenshot check was completed after the 2×2 metrics + Candidate inbox stage. It showed materially better phone-scale hierarchy than scaling the full desktop capture.

The final Ask ToolRadar panel write then succeeded. A final post-panel screenshot could not be executed because the authenticated Figma Starter plan reached its MCP tool-call limit.

Therefore the final truth state is:

```text
captureCompleted=true
structuredCaptureConfirmed=true
intermediateVisualValidationCompleted=true
finalAgentPanelWriteCompleted=true
finalVisualValidationComplete=false
humanDesignApproved=false
productionAssetApproved=false
publicationPerformed=false
analyticsObserved=false
```

A successful write plus returned node IDs is not a substitute for final visual inspection.

Do not repeatedly consume calls after a known plan-rate boundary. Preserve the successful write/evidence and resume visual validation when the tool budget is available again.

## Production lessons

1. **Capture product truth before redesign.** Do not design a ToolRadar product frame from memory when the real browser state can be captured.
2. **Code-to-canvas is a reference layer, not automatically a video layout.** Desktop density must be re-authored for social viewing.
3. **Preserve factual UI deterministically.** Do not replace product labels/metrics/state with image-generated UI.
4. **Use design-system primitives before ad hoc drawing when they semantically match.** Do not force a library component merely to increase reuse metrics.
5. **Use verified product fonts.** Silent font approximation invalidates claims of visual fidelity.
6. **Build Figma incrementally and validate meaningful stages.** Avoid one giant mutation.
7. **Treat write success and visual approval separately.** Figma node creation is technical evidence, not design approval.
8. **Keep Figma and Remotion responsibilities separate.** Figma owns design-frame hierarchy; Remotion/Shared Media own deterministic timing/render/evidence.
9. **Keep ComfyUI behind deterministic UI.** Generated visual polish may support background/material treatment but must not own factual product state.
10. **Rate limits are an execution constraint, not permission to infer PASS.** Record the unvalidated gate truthfully and continue independent work elsewhere.

## Next valid handoff

Once a final design-frame visual check is available, the highest-value next experiment is a bounded Remotion reference scene that implements the new hierarchy while keeping source product copy/state deterministic.

Do not call that scene a new production candidate until:
- its Figma design reference is visually checked;
- the Remotion implementation is compared against the design reference;
- the resulting video is technically inspected;
- human creative selection remains a separate gate.
