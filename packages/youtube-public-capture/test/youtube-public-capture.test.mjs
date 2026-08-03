import assert from "node:assert/strict";
import test from "node:test";
import { captureYouTubePublicMetadata } from "../src/index.mjs";

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

function rssVideo(id, channelId) {
  return {
    channelId,
    ingestionSource: "youtube_atom_feed",
    sourceItem: {
      sourceType: "youtube_video",
      externalId: id,
      sourceKey: `youtube_video:${id}`,
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      title: `RSS ${id}`,
      body: "",
      publishedAt: "2026-08-03T10:00:00.000Z",
      capturedAt,
      rawPayload: {
        ingestionSource: "youtube_atom_feed",
        videoId: id,
        channelId,
      },
      contentHash: "a".repeat(64),
    },
    metricSnapshot: {
      sourceItemId: `youtube_video:${id}`,
      capturedAt,
      metrics: { viewCount: 100 },
    },
  };
}

function apiVideo(id, channelId) {
  return {
    id,
    snippet: {
      channelId,
      title: `API ${id}`,
      description: "Public description",
      publishedAt: "2026-08-03T10:00:00.000Z",
    },
    statistics: { viewCount: "120" },
    contentDetails: { duration: "PT1M" },
    status: { privacyStatus: "public", license: "youtube" },
  };
}

function apiClient({ fail = false } = {}) {
  return {
    async getChannel(channelId) {
      if (fail) throw new Error("quotaExceeded");
      return {
        channelId,
        title: "Fallback channel",
        uploadsPlaylistId: `UU-${channelId}`,
      };
    },
    async listUploadVideoIds({ playlistId }) {
      const channelId = playlistId.slice(3);
      return {
        videoIds: [
          channelId === channels[0].channelId ? "abcDEF12345" : "xyzXYZ67890",
        ],
        nextPageToken: null,
      };
    },
    async getVideos(videoIds) {
      const id = videoIds[0];
      const channelId = id === "abcDEF12345" ? channels[0].channelId : channels[1].channelId;
      return [apiVideo(id, channelId)];
    },
  };
}

test("sufficient RSS coverage performs zero YouTube API calls", async () => {
  let apiCalls = 0;
  const result = await captureYouTubePublicMetadata({
    channels,
    capturedAt,
    rssClient: {
      async getChannelFeed({ channelId }) {
        const id = channelId === channels[0].channelId ? "abcDEF12345" : "xyzXYZ67890";
        return { videos: [rssVideo(id, channelId)] };
      },
    },
    youtubeClient: {
      async getChannel() {
        apiCalls += 1;
      },
      async listUploadVideoIds() {
        apiCalls += 1;
      },
      async getVideos() {
        apiCalls += 1;
      },
    },
  });

  assert.equal(apiCalls, 0);
  assert.equal(result.artifactVersion, "youtube-public-capture-v1");
  assert.equal(result.captureMode, "rss_only");
  assert.equal(result.succeededChannels, 2);
  assert.deepEqual(result.providerSummary.videoSourceCounts, {
    youtube_atom_feed: 2,
  });
});

test("API fallback fills only RSS-failed channels", async () => {
  const apiChannelCalls = [];
  const baseApi = apiClient();
  const result = await captureYouTubePublicMetadata({
    channels,
    capturedAt,
    minimumSuccessRatio: 0.8,
    rssClient: {
      async getChannelFeed({ channelId }) {
        if (channelId === channels[1].channelId) throw new Error("HTTP 500");
        return { videos: [rssVideo("abcDEF12345", channelId)] };
      },
    },
    youtubeClient: {
      ...baseApi,
      async getChannel(channelId) {
        apiChannelCalls.push(channelId);
        return baseApi.getChannel(channelId);
      },
    },
  });

  assert.deepEqual(apiChannelCalls, [channels[1].channelId]);
  assert.equal(result.captureMode, "rss_with_api_fallback");
  assert.equal(result.succeededChannels, 2);
  assert.equal(result.failedChannels, 0);
  assert.equal(result.channels[0].provider, "youtube_atom_feed");
  assert.equal(result.channels[1].provider, "youtube_data_api");
  assert.deepEqual(result.providerSummary.videoSourceCounts, {
    youtube_atom_feed: 1,
    youtube_data_api: 1,
  });
});

test("low RSS coverage without an API key fails closed", async () => {
  await assert.rejects(
    async () => {
      try {
        await captureYouTubePublicMetadata({
          channels,
          capturedAt,
          rssClient: {
            async getChannelFeed() {
              throw new Error("HTTP 404");
            },
          },
        });
      } catch (error) {
        assert.equal(error.code, "YOUTUBE_API_FALLBACK_UNAVAILABLE");
        assert.equal(error.coverage.succeededChannels, 0);
        assert.equal(error.coverage.requiredChannels, 2);
        throw error;
      }
    },
    /coverage gate failed/,
  );
});

test("failed API fallback remains an explicit coverage failure", async () => {
  await assert.rejects(
    async () => {
      try {
        await captureYouTubePublicMetadata({
          channels,
          capturedAt,
          rssClient: {
            async getChannelFeed() {
              throw new Error("HTTP 500");
            },
          },
          youtubeClient: apiClient({ fail: true }),
        });
      } catch (error) {
        assert.equal(error.code, "YOUTUBE_PUBLIC_CAPTURE_COVERAGE_FAILED");
        assert.equal(error.channelResults.length, 2);
        assert.match(error.channelResults[0].error, /quotaExceeded/);
        throw error;
      }
    },
    /coverage gate failed/,
  );
});
