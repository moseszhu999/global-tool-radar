# ToolRadar Production Evidence Loop v1

## Purpose

Turn a one-time public YouTube RSS capture into a repeatable evidence loop without putting database credentials in GitHub Actions and without treating metadata freshness as confirmed momentum.

## Fixed flow

```text
11 reviewed channel IDs
→ keyless public Atom capture
→ commit-bound JSON artifact
→ SHA-256 and structure validation
→ bounded atomic Neon batches
→ append-only Source Revision and Metric Snapshot
→ import receipt
→ second or later capture
→ relative velocity projection
→ explicit momentum gate
```

## Capture boundary

The scheduled GitHub workflow has only `contents: read`. It does not receive `DATABASE_URL`, Neon identifiers, a YouTube API key, cookies, browser credentials, or publication credentials. It uploads one JSON artifact retained for 14 days.

Every scheduled artifact records:

- artifact version;
- evidence class;
- capture timestamp;
- source commit SHA;
- GitHub run ID;
- requested, successful, and failed channels;
- normalized Source Items;
- observable Metric Snapshots;
- metadata-only candidate projection.

The artifact remains `METRIC_CONFIRMATION_REQUIRED` even when the Feed exposes a view count.

## Import boundary

`npm run import:youtube-rss-artifact` requires:

```text
TOOLRADAR_ARTIFACT_PATH
TOOLRADAR_ARTIFACT_SHA256
TOOLRADAR_ARTIFACT_COMMIT_SHA
TOOLRADAR_IMPORT_RECEIPT
TOOLRADAR_IMPORT_BATCH_SIZE
```

The importer verifies the artifact before database access, then verifies the Neon runtime identity before creating a write repository.

A batch contains at most 100 captures and defaults to 25. Each batch is passed as one JSON parameter to one PostgreSQL statement. That statement calls the existing canonical `persist_toolradar_source_capture_v1` owner for every capture. A malformed item rolls back its whole batch. Earlier completed batches remain safe because an exact rerun inserts zero duplicate revisions and zero duplicate snapshots.

The receipt is a file, not a new database owner. It records the artifact digest, source commit, batch counts, inserted revision and snapshot totals, and whether the import was an exact replay.

## Evidence ownership

This phase does not create another Tool, Source, Revision, Snapshot, Candidate, or Momentum table.

Canonical storage remains:

- `toolradar_source_identities`;
- `toolradar_source_revisions`;
- `toolradar_metric_snapshots`.

Metadata and momentum candidates remain deterministic read-time projections.

## Momentum confirmation gate

A video can become `MOMENTUM_CONFIRMED` only when all of the following are true:

1. at least two snapshots exist;
2. the latest snapshot interval is at least six hours;
3. both view counts are observable;
4. the channel identity is observable;
5. at least three other valid same-channel velocity intervals exist;
6. the channel baseline is positive.

Otherwise the item remains `METRIC_CONFIRMATION_REQUIRED` with explicit reason codes such as:

- `NEEDS_TWO_SNAPSHOTS`;
- `SNAPSHOT_INTERVAL_TOO_SHORT`;
- `VIEW_COUNT_NOT_OBSERVABLE`;
- `CHANNEL_ID_NOT_OBSERVABLE`;
- `CHANNEL_BASELINE_INSUFFICIENT`;
- `CHANNEL_BASELINE_NOT_POSITIVE`.

A decreasing public view count is preserved as observed evidence. It may pass the evidence gate but receives a zero relative-velocity score; the system never rewrites it as missing or positive growth.

## Deferred production setup

Password rotation and deployment-platform secret configuration remain intentionally deferred while this is a test project. They are required before unattended database import is enabled. The scheduled capture itself is already secret-free.
