import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { createNeonWorkerRepository } from "../../../packages/persistence/neon-http/src/index.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { buildYouTubeDailyCandidates } from "../../../packages/youtube-momentum/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
await verifyNeonRuntime({ query, ...runtimeEnv });

const repository = createNeonWorkerRepository({ query });
const now = new Date();
const since = new Date(
  now.getTime() - 14 * 24 * 60 * 60 * 1000,
).toISOString();
const rows = await repository.listYouTubeSnapshotSeries({ since });
const candidates = buildYouTubeDailyCandidates(rows, {
  now: now.toISOString(),
});
console.log(JSON.stringify(candidates.slice(0, 20), null, 2));
