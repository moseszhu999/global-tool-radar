# ToolRadar YouTube RSS Pilot Artifact v1

## Purpose

This stage creates a real public-data capture without distributing a database password or requiring a YouTube Data API key.

The execution path is:

```text
Audited YouTube channel manifest
→ public YouTube Atom feeds
→ existing deterministic RSS normalizer
→ bounded pilot artifact
→ human / connector review
→ separate Neon persistence step
```

The GitHub Actions workflow is `.github/workflows/youtube-rss-pilot.yml`.

## Security boundary

The workflow has only:

```yaml
permissions:
  contents: read
```

It does not receive or reference:

- `DATABASE_URL`;
- Neon project, branch, installation, or password variables;
- `YOUTUBE_API_KEY`;
- GitHub Actions secrets;
- browser sessions or cookies.

The workflow therefore cannot access the ToolRadar database. It only retrieves public Atom feeds and uploads one JSON artifact with a seven-day retention period.

## Artifact contract

The command is:

```bash
npm run pilot:youtube-rss
```

The default output is:

```text
out/youtube-rss-pilot.json
```

The artifact records:

- capture timestamp;
- requested, successful, and failed channels;
- per-channel feed results;
- audited source-owner metadata from the watchlist manifest;
- normalized Source Item objects;
- Metric Snapshot objects only when a public count is explicitly present;
- explicit failures with credential redaction.

It never stores the raw XML response, database credentials, API keys, cookies, or media bytes.

## Evidence semantics

Every artifact is classified as:

```text
evidenceClass: public_metadata_capture
promotionGate: METRIC_CONFIRMATION_REQUIRED
```

A successful RSS capture proves that public metadata was observable at the capture time. It does not prove that a video is trending, that a tool is commercially attractive, or that a content-production decision should be made.

Missing public metrics remain `null`. They are not converted to zero.

## Failure behavior

- Paused or rejected manifest entries are excluded.
- One failed channel remains explicit but does not discard successful channels.
- If every channel fails, the command fails closed.
- If successful feeds contain no videos, the command fails closed.
- Duplicate stable video identities are accepted once.
- Response bodies and credentials are not copied into failure messages.

## Persistence boundary

Artifact creation and database persistence are intentionally separate.

The pilot workflow cannot write Neon. A reviewed artifact may later be persisted through the existing atomic `persist_toolradar_source_capture_v1` function by an authorized runtime or connected database controller. Exact replays remain idempotent because Source Revisions are keyed by content hash and Metric Snapshots by source identity plus capture timestamp.
