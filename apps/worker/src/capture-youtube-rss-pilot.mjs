import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createYouTubeRssClient } from "../../../packages/connectors/youtube-rss/src/index.mjs";
import { buildYouTubeMetadataCandidates } from "../../../packages/metadata-candidates/src/index.mjs";
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
const sourceCommitSha = process.env.TOOLRADAR_SOURCE_COMMIT_SHA ?? null;
const captureRunId = process.env.TOOLRADAR_CAPTURE_RUN_ID ?? null;
if (sourceCommitSha !== null && !/^[0-9a-f]{40}$/.test(sourceCommitSha)) {
  throw new Error("TOOLRADAR_SOURCE_COMMIT_SHA must be a canonical commit SHA");
}

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

const candidateRows = artifact.videos.map((video) => ({
  sourceIdentityId: video.sourceItem.sourceKey,
  externalId: video.sourceItem.externalId,
  sourceUrl: video.sourceItem.sourceUrl,
  title: video.sourceItem.title,
  body: video.sourceItem.body,
  publishedAt: video.sourceItem.publishedAt,
  channelId: video.sourceItem.rawPayload.channelId ?? null,
  capturedAt: video.sourceItem.capturedAt,
  ingestionSource: video.ingestionSource,
}));
const metadataCandidates = buildYouTubeMetadataCandidates(candidateRows, {
  now: artifact.capturedAt,
  channels: manifest.channels,
});
const bundle = Object.freeze({
  ...artifact,
  sourceCommitSha,
  captureRunId,
  metadataCandidateVersion: "youtube-metadata-v1",
  metadataCandidateCount: metadataCandidates.length,
  metadataCandidates,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, {
  encoding: "utf8",
  flag: "w",
});

console.log(
  JSON.stringify(
    {
      artifactVersion: bundle.artifactVersion,
      sourceCommitSha: bundle.sourceCommitSha,
      captureRunId: bundle.captureRunId,
      capturedAt: bundle.capturedAt,
      outputPath,
      requestedChannels: bundle.requestedChannels,
      succeededChannels: bundle.succeededChannels,
      failedChannels: bundle.failedChannels,
      videoCount: bundle.videoCount,
      metricSnapshotCount: bundle.metricSnapshotCount,
      metadataCandidateCount: bundle.metadataCandidateCount,
      promotionGate: bundle.promotionGate,
    },
    null,
    2,
  ),
);
