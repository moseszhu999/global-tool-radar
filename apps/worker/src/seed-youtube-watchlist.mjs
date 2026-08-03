import { readFile } from "node:fs/promises";
import { createNeonQuery } from "../../../packages/persistence/neon-http/src/client.mjs";
import { verifyNeonRuntime } from "../../../packages/runtime-identity/src/index.mjs";
import { seedYouTubeWatchlist } from "../../../packages/watchlist-seed/src/index.mjs";
import { readNeonRuntimeEnv } from "./runtime-env.mjs";

const runtimeEnv = readNeonRuntimeEnv();
const query = createNeonQuery({ databaseUrl: runtimeEnv.databaseUrl });
await verifyNeonRuntime({ ...runtimeEnv, query });

const manifest = JSON.parse(
  await readFile(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);
const result = await seedYouTubeWatchlist({
  query,
  entries: manifest.channels,
});

console.log(
  JSON.stringify(
    {
      version: manifest.version,
      verifiedAt: manifest.verifiedAt,
      requested: result.requested,
      seeded: result.seeded,
      channels: result.channels.map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        status: channel.status,
      })),
    },
    null,
    2,
  ),
);
