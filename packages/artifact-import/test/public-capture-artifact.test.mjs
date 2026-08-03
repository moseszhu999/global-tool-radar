import assert from "node:assert/strict";
import test from "node:test";
import {
  importYouTubePublicArtifact,
  sha256Hex,
  validateYouTubePublicArtifact,
} from "../src/index.mjs";

const capturedAt = "2026-08-03T12:00:00.000Z";
const sourceCommitSha = "f".repeat(40);

function publicArtifact() {
  const externalId = "abcDEF12345";
  const sourceKey = `youtube_video:${externalId}`;
  return {
    artifactVersion: "youtube-public-capture-v1",
    evidenceClass: "public_metadata_capture",
    promotionGate: "METRIC_CONFIRMATION_REQUIRED",
    sourceCommitSha,
    capturedAt,
    videoCount: 1,
    metricSnapshotCount: 1,
    videos: [
      {
        channel: {
          channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
          title: "OpenAI",
        },
        ingestionSource: "youtube_data_api",
        sourceItem: {
          sourceType: "youtube_video",
          externalId,
          sourceKey,
          sourceUrl: `https://www.youtube.com/watch?v=${externalId}`,
          title: "A public API video",
          body: "Public description",
          publishedAt: "2026-08-03T10:00:00.000Z",
          capturedAt,
          rawPayload: {
            channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
            videoId: externalId,
            ingestionSource: "youtube_data_api",
          },
          contentHash: "b".repeat(64),
        },
        metricSnapshot: {
          sourceItemId: sourceKey,
          capturedAt,
          metrics: {
            viewCount: 100,
            likeCount: 5,
            commentCount: 2,
            voteCount: null,
            starCount: null,
            forkCount: null,
            downloadCount: null,
          },
        },
      },
    ],
  };
}

test("public capture artifacts use the canonical importer contract", async () => {
  const artifact = publicArtifact();
  const validated = validateYouTubePublicArtifact(artifact, {
    expectedSourceCommitSha: sourceCommitSha,
  });
  assert.equal(validated.artifactVersion, "youtube-public-capture-v1");
  assert.equal(validated.captures.length, 1);

  const digest = sha256Hex(JSON.stringify(artifact));
  const receipt = await importYouTubePublicArtifact({
    artifact,
    artifactSha256: digest,
    expectedArtifactSha256: digest,
    expectedSourceCommitSha: sourceCommitSha,
    repository: {
      async persistSourceCaptureBatch(captures) {
        return {
          processed: captures.length,
          revisionsInserted: captures.length,
          snapshotsInserted: captures.length,
        };
      },
    },
  });
  assert.equal(receipt.artifactVersion, "youtube-public-capture-v1");
  assert.equal(receipt.processed, 1);
});

test("unknown public capture versions remain rejected", () => {
  const artifact = publicArtifact();
  artifact.artifactVersion = "youtube-public-capture-v2";
  assert.throws(
    () => validateYouTubePublicArtifact(artifact),
    /Unsupported YouTube public capture artifact version/,
  );
});
