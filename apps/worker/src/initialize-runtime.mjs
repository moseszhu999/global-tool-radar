import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { initializeNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
const runtime = await initializeNeonRuntime({
  query,
  ...runtimeEnv,
  confirmation: process.env.TOOLRADAR_RUNTIME_INITIALIZE_CONFIRMATION,
});

console.log(
  JSON.stringify(
    {
      productCode: runtime.productCode,
      provider: runtime.provider,
      projectId: runtime.projectId,
      branchId: runtime.branchId,
      databaseName: runtime.databaseName,
      installationId: runtime.installationId,
      schemaVersion: runtime.schemaVersion,
      initializedAt: runtime.initializedAt,
    },
    null,
    2,
  ),
);
