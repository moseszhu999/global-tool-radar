# ToolRadar M12 Feedback Report Workbench v1

## Purpose

Turn the bounded feedback runtime into a local operator workflow without creating platform activity or inventing metrics.

```text
human-confirmed publication receipt
+ at least two matching human-confirmed analytics snapshots
+ exact media SHA-256
→ observed metric deltas
→ bounded recommendations
→ downloadable report JSON
```

## Operator flow

Open `/publication-feedback-workbench.html`, then:

1. import one real `publication-receipt` JSON;
2. import at least two real `analytics-snapshot` JSON files;
3. confirm that all files refer to the same real platform publication;
4. generate and inspect the bounded report;
5. download the report JSON for human review.

## Required identity checks

Every snapshot must match the publication receipt on:

- platform;
- platform video ID;
- media SHA-256;
- publication and capture chronology;
- explicit human confirmation.

Unknown metrics remain `null`. A single snapshot is insufficient.

## Authority boundary

The page is static and local-only. It performs no platform login, OAuth flow, network request, credential storage, server write, database write, content mutation or republication.

The generated report always preserves:

```text
causalClaimAllowed = false
automaticContentMutationAllowed = false
automaticRepublishingAllowed = false
humanReviewRequired = true
```

## Current real-case status

The Replit Design case still lacks a real platform publication and two real analytics snapshots. The workbench is therefore operational, while report generation for that case remains truthfully blocked.
