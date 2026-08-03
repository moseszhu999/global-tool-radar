import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createYouTubeClient } from "../../../packages/connectors/youtube/src/index.mjs";
import { createYouTubeRssClient } from "../../../packages/connectors/youtube-rss/src/index.mjs";
import { buildYouTubeMetadataCandidates } from "../../../packages/metadata-candidates/src/index.mjs";
import { captureYouTubePublicMetadata } from "../../../packages/youtube-public-capture/src/index.mjs";
import { createResilientYouTubeRssClient } from "../../../packages/youtube-rss-resilience/src/index.mjs";

const manifest = JSON.parse(
  await readFile(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);
const capturedAt =
  process.env.TOOLRADAR_PILOT_CAPTURED_AT ?? new Date().toISOString();
const outputPath =
  process.env.TOOLRADAR_PILOT_OUTPUT ?? "out/youtube-public-capture.json";
const sourceCommitSha = process.env.TOOLRADAR_SOURCE_COMMIT_SHA ?? null;
const captureRunId = process.env.TOOLRADAR_CAPTURE_RUN_ID ?? null;
const minimumSuccessRatio = Number(
  process.env.TOOLRADAR_RSS_MINIMUM_SUCCESS_RATIO ?? 0.8,
);
const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim() || null;
if (sourceCommitSha !== null && !/^[0-9a-f]{40}$/.test(sourceCommitSha)) {
  throw new Error("TOOLRADAR_SOURCE_COMMIT_SHA must be a canonical commit SHA");
}

let artifact;
try {
  const rssClient = createResilientYouTubeRssClient({
    client: createYouTubeRssClient(),
    maxAttempts: 3,
    retryDelayMs: 250,
    maximumRetryDelayMs: 1000,
  });
  artifact = await captureYouTubePublicMetadata({
    rssClient,
    youtubeClient:
      youtubeApiKey === null
        ? null
        : createYouTubeClient({ apiKey: youtubeApiKey }),
    channels: manifest.channels,
    capturedAt,
    minimumSuccessRatio,
    maxVideosPerChannel: 15,
  });
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        code: error?.code ?? "YOUTUBE_PUBLIC_CAPTURE_FAILED",
        error: error?.message ?? "YouTube public capture failed",
        coverage: error?.coverage ?? null,
        apiFallbackConfigured: youtubeApiKey !== null,
        channels: (error?.channelResults ?? []).map((result) => ({
          channelId: result.channel.channelId,
          title: result.channel.title,
          status: result.status,
          provider: result.provider ?? null,
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
      captureMode: bundle.captureMode,
      requestedChannels: bundle.requestedChannels,
      succeededChannels: bundle.succeededChannels,
      failedChannels: bundle.failedChannels,
      requiredChannels: bundle.coverage.requiredChannels,
      videoCount: bundle.videoCount,
      metricSnapshotCount: bundle.metricSnapshotCount,
      metadataCandidateCount: bundle.metadataCandidateCount,
      providerSummary: bundle.providerSummary,
      promotionGate: bundle.promotionGate,
    },
    null,
    2,
  ),
);
