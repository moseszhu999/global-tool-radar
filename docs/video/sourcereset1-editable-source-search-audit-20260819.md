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

## Fresh repository truth used — 2026-09-05 refresh

```text
repository=moseszhu999/global-tool-radar
main=23d92ffc4674f1581c4191e595d279a20008be53
PR127 head before this refresh=cb8ca89a582ce818ab6919e2893830c1ec57f259
PR125 current Gold head=1a83beabc21a504e37dd6175324d1f278faa7b10
PR126 current Premium head=f9f15b0f52d1b477add091e2eac8b1b8979e9b6e
```

The repository-level AI entrypoint remains the open governance owner PR #128 (`AGENTS.md` / `CLAUDE.md`), which requires one owner for render/TTS/timeline/evidence truth and forbids fabricating provenance.

This refresh corrects stale owner SHAs that remained in the audit text. It does not claim that a newer repository/source search has recovered the editable Cold Brew source; the provenance conclusion below remains bounded and fail-closed.

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

The current Gold owner is PR #125 at exact head `1a83beabc21a504e37dd6175324d1f278faa7b10`. Its changed-path inventory remains Gold quality/profile/runtime adoption and active Gold composition/evidence work; no Cold Brew / SourceReset editable footer source is claimed by that owner.

The Gold owner also remains the current product-quality/render composition lane and must not be replaced by a SourceReset-side parallel renderer.

### 3. Premium owner #126

The current Premium owner is PR #126 at exact head `f9f15b0f52d1b477add091e2eac8b1b8979e9b6e`. Its changed-path inventory remains Premium quality/profile/runtime escalation files; no Cold Brew / SourceReset composition or editable footer source is claimed by that owner.

### 4. Current continuation owner #127

Immediately before this refresh, PR #127 was at exact head `cb8ca89a582ce818ab6919e2893830c1ec57f259` with five changed paths:

- `docs/video/NEXT-WINDOW-PROMPT-VIDEO-OP-20260813.md`
- `docs/video/coldbrew-premium-v44-handoff-20260813.md`
- `docs/video/coldbrew-v44-artifact-manifest.json`
- `docs/video/sourcereset1-editable-source-search-audit-20260819.md`
- `skills/video-operation-premium-cinematic/SKILL.md`

This refresh changes only this existing provenance-audit file inside the same #127 owner. It does not add a renderer/runtime/source owner.

### 5. Repository PR search / existing recovery evidence

Repository owner review history continues to identify #127 as the SourceReset continuation/evidence owner and does not establish a separate exact editable Cold Brew footer-source owner.

Existing bounded recovery evidence, including repository/source search and the previously executed read-only MacRunner editable-source scan, has not proved an exact editable source owner. A negative bounded search does not prove that the source never existed.

## Bounded conclusion

```text
CURRENT_REPOSITORY_EDITABLE_SOURCERESET_SOURCE_SEARCH=NEGATIVE_BOUNDED
CURRENT_MAIN_REMOTION_COLD_BREW_SOURCE=NOT_LOCATED
GOLD_PREMIUM_OWNER_COLD_BREW_EDITABLE_SOURCE=NOT_LOCATED
EXACT_EDITABLE_FOOTER_SOURCE_OWNER=NOT_PROVED
```

The current evidence therefore supports a stronger, narrower blocker:

```text
FOOTER_CORRECTION=BLOCKED_CHAT_ONLY_CURRENT_REPOSITORY_SOURCE_NOT_LOCATED
```

This does **not** prove that the editable source never existed. It may have been local-only, in an unreferenced historical branch/commit, or in another durable asset store. No such source identity is currently proved by the connected evidence.

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
