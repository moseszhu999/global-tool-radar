# ToolRadar YouTube Provider Fallback v1

## Goal

Keep the public YouTube evidence loop operational when the keyless Atom feed is temporarily unavailable, without weakening provenance, coverage, secret isolation, or promotion gates.

## Provider order

1. Attempt the keyless YouTube Atom feed for every active channel.
2. Apply bounded retries to retryable feed failures.
3. When Atom coverage already satisfies the configured channel gate, do not call the YouTube Data API.
4. When Atom coverage is below the gate and an API key is available, call the official YouTube Data API only for channels that did not produce usable Atom evidence.
5. Merge successful provider results by stable video identity. Atom evidence wins on duplicate identities.
6. Recalculate the channel coverage gate after merging.
7. Fail closed when merged coverage remains below the gate.

For the current 11-channel watchlist and an 80% minimum ratio, at least 9 channels must produce usable public video evidence.

## Artifact contract

Mixed-provider output uses:

```text
youtube-public-capture-v1
```

Every video retains its actual ingestion source:

```text
youtube_atom_feed
youtube_data_api
```

The artifact remains:

```text
evidenceClass: public_metadata_capture
promotionGate: METRIC_CONFIRMATION_REQUIRED
```

Both the legacy `youtube-rss-pilot-v1` artifact and the new public-capture artifact use the same canonical Source Identity, Source Revision, Metric Snapshot, bounded batch importer, and import receipt.

## Secret boundary

Pull-request diagnostics:

- receive no YouTube API key;
- remain non-blocking because external feed availability is not a code-quality signal;
- upload an artifact only when the secret-free capture itself passes the coverage gate.

Scheduled and manually dispatched production captures:

- may receive `YOUTUBE_API_KEY` from GitHub Actions secrets;
- never print the key;
- redact keys from provider errors;
- remain strict and fail when neither provider reaches the coverage gate.

The workflow receives no Neon URL, database password, runtime installation identity, cookies, browser session, or publishing credential.

## Quota boundary

The API fallback is deliberately bounded:

- only failed Atom channels are queried;
- at most 15 recent videos are requested per fallback channel;
- one channel lookup, one uploads-playlist request, and one bounded video-details request are used per fallback channel;
- no search endpoint is used.

## Promotion boundary

Provider fallback changes availability only. It does not change momentum semantics.

`MOMENTUM_CONFIRMED` still requires:

- two observable snapshots of the same video;
- at least six hours between snapshots;
- canonical channel ownership;
- enough same-channel historical velocity intervals;
- a positive observable channel baseline.

Metadata captured through either provider remains pending until every gate is satisfied.
