# SourceReset1 Editable Source Search Audit — 2026-08-19

## Scope

This is a bounded repository-level provenance audit for the current review binary `SourceReset1_Scene1Motion.mp4` and the inherited Scene-1 `北纬39° Coffee` footer clipping issue.

Execution boundary:

```text
execution_surface=CHAT_ONLY
merge=NO
deploy=NO
publication=NO
pixel_patch=NO
second_renderer=NO
```

## Fresh repository truth used

```text
repository=moseszhu999/global-tool-radar
main=23d92ffc4674f1581c4191e595d279a20008be53
PR127 head=153f9fa0f1c15a551dffab6a286a4655bf7e2aed
PR125 head=674a6b80525a2412b364f1b5b0f7609d73b26856
PR126 head=f9f15b0f52d1b477add091e2eac8b1b8979e9b6e
```

The repository-level AI entrypoint remains the open governance owner PR #128 (`AGENTS.md` / `CLAUDE.md`), which requires one owner for render/TTS/timeline/evidence truth and forbids fabricating provenance.

## Search evidence

### 1. Current main Remotion source surface

The current `apps/remotion-video/src/` directory on `main` contains the generic ToolRadar compositions and benchmark/overlay sources currently committed there. The current directory listing does not expose a Cold Brew / `SourceReset0` / `SourceReset1` composition or editable footer source.

Observed current-main entries include:

- `tool-radar-video.tsx`
- `toolradar-explainer-14to5-benchmark-v1.tsx`
- `toolradar-explainer-19s-animatic-v1.tsx`
- `toolradar-explainer-production-polish-alpha-overlay-v2.tsx`
- `toolradar-explainer-production-polish-overlay-v1.tsx`
- `toolradar-explainer-radar-scout-overlay-v1.tsx`

This is evidence about the current committed source surface only; it is not a claim about deleted/uncommitted/local-only historical source.

### 2. Gold owner #125

Fresh PR #125 changed-path inventory is limited to Gold quality/profile/runtime adoption files such as:

- `.github/workflows/render-preview.yml`
- Gold baseline props/tests
- worker storyboard/render-package builders
- Gold profile adapter
- video quality gate files

No Cold Brew / SourceReset composition or editable footer source appears in that changed-path inventory.

### 3. Premium owner #126

Fresh PR #126 changed-path inventory is limited to Premium quality/profile/runtime escalation files such as:

- `.github/workflows/premium-quality-contract.yml`
- Premium baseline/audit/evidence props
- Premium profile adapter
- video quality gate files

No Cold Brew / SourceReset composition or editable footer source appears in that changed-path inventory.

### 4. Current continuation owner #127

Fresh PR #127 changed paths are only:

- `docs/video/NEXT-WINDOW-PROMPT-VIDEO-OP-20260813.md`
- `docs/video/coldbrew-premium-v44-handoff-20260813.md`
- `docs/video/coldbrew-v44-artifact-manifest.json`
- `skills/video-operation-premium-cinematic/SKILL.md`

Before this audit file, #127 therefore carried continuation/evidence truth but no editable Cold Brew composition or footer source.

### 5. Repository PR search

A fresh repository PR search for `SourceReset0` / `SourceReset1` resolves the current continuation PR #127 and does not surface a separate open/closed PR that claims ownership of the exact editable Cold Brew footer source.

## Bounded conclusion

```text
CURRENT_REPOSITORY_EDITABLE_SOURCERESET_SOURCE_SEARCH=NEGATIVE_BOUNDED
CURRENT_MAIN_REMOTION_COLD_BREW_SOURCE=NOT_LOCATED
GOLD_PREMIUM_OWNER_COLD_BREW_EDITABLE_SOURCE=NOT_LOCATED
PR127_EDITABLE_COLD_BREW_SOURCE=NOT_PRESENT_BEFORE_THIS_AUDIT
EXACT_EDITABLE_FOOTER_SOURCE_OWNER=NOT_PROVED
```

The current evidence therefore supports a stronger, narrower blocker:

```text
FOOTER_CORRECTION=BLOCKED_CHAT_ONLY_CURRENT_REPOSITORY_SOURCE_NOT_LOCATED
```

This does **not** prove that the editable source never existed. It may have been local-only, in an unreferenced historical branch/commit, or in another durable asset store. No such source identity is currently proved by the connected GitHub evidence.

## Required next evidence before correction

Any footer correction must first recover one of the following from durable evidence:

1. exact editable composition/source path + commit/blob SHA; or
2. exact source package/artifact ID + digest; or
3. existing render job/receipt that names the source package/entrypoint; or
4. durable external editable asset identity that can be bound back to the existing Shared Media/Remotion owner.

Until then:

```text
patch_final_mp4_pixels=false
create_parallel_overlay_renderer=false
create_second_shared_media_renderer=false
infer_source_owner=false
scene2_motion=HOLD
final_video=NOT_PROVED
```
