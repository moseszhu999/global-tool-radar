# ToolRadar YouTube Public Capture Receipt — Run 30796846375

## Status

`VERIFIED`

This receipt records the first commit-bound production capture generated after `YOUTUBE_API_KEY` was configured in GitHub Actions.

The key was available to the scheduled/manual production step, but this run did not consume YouTube Data API quota because the public Atom feeds recovered and satisfied the coverage gate by themselves.

## Source run

- GitHub Actions run: `30796846375`
- Source commit: `b650b3b21876612b2e24c65eb825c3bd360a254e`
- Artifact version: `youtube-public-capture-v1`
- Artifact ID: `8849196993`
- Captured at: `2026-08-03T08:18:01.943Z`
- Artifact ZIP SHA-256: `e333bee5e9c91e0d420326f88a81172cb55f68ba304a2c68ea3a33297f17bec4`
- Artifact JSON SHA-256: `baa854af766bdcdd1398d065ef115790080bad4b72300c984da7628d3260ed08`

## Capture coverage

| Measure | Result |
|---|---:|
| Requested channels | 11 |
| Successful channels | 11 |
| Failed channels | 0 |
| Required channels | 9 |
| Videos | 165 |
| Metric snapshots | 165 |
| Metadata candidates | 77 |

Provider result:

- RSS attempted: `11`
- RSS succeeded: `11`
- YouTube Data API available: `true`
- YouTube Data API attempted: `0`
- Evidence source: `165 × youtube_atom_feed`

The successful result proves that the production workflow can receive the restricted GitHub Secret without leaking it. It does not yet prove a live API fallback request because RSS coverage made fallback unnecessary.

## Neon import

The dedicated Neon runtime already contained the same 165 stable YouTube video identities and their first snapshot.

The production artifact was imported as a metric-only capture against the existing immutable source revisions:

| Measure | Result |
|---|---:|
| Requested | 165 |
| Matched existing sources | 165 |
| Processed | 165 |
| Revisions inserted | 0 |
| Snapshots inserted | 165 |

The complete operation used one PostgreSQL statement. Any failure would have rolled back the whole import.

Exact replay result:

| Measure | Result |
|---|---:|
| Processed | 165 |
| Revisions inserted | 0 |
| Snapshots inserted | 0 |

## Database tie-out

Verified at `2026-08-03T08:32:50.529Z`:

- Source identities: `165`
- Source revisions: `165`
- Metric snapshots: `330`
- Active channels: `11`
- Videos with measured intervals: `165`
- Positive view intervals: `140`
- Zero view intervals: `25`
- Negative view intervals: `0`
- Channels with interval evidence: `11`
- Intervals per channel: `15`
- Channels with a positive median velocity baseline: `10`

The measured interval was `3.2374172222` hours for every video. Average observed growth was `1,309.36` views and the largest observed increase was `189,395` views.

## Leading observations

These values are observations, not editorial recommendations:

1. `Making New York City miniature with Claude`: `+189,395` views.
2. `Reconstructing Pelé’s lost goal`: `+13,983` views.
3. `Seedance 2.5 is Here — Everything You need to Know`: `+4,892` views.
4. `Introducing Replit Design`: `+1,727` views.
5. `Why OpenClaw feels like the Linux of AI`: `+382` views.

The first two entries demonstrate why raw view deltas cannot be treated as product opportunity scores without channel baselines, freshness, tool ownership and editorial review.

## Promotion boundary

Current gate:

```text
METRIC_CONFIRMATION_REQUIRED
```

Blocking reason:

```text
SNAPSHOT_INTERVAL_TOO_SHORT
```

The production runtime requires at least six hours between eligible snapshots. The observed interval is only `3.2374172222` hours, so the correct confirmed-momentum count remains `0`.

A later eligible capture and canonical import are still required before any item can become `MOMENTUM_CONFIRMED`.
