import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { captureYouTubeRssPilot } from "../src/index.mjs";

const capturedAt = "2026-08-03T05:00:00Z";
const channels = [
  {
    channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
    title: "OpenAI",
    officialHandle: "@OpenAI",
    category: "foundation_model",
    status: "active",
    evidenceUrl: "https://example.test/openai",
  },
  {
    channelId: "UCP7jMXSY2xbc3KCAE0MHQ-A",
    title: "Google DeepMind",
    category: "foundation_model",
    status: "active",
  },
  {
    channelId: "UC6YYHJzM6PhZ2Yey9BQiUaw",
    title: "Cursor",
    category: "coding_agent",
    status: "paused",
  },
];

function video(id, channelId, { metric = true } = {}) {
  return {
    channelId,
    ingestionSource: "youtube_atom_feed",
    sourceItem: {
      sourceType: "youtube_video",
      externalId: id,
      sourceKey: `youtube_video:${id}`,
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      title: `Video ${id}`,
      body: "",
      publishedAt: "2026-08-03T04:00:00Z",
      capturedAt,
      rawPayload: { ingestionSource: "youtube_atom_feed", channelId },
      contentHash: "a".repeat(64),
    },
    metricSnapshot: metric
      ? {
          sourceItemId: `youtube_video:${id}`,
          capturedAt,
          metrics: { viewCount: 10 },
        }
      : null,
  };
}

test("pilot captures active channels and preserves owner metadata", async () => {
  const result = await captureYouTubeRssPilot({
    channels,
    capturedAt,
    rssClient: {
      async getChannelFeed({ channelId }) {
        return {
          feedTitle: channelId === channels[0].channelId ? "OpenAI" : "DeepMind",
          videos: [video(channelId.slice(-11), channelId)],
        };
      },
    },
  });

  assert.equal(result.requestedChannels, 2);
  assert.equal(result.succeededChannels, 2);
  assert.equal(result.videoCount, 2);
  assert.equal(result.metricSnapshotCount, 2);
  assert.equal(result.videos[0].channel.category, "foundation_model");
  assert.equal(result.evidenceClass, "public_metadata_capture");
  assert.equal(result.promotionGate, "METRIC_CONFIRMATION_REQUIRED");
});

test("duplicate videos are accepted once across channels", async () => {
  const duplicated = video("abcDEF12345", channels[0].channelId, { metric: false });
  const result = await captureYouTubeRssPilot({
    channels: channels.slice(0, 2),
    capturedAt,
    rssClient: {
      async getChannelFeed({ channelId }) {
        return {
          videos: [
            channelId === channels[0].channelId
              ? duplicated
              : { ...duplicated, channelId },
          ],
        };
      },
    },
  });
  assert.equal(result.videoCount, 1);
  assert.equal(result.metricSnapshotCount, 0);
  assert.equal(result.videos[0].metricSnapshot, null);
});

test("one failed channel remains explicit without aborting evidence", async () => {
  const result = await captureYouTubeRssPilot({
    channels: channels.slice(0, 2),
    capturedAt,
    rssClient: {
      async getChannelFeed({ channelId }) {
        if (channelId === channels[1].channelId) throw new Error("HTTP 503");
        return { videos: [video("abcDEF12345", channelId)] };
      },
    },
  });
  assert.equal(result.succeededChannels, 1);
  assert.equal(result.failedChannels, 1);
  assert.equal(result.channels[1].status, "failed");
  assert.equal(result.videoCount, 1);
});

test("all-channel failure fails closed", async () => {
  await assert.rejects(
    () =>
      captureYouTubeRssPilot({
        channels: channels.slice(0, 1),
        capturedAt,
        rssClient: {
          async getChannelFeed() {
            throw new Error("HTTP 500");
          },
        },
      }),
    /no successful channels/,
  );
});

test("empty successful feeds fail closed", async () => {
  await assert.rejects(
    () =>
      captureYouTubeRssPilot({
        channels: channels.slice(0, 1),
        capturedAt,
        rssClient: {
          async getChannelFeed() {
            return { videos: [] };
          },
        },
      }),
    /captured no videos/,
  );
});

test("failures redact database and bearer credentials", async () => {
  const result = await captureYouTubeRssPilot({
    channels: channels.slice(0, 2),
    capturedAt,
    rssClient: {
      async getChannelFeed({ channelId }) {
        if (channelId === channels[1].channelId) {
          throw new Error(
            "postgresql://owner:npg_secret@host/neondb Bearer token-secret",
          );
        }
        return { videos: [video("abcDEF12345", channelId)] };
      },
    },
  });
  assert.match(result.channels[1].error, /REDACTED/);
  assert.doesNotMatch(result.channels[1].error, /npg_secret|token-secret/);
});

test("pilot workflow is read-only and contains no secret or database input", () => {
  const workflow = readFileSync(
    new URL("../../../.github/workflows/youtube-rss-pilot.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days: 7/);
  assert.doesNotMatch(
    workflow,
    /secrets\.|DATABASE_URL|YOUTUBE_API_KEY|TOOLRADAR_NEON_|TOOLRADAR_INSTALLATION_ID/,
  );
});
