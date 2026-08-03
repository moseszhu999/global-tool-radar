# ToolRadar YouTube Watchlist Runtime v1

## Purpose

This runtime turns the read-only YouTube connector into a repeatable worker pipeline:

1. claim due channels with a database lease;
2. resolve each channel's uploads playlist;
3. read public video metadata and statistics in batches;
4. persist stable identities, immutable revisions, and metric snapshots;
5. complete or fail the run atomically with the watchlist state;
6. derive reproducible daily candidates from snapshot velocity and freshness.

It does not download media or captions, register accounts, pay for services, generate content, or publish to Douyin/Bilibili.

## Runtime ownership

- `toolradar_youtube_channel_watchlist` owns scheduling and worker leases.
- `toolradar_ingestion_runs` owns execution outcomes.
- Source identity/revision/snapshot tables remain owned by Source Snapshot v1.
- `youtube-momentum` is a pure projection and does not rewrite snapshots.

## Concurrency and failure rules

- Claims use `FOR UPDATE SKIP LOCKED`.
- A worker must own the active lease to complete or fail a scan.
- Successful scans reset failures and schedule the configured interval.
- Failed scans use exponential backoff capped at 24 hours.
- API/service-role secrets are never included in stored errors.
- No anon or authenticated table policies are introduced.

## Candidate calculation

For each video, the latest observed views/hour is compared with the channel's historical median views/hour. The ratio is mapped through a bounded logarithmic score:

- 1x baseline = 50
- 2x baseline = 75
- 4x baseline = 100

Freshness contributes 20%. If channel history is insufficient, relative velocity stays unknown rather than becoming zero; the result exposes reduced coverage. Ranking uses `score × coverage`, so an unsupported fresh video cannot outrank a well-supported candidate merely because its missing signal was renormalized.

## Execution

Apply migrations, insert explicit channel IDs into the watchlist, and run:

```bash
npm run worker:youtube
npm run radar:daily
```

The worker requires backend-only `SUPABASE_SERVICE_ROLE_KEY`. It must never be exposed to a browser bundle.
