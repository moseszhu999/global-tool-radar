import assert from "node:assert/strict";
import test from "node:test";
import { runYouTubeRssBootstrap } from "../src/index.mjs";

const channels = [
  { channelId: "UCXZCJLdBC09xxGZ6gcdrc6A" },
  { channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A" },
];

function normalizedVideo(id, { metric = true } = {}) {
  return {
    sourceItem: {
      sourceType: "youtube_video",
      externalId: id,
      sourceKey: `youtube_video:${id}`,
    },
    metricSnapshot: metric ? { metrics: { viewCount: 10 } } : null,
  };
}

test("bootstrap persists each public feed item and reports inserted evidence", async () => {
  const persisted = [];
  const result = await runYouTubeRssBootstrap({
    channels,
    capturedAt: "2026-08-03T04:00:00Z",
    rssClient: {
      async getChannelFeed({ channelId }) {
        return {
          videos:
            channelId === channels[0].channelId
              ? [normalizedVideo("abcDEF12345"), normalizedVideo("ZYX98765432", { metric: false })]
              : [normalizedVideo("QWE12345678")],
        };
      },
    },
    repository: {
      async persistSourceCapture(input) {
        persisted.push(input);
        return {
          revisionInserted: true,
          snapshotInserted: input.metricSnapshot !== null,
        };
      },
    },
  });

  assert.equal(persisted.length, 3);
  assert.equal(result.succeededChannels, 2);
  assert.equal(result.failedChannels, 0);
  assert.equal(result.discoveredVideos, 3);
  assert.equal(result.insertedRevisions, 3);
  assert.equal(result.insertedSnapshots, 2);
});

test("one failed channel does not fabricate evidence or abort other channels", async () => {
  let writes = 0;
  const result = await runYouTubeRssBootstrap({
    channels,
    capturedAt: "2026-08-03T04:00:00Z",
    rssClient: {
      async getChannelFeed({ channelId }) {
        if (channelId === channels[0].channelId) {
          throw new Error("HTTP 503");
        }
        return { videos: [normalizedVideo("QWE12345678")] };
      },
    },
    repository: {
      async persistSourceCapture() {
        writes += 1;
        return { revisionInserted: true, snapshotInserted: true };
      },
    },
  });

  assert.equal(writes, 1);
  assert.equal(result.succeededChannels, 1);
  assert.equal(result.failedChannels, 1);
  assert.equal(result.discoveredVideos, 1);
  assert.equal(result.channels[0].status, "failed");
  assert.equal(result.channels[0].discoveredVideos, 0);
});

test("exact replays report zero inserted revisions and snapshots", async () => {
  const result = await runYouTubeRssBootstrap({
    channels: channels.slice(0, 1),
    capturedAt: "2026-08-03T04:00:00Z",
    rssClient: {
      async getChannelFeed() {
        return { videos: [normalizedVideo("abcDEF12345")] };
      },
    },
    repository: {
      async persistSourceCapture() {
        return { revisionInserted: false, snapshotInserted: false };
      },
    },
  });

  assert.equal(result.discoveredVideos, 1);
  assert.equal(result.insertedRevisions, 0);
  assert.equal(result.insertedSnapshots, 0);
});

test("database secrets are redacted from per-channel failures", async () => {
  const result = await runYouTubeRssBootstrap({
    channels: channels.slice(0, 1),
    capturedAt: "2026-08-03T04:00:00Z",
    rssClient: {
      async getChannelFeed() {
        throw new Error("postgresql://owner:npg_secret@example.test/db npg_secret");
      },
    },
    repository: {
      async persistSourceCapture() {
        throw new Error("not reached");
      },
    },
  });

  assert.match(result.channels[0].error, /REDACTED/);
  assert.doesNotMatch(result.channels[0].error, /npg_secret/);
});
