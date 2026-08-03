import { readFile } from "node:fs/promises";
import { buildYouTubeMetadataCandidates } from "../../../packages/metadata-candidates/src/index.mjs";
import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { createYouTubeMetadataReader } from "../../../packages/persistence/neon-http/src/youtube-metadata.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery(runtimeEnv.databaseUrl);
await verifyNeonRuntime({ query, ...runtimeEnv });

const metadataReader = createYouTubeMetadataReader({ query });
const manifest = JSON.parse(
  await readFile(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);
const now = new Date();
const since = new Date(
  now.getTime() - 14 * 24 * 60 * 60 * 1000,
).toISOString();
const rows = await metadataReader.listYouTubeMetadataRows({ since });
const candidates = buildYouTubeMetadataCandidates(rows, {
  now: now.toISOString(),
  channels: manifest.channels,
});

console.log(
  JSON.stringify(
    {
      generatedAt: now.toISOString(),
      signalClass: "metadata_only",
      promotionGate: "METRIC_CONFIRMATION_REQUIRED",
      observedVideos: rows.length,
      candidateCount: candidates.length,
      candidates: candidates.slice(0, 50),
    },
    null,
    2,
  ),
);
