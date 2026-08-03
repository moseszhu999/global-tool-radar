import {
  initializeSupabaseRuntime,
} from "../../../packages/runtime-identity/src/index.mjs";
import { readSupabaseRuntimeEnv } from "./runtime-env.mjs";

const runtime = await initializeSupabaseRuntime({
  ...readSupabaseRuntimeEnv(),
  confirmation: process.env.TOOLRADAR_RUNTIME_INITIALIZE_CONFIRMATION,
});

console.log(
  JSON.stringify(
    {
      productCode: runtime.productCode,
      projectRef: runtime.projectRef,
      installationId: runtime.installationId,
      schemaVersion: runtime.schemaVersion,
      initializedAt: runtime.initializedAt,
    },
    null,
    2,
  ),
);
