import { createYouTubeClient } from "../../../packages/connectors/youtube/src/index.mjs";
import { createSupabaseWorkerRepository } from "../../../packages/persistence/supabase-rest/src/index.mjs";
import { runYouTubeWatchlistBatch } from "../../../packages/youtube-ingestion/src/index.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const repository = createSupabaseWorkerRepository({
  supabaseUrl: requiredEnv("SUPABASE_URL"),
  serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
});
const youtubeClient = createYouTubeClient({
  apiKey: requiredEnv("YOUTUBE_API_KEY"),
});

const result = await runYouTubeWatchlistBatch({
  repository,
  youtubeClient,
  workerId: requiredEnv("TOOLRADAR_WORKER_ID"),
  limit: Number(process.env.TOOLRADAR_CLAIM_LIMIT ?? 10),
  maxPages: Number(process.env.TOOLRADAR_YOUTUBE_MAX_PAGES ?? 2),
});

console.log(JSON.stringify(result, null, 2));
if (result.failed > 0) process.exitCode = 1;
