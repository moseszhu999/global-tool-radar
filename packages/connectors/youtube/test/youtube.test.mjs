import assert from "node:assert/strict";
import test from "node:test";
import {
  createYouTubeClient,
  normalizeYouTubeVideo,
} from "../src/index.mjs";

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

test("channel lookup resolves the uploads playlist", async () => {
  const requests = [];
  const client = createYouTubeClient({
    apiKey: "secret-key",
    fetchImpl: async (url) => {
      requests.push(url);
      return response({
        items: [
          {
            id: "channel-1",
            snippet: { title: "Tools" },
            contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
            statistics: {
              subscriberCount: "1000",
              videoCount: "20",
              hiddenSubscriberCount: false,
            },
          },
        ],
      });
    },
  });

  const channel = await client.getChannel("channel-1");
  assert.equal(channel.uploadsPlaylistId, "uploads-1");
  assert.match(requests[0], /part=contentDetails%2Csnippet%2Cstatistics/);
  assert.match(requests[0], /key=secret-key/);
});

test("upload playlist pagination preserves nextPageToken", async () => {
  const client = createYouTubeClient({
    apiKey: "secret-key",
    fetchImpl: async () =>
      response({
        items: [{ contentDetails: { videoId: "video-1" } }],
        nextPageToken: "next-1",
      }),
  });
  const page = await client.listUploadVideoIds({ playlistId: "uploads-1" });
  assert.deepEqual(page.videoIds, ["video-1"]);
  assert.equal(page.nextPageToken, "next-1");
});

test("video responses normalize into source records and observable snapshots", () => {
  const normalized = normalizeYouTubeVideo(
    {
      id: "video-1",
      snippet: {
        title: "A new AI tool",
        description: "Demo",
        channelId: "channel-1",
        publishedAt: "2026-08-03T00:00:00Z",
      },
      statistics: {
        viewCount: "100",
        likeCount: "10",
      },
      contentDetails: { duration: "PT1M30S" },
      status: { privacyStatus: "public", license: "youtube" },
    },
    "2026-08-03T01:00:00Z",
  );

  assert.equal(normalized.sourceItem.sourceKey, "youtube_video:video-1");
  assert.equal(normalized.metricSnapshot.metrics.viewCount, 100);
  assert.equal(normalized.metricSnapshot.metrics.commentCount, null);
  assert.equal(normalized.duration, "PT1M30S");
});

test("API failures redact the API key from error messages", async () => {
  const client = createYouTubeClient({
    apiKey: "secret-key",
    fetchImpl: async () =>
      response(
        { error: { errors: [{ reason: "quotaExceeded" }] } },
        { ok: false, status: 403 },
      ),
  });

  await assert.rejects(
    () => client.getVideos(["video-1"]),
    (error) =>
      error.message.includes("quotaExceeded") &&
      error.message.includes("[REDACTED]") &&
      !error.message.includes("secret-key"),
  );
});
