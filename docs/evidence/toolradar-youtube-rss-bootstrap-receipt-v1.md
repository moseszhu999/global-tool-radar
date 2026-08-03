# ToolRadar YouTube RSS Bootstrap Receipt v1

## Status

`VERIFIED`

This receipt records the one-time historical bootstrap of the first complete YouTube RSS artifact into the dedicated Neon runtime.

It is evidence of database initialization. It is **not** a production momentum snapshot and cannot, by itself, satisfy `MOMENTUM_CONFIRMED`.

## Source artifact

- Artifact version: `youtube-rss-pilot-v1`
- Captured at: `2026-08-03T05:03:47.241Z`
- JSON SHA-256: `813b1e3c8a3ee01de05f385c1e3f2f499de0ba2a727ce6c6c8202a14ae269ba3`
- Requested channels: `11`
- Successful channels: `11`
- Failed channels: `0`
- Videos: `165`
- Observable view snapshots: `165`
- Source commit binding: unavailable because this artifact predates that field

## Import treatment

The existing 15 records were retained. The remaining 150 records were imported in four atomic batches:

| Batch | Processed | Revisions inserted | Snapshots inserted |
|---|---:|---:|---:|
| 1 | 38 | 38 | 38 |
| 2 | 38 | 38 | 38 |
| 3 | 38 | 38 | 38 |
| 4 | 36 | 36 | 36 |
| **Total** | **150** | **150** | **150** |

The historical artifact was normalized as `youtube-rss-minimal-metadata-v1`. Each imported revision retains:

- stable YouTube video ID;
- canonical video URL;
- title;
- publication time;
- canonical channel ID;
- capture time;
- observed view count;
- originating Artifact SHA-256.

Long descriptions were intentionally omitted from this bootstrap revision. The original artifact remains the content-complete evidence source identified by its SHA-256.

## Database verification

Verified at `2026-08-03T06:19:17.579Z` against Neon project `super-night-56614593`, database `neondb`:

- Source identities: `165`
- Source revisions: `165`
- Metric snapshots: `165`
- Active watchlist channels: `11`
- Channels represented in bootstrap evidence: `11`
- Revisions per channel: `15`
- Bootstrap revisions: `150`
- Distinct bootstrap artifact digests: `1`

## Promotion boundary

This receipt does not change the production gate.

A candidate may become `MOMENTUM_CONFIRMED` only after the runtime has:

1. a commit-bound eligible capture;
2. at least 9 of 11 active channels successfully captured;
3. two observable snapshots for the same video;
4. at least six hours between those snapshots;
5. sufficient same-channel historical velocity intervals;
6. a positive observable channel baseline.

The bootstrap records can support historical context, but they must never be relabeled as a commit-bound production capture.
