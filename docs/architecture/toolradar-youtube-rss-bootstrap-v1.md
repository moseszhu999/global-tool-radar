# ToolRadar YouTube RSS Bootstrap v1

## Purpose

The RSS bootstrap discovers recent public video metadata without a YouTube Data API key. It is a bootstrap and fallback signal, not a replacement for the canonical Data API collector.

The command is:

```bash
npm run bootstrap:youtube-rss
```

It reads the audited watchlist manifest, verifies the bound Neon runtime identity, retrieves each channel feed, normalizes entries into Source Revision and optional Metric Snapshot objects, and persists them through the existing atomic database function.

## Deterministic identity

Each video remains identified as:

```text
youtube_video:<video_id>
```

The Atom feed is another observation path for the existing source identity. It does not create a second YouTube entity owner.

## Revision and metric separation

The content revision payload includes:

- video ID;
- channel ID;
- title;
- description;
- publication and update timestamps;
- canonical watch link;
- ingestion source marker.

Public view count, when present in the feed, is stored only in Metric Snapshot. A view-count change therefore does not change the Source Revision hash.

If no valid public view count is present:

```text
metricSnapshot = null
```

It is never converted to zero. Rating counts are not treated as likes because their semantics are not equivalent.

## Failure behavior

- Feed/channel ID mismatches fail closed.
- Duplicate entries in one feed are deduplicated by stable video ID.
- A failed channel does not fabricate evidence and does not abort successful channels.
- HTTP response bodies are not copied into errors.
- Database connection strings and Neon password tokens are redacted.
- The command exits non-zero when any channel fails, while retaining the per-channel result report.

## Operational boundary

The public Atom endpoint is treated as a best-effort bootstrap surface and may change independently of the YouTube Data API. The Data API remains necessary for the governed uploads-playlist traversal and fuller statistics.

This owner does not:

- download video, audio, captions, or thumbnails;
- bypass authentication, quotas, or access controls;
- infer missing metrics;
- generate scripts or media;
- publish to YouTube, Douyin, Bilibili, or any other platform.
