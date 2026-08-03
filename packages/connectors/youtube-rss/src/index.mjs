import {
  createMetricSnapshot,
  createSourceItem,
} from "../../../source-records/src/index.mjs";

const DEFAULT_ENDPOINT = "https://www.youtube.com/feeds/videos.xml";
const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeTimestamp(value, field) {
  assertNonEmptyString(value, field);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be an ISO-compatible timestamp`);
  }
  return date.toISOString();
}

function assertChannelId(channelId) {
  assertNonEmptyString(channelId, "channelId");
  if (!CHANNEL_ID_PATTERN.test(channelId)) {
    throw new TypeError("channelId must be a canonical YouTube UC channel ID");
  }
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTag(xml, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = xml.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match ? decodeXml(match[1].trim()) : null;
}

function parseAttributes(fragment) {
  const attributes = {};
  for (const match of fragment.matchAll(
    /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function extractElementAttributes(xml, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = xml.match(new RegExp(`<${escaped}\\b([^>]*)\\/?>(?:|)`, "i"));
  return match ? parseAttributes(match[1]) : null;
}

function extractAlternateLink(entry) {
  for (const match of entry.matchAll(/<link\b([^>]*)\/?\s*>/gi)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.rel === "alternate" && attributes.href) {
      return attributes.href;
    }
  }
  return null;
}

function safeCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function extractVideoId(entry) {
  const explicit = extractTag(entry, "yt:videoId");
  if (explicit && VIDEO_ID_PATTERN.test(explicit)) return explicit;
  const atomId = extractTag(entry, "id");
  const fallback = atomId?.match(/^yt:video:([A-Za-z0-9_-]{11})$/)?.[1] ?? null;
  return fallback;
}

export function buildYouTubeRssUrl(channelId, endpoint = DEFAULT_ENDPOINT) {
  assertChannelId(channelId);
  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new TypeError("YouTube RSS endpoint must use https");
  }
  url.searchParams.set("channel_id", channelId);
  return url.toString();
}

export function parseYouTubeAtomFeed(xml, { capturedAt, expectedChannelId } = {}) {
  assertNonEmptyString(xml, "xml");
  const captured = normalizeTimestamp(capturedAt, "capturedAt");
  if (expectedChannelId !== undefined) assertChannelId(expectedChannelId);

  const feedChannelId = extractTag(xml, "yt:channelId");
  if (feedChannelId && !CHANNEL_ID_PATTERN.test(feedChannelId)) {
    throw new Error("YouTube RSS feed returned a noncanonical channel ID");
  }
  if (
    expectedChannelId &&
    feedChannelId &&
    feedChannelId !== expectedChannelId
  ) {
    throw new Error(
      `YouTube RSS channel mismatch: expected ${expectedChannelId}, received ${feedChannelId}`,
    );
  }

  const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const seenVideoIds = new Set();
  const videos = [];

  for (const [, entry] of entries) {
    const videoId = extractVideoId(entry);
    if (!videoId || seenVideoIds.has(videoId)) continue;
    seenVideoIds.add(videoId);

    const channelId = extractTag(entry, "yt:channelId") ?? feedChannelId ?? null;
    if (channelId && !CHANNEL_ID_PATTERN.test(channelId)) {
      throw new Error(`Video ${videoId} has a noncanonical channel ID`);
    }
    if (expectedChannelId && channelId && channelId !== expectedChannelId) {
      throw new Error(`Video ${videoId} belongs to an unexpected channel`);
    }

    const title = extractTag(entry, "title") ?? videoId;
    const description = extractTag(entry, "media:description") ?? "";
    const publishedAt = extractTag(entry, "published");
    const updatedAt = extractTag(entry, "updated");
    const alternateLink = extractAlternateLink(entry);
    const sourceUrl =
      alternateLink ??
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const statistics = extractElementAttributes(entry, "media:statistics");
    const viewCount = safeCount(statistics?.views);

    const sourceItem = createSourceItem({
      sourceType: "youtube_video",
      externalId: videoId,
      sourceUrl,
      title,
      body: description,
      publishedAt,
      capturedAt: captured,
      rawPayload: {
        ingestionSource: "youtube_atom_feed",
        videoId,
        channelId,
        title,
        description,
        publishedAt,
        updatedAt,
        alternateLink: sourceUrl,
      },
    });
    const metricSnapshot =
      viewCount === null
        ? null
        : createMetricSnapshot({
            sourceItemId: sourceItem.sourceKey,
            capturedAt: captured,
            metrics: { viewCount },
          });

    videos.push(
      Object.freeze({
        sourceItem,
        metricSnapshot,
        channelId,
        updatedAt: updatedAt ? normalizeTimestamp(updatedAt, "updatedAt") : null,
        ingestionSource: "youtube_atom_feed",
      }),
    );
  }

  return Object.freeze({
    channelId: feedChannelId ?? expectedChannelId ?? null,
    feedTitle: extractTag(xml.slice(0, xml.search(/<entry\b/i)), "title"),
    capturedAt: captured,
    videos: Object.freeze(videos),
  });
}

export function createYouTubeRssClient({
  fetchImpl = globalThis.fetch,
  endpoint = DEFAULT_ENDPOINT,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }

  return Object.freeze({
    async getChannelFeed({ channelId, capturedAt }) {
      const url = buildYouTubeRssUrl(channelId, endpoint);
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/atom+xml, application/xml, text/xml",
          "User-Agent": "global-tool-radar/0.7",
        },
      });
      const text = await response.text().catch(() => "");
      if (!response.ok) {
        throw new Error(
          `YouTube RSS request failed (HTTP ${response.status}) for channel ${channelId}`,
        );
      }
      return parseYouTubeAtomFeed(text, {
        capturedAt,
        expectedChannelId: channelId,
      });
    },
  });
}
