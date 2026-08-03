import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYouTubeRssUrl,
  createYouTubeRssClient,
  parseYouTubeAtomFeed,
} from "../src/index.mjs";

const channelId = "UCXZCJLdBC09xxGZ6gcdrc6A";
const feedChannelId = channelId.slice(2);
const capturedAt = "2026-08-03T03:30:00Z";

function feed({ firstViews = "100", duplicateFirst = false } = {}) {
  const firstEntry = `
    <entry>
      <id>yt:video:abcDEF12345</id>
      <yt:videoId>abcDEF12345</yt:videoId>
      <yt:channelId>${feedChannelId}</yt:channelId>
      <title>Agents &amp; Tools</title>
      <link href="https://www.youtube.com/watch?v=abcDEF12345" rel="alternate" />
      <published>2026-08-03T01:00:00+00:00</published>
      <updated>2026-08-03T02:00:00+00:00</updated>
      <media:group>
        <media:description><![CDATA[Build <fast> & safely]]></media:description>
        <media:statistics views="${firstViews}" />
        <media:starRating count="88" average="4.9" />
      </media:group>
    </entry>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
        xmlns:media="http://search.yahoo.com/mrss/">
    <title>OpenAI</title>
    <yt:channelId>${feedChannelId}</yt:channelId>
    ${firstEntry}
    ${duplicateFirst ? firstEntry : ""}
    <entry>
      <id>yt:video:ZYX98765432</id>
      <yt:videoId>ZYX98765432</yt:videoId>
      <yt:channelId>${feedChannelId}</yt:channelId>
      <title>Second video</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=ZYX98765432" />
      <published>2026-08-02T01:00:00Z</published>
      <updated>2026-08-02T01:30:00Z</updated>
      <media:group>
        <media:description>No public statistics</media:description>
      </media:group>
    </entry>
  </feed>`;
}

test("RSS URL uses the stable channel ID and rejects handles", () => {
  const url = new URL(buildYouTubeRssUrl(channelId));
  assert.equal(url.protocol, "https:");
  assert.equal(url.searchParams.get("channel_id"), channelId);
  assert.throws(() => buildYouTubeRssUrl("@OpenAI"), /canonical/);
});

test("real Atom channel suffixes normalize to canonical UC ids", () => {
  const result = parseYouTubeAtomFeed(feed(), {
    capturedAt,
    expectedChannelId: channelId,
  });
  assert.equal(result.channelId, channelId);
  assert.equal(result.videos[0].channelId, channelId);
  assert.equal(result.videos[0].sourceItem.rawPayload.channelId, channelId);
});

test("full UC channel IDs remain accepted for compatible fixtures", () => {
  const result = parseYouTubeAtomFeed(
    feed().replaceAll(feedChannelId, channelId),
    { capturedAt, expectedChannelId: channelId },
  );
  assert.equal(result.channelId, channelId);
  assert.equal(result.videos.length, 2);
});

test("Atom entries normalize into source revisions and observable view snapshots", () => {
  const result = parseYouTubeAtomFeed(feed(), {
    capturedAt,
    expectedChannelId: channelId,
  });
  assert.equal(result.channelId, channelId);
  assert.equal(result.feedTitle, "OpenAI");
  assert.equal(result.videos.length, 2);

  const first = result.videos[0];
  assert.equal(first.sourceItem.externalId, "abcDEF12345");
  assert.equal(first.sourceItem.title, "Agents & Tools");
  assert.equal(first.sourceItem.body, "Build <fast> & safely");
  assert.equal(first.sourceItem.rawPayload.ingestionSource, "youtube_atom_feed");
  assert.equal(first.metricSnapshot.metrics.viewCount, 100);
  assert.equal(first.metricSnapshot.metrics.likeCount, null);

  const second = result.videos[1];
  assert.equal(second.metricSnapshot, null);
});

test("view changes create snapshots without changing content revision hashes", () => {
  const older = parseYouTubeAtomFeed(feed({ firstViews: "100" }), {
    capturedAt: "2026-08-03T03:00:00Z",
    expectedChannelId: channelId,
  }).videos[0];
  const newer = parseYouTubeAtomFeed(feed({ firstViews: "175" }), {
    capturedAt: "2026-08-03T04:00:00Z",
    expectedChannelId: channelId,
  }).videos[0];

  assert.equal(older.sourceItem.contentHash, newer.sourceItem.contentHash);
  assert.equal(older.metricSnapshot.metrics.viewCount, 100);
  assert.equal(newer.metricSnapshot.metrics.viewCount, 175);
});

test("duplicate feed entries are deterministically deduplicated", () => {
  const result = parseYouTubeAtomFeed(feed({ duplicateFirst: true }), {
    capturedAt,
    expectedChannelId: channelId,
  });
  assert.deepEqual(
    result.videos.map((video) => video.sourceItem.externalId),
    ["abcDEF12345", "ZYX98765432"],
  );
});

test("channel mismatches fail closed", () => {
  const otherSuffix = "6YYHJzM6PhZ2Yey9BQiUaw";
  assert.throws(
    () =>
      parseYouTubeAtomFeed(feed().replace(feedChannelId, otherSuffix), {
        capturedAt,
        expectedChannelId: channelId,
      }),
    /channel mismatch/,
  );
});

test("client requests Atom XML and normalizes the response", async () => {
  let request;
  const client = createYouTubeRssClient({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        async text() {
          return feed();
        },
      };
    },
  });

  const result = await client.getChannelFeed({ channelId, capturedAt });
  assert.equal(new URL(request.url).searchParams.get("channel_id"), channelId);
  assert.match(request.options.headers.Accept, /atom\+xml/);
  assert.equal(result.videos.length, 2);
});

test("HTTP errors do not echo response bodies or credentials", async () => {
  const client = createYouTubeRssClient({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async text() {
        return "internal body should not be exposed";
      },
    }),
  });
  await assert.rejects(
    () => client.getChannelFeed({ channelId, capturedAt }),
    (error) =>
      error.message.includes("HTTP 503") &&
      !error.message.includes("internal body"),
  );
});
