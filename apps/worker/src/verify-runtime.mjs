import {
  verifySupabaseRuntime,
} from "../../../packages/runtime-identity/src/index.mjs";
import { readSupabaseRuntimeEnv } from "./runtime-env.mjs";

const runtime = await verifySupabaseRuntime(readSupabaseRuntimeEnv());

console.log(
  JSON.stringify(
    {
      verified: true,
      productCode: runtime.productCode,
      projectRef: runtime.projectRef,
      installationId: runtime.installationId,
      schemaVersion: runtime.schemaVersion,
    },
    null,
    2,
  ),
);
