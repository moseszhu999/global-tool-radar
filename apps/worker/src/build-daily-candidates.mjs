import { createSupabaseWorkerRepository } from "../../../packages/persistence/supabase-rest/src/index.mjs";
import { buildYouTubeDailyCandidates } from "../../../packages/youtube-momentum/src/index.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const repository = createSupabaseWorkerRepository({
  supabaseUrl: requiredEnv("SUPABASE_URL"),
  serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
});
const now = new Date();
const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
const rows = await repository.listYouTubeSnapshotSeries({ since });
const candidates = buildYouTubeDailyCandidates(rows, {
  now: now.toISOString(),
});
console.log(JSON.stringify(candidates.slice(0, 20), null, 2));
