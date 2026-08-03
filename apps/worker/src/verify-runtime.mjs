import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
const runtime = await verifyNeonRuntime({ query, ...runtimeEnv });

console.log(
  JSON.stringify(
    {
      verified: true,
      productCode: runtime.productCode,
      provider: runtime.provider,
      projectId: runtime.projectId,
      branchId: runtime.branchId,
      databaseName: runtime.databaseName,
      installationId: runtime.installationId,
      schemaVersion: runtime.schemaVersion,
    },
    null,
    2,
  ),
);
