# ToolRadar M12 Publication Feedback Intake v1

## Business milestone

This runtime prepares the post-publication evidence boundary without claiming that a video was published.

```text
M11 release identity
→ empty publication receipt templates
→ empty analytics snapshot templates
→ exact media SHA-256 binding
→ receipt validation
→ metric validation
→ feedback readiness decision
```

## Current real-case state

The Replit Design media identity is bound to:

- case: `video-case:aw_nlbkzvyy`
- release package: `video-case:aw_nlbkzvyy:release:v1`
- media SHA-256: `13a72f8139040d15956c1cbc74d45f0193a7eb9269bbeec2e3a6292cddf87f1c`
- state: `AWAITING_REAL_PUBLICATION`

No platform video ID, public URL, publication timestamp, account credential or performance metric is present.

## Publication receipt gate

A receipt is accepted only when it includes:

- supported platform;
- exact release package, case and media digest;
- non-empty platform video ID;
- canonical HTTPS URL;
- publication and capture timestamps;
- an allowed capture method;
- explicit operator confirmation.

## Analytics snapshot gate

Metrics are accepted only after a valid publication receipt exists. Every snapshot must match the same platform video ID and media digest, include an observation timestamp and age window, use an allowed source, and contain at least one observed non-negative metric.

Missing values remain `null`; the runtime does not infer them.

## Readiness states

| State | Meaning | Optimization |
|---|---|---|
| `AWAITING_REAL_PUBLICATION` | No verified platform publication receipt | blocked |
| `PUBLISHED_AWAITING_METRICS` | Verified publication exists but no analytics snapshot | blocked |
| `REAL_METRICS_AVAILABLE` | At least one verified analytics snapshot exists | allowed for downstream analysis |

## Truth boundary

The runtime explicitly disables:

- fabricated publication receipts;
- fabricated metrics;
- automatic platform credential use;
- inference from missing metrics.

This milestone does not upload, publish, log in, authorize an account or claim platform performance.
