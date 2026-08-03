import assert from "node:assert/strict";
import test from "node:test";
import { captureYouTubeApiChannels } from "../src/index.mjs";

const capturedAt = "2026-08-03T12:00:00.000Z";
const channels = [
  {
    channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
    title: "OpenAI",
    category: "foundation_model",
    status: "active",
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "DeepMind",
    category: "foundation_model",
    status: "active",
  },
];

function apiVideo(id, channelId, viewCount = "100") {
  return {
    id,
    snippet: {
      channelId,
      title: `Video ${id}`,
      description: "Public description",
      publishedAt: "2026-08-03T10:00:00.000Z",
    },
    statistics: { viewCount, likeCount: "5", commentCount: "2" },
    contentDetails: { duration: "PT2M" },
    status: { privacyStatus: "public", license: "youtube" },
  };
}

test("API pilot produces importer-compatible public captures", async () => {
  const result = await captureYouTubeApiChannels({
    channels: channels.slice(0, 1),
    capturedAt,
    youtubeClient: {
      async getChannel(channelId) {
        return {
          channelId,
          title: "OpenAI",
          uploadsPlaylistId: "UU-openai",
        };
      },
      async listUploadVideoIds({ playlistId, maxResults }) {
        assert.equal(playlistId, "UU-openai");
        assert.equal(maxResults, 15);
        return { videoIds: ["abcDEF12345"], nextPageToken: null };
      },
      async getVideos(videoIds) {
        assert.deepEqual(videoIds, ["abcDEF12345"]);
        return [apiVideo("abcDEF12345", channels[0].channelId)];
      },
    },
  });

  assert.equal(result.succeededChannels, 1);
  assert.equal(result.failedChannels, 0);
  assert.equal(result.videoCount, 1);
  assert.equal(result.metricSnapshotCount, 1);
  assert.equal(result.videos[0].ingestionSource, "youtube_data_api");
  assert.equal(
    result.videos[0].sourceItem.rawPayload.channelId,
    channels[0].channelId,
  );
  assert.equal(result.videos[0].sourceItem.rawPayload.videoId, "abcDEF12345");
  assert.equal(result.videos[0].metricSnapshot.metrics.viewCount, 100);
});

test("API pilot isolates channel failures and redacts API keys", async () => {
  const result = await captureYouTubeApiChannels({
    channels,
    capturedAt,
    youtubeClient: {
      async getChannel(channelId) {
        if (channelId === channels[1].channelId) {
          throw new Error(
            "YouTube API request failed at https://example.test/videos?key=secret-key",
          );
        }
        return { channelId, title: "OpenAI", uploadsPlaylistId: "UU-openai" };
      },
      async listUploadVideoIds() {
        return { videoIds: ["abcDEF12345"], nextPageToken: null };
      },
      async getVideos() {
        return [apiVideo("abcDEF12345", channels[0].channelId)];
      },
    },
  });

  assert.equal(result.succeededChannels, 1);
  assert.equal(result.failedChannels, 1);
  assert.match(result.channels[1].error, /REDACTED/);
  assert.doesNotMatch(result.channels[1].error, /secret-key/);
});

test("API pilot rejects unbounded video requests before network access", async () => {
  let called = false;
  await assert.rejects(
    () =>
      captureYouTubeApiChannels({
        channels: channels.slice(0, 1),
        capturedAt,
        maxVideosPerChannel: 51,
        youtubeClient: {
          async getChannel() {
            called = true;
          },
          async listUploadVideoIds() {},
          async getVideos() {},
        },
      }),
    /1 to 50/,
  );
  assert.equal(called, false);
});
