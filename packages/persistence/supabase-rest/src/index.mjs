function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeBaseUrl(value) {
  assertNonEmptyString(value, "supabaseUrl");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("supabaseUrl must use http or https");
  }
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

function normalizeTimestamp(value, field) {
  assertNonEmptyString(value, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function toQueryString(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

function safeReason(payload, status) {
  return (
    payload?.code ??
    payload?.error_code ??
    payload?.message ??
    payload?.error_description ??
    `HTTP ${status}`
  );
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

export function createSupabaseWorkerRepository({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeBaseUrl(supabaseUrl);
  assertNonEmptyString(serviceRoleKey, "serviceRoleKey");
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  const restBase = `${baseUrl}/rest/v1`;

  async function request(path, { method = "GET", query, body, prefer } = {}) {
    const response = await fetchImpl(`${restBase}/${path}${toQueryString(query)}`, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Supabase REST request failed (${safeReason(payload, response.status)}) on ${path}`);
    }
    return payload;
  }

  return Object.freeze({
    async persistSourceCapture({ sourceItem, metricSnapshot }) {
      if (!sourceItem || typeof sourceItem !== "object") {
        throw new TypeError("sourceItem is required");
      }
      const identities = await request("toolradar_source_identities", {
        method: "POST",
        query: {
          on_conflict: "source_type,external_id",
          select: "id,source_type,external_id,source_url",
        },
        prefer: "resolution=merge-duplicates,return=representation",
        body: {
          source_type: sourceItem.sourceType,
          external_id: sourceItem.externalId,
          source_url: sourceItem.sourceUrl,
        },
      });
      const identity = identities?.[0];
      if (!identity?.id) throw new Error("Supabase did not return a source identity id");

      const revisions = await request("toolradar_source_revisions", {
        method: "POST",
        query: {
          on_conflict: "source_identity_id,content_hash",
          select: "id",
        },
        prefer: "resolution=ignore-duplicates,return=representation",
        body: {
          source_identity_id: identity.id,
          title: sourceItem.title,
          body: sourceItem.body,
          published_at: sourceItem.publishedAt,
          captured_at: sourceItem.capturedAt,
          raw_payload: sourceItem.rawPayload,
          content_hash: sourceItem.contentHash,
        },
      });

      let snapshots = [];
      if (metricSnapshot) {
        snapshots = await request("toolradar_metric_snapshots", {
          method: "POST",
          query: {
            on_conflict: "source_identity_id,captured_at",
            select: "id",
          },
          prefer: "resolution=ignore-duplicates,return=representation",
          body: {
            source_identity_id: identity.id,
            captured_at: metricSnapshot.capturedAt,
            metrics: metricSnapshot.metrics,
          },
        });
      }

      return Object.freeze({
        sourceIdentityId: identity.id,
        revisionInserted: Array.isArray(revisions) && revisions.length > 0,
        snapshotInserted: Array.isArray(snapshots) && snapshots.length > 0,
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
      const rows = await request("rpc/claim_toolradar_youtube_watchlist_v1", {
        method: "POST",
        body: {
          p_worker_id: workerId,
          p_limit: limit,
          p_now: normalizeTimestamp(at, "at"),
          p_lease_minutes: leaseMinutes,
        },
      });
      return Object.freeze((rows ?? []).map(mapWatchlistRow));
    },

    async startIngestionRun({ watchlistId, workerId, startedAt }) {
      assertNonEmptyString(watchlistId, "watchlistId");
      assertNonEmptyString(workerId, "workerId");
      const rows = await request("toolradar_ingestion_runs", {
        method: "POST",
        query: { select: "id" },
        prefer: "return=representation",
        body: {
          watchlist_id: watchlistId,
          worker_id: workerId,
          status: "started",
          started_at: normalizeTimestamp(startedAt, "startedAt"),
        },
      });
      const id = rows?.[0]?.id;
      if (!id) throw new Error("Supabase did not return an ingestion run id");
      return id;
    },

    async completeYouTubeScan(input) {
      const rows = await request("rpc/complete_toolradar_youtube_scan_v1", {
        method: "POST",
        body: {
          p_watchlist_id: input.watchlistId,
          p_run_id: input.runId,
          p_worker_id: input.workerId,
          p_at: normalizeTimestamp(input.at, "at"),
          p_next_scan_at: normalizeTimestamp(input.nextScanAt, "nextScanAt"),
          p_title: input.title,
          p_uploads_playlist_id: input.uploadsPlaylistId,
          p_scanned_video_count: input.scannedVideoCount,
          p_persisted_revision_count: input.persistedRevisionCount,
          p_persisted_snapshot_count: input.persistedSnapshotCount,
        },
      });
      return rows?.[0] ?? rows ?? null;
    },

    async failYouTubeScan(input) {
      const rows = await request("rpc/fail_toolradar_youtube_scan_v1", {
        method: "POST",
        body: {
          p_watchlist_id: input.watchlistId,
          p_run_id: input.runId,
          p_worker_id: input.workerId,
          p_at: normalizeTimestamp(input.at, "at"),
          p_next_scan_at: normalizeTimestamp(input.nextScanAt, "nextScanAt"),
          p_error_code: input.errorCode,
          p_error_message: input.errorMessage,
        },
      });
      return rows?.[0] ?? rows ?? null;
    },

    async listYouTubeSnapshotSeries({ since, limit = 5000 }) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20000) {
        throw new TypeError("limit must be an integer from 1 to 20000");
      }
      const rows = await request("rpc/get_toolradar_youtube_snapshot_series_v1", {
        method: "POST",
        body: {
          p_since: normalizeTimestamp(since, "since"),
          p_limit: limit,
        },
      });
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
