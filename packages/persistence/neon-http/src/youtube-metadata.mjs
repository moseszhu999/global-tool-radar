function assertQuery(query) {
  if (typeof query !== "function") {
    throw new TypeError("query must be a function");
  }
}

function normalizeTimestamp(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
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

export function createYouTubeMetadataReader({ query } = {}) {
  assertQuery(query);

  return Object.freeze({
    async listYouTubeMetadataRows({ since, limit = 5000 } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20000) {
        throw new TypeError("limit must be an integer from 1 to 20000");
      }
      try {
        const rows = await query(
          `WITH latest_revision AS (
            SELECT DISTINCT ON (revision.source_identity_id)
              identity.id AS source_identity_id,
              identity.external_id,
              identity.source_url,
              revision.title,
              revision.body,
              revision.published_at,
              revision.captured_at,
              revision.raw_payload
            FROM public.toolradar_source_revisions revision
            JOIN public.toolradar_source_identities identity
              ON identity.id = revision.source_identity_id
            WHERE identity.source_type = 'youtube_video'
              AND revision.published_at >= $1::timestamptz
            ORDER BY revision.source_identity_id,
              revision.captured_at DESC,
              revision.id DESC
          )
          SELECT
            source_identity_id,
            external_id,
            source_url,
            title,
            body,
            published_at,
            COALESCE(
              raw_payload #>> '{snippet,channelId}',
              raw_payload ->> 'channelId'
            ) AS channel_id,
            captured_at,
            COALESCE(
              raw_payload ->> 'ingestionSource',
              'youtube_data_api'
            ) AS ingestion_source
          FROM latest_revision
          ORDER BY published_at DESC, source_identity_id
          LIMIT $2`,
          [normalizeTimestamp(since, "since"), limit],
        );
        return Object.freeze(
          (rows ?? []).map((row) =>
            Object.freeze({
              sourceIdentityId: row.source_identity_id,
              externalId: row.external_id,
              sourceUrl: row.source_url,
              title: row.title,
              body: row.body ?? "",
              publishedAt: row.published_at,
              channelId: row.channel_id ?? null,
              capturedAt: row.captured_at,
              ingestionSource: row.ingestion_source ?? null,
            }),
          ),
        );
      } catch (error) {
        throw new Error(
          `YouTube metadata query failed (${redactDatabaseSecrets(
            error?.message ?? error ?? "unknown error",
          )})`,
        );
      }
    },
  });
}
