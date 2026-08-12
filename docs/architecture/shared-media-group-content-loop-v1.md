# Shared Media Group Content Loop v1

## Purpose

W3C adds the first Group-owned business loop on top of the existing Shared Media render truth without creating a second render runtime, publisher, approval system, or social-account owner.

```text
structured content idea
→ script draft evidence
→ existing canonical media.render.v1 result
→ existing shared-media.group-work-item.v1 projection
→ pre-publication human review pack
→ later Group business evaluation
```

The owner is `shared-media`; the Group action is `content_candidate_prepare`; only L0/L1 autonomy is accepted.

## Reused owners

This package reuses the already-accepted Shared Media boundaries:

- canonical `media.render.v1` request/result/evidence validation;
- `shared-media.group-service-status.v1` / `shared-media.group-work-item.v1` projection;
- canonical render evidence remains technical truth only;
- technical render success becomes `awaiting_human_review`, never publication approval.

The W3C module calls the existing group-service projection instead of copying render validation, transport, Mac runtime, artifact storage, or publication logic.

## Route states

```text
blocked
needs_idea_clarification
script_draft_planned
render_candidate_planned
render_in_progress
render_blocked
cancelled
prepublication_review_ready
```

A content idea must first contain audience, channel, target duration, and at least one source-evidence reference. Explicit blockers fail closed. Script evidence is forbidden while the idea is incomplete or blocked. Render observation is forbidden until script evidence exists.

## Script evidence boundary

The loop stores only bounded identity/digest evidence:

```text
scriptRef
artifactDigest
workEvidenceRef
workEvidenceDigest
workspaceId
actorRef
observedAt
```

It does not copy script text into the Group loop. Workspace and actor must match the content idea, and script evidence cannot be newer than the loop observation time.

## Render boundary

Render observation is projected through the existing Shared Media group-service adapter with `consumerDomain=pr-growth`.

Therefore:

- queued/running stay monitor-only;
- failed stays blocked with bounded failure evidence;
- cancelled stays cancelled;
- succeeded becomes `prepublication_review_ready` only when the observation is fresh;
- artifact locator is not copied into the Group pack;
- raw provider error text is not copied into the Group pack.

This module does not submit a render and does not own render transport.

## Pre-publication pack

A successful technical render produces a review-ready pack containing bounded content/script/render evidence and five pending human checks:

```text
content_accuracy
rights_privacy_brand
visual_quality
voice_caption_quality
channel_fit
```

Even when the pack is review-ready:

```text
humanDecisionRequired=true
humanReviewCompleted=false
approvalDecisionCreated=false
publicationAllowed=false
publicationPerformed=false
externalActionPerformed=false
```

A later human-review/publication owner must create any actual approval or publication decision. W3C never infers it.

## Business evaluation handoff

The loop exposes only a measured-outcome handoff. Required metrics remain:

```text
outcome
human_minutes
cycle_time_ms
cost_usd
error_count
reversal_count
human_takeover
```

`human_accepted_candidate_rate` is only a suggested downstream metric with a null value until measured. W3C does not fabricate business success.

## Non-goals / closed boundaries

```text
second media.render contract = NO
second render runtime = NO
render submission = NO
render transport ownership = NO
script text copy = NO
human approval inference = NO
publication authorization = NO
publication = NO
social credential handling = NO
payment = NO
production deployment = NO
```

This branch is a Draft product slice. Merge and deployment remain separate decisions.