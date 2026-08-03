import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  seedYouTubeWatchlist,
  validateWatchlistSeed,
} from "../src/index.mjs";

const manifest = JSON.parse(
  readFileSync(
    new URL("../../../config/youtube-watchlist.v1.json", import.meta.url),
    "utf8",
  ),
);

test("manifest contains eleven unique canonical channel ids with evidence", () => {
  assert.equal(manifest.channels.length, 11);
  const ids = new Set();
  for (const channel of manifest.channels) {
    assert.match(channel.channelId, /^UC[A-Za-z0-9_-]{22}$/);
    assert.equal(channel.status, "active");
    assert.equal(channel.scanIntervalMinutes, 120);
    assert.match(channel.evidenceUrl, /^https:\/\//);
    ids.add(channel.channelId);
  }
  assert.equal(ids.size, 11);
});

test("duplicate channel ids fail before database access", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      seedYouTubeWatchlist({
        query: async () => {
          calls += 1;
          return [];
        },
        entries: [manifest.channels[0], manifest.channels[0]],
      }),
    /duplicate channel id/,
  );
  assert.equal(calls, 0);
});

test("seed is idempotent and does not overwrite scheduling or lease fields", async () => {
  const calls = [];
  const result = await seedYouTubeWatchlist({
    entries: manifest.channels.slice(0, 2),
    query: async (text, params) => {
      calls.push({ text, params });
      return [
        {
          channel_id: params[0],
          title: params[1],
          status: params[2],
          scan_interval_minutes: params[3],
          next_scan_at: "2026-08-03T03:00:00Z",
          uploads_playlist_id: "UU-existing",
          lease_owner: "worker-existing",
        },
      ];
    },
  });

  assert.equal(result.seeded, 2);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.text, /ON CONFLICT \(channel_id\) DO UPDATE/);
    assert.doesNotMatch(call.text, /next_scan_at\s*=/);
    assert.doesNotMatch(call.text, /uploads_playlist_id\s*=/);
    assert.doesNotMatch(call.text, /lease_owner\s*=/);
  }
  assert.equal(result.channels[0].uploadsPlaylistId, "UU-existing");
  assert.equal(result.channels[0].leaseOwner, "worker-existing");
});

test("invalid intervals and noncanonical ids are rejected", () => {
  assert.throws(
    () => validateWatchlistSeed([{ channelId: "@openai", title: "OpenAI" }]),
    /not canonical/,
  );
  assert.throws(
    () =>
      validateWatchlistSeed([
        {
          channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
          title: "OpenAI",
          scanIntervalMinutes: 10,
        },
      ]),
    /60 to 10080/,
  );
});

test("database errors redact connection strings and Neon passwords", async () => {
  await assert.rejects(
    () =>
      seedYouTubeWatchlist({
        entries: manifest.channels.slice(0, 1),
        query: async () => {
          throw new Error(
            "failed postgresql://owner:npg_secret@example.test/db npg_secret",
          );
        },
      }),
    (error) =>
      error.message.includes("[REDACTED_DATABASE_URL]") &&
      !error.message.includes("npg_secret"),
  );
});
