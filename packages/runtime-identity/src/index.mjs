export const TOOLRADAR_PRODUCT_CODE = "global-tool-radar";
const SUPABASE_HOST_SUFFIX = ".supabase.co";
const PROJECT_REF_PATTERN = /^[a-z0-9-]{6,64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeProjectRef(value, field = "projectRef") {
  assertNonEmptyString(value, field);
  const normalized = value.trim().toLowerCase();
  if (!PROJECT_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${field} is not a valid Supabase project ref`);
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

export function extractSupabaseProjectRef(supabaseUrl) {
  assertNonEmptyString(supabaseUrl, "supabaseUrl");
  const url = new URL(supabaseUrl);
  if (url.protocol !== "https:") {
    throw new TypeError("supabaseUrl must use https");
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new TypeError(
      "supabaseUrl must use the canonical <project-ref>.supabase.co host",
    );
  }
  const projectRef = hostname.slice(0, -SUPABASE_HOST_SUFFIX.length);
  return normalizeProjectRef(projectRef, "supabaseUrl project ref");
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

async function postRpc({
  supabaseUrl,
  serviceRoleKey,
  functionName,
  body,
  fetchImpl,
}) {
  assertNonEmptyString(serviceRoleKey, "serviceRoleKey");
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }
  const url = new URL(
    `/rest/v1/rpc/${functionName}`,
    `${supabaseUrl.replace(/\/$/, "")}/`,
  );
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Supabase runtime identity request failed (${safeReason(
        payload,
        response.status,
      )}) on ${functionName}`,
    );
  }
  return payload;
}

function firstRow(payload) {
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (payload && typeof payload === "object") return payload;
  return null;
}

export function validateRuntimeIdentity(
  rawIdentity,
  { expectedProjectRef, expectedInstallationId },
) {
  if (!rawIdentity || typeof rawIdentity !== "object") {
    throw new Error("ToolRadar runtime identity is not initialized");
  }

  const actualProjectRef = normalizeProjectRef(
    rawIdentity.project_ref ?? rawIdentity.projectRef,
    "runtime project ref",
  );
  const actualInstallationId = normalizeInstallationId(
    rawIdentity.installation_id ?? rawIdentity.installationId,
    "runtime installation id",
  );
  const expectedRef = normalizeProjectRef(
    expectedProjectRef,
    "expectedProjectRef",
  );
  const expectedInstallation = normalizeInstallationId(
    expectedInstallationId,
    "expectedInstallationId",
  );
  const productCode = rawIdentity.product_code ?? rawIdentity.productCode;
  const schemaVersion = Number(
    rawIdentity.schema_version ?? rawIdentity.schemaVersion,
  );

  if (productCode !== TOOLRADAR_PRODUCT_CODE) {
    throw new Error(`Unexpected runtime product code: ${String(productCode)}`);
  }
  if (actualProjectRef !== expectedRef) {
    throw new Error(
      `Runtime project ref mismatch: expected ${expectedRef}, received ${actualProjectRef}`,
    );
  }
  if (actualInstallationId !== expectedInstallation) {
    throw new Error("Runtime installation id does not match this deployment");
  }
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Runtime schema version is missing or invalid");
  }

  return Object.freeze({
    productCode,
    projectRef: actualProjectRef,
    installationId: actualInstallationId,
    schemaVersion,
    initializedAt:
      rawIdentity.initialized_at ?? rawIdentity.initializedAt ?? null,
  });
}

function assertUrlMatchesExpected(supabaseUrl, expectedProjectRef) {
  const actualProjectRef = extractSupabaseProjectRef(supabaseUrl);
  const expectedRef = normalizeProjectRef(
    expectedProjectRef,
    "expectedProjectRef",
  );
  if (actualProjectRef !== expectedRef) {
    throw new Error(
      `Supabase URL project ref mismatch: expected ${expectedRef}, received ${actualProjectRef}`,
    );
  }
  return actualProjectRef;
}

export async function initializeSupabaseRuntime({
  supabaseUrl,
  serviceRoleKey,
  expectedProjectRef,
  expectedInstallationId,
  confirmation,
  fetchImpl = globalThis.fetch,
}) {
  if (confirmation !== "INITIALIZE_DEDICATED_TOOLRADAR_PROJECT") {
    throw new Error(
      "Runtime initialization requires explicit dedicated-project confirmation",
    );
  }
  const projectRef = assertUrlMatchesExpected(
    supabaseUrl,
    expectedProjectRef,
  );
  const installationId = normalizeInstallationId(
    expectedInstallationId,
    "expectedInstallationId",
  );
  const payload = await postRpc({
    supabaseUrl,
    serviceRoleKey,
    functionName: "initialize_toolradar_runtime_identity_v1",
    body: {
      p_project_ref: projectRef,
      p_installation_id: installationId,
    },
    fetchImpl,
  });
  return validateRuntimeIdentity(firstRow(payload), {
    expectedProjectRef: projectRef,
    expectedInstallationId: installationId,
  });
}

export async function verifySupabaseRuntime({
  supabaseUrl,
  serviceRoleKey,
  expectedProjectRef,
  expectedInstallationId,
  fetchImpl = globalThis.fetch,
}) {
  const projectRef = assertUrlMatchesExpected(
    supabaseUrl,
    expectedProjectRef,
  );
  const installationId = normalizeInstallationId(
    expectedInstallationId,
    "expectedInstallationId",
  );
  const payload = await postRpc({
    supabaseUrl,
    serviceRoleKey,
    functionName: "get_toolradar_runtime_identity_v1",
    body: {},
    fetchImpl,
  });
  return validateRuntimeIdentity(firstRow(payload), {
    expectedProjectRef: projectRef,
    expectedInstallationId: installationId,
  });
}
