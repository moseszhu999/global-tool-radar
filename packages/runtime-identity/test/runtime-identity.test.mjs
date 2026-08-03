import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSupabaseProjectRef,
  initializeSupabaseRuntime,
  validateRuntimeIdentity,
  verifySupabaseRuntime,
} from "../src/index.mjs";

const projectRef = "abcdefghijklmnopqrst";
const installationId = "0198a52f-854d-7d93-a0c8-bc1952f4ef43";
const supabaseUrl = `https://${projectRef}.supabase.co`;

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

function identity() {
  return {
    product_code: "global-tool-radar",
    project_ref: projectRef,
    installation_id: installationId,
    schema_version: 1,
    initialized_at: "2026-08-03T01:00:00Z",
  };
}

test("canonical Supabase URL yields the project ref", () => {
  assert.equal(extractSupabaseProjectRef(supabaseUrl), projectRef);
  assert.throws(
    () => extractSupabaseProjectRef("https://database.example.com"),
    /canonical/,
  );
});

test("URL mismatch fails before any network request", async () => {
  let called = false;
  await assert.rejects(
    () =>
      verifySupabaseRuntime({
        supabaseUrl,
        serviceRoleKey: "secret",
        expectedProjectRef: "differentprojectref1",
        expectedInstallationId: installationId,
        fetchImpl: async () => {
          called = true;
          return response([]);
        },
      }),
    /URL project ref mismatch/,
  );
  assert.equal(called, false);
});

test("runtime identity validates product, project, installation and schema", () => {
  const result = validateRuntimeIdentity(identity(), {
    expectedProjectRef: projectRef,
    expectedInstallationId: installationId,
  });
  assert.equal(result.productCode, "global-tool-radar");
  assert.equal(result.schemaVersion, 1);
});

test("missing identity fails closed", async () => {
  await assert.rejects(
    () =>
      verifySupabaseRuntime({
        supabaseUrl,
        serviceRoleKey: "secret",
        expectedProjectRef: projectRef,
        expectedInstallationId: installationId,
        fetchImpl: async () => response([]),
      }),
    /not initialized/,
  );
});

test("service role key is not exposed by API failures", async () => {
  await assert.rejects(
    () =>
      verifySupabaseRuntime({
        supabaseUrl,
        serviceRoleKey: "super-secret-key",
        expectedProjectRef: projectRef,
        expectedInstallationId: installationId,
        fetchImpl: async () =>
          response(
            { code: "PGRST202", message: "function unavailable" },
            { ok: false, status: 404 },
          ),
      }),
    (error) =>
      error.message.includes("PGRST202") &&
      !error.message.includes("super-secret-key"),
  );
});

test("initialization requires explicit confirmation", async () => {
  await assert.rejects(
    () =>
      initializeSupabaseRuntime({
        supabaseUrl,
        serviceRoleKey: "secret",
        expectedProjectRef: projectRef,
        expectedInstallationId: installationId,
        confirmation: "YES",
        fetchImpl: async () => response([identity()]),
      }),
    /explicit dedicated-project confirmation/,
  );
});

test("initialization sends the bound project and installation identifiers", async () => {
  let request;
  const result = await initializeSupabaseRuntime({
    supabaseUrl,
    serviceRoleKey: "secret",
    expectedProjectRef: projectRef,
    expectedInstallationId: installationId,
    confirmation: "INITIALIZE_DEDICATED_TOOLRADAR_PROJECT",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response([identity()]);
    },
  });
  assert.match(request.url, /initialize_toolradar_runtime_identity_v1/);
  assert.deepEqual(JSON.parse(request.options.body), {
    p_project_ref: projectRef,
    p_installation_id: installationId,
  });
  assert.equal(result.installationId, installationId);
});
