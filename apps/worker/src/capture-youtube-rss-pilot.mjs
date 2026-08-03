import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createYouTubeRssClient } from "../../../packages/connectors/youtube-rss/src/index.mjs";
import { captureYouTubeRssPilot } from "../../../packages/youtube-rss-pilot/src/index.mjs";

const manifest = JSON.parse(
  await readFile(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);
const capturedAt =
  process.env.TOOLRADAR_PILOT_CAPTURED_AT ?? new Date().toISOString();
const outputPath =
  process.env.TOOLRADAR_PILOT_OUTPUT ?? "out/youtube-rss-pilot.json";

let artifact;
try {
  artifact = await captureYouTubeRssPilot({
    rssClient: createYouTubeRssClient(),
    channels: manifest.channels,
    capturedAt,
  });
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        error: error?.message ?? "YouTube RSS pilot failed",
        channels: (error?.channelResults ?? []).map((result) => ({
          channelId: result.channel.channelId,
          title: result.channel.title,
          status: result.status,
          error: result.error,
        })),
      },
      null,
      2,
    ),
  );
  throw error;
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, {
  encoding: "utf8",
  flag: "w",
});

console.log(
  JSON.stringify(
    {
      artifactVersion: artifact.artifactVersion,
      capturedAt: artifact.capturedAt,
      outputPath,
      requestedChannels: artifact.requestedChannels,
      succeededChannels: artifact.succeededChannels,
      failedChannels: artifact.failedChannels,
      videoCount: artifact.videoCount,
      metricSnapshotCount: artifact.metricSnapshotCount,
      promotionGate: artifact.promotionGate,
    },
    null,
    2,
  ),
);
