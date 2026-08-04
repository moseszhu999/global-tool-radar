# ToolRadar M12 Bounded Feedback Report v1

## Purpose

Advance the post-publication loop without inventing platform activity or causal conclusions.

```text
human-confirmed publication receipt
+ at least two human-confirmed analytics snapshots
+ exact media SHA-256 identity
→ metric deltas
→ bounded observations
→ human-reviewed next-test suggestions
```

## Required evidence

A report is allowed only when all of the following are true:

- the platform publication has a real platform video ID;
- the canonical public URL uses HTTPS;
- the publication timestamp is present;
- the publication receipt is explicitly human-confirmed;
- every analytics snapshot refers to the same platform, video ID and media SHA-256;
- at least two snapshots have distinct capture timestamps;
- every snapshot is explicitly human-confirmed;
- unknown metrics remain `null`.

## Deliberate limits

The report may calculate observed deltas. It may not claim that a title, thumbnail, hook, topic, product or platform caused those changes.

The v1 gates therefore remain:

```text
causalClaimAllowed = false
automaticContentMutationAllowed = false
automaticRepublishingAllowed = false
humanReviewRequired = true
```

Views are treated as distribution evidence only. Completion-rate movement may trigger a suggestion to inspect the opening, but it is not proof that the opening caused the movement.

## Current production state

The first Replit Design case still has no real platform publication receipt and no real analytics snapshots. The runtime is therefore ready, but report generation remains blocked by truthful evidence rather than silently producing a demo result.
