export const TOOLRADAR_PRODUCT_CODE = "global-tool-radar";
export const TOOLRADAR_PROVIDER = "neon";

const RESOURCE_ID_PATTERN = /^[a-z0-9-]{6,80}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeResourceId(value, field) {
  assertNonEmptyString(value, field);
  const normalized = value.trim().toLowerCase();
  if (!RESOURCE_ID_PATTERN.test(normalized)) {
    throw new TypeError(`${field} is not a valid Neon resource id`);
  }
  return normalized;
}

function normalizeDatabaseName(value, field = "databaseName") {
  assertNonEmptyString(value, field);
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(normalized)) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function normalizeInstallationId(value, field = "installationId") {
  assertNonEmptyString(value, field);
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) {
    throw new TypeError(`${field} must be a UUID`);
  }
  return normalized;
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

function assertQuery(query) {
  if (typeof query !== "function") {
    throw new TypeError("query must be a function");
  }
}

function firstRow(payload) {
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (payload && typeof payload === "object") return payload;
  return null;
}

export function validateNeonDatabaseUrl(databaseUrl, expectedDatabaseName) {
  assertNonEmptyString(databaseUrl, "databaseUrl");
  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new TypeError("databaseUrl must use postgres or postgresql");
  }
  if (!url.hostname.toLowerCase().endsWith(".neon.tech")) {
    throw new TypeError("databaseUrl must use a canonical Neon hostname");
  }
  if (!url.username || !url.password) {
    throw new TypeError("databaseUrl must include database credentials");
  }
  const actualDatabaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const expected = normalizeDatabaseName(expectedDatabaseName, "expectedDatabaseName");
  if (actualDatabaseName !== expected) {
    throw new Error(
      `Neon database name mismatch: expected ${expected}, received ${actualDatabaseName}`,
    );
  }
  return Object.freeze({
    hostname: url.hostname.toLowerCase(),
    databaseName: actualDatabaseName,
  });
}

export function validateRuntimeIdentity(
  rawIdentity,
  {
    expectedProjectId,
    expectedBranchId,
    expectedDatabaseName,
    expectedInstallationId,
  },
) {
  if (!rawIdentity || typeof rawIdentity !== "object") {
    throw new Error("ToolRadar runtime identity is not initialized");
  }

  const productCode = rawIdentity.product_code ?? rawIdentity.productCode;
  const provider = rawIdentity.provider;
  const projectId = normalizeResourceId(
    rawIdentity.project_id ?? rawIdentity.projectId,
    "runtime project id",
  );
  const branchId = normalizeResourceId(
    rawIdentity.branch_id ?? rawIdentity.branchId,
    "runtime branch id",
  );
  const databaseName = normalizeDatabaseName(
    rawIdentity.database_name ?? rawIdentity.databaseName,
    "runtime database name",
  );
  const installationId = normalizeInstallationId(
    rawIdentity.installation_id ?? rawIdentity.installationId,
    "runtime installation id",
  );
  const schemaVersion = Number(
    rawIdentity.schema_version ?? rawIdentity.schemaVersion,
  );

  const expectedProject = normalizeResourceId(
    expectedProjectId,
    "expectedProjectId",
  );
  const expectedBranch = normalizeResourceId(
    expectedBranchId,
    "expectedBranchId",
  );
  const expectedDatabase = normalizeDatabaseName(
    expectedDatabaseName,
    "expectedDatabaseName",
  );
  const expectedInstallation = normalizeInstallationId(
    expectedInstallationId,
    "expectedInstallationId",
  );

  if (productCode !== TOOLRADAR_PRODUCT_CODE) {
    throw new Error(`Unexpected runtime product code: ${String(productCode)}`);
  }
  if (provider !== TOOLRADAR_PROVIDER) {
    throw new Error(`Unexpected runtime provider: ${String(provider)}`);
  }
  if (projectId !== expectedProject) {
    throw new Error(
      `Runtime project id mismatch: expected ${expectedProject}, received ${projectId}`,
    );
  }
  if (branchId !== expectedBranch) {
    throw new Error(
      `Runtime branch id mismatch: expected ${expectedBranch}, received ${branchId}`,
    );
  }
  if (databaseName !== expectedDatabase) {
    throw new Error(
      `Runtime database name mismatch: expected ${expectedDatabase}, received ${databaseName}`,
    );
  }
  if (installationId !== expectedInstallation) {
    throw new Error("Runtime installation id does not match this deployment");
  }
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Runtime schema version is missing or invalid");
  }

  return Object.freeze({
    productCode,
    provider,
    projectId,
    branchId,
    databaseName,
    installationId,
    schemaVersion,
    initializedAt: rawIdentity.initialized_at ?? rawIdentity.initializedAt ?? null,
  });
}

async function runIdentityQuery(query, text, params) {
  assertQuery(query);
  try {
    return await query(text, params);
  } catch (error) {
    throw new Error(`Neon runtime identity query failed (${safeDatabaseReason(error)})`);
  }
}

export async function initializeNeonRuntime({
  query,
  expectedProjectId,
  expectedBranchId,
  expectedDatabaseName,
  expectedInstallationId,
  confirmation,
}) {
  if (confirmation !== "INITIALIZE_DEDICATED_TOOLRADAR_NEON_DATABASE") {
    throw new Error(
      "Runtime initialization requires explicit dedicated-Neon confirmation",
    );
  }
  const projectId = normalizeResourceId(expectedProjectId, "expectedProjectId");
  const branchId = normalizeResourceId(expectedBranchId, "expectedBranchId");
  const databaseName = normalizeDatabaseName(
    expectedDatabaseName,
    "expectedDatabaseName",
  );
  const installationId = normalizeInstallationId(
    expectedInstallationId,
    "expectedInstallationId",
  );
  const rows = await runIdentityQuery(
    query,
    `SELECT * FROM public.initialize_toolradar_runtime_identity_v1($1, $2, $3, $4::uuid)`,
    [projectId, branchId, databaseName, installationId],
  );
  return validateRuntimeIdentity(firstRow(rows), {
    expectedProjectId: projectId,
    expectedBranchId: branchId,
    expectedDatabaseName: databaseName,
    expectedInstallationId: installationId,
  });
}

export async function verifyNeonRuntime({
  query,
  expectedProjectId,
  expectedBranchId,
  expectedDatabaseName,
  expectedInstallationId,
}) {
  const rows = await runIdentityQuery(
    query,
    `SELECT * FROM public.get_toolradar_runtime_identity_v1()`,
    [],
  );
  return validateRuntimeIdentity(firstRow(rows), {
    expectedProjectId,
    expectedBranchId,
    expectedDatabaseName,
    expectedInstallationId,
  });
}
