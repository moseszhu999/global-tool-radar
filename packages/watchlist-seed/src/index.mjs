const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;
const ALLOWED_STATUS = new Set(["active", "paused", "rejected"]);

function assertQuery(query) {
  if (typeof query !== "function") {
    throw new TypeError("query must be a function");
  }
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function redactSecrets(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]");
}

export function validateWatchlistSeed(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new TypeError("entries must be a non-empty array");
  }

  const seen = new Set();
  return Object.freeze(
    entries.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new TypeError(`entries[${index}] must be an object`);
      }
      assertNonEmptyString(entry.channelId, `entries[${index}].channelId`);
      if (!CHANNEL_ID_PATTERN.test(entry.channelId)) {
        throw new TypeError(`entries[${index}].channelId is not canonical`);
      }
      if (seen.has(entry.channelId)) {
        throw new Error(`duplicate channel id: ${entry.channelId}`);
      }
      seen.add(entry.channelId);

      assertNonEmptyString(entry.title, `entries[${index}].title`);
      const status = entry.status ?? "active";
      if (!ALLOWED_STATUS.has(status)) {
        throw new TypeError(`entries[${index}].status is invalid`);
      }
      const interval = entry.scanIntervalMinutes ?? 120;
      if (!Number.isInteger(interval) || interval < 60 || interval > 10080) {
        throw new TypeError(
          `entries[${index}].scanIntervalMinutes must be an integer from 60 to 10080`,
        );
      }

      return Object.freeze({
        channelId: entry.channelId,
        title: entry.title.trim(),
        status,
        scanIntervalMinutes: interval,
      });
    }),
  );
}

export async function seedYouTubeWatchlist({ query, entries } = {}) {
  assertQuery(query);
  const validated = validateWatchlistSeed(entries);
  const results = [];

  for (const entry of validated) {
    try {
      const rows = await query(
        `INSERT INTO public.toolradar_youtube_channel_watchlist (
          channel_id, title, status, scan_interval_minutes
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (channel_id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          scan_interval_minutes = EXCLUDED.scan_interval_minutes,
          updated_at = now()
        RETURNING channel_id, title, status, scan_interval_minutes,
          next_scan_at, uploads_playlist_id, lease_owner`,
        [
          entry.channelId,
          entry.title,
          entry.status,
          entry.scanIntervalMinutes,
        ],
      );
      const row = rows?.[0];
      if (!row?.channel_id) {
        throw new Error("database did not return a channel id");
      }
      results.push(
        Object.freeze({
          channelId: row.channel_id,
          title: row.title,
          status: row.status,
          scanIntervalMinutes: row.scan_interval_minutes,
          nextScanAt: row.next_scan_at,
          uploadsPlaylistId: row.uploads_playlist_id ?? null,
          leaseOwner: row.lease_owner ?? null,
        }),
      );
    } catch (error) {
      throw new Error(
        `Watchlist seed failed for ${entry.channelId} (${redactSecrets(
          error?.message ?? error,
        )})`,
      );
    }
  }

  return Object.freeze({
    requested: validated.length,
    seeded: results.length,
    channels: Object.freeze(results),
  });
}
