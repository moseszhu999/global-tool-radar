import { readFile } from "node:fs/promises";
import { createYouTubeRssClient } from "../../../packages/connectors/youtube-rss/src/index.mjs";
import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { createNeonWorkerRepository } from "../../../packages/persistence/neon-http/src/index.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { runYouTubeRssBootstrap } from "../../../packages/youtube-rss-bootstrap/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery({ databaseUrl: runtimeEnv.databaseUrl });
await verifyNeonRuntime({ ...runtimeEnv, query });

const repository = createNeonWorkerRepository({ query });
const rssClient = createYouTubeRssClient();
const manifest = JSON.parse(
  await readFile(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);
const result = await runYouTubeRssBootstrap({
  repository,
  rssClient,
  channels: manifest.channels.filter((channel) => channel.status === "active"),
  capturedAt: new Date().toISOString(),
});

console.log(JSON.stringify(result, null, 2));
if (result.failedChannels > 0) process.exitCode = 1;
