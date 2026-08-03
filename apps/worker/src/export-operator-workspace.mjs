import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { createNeonWorkerRepository } from "../../../packages/persistence/neon-http/src/index.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { buildYouTubeDailyCandidates } from "../../../packages/youtube-momentum/src/index.mjs";
import {
  buildOperatorWorkspaceProjection,
  validateOperatorWorkspaceProjection,
} from "../../../packages/operator-workspace/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
await verifyNeonRuntime({ query, ...runtimeEnv });

const repository = createNeonWorkerRepository({ query });
const now = new Date();
const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
const rows = await repository.listYouTubeSnapshotSeries({ since });
const candidates = buildYouTubeDailyCandidates(rows, { now: now.toISOString() });
const projection = buildOperatorWorkspaceProjection(candidates.slice(0, 50), {
  generatedAt: now.toISOString(),
});
validateOperatorWorkspaceProjection(projection);

const outputPath = resolve(
  process.env.TOOLRADAR_WORKSPACE_OUTPUT || "apps/web/data/daily-candidates.json",
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schemaVersion: projection.schemaVersion,
  generatedAt: projection.generatedAt,
  candidateCount: projection.candidates.length,
  outputPath,
}, null, 2));
