import { validateNeonDatabaseUrl } from "../../../packages/runtime-identity/src/index.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readNeonRuntimeEnv() {
  const runtime = Object.freeze({
    databaseUrl: requiredEnv("DATABASE_URL"),
    expectedProjectId: requiredEnv("TOOLRADAR_NEON_PROJECT_ID"),
    expectedBranchId: requiredEnv("TOOLRADAR_NEON_BRANCH_ID"),
    expectedDatabaseName: requiredEnv("TOOLRADAR_DATABASE_NAME"),
    expectedInstallationId: requiredEnv("TOOLRADAR_INSTALLATION_ID"),
  });
  validateNeonDatabaseUrl(runtime.databaseUrl, runtime.expectedDatabaseName);
  return runtime;
}
