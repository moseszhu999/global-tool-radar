import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeNeonRuntime,
  validateNeonDatabaseUrl,
  validateRuntimeIdentity,
  verifyNeonRuntime,
} from "../src/index.mjs";

const projectId = "spring-bread-82251500";
const branchId = "br-sweet-paper-a63dx82m";
const databaseName = "neondb";
const installationId = "0198a52f-854d-7d93-a0c8-bc1952f4ef43";
const databaseUrl =
  "postgresql://neondb_owner:npg_secret@ep-example-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require";

function identity(overrides = {}) {
  return {
    product_code: "global-tool-radar",
    provider: "neon",
    project_id: projectId,
    branch_id: branchId,
    database_name: databaseName,
    installation_id: installationId,
    schema_version: 1,
    initialized_at: "2026-08-03T01:00:00Z",
    ...overrides,
  };
}

test("canonical Neon connection string validates the database", () => {
  const result = validateNeonDatabaseUrl(databaseUrl, databaseName);
  assert.equal(result.databaseName, databaseName);
  assert.match(result.hostname, /\.neon\.tech$/);
  assert.throws(
    () =>
      validateNeonDatabaseUrl(
        "postgresql://user:secret@database.example.com/neondb",
        databaseName,
      ),
    /canonical Neon hostname/,
  );
  assert.throws(
    () => validateNeonDatabaseUrl(databaseUrl, "otherdb"),
    /database name mismatch/,
  );
});

test("runtime identity validates provider and every deployment binding", () => {
  const result = validateRuntimeIdentity(identity(), {
    expectedProjectId: projectId,
    expectedBranchId: branchId,
    expectedDatabaseName: databaseName,
    expectedInstallationId: installationId,
  });
  assert.equal(result.provider, "neon");
  assert.equal(result.schemaVersion, 1);
  assert.throws(
    () =>
      validateRuntimeIdentity(identity({ branch_id: "br-different-branch" }), {
        expectedProjectId: projectId,
        expectedBranchId: branchId,
        expectedDatabaseName: databaseName,
        expectedInstallationId: installationId,
      }),
    /branch id mismatch/,
  );
});

test("missing identity fails closed", async () => {
  await assert.rejects(
    () =>
      verifyNeonRuntime({
        query: async () => [],
        expectedProjectId: projectId,
        expectedBranchId: branchId,
        expectedDatabaseName: databaseName,
        expectedInstallationId: installationId,
      }),
    /not initialized/,
  );
});

test("database credentials are redacted from query failures", async () => {
  await assert.rejects(
    () =>
      verifyNeonRuntime({
        query: async () => {
          throw new Error(
            "failed at postgresql://owner:npg_supersecret@host.neon.tech/neondb",
          );
        },
        expectedProjectId: projectId,
        expectedBranchId: branchId,
        expectedDatabaseName: databaseName,
        expectedInstallationId: installationId,
      }),
    (error) =>
      error.message.includes("[REDACTED_DATABASE_URL]") &&
      !error.message.includes("npg_supersecret"),
  );
});

test("initialization requires the dedicated Neon confirmation", async () => {
  await assert.rejects(
    () =>
      initializeNeonRuntime({
        query: async () => [identity()],
        expectedProjectId: projectId,
        expectedBranchId: branchId,
        expectedDatabaseName: databaseName,
        expectedInstallationId: installationId,
        confirmation: "YES",
      }),
    /explicit dedicated-Neon confirmation/,
  );
});

test("initialization sends project, branch, database, and installation bindings", async () => {
  let request;
  const result = await initializeNeonRuntime({
    query: async (text, params) => {
      request = { text, params };
      return [identity()];
    },
    expectedProjectId: projectId,
    expectedBranchId: branchId,
    expectedDatabaseName: databaseName,
    expectedInstallationId: installationId,
    confirmation: "INITIALIZE_DEDICATED_TOOLRADAR_NEON_DATABASE",
  });
  assert.match(request.text, /initialize_toolradar_runtime_identity_v1/);
  assert.deepEqual(request.params, [
    projectId,
    branchId,
    databaseName,
    installationId,
  ]);
  assert.equal(result.installationId, installationId);
});
