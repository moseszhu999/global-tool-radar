# Shared Media Group Service Adapter v1

Status: bounded P1 read-only projection for Group Work Entry and PR/Growth consumers.

Refs: #110. Reuses canonical `media.render.v1`; does not replace or widen it.

## Purpose

Expose technical Shared Media render lifecycle truth to group consumers without giving Shared Media ownership of business truth, human approval, consumer-domain decisions, social publication or external actions.

```text
media.render.v1 result
→ explicit group read-access context
→ shared-media.group-service-status.v1
→ shared-media.group-work-item.v1
→ Work Inbox / PR-Growth consumer
```

The adapter is a pure deterministic projection. It validates the canonical render result and emits a bounded status/receipt view only.

## Status mapping

```text
queued    → pending / monitor_render
running   → in_progress / monitor_render
succeeded → awaiting_human_review / review_rendered_candidate
failed    → blocked / inspect_render_failure
cancelled → cancelled / none
```

A technically successful render is deliberately **not** a human review, consumer-domain approval or publication decision.

## Fixed truth boundary

Every projection fixes:

```text
readOnly = true
technicalResultOnly = true
humanReviewCompleted = false
humanDecisionInferred = false
consumerDomainDecisionInferred = false
publicationAllowed = false
publicationPerformed = false
externalActionPerformed = false
```

Therefore:

```text
rendered != human reviewed
rendered != approved
rendered != publication allowed
rendered != published
```

## Privacy / evidence projection

For a successful render, the group-facing terminal evidence may expose only bounded technical facts such as artifact ID, SHA-256, media type, byte length, render-log SHA-256 and collection time. It does not expose the artifact locator through the shared Work Inbox projection.

For a failed render, the projection exposes bounded failure code/stage/retryability plus render-log digest. It deliberately does not project the raw provider error message.

The adapter rejects email-like PII and secret-shaped group references.

## Access boundary

The adapter consumes an external `shared-media:access-decision:*` reference plus a group organization reference and `readAllowed` decision. It does not create or infer that decision.

`readAllowed=false` fails closed with `SHARED_MEDIA_GROUP_ACCESS_DENIED`.

## Consumer domains

Initial bounded consumer labels:

```text
tradeos
trainingos
pr-growth
aiexe
other
```

These labels are routing metadata only. They do not give Shared Media authority to decide what those domains should do.

## Intended uses

- Group Work Inbox can show render pending/running/failed/awaiting-human-review status.
- TradeOS or TrainingOS can contextually request media while retaining their own domain truth.
- PR/Growth can request media variants while retaining narrative, claim and publication approval ownership.
- AIEXE can observe status without turning a technical result into a domain decision.

## Non-goals

- social account secrets;
- automatic publication;
- human approval;
- campaign/narrative ownership;
- TradeOS/TrainingOS truth mutation;
- payment, settlement, wallet or token action;
- Production external action.
