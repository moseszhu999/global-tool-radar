import assert from "node:assert/strict";
import test from "node:test";
import {
  importYouTubeRssArtifact,
  sha256Hex,
  validateYouTubeRssArtifact,
} from "../src/index.mjs";

const capturedAt = "2026-08-03T05:03:47.241Z";
const sourceCommitSha = "a".repeat(40);

function capture(externalId = "abcDEF12345") {
  const sourceKey = `youtube_video:${externalId}`;
  return {
    channel: {
      channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
      title: "OpenAI",
    },
    sourceItem: {
      sourceType: "youtube_video",
      externalId,
      sourceKey,
      sourceUrl: `https://www.youtube.com/watch?v=${externalId}`,
      title: "A public video",
      body: "Public description",
      publishedAt: "2026-08-03T01:00:00.000Z",
      capturedAt,
      rawPayload: {
        channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
        videoId: externalId,
        ingestionSource: "youtube_atom_feed",
      },
      contentHash: "b".repeat(64),
    },
    metricSnapshot: {
      sourceItemId: sourceKey,
      capturedAt,
      metrics: {
        viewCount: 100,
        likeCount: null,
        commentCount: null,
        voteCount: null,
        starCount: null,
        forkCount: null,
        downloadCount: null,
      },
    },
  };
}

function artifact(videos = [capture()]) {
  return {
    artifactVersion: "youtube-rss-pilot-v1",
    evidenceClass: "public_metadata_capture",
    promotionGate: "METRIC_CONFIRMATION_REQUIRED",
    sourceCommitSha,
    capturedAt,
    videoCount: videos.length,
    metricSnapshotCount: videos.length,
    videos,
  };
}

test("artifact validation binds the digest, source commit, and canonical evidence", async () => {
  const value = artifact();
  const bytes = `${JSON.stringify(value)}\n`;
  const digest = sha256Hex(bytes);
  let received;
  const receipt = await importYouTubeRssArtifact({
    artifact: value,
    artifactSha256: digest,
    expectedArtifactSha256: digest,
    expectedSourceCommitSha: sourceCommitSha,
    batchSize: 25,
    repository: {
      async persistSourceCaptureBatch(captures) {
        received = captures;
        return {
          processed: captures.length,
          revisionsInserted: captures.length,
          snapshotsInserted: captures.length,
        };
      },
    },
  });
  assert.equal(received.length, 1);
  assert.equal(receipt.processed, 1);
  assert.equal(receipt.revisionsInserted, 1);
  assert.equal(receipt.snapshotsInserted, 1);
  assert.equal(receipt.exactReplay, false);
  assert.equal(receipt.sourceCommitSha, sourceCommitSha);
});

test("exact replay receipt reports zero new evidence", async () => {
  const value = artifact();
  const digest = sha256Hex(JSON.stringify(value));
  const receipt = await importYouTubeRssArtifact({
    artifact: value,
    artifactSha256: digest,
    repository: {
      async persistSourceCaptureBatch(captures) {
        return { processed: captures.length, revisionsInserted: 0, snapshotsInserted: 0 };
      },
    },
  });
  assert.equal(receipt.exactReplay, true);
});

test("duplicate video identities fail before database access", async () => {
  let called = false;
  const value = artifact([capture(), capture()]);
  await assert.rejects(
    () =>
      importYouTubeRssArtifact({
        artifact: value,
        artifactSha256: "c".repeat(64),
        repository: {
          async persistSourceCaptureBatch() {
            called = true;
          },
        },
      }),
    /duplicate video/,
  );
  assert.equal(called, false);
});

test("digest or source commit mismatches fail closed", async () => {
  const value = artifact();
  await assert.rejects(
    () =>
      importYouTubeRssArtifact({
        artifact: value,
        artifactSha256: "c".repeat(64),
        expectedArtifactSha256: "d".repeat(64),
        repository: { persistSourceCaptureBatch() {} },
      }),
    /SHA-256/,
  );
  assert.throws(
    () => validateYouTubeRssArtifact(value, { expectedSourceCommitSha: "e".repeat(40) }),
    /sourceCommitSha/,
  );
});

test("invalid ownership, hashes, and metric counts are rejected", () => {
  const invalid = artifact();
  invalid.videos[0].sourceItem.rawPayload.channelId = "UC6YYHJzM6PhZ2Yey9BQiUaw";
  assert.throws(() => validateYouTubeRssArtifact(invalid), /ownership mismatch/);

  const invalidHash = artifact();
  invalidHash.videos[0].sourceItem.contentHash = "not-a-hash";
  assert.throws(() => validateYouTubeRssArtifact(invalidHash), /content hash/);

  const invalidCount = artifact();
  invalidCount.metricSnapshotCount = 0;
  assert.throws(() => validateYouTubeRssArtifact(invalidCount), /metricSnapshotCount/);
});
