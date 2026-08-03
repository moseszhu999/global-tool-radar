import { neon } from "@neondatabase/serverless";

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function redactDatabaseSecrets(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]");
}

export function createNeonQuery(databaseUrl) {
  assertNonEmptyString(databaseUrl, "databaseUrl");
  const sql = neon(databaseUrl);
  return async function query(text, params = []) {
    try {
      return await sql.query(text, params);
    } catch (error) {
      const code = error?.code ? `${error.code}: ` : "";
      const reason = redactDatabaseSecrets(error?.message ?? error ?? "unknown error");
      throw new Error(`Neon HTTP query failed (${code}${reason})`);
    }
  };
}
