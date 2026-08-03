import assert from "node:assert/strict";
import test from "node:test";
import {
  assertYouTubeRssCoverage,
  createResilientYouTubeRssClient,
} from "../src/index.mjs";

test("retryable 404 and 500 responses recover within bounded attempts", async () => {
  let attempts = 0;
  const delays = [];
  const client = createResilientYouTubeRssClient({
    maxAttempts: 3,
    retryDelayMs: 10,
    sleepImpl: async (delay) => delays.push(delay),
    client: {
      async getChannelFeed() {
        attempts += 1;
        if (attempts === 1) throw new Error("YouTube RSS request failed (HTTP 404)");
        if (attempts === 2) throw new Error("YouTube RSS request failed (HTTP 500)");
        return { videos: [{ id: "ok" }] };
      },
    },
  });
  const result = await client.getChannelFeed({ channelId: "channel" });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.equal(result.videos.length, 1);
});

test("non-retryable failures stop immediately", async () => {
  let attempts = 0;
  const client = createResilientYouTubeRssClient({
    client: {
      async getChannelFeed() {
        attempts += 1;
        throw new Error("channel mismatch");
      },
    },
  });
  await assert.rejects(() => client.getChannelFeed({}), /exhausted 3 attempt/);
  assert.equal(attempts, 1);
});

test("exhausted retries preserve safe status context without secrets", async () => {
  const client = createResilientYouTubeRssClient({
    maxAttempts: 2,
    retryDelayMs: 0,
    sleepImpl: async () => {},
    client: {
      async getChannelFeed() {
        throw new Error(
          "HTTP 503 postgresql://owner:npg_secret@host/db Bearer token-secret",
        );
      },
    },
  });
  await assert.rejects(
    () => client.getChannelFeed({}),
    (error) =>
      error.message.includes("HTTP 503") &&
      error.message.includes("REDACTED") &&
      !error.message.includes("npg_secret") &&
      !error.message.includes("token-secret"),
  );
});

test("eleven-channel pilot requires at least nine successes", () => {
  assert.throws(
    () =>
      assertYouTubeRssCoverage({
        requestedChannels: 11,
        succeededChannels: 1,
        channels: [],
      }),
    /1\/11 channels succeeded; 9 required/,
  );
  const accepted = assertYouTubeRssCoverage({
    requestedChannels: 11,
    succeededChannels: 9,
  });
  assert.equal(accepted.requiredChannels, 9);
  assert.equal(accepted.actualSuccessRatio, 9 / 11);
});
