import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYouTubeMetadataCandidates,
  extractTopicTokens,
} from "../src/index.mjs";

const now = "2026-08-03T12:00:00Z";
function row(id, channelId, publishedAt, title) {
  return {
    sourceIdentityId: `source-${id}`,
    externalId: id,
    sourceUrl: `https://www.youtube.com/watch?v=${id}`,
    title,
    body: "",
    publishedAt,
    channelId,
    capturedAt: now,
    ingestionSource: "youtube_atom_feed",
  };
}

const channels = [
  {
    channelId: "channel-a",
    title: "OpenAI",
    category: "foundation_model",
    status: "active",
  },
  {
    channelId: "channel-b",
    title: "GitHub",
    category: "developer_platform",
    status: "active",
  },
];

test("topic extraction removes generic video words deterministically", () => {
  assert.deepEqual(
    extractTopicTokens("Introducing the new Agent SDK tutorial"),
    ["agent", "sdk"],
  );
});

test("fresh tracked video is metadata-only and remains metric-gated", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "aaaaaaaaaaa",
        "channel-a",
        "2026-08-03T11:00:00Z",
        "Agent SDK for coding workflows",
      ),
    ],
    { now, channels },
  );
  assert.equal(candidates[0].signalClass, "metadata_only");
  assert.equal(
    candidates[0].promotionGate,
    "METRIC_CONFIRMATION_REQUIRED",
  );
  assert.equal(candidates[0].owner.title, "OpenAI");
  assert.ok(candidates[0].reasonCodes.includes("VERY_FRESH"));
});

test("cross-channel evidence counts distinct channels rather than videos", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "aaaaaaaaaaa",
        "channel-a",
        "2026-08-03T10:00:00Z",
        "Agent memory for coding workflows",
      ),
      row(
        "bbbbbbbbbbb",
        "channel-b",
        "2026-08-03T09:00:00Z",
        "Agent memory in developer workflows",
      ),
      row(
        "ccccccccccc",
        "channel-b",
        "2026-08-03T08:00:00Z",
        "Agent memory follow-up",
      ),
    ],
    { now, channels },
  );
  const candidate = candidates.find(
    (item) => item.externalId === "aaaaaaaaaaa",
  );
  assert.equal(candidate.corroboratingChannelCount, 1);
  assert.equal(candidate.crossChannelTopicScore, 50);
  assert.deepEqual(candidate.sharedTopics, [
    "agent",
    "memory",
    "workflows",
  ]);
});

test("release density is observable but cannot remove the metric gate", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "aaaaaaaaaaa",
        "channel-a",
        "2026-08-03T11:00:00Z",
        "Reasoning model one",
      ),
      row(
        "bbbbbbbbbbb",
        "channel-a",
        "2026-08-03T10:00:00Z",
        "Reasoning model two",
      ),
      row(
        "ccccccccccc",
        "channel-a",
        "2026-08-03T09:00:00Z",
        "Reasoning model three",
      ),
    ],
    { now, channels },
  );
  assert.equal(candidates[0].channelVideoCountInWindow, 3);
  assert.equal(candidates[0].releaseDensityScore, 75);
  assert.ok(
    candidates[0].reasonCodes.includes("CHANNEL_RELEASE_BURST"),
  );
  assert.equal(
    candidates[0].promotionGate,
    "METRIC_CONFIRMATION_REQUIRED",
  );
});

test("missing channel identity stays missing rather than becoming zero", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "aaaaaaaaaaa",
        null,
        "2026-08-03T11:00:00Z",
        "Agent memory",
      ),
    ],
    { now, channels },
  );
  assert.equal(candidates[0].releaseDensityScore, null);
  assert.equal(candidates[0].crossChannelTopicScore, null);
  assert.deepEqual(candidates[0].missing, [
    "releaseDensity",
    "crossChannelTopic",
  ]);
  assert.equal(candidates[0].coverage, 0.6);
  assert.ok(candidates[0].rankingScore < candidates[0].metadataScore);
});

test("items older than the candidate horizon are excluded", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "aaaaaaaaaaa",
        "channel-a",
        "2026-07-20T00:00:00Z",
        "Old agent video",
      ),
    ],
    { now, channels, maxAgeHours: 168 },
  );
  assert.equal(candidates.length, 0);
});

test("sorting is deterministic under equal scores", () => {
  const candidates = buildYouTubeMetadataCandidates(
    [
      row(
        "bbbbbbbbbbb",
        "channel-a",
        "2026-08-03T10:00:00Z",
        "Unique alpha topic",
      ),
      row(
        "aaaaaaaaaaa",
        "channel-b",
        "2026-08-03T10:00:00Z",
        "Unique beta topic",
      ),
    ],
    { now, channels },
  );
  assert.deepEqual(
    candidates.map((candidate) => candidate.externalId),
    ["aaaaaaaaaaa", "bbbbbbbbbbb"],
  );
});

test("topic window cannot exceed the candidate horizon", () => {
  assert.throws(
    () =>
      buildYouTubeMetadataCandidates([], {
        now,
        maxAgeHours: 24,
        topicWindowHours: 72,
      }),
    /must not exceed/,
  );
});
