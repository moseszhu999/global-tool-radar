# ToolRadar YouTube Metadata Candidates v1

## Purpose

This projection creates a useful daily queue before view-velocity history is available. It uses only public video metadata already stored as Source Revisions.

The command is:

```bash
npm run radar:metadata
```

It does not claim that a video or tool is trending. Every result is explicitly marked:

```text
signalClass = metadata_only
promotionGate = METRIC_CONFIRMATION_REQUIRED
```

## Read model

The read-only Neon projection selects the latest revision for each YouTube source identity. It supports both current ingestion shapes:

- YouTube Data API: `raw_payload.snippet.channelId`;
- YouTube Atom feed: `raw_payload.channelId`.

No schema change, materialized projection, table write, or score persistence is introduced.

## Metadata score

The metadata score is a queueing score, not the final ToolRadar opportunity score and not a momentum score.

Configured components:

- freshness: 60%;
- tracked-channel release density in the recent topic window: 20%;
- topic terms corroborated by distinct tracked channels: 20%.

Missing values remain missing. For example, when the channel ID is unavailable, release density and cross-channel topic evidence are `null`; they are not converted to zero. Coverage is exposed and ranking uses:

```text
rankingScore = metadataScore × coverage
```

## Topic corroboration

Topic extraction is deterministic and limited to significant title tokens after normalization and removal of generic video words. A repeated topic counts only when it appears on distinct channels. Multiple videos from one channel do not fabricate cross-channel corroboration.

The output records:

- shared topic tokens;
- corroborating channel IDs and count;
- tracked source owner and category when the channel is in the audited manifest;
- release count in the configured recent window;
- freshness, component scores, coverage, missing signals, and reason codes.

## Promotion boundary

Metadata candidates may be used to choose what should be inspected or tested next. They cannot be promoted to a momentum claim until observable metric evidence exists, such as multiple timestamped view snapshots supporting a velocity calculation.

This owner does not:

- infer views, likes, comments, or downloads;
- merge metadata score into the final business opportunity score;
- test a third-party tool;
- download or reuse media;
- generate scripts or videos;
- publish externally.
