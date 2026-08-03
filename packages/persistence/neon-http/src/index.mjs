function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function assertQuery(query) {
  if (typeof query !== "function") {
    throw new TypeError("query must be a function");
  }
}

function normalizeTimestamp(value, field) {
  assertNonEmptyString(value, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function redactDatabaseSecrets(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]");
}

function safeDatabaseReason(error) {
  const code = error?.code ? `${error.code}: ` : "";
  return `${code}${redactDatabaseSecrets(error?.message ?? error ?? "unknown error")}`;
}

function mapWatchlistRow(row) {
  return Object.freeze({
    id: row.id,
    channelId: row.channel_id,
    title: row.title ?? null,
    uploadsPlaylistId: row.uploads_playlist_id ?? null,
    status: row.status,
    scanIntervalMinutes: row.scan_interval_minutes,
    nextScanAt: row.next_scan_at,
    lastScanAt: row.last_scan_at ?? null,
    lastSuccessAt: row.last_success_at ?? null,
    consecutiveFailures: row.consecutive_failures ?? 0,
    leaseOwner: row.lease_owner ?? null,
    leaseExpiresAt: row.lease_expires_at ?? null,
  });
}

export function createNeonWorkerRepository({ query } = {}) {
  assertQuery(query);

  async function run(text, params = []) {
    try {
      return await query(text, params);
    } catch (error) {
      throw new Error(`Neon query failed (${safeDatabaseReason(error)})`);
    }
  }

  return Object.freeze({
    async persistSourceCapture({ sourceItem, metricSnapshot }) {
      if (!sourceItem || typeof sourceItem !== "object") {
        throw new TypeError("sourceItem is required");
      }
      const rows = await run(
        `SELECT * FROM public.persist_toolradar_source_capture_v1(
          $1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz,
          $8::jsonb, $9, $10::jsonb
        )`,
        [
          sourceItem.sourceType,
          sourceItem.externalId,
          sourceItem.sourceUrl,
          sourceItem.title,
          sourceItem.body,
          sourceItem.publishedAt,
          sourceItem.capturedAt,
          JSON.stringify(sourceItem.rawPayload),
          sourceItem.contentHash,
          metricSnapshot ? JSON.stringify(metricSnapshot.metrics) : null,
        ],
      );
      const row = rows?.[0];
      if (!row?.source_identity_id) {
        throw new Error("Neon did not return a source identity id");
      }
      return Object.freeze({
        sourceIdentityId: row.source_identity_id,
        revisionInserted: row.revision_inserted === true,
        snapshotInserted: row.snapshot_inserted === true,
      });
    },

    async claimDueYouTubeChannels({ workerId, at, limit = 10, leaseMinutes = 15 }) {
      assertNonEmptyString(workerId, "workerId");
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError("limit must be an integer from 1 to 100");
      }
      if (!Number.isInteger(leaseMinutes) || leaseMinutes < 1 || leaseMinutes > 120) {
        throw new TypeError("leaseMinutes must be an integer from 1 to 120");
      }
      const rows = await run(
        `SELECT * FROM public.claim_toolradar_youtube_watchlist_v1(
          $1, $2, $3::timestamptz, $4
        )`,
        [workerId, limit, normalizeTimestamp(at, "at"), leaseMinutes],
      );
      return Object.freeze((rows ?? []).map(mapWatchlistRow));
    },

    async startIngestionRun({ watchlistId, workerId, startedAt }) {
      assertNonEmptyString(watchlistId, "watchlistId");
      assertNonEmptyString(workerId, "workerId");
      const rows = await run(
        `INSERT INTO public.toolradar_ingestion_runs (
          watchlist_id, worker_id, status, started_at
        ) VALUES ($1::uuid, $2, 'started', $3::timestamptz)
        RETURNING id`,
        [watchlistId, workerId, normalizeTimestamp(startedAt, "startedAt")],
      );
      const id = rows?.[0]?.id;
      if (!id) throw new Error("Neon did not return an ingestion run id");
      return id;
    },

    async completeYouTubeScan(input) {
      const rows = await run(
        `SELECT * FROM public.complete_toolradar_youtube_scan_v1(
          $1::uuid, $2::uuid, $3, $4::timestamptz, $5::timestamptz,
          $6, $7, $8, $9, $10
        )`,
        [
          input.watchlistId,
          input.runId,
          input.workerId,
          normalizeTimestamp(input.at, "at"),
          normalizeTimestamp(input.nextScanAt, "nextScanAt"),
          input.title,
          input.uploadsPlaylistId,
          input.scannedVideoCount,
          input.persistedRevisionCount,
          input.persistedSnapshotCount,
        ],
      );
      return rows?.[0] ?? null;
    },

    async failYouTubeScan(input) {
      const rows = await run(
        `SELECT * FROM public.fail_toolradar_youtube_scan_v1(
          $1::uuid, $2::uuid, $3, $4::timestamptz, $5::timestamptz,
          $6, $7
        )`,
        [
          input.watchlistId,
          input.runId,
          input.workerId,
          normalizeTimestamp(input.at, "at"),
          normalizeTimestamp(input.nextScanAt, "nextScanAt"),
          input.errorCode,
          input.errorMessage,
        ],
      );
      return rows?.[0] ?? null;
    },

    async listYouTubeSnapshotSeries({ since, limit = 5000 }) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20000) {
        throw new TypeError("limit must be an integer from 1 to 20000");
      }
      const rows = await run(
        `SELECT * FROM public.get_toolradar_youtube_snapshot_series_v1(
          $1::timestamptz, $2
        )`,
        [normalizeTimestamp(since, "since"), limit],
      );
      return Object.freeze(
        (rows ?? []).map((row) =>
          Object.freeze({
            sourceIdentityId: row.source_identity_id,
            externalId: row.external_id,
            title: row.title,
            publishedAt: row.published_at,
            channelId: row.channel_id,
            capturedAt: row.captured_at,
            viewCount: row.view_count === null ? null : Number(row.view_count),
          }),
        ),
      );
    },
  });
}
