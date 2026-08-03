function assertQuery(query) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
}

function redactDatabaseSecrets(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]");
}

function normalizeCapture(capture, index) {
  if (!capture || typeof capture !== "object" || !capture.sourceItem) {
    throw new TypeError(`captures[${index}].sourceItem is required`);
  }
  const { sourceItem, metricSnapshot = null } = capture;
  return {
    source_type: sourceItem.sourceType,
    external_id: sourceItem.externalId,
    source_url: sourceItem.sourceUrl,
    title: sourceItem.title,
    body: sourceItem.body ?? "",
    published_at: sourceItem.publishedAt ?? null,
    captured_at: sourceItem.capturedAt,
    raw_payload: sourceItem.rawPayload,
    content_hash: sourceItem.contentHash,
    metrics: metricSnapshot?.metrics ?? null,
  };
}

export function createNeonArtifactImportRepository({ query } = {}) {
  assertQuery(query);
  return Object.freeze({
    async persistSourceCaptureBatch(captures) {
      if (!Array.isArray(captures) || captures.length < 1 || captures.length > 100) {
        throw new TypeError("captures must contain from 1 to 100 items");
      }
      const payload = captures.map(normalizeCapture);
      let rows;
      try {
        rows = await query(
          `WITH payload AS (
            SELECT *
            FROM jsonb_to_recordset($1::jsonb) AS x(
              source_type text,
              external_id text,
              source_url text,
              title text,
              body text,
              published_at timestamptz,
              captured_at timestamptz,
              raw_payload jsonb,
              content_hash text,
              metrics jsonb
            )
          ), persisted AS (
            SELECT p.external_id, r.revision_inserted, r.snapshot_inserted
            FROM payload p
            CROSS JOIN LATERAL public.persist_toolradar_source_capture_v1(
              p.source_type,
              p.external_id,
              p.source_url,
              p.title,
              p.body,
              p.published_at,
              p.captured_at,
              p.raw_payload,
              p.content_hash,
              p.metrics
            ) r
          )
          SELECT
            count(*)::integer AS processed,
            count(*) FILTER (WHERE revision_inserted)::integer AS revisions_inserted,
            count(*) FILTER (WHERE snapshot_inserted)::integer AS snapshots_inserted
          FROM persisted`,
          [JSON.stringify(payload)],
        );
      } catch (error) {
        const code = error?.code ? `${error.code}: ` : "";
        const reason = redactDatabaseSecrets(error?.message ?? error ?? "unknown error");
        throw new Error(`Neon artifact batch failed (${code}${reason})`);
      }
      const row = rows?.[0];
      if (!row) throw new Error("Neon artifact batch returned no receipt");
      return Object.freeze({
        processed: Number(row.processed),
        revisionsInserted: Number(row.revisions_inserted),
        snapshotsInserted: Number(row.snapshots_inserted),
      });
    },
  });
}
