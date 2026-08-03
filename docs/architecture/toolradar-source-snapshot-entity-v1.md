# ToolRadar Source Snapshot + Canonical Tool Entity v1

## Scope

This stage introduces the first persistent discovery boundary:

1. stable source identities;
2. immutable source revisions;
3. append-only metric snapshots;
4. canonical tool entities keyed by internal UUID and official domain;
5. explicit, evidence-bearing source-to-tool links;
6. a read-only YouTube Data API connector for channel uploads and video statistics.

## Owner boundaries

This stage owns:

- `packages/source-records/**`
- `packages/tool-entities/**`
- `packages/connectors/youtube/**`
- `supabase/migrations/20260803081000_toolradar_source_snapshot_entity_v1.sql`

It does not own opportunity scoring, browser testing, test evidence, scripts, rendering,
publishing, accounts, payments, or platform credentials.

## Deterministic identity rules

A source identity is `(source_type, external_id)`. Upstream metadata changes create a new
revision with a new SHA-256 `content_hash`; they do not overwrite history. Public metric
changes create metric snapshots against the stable source identity and do not create
content revisions.

A tool is not identified by its display name. Automatic confirmation is limited to strong
evidence such as the same normalized official domain or an explicit official link. A
name-only match is always a candidate and can never auto-merge.

Closed-source tools are valid canonical entities and do not require a GitHub repository.

## YouTube boundary

The connector follows the official low-cost channel-upload path:

- `channels.list(part=contentDetails,...)` resolves the uploads playlist;
- `playlistItems.list` discovers uploaded video IDs with pagination;
- `videos.list` fetches public video metadata and statistics in batches of at most 50.

The API key is passed only to the request URL and is redacted from error messages. The
connector does not download video media, captions, or creator assets.

## Missing and decreasing metrics

Unobserved counts are stored as `null`, never zero. Metric decreases are preserved as
observed changes because moderation or upstream corrections can reduce public counts.

## Persistence gate

RLS is enabled and v1 creates no permissive policies. The future web/worker identity owner
must define authorization before application access is enabled.
