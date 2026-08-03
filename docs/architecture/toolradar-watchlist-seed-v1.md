# ToolRadar YouTube Watchlist Seed v1

## Purpose

This owner makes the initial public-channel watchlist reproducible. It does not decide content rights, download media, create scripts, or publish videos.

## Canonical input

`config/youtube-watchlist.v1.json` contains stable YouTube `UC...` channel IDs, display titles, official handles, categories, scan intervals, and public evidence URLs.

Channel IDs are used instead of names or handles because names and handles can change. A seed entry is accepted only when:

- the ID is canonical and unique;
- the title is non-empty;
- the status is bounded to active, paused, or rejected;
- the scan interval is between one hour and seven days;
- a human-reviewable evidence URL is recorded in the manifest.

## Idempotent seed behavior

`npm run watchlist:seed` verifies the Neon runtime identity before any write. It then upserts each channel by stable channel ID.

The seed command may update only:

- title;
- status;
- scan interval;
- updated timestamp.

It must not overwrite:

- `next_scan_at`;
- `uploads_playlist_id` discovered by the collector;
- last scan or success timestamps;
- failure counters;
- errors;
- lease owner or lease expiry.

This allows the manifest to be reapplied without resetting production scheduling or erasing runtime evidence.

## Initial categories

The first seed intentionally spans several signal classes:

- foundation models;
- coding agents;
- AI search;
- voice generation;
- video generation and editing;
- developer platforms;
- design tools.

The list is a discovery seed, not a ranking, endorsement, or exhaustive market map.

## Security boundary

Database credentials and YouTube API keys are never stored in the manifest or repository. Runtime errors redact PostgreSQL connection strings and Neon password tokens. Credentials must be installed directly in the selected deployment platform, not pasted into source control or chat logs.
