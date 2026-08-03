import { createSupabaseWorkerRepository } from "../../../packages/persistence/supabase-rest/src/index.mjs";
import { verifySupabaseRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { buildYouTubeDailyCandidates } from "../../../packages/youtube-momentum/src/index.mjs";
import { readSupabaseRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readSupabaseRuntimeEnv();
await verifySupabaseRuntime(runtimeEnv);

const repository = createSupabaseWorkerRepository({
  supabaseUrl: runtimeEnv.supabaseUrl,
  serviceRoleKey: runtimeEnv.serviceRoleKey,
});
const now = new Date();
const since = new Date(
  now.getTime() - 14 * 24 * 60 * 60 * 1000,
).toISOString();
const rows = await repository.listYouTubeSnapshotSeries({ since });
const candidates = buildYouTubeDailyCandidates(rows, {
  now: now.toISOString(),
});
console.log(JSON.stringify(candidates.slice(0, 20), null, 2));
