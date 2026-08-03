import { weightedScore } from "../../scoring/src/index.mjs";
import { freshnessScore } from "../../youtube-momentum/src/index.mjs";

const round = (value) => Math.round(value * 100) / 100;
const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "best",
  "build",
  "building",
  "choose",
  "choosing",
  "demo",
  "everything",
  "feels",
  "first",
  "for",
  "from",
  "getting",
  "guide",
  "here",
  "how",
  "into",
  "introducing",
  "introduction",
  "just",
  "know",
  "latest",
  "like",
  "little",
  "matters",
  "meet",
  "need",
  "new",
  "now",
  "official",
  "one",
  "our",
  "stop",
  "team",
  "the",
  "this",
  "today",
  "tutorial",
  "update",
  "using",
  "video",
  "watch",
  "what",
  "whole",
  "why",
  "with",
  "you",
  "your",
]);

function assertRows(rows) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
}

function hoursBetween(earlier, later) {
  const start = new Date(earlier).getTime();
  const end = new Date(later).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, (end - start) / 3_600_000);
}

function boundedCountScore(count, { first = 25, step = 25 } = {}) {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError("count must be a non-negative integer");
  }
  if (count === 0) return 0;
  return Math.min(100, first + step * (count - 1));
}

export function extractTopicTokens(value) {
  const matches =
    String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9+#.-]{2,}/g) ?? [];
  const tokens = new Set();
  for (const raw of matches) {
    const token = raw.replace(/^[.+#-]+|[.+#-]+$/g, "");
    if (
      token.length < 3 ||
      /^\d+$/.test(token) ||
      STOPWORDS.has(token)
    ) {
      continue;
    }
    tokens.add(token);
  }
  return Object.freeze([...tokens].sort());
}

function normalizeManifest(channels) {
  if (channels === undefined) return new Map();
  if (!Array.isArray(channels)) throw new TypeError("channels must be an array");
  const map = new Map();
  for (const channel of channels) {
    if (!channel || typeof channel.channelId !== "string") continue;
    map.set(
      channel.channelId,
      Object.freeze({
        channelId: channel.channelId,
        title: channel.title ?? null,
        category: channel.category ?? null,
        status: channel.status ?? null,
      }),
    );
  }
  return map;
}

export function buildYouTubeMetadataCandidates(
  rows,
  {
    now = new Date().toISOString(),
    channels,
    maxAgeHours = 168,
    topicWindowHours = 72,
  } = {},
) {
  assertRows(rows);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new TypeError("maxAgeHours must be positive");
  }
  if (!Number.isFinite(topicWindowHours) || topicWindowHours <= 0) {
    throw new TypeError("topicWindowHours must be positive");
  }
  if (topicWindowHours > maxAgeHours) {
    throw new TypeError("topicWindowHours must not exceed maxAgeHours");
  }
  const nowTime = new Date(now).getTime();
  if (Number.isNaN(nowTime)) throw new TypeError("now must be a valid timestamp");
  const ownerByChannel = normalizeManifest(channels);

  const recent = rows
    .filter(
      (row) =>
        row?.sourceIdentityId &&
        row?.externalId &&
        row?.publishedAt,
    )
    .map((row) => ({
      ...row,
      ageHours: hoursBetween(row.publishedAt, now),
    }))
    .filter(
      (row) =>
        row.ageHours !== null &&
        row.ageHours <= maxAgeHours,
    );

  const topicRows = recent.filter(
    (row) => row.ageHours <= topicWindowHours,
  );
  const tokenChannels = new Map();
  const titleTokens = new Map();
  const channelReleaseCount = new Map();

  for (const row of topicRows) {
    const tokens = extractTopicTokens(row.title);
    titleTokens.set(row.sourceIdentityId, tokens);
    if (!row.channelId) continue;
    channelReleaseCount.set(
      row.channelId,
      (channelReleaseCount.get(row.channelId) ?? 0) + 1,
    );
    for (const token of tokens) {
      const channelSet = tokenChannels.get(token) ?? new Set();
      channelSet.add(row.channelId);
      tokenChannels.set(token, channelSet);
    }
  }

  const candidates = recent.map((row) => {
    const fresh = freshnessScore(row.publishedAt, now, maxAgeHours);
    const channelCount = row.channelId
      ? row.ageHours <= topicWindowHours
        ? (channelReleaseCount.get(row.channelId) ?? 0)
        : 0
      : null;
    const releaseDensity =
      channelCount === null ? null : boundedCountScore(channelCount);
    const tokens =
      titleTokens.get(row.sourceIdentityId) ?? extractTopicTokens(row.title);
    const sharedTopics = [];
    const corroboratingChannels = new Set();

    if (row.channelId && row.ageHours <= topicWindowHours) {
      for (const token of tokens) {
        const channelsForToken = tokenChannels.get(token);
        if (!channelsForToken || channelsForToken.size < 2) continue;
        sharedTopics.push(token);
        for (const channelId of channelsForToken) {
          if (channelId !== row.channelId) {
            corroboratingChannels.add(channelId);
          }
        }
      }
    }

    sharedTopics.sort((left, right) => {
      const channelDelta =
        (tokenChannels.get(right)?.size ?? 0) -
        (tokenChannels.get(left)?.size ?? 0);
      return channelDelta || left.localeCompare(right);
    });

    const crossChannel = row.channelId
      ? boundedCountScore(corroboratingChannels.size, {
          first: 50,
          step: 25,
        })
      : null;
    const total = weightedScore([
      { key: "freshness", weight: 0.6, value: fresh },
      {
        key: "releaseDensity",
        weight: 0.2,
        value: releaseDensity,
      },
      {
        key: "crossChannelTopic",
        weight: 0.2,
        value: crossChannel,
      },
    ]);
    const rankingScore =
      total.score === null ? null : round(total.score * total.coverage);
    const owner = row.channelId
      ? ownerByChannel.get(row.channelId) ?? null
      : null;
    const reasonCodes = [];
    if (row.ageHours <= 24) reasonCodes.push("VERY_FRESH");
    else if (row.ageHours <= 72) reasonCodes.push("FRESH");
    if ((channelCount ?? 0) >= 3) {
      reasonCodes.push("CHANNEL_RELEASE_BURST");
    }
    if (corroboratingChannels.size > 0) {
      reasonCodes.push("CROSS_CHANNEL_TOPIC");
    }
    if (owner) reasonCodes.push("TRACKED_SOURCE_OWNER");

    return Object.freeze({
      signalVersion: "youtube-metadata-v1",
      signalClass: "metadata_only",
      promotionGate: "METRIC_CONFIRMATION_REQUIRED",
      sourceIdentityId: row.sourceIdentityId,
      externalId: row.externalId,
      sourceUrl: row.sourceUrl ?? null,
      title: row.title,
      channelId: row.channelId ?? null,
      publishedAt: row.publishedAt,
      observedAt: row.capturedAt ?? null,
      ingestionSource: row.ingestionSource ?? null,
      owner,
      ageHours: round(row.ageHours),
      topicWindowHours,
      channelVideoCountInWindow: channelCount,
      corroboratingChannelCount: row.channelId
        ? corroboratingChannels.size
        : null,
      corroboratingChannelIds: Object.freeze(
        [...corroboratingChannels].sort(),
      ),
      sharedTopics: Object.freeze(sharedTopics),
      freshnessScore: fresh,
      releaseDensityScore: releaseDensity,
      crossChannelTopicScore: crossChannel,
      metadataScore: total.score,
      rankingScore,
      coverage: total.coverage,
      missing: Object.freeze(total.missing),
      reasonCodes: Object.freeze(reasonCodes),
    });
  });

  return Object.freeze(
    candidates.sort(
      (left, right) =>
        (right.rankingScore ?? -1) - (left.rankingScore ?? -1) ||
        right.coverage - left.coverage ||
        (right.metadataScore ?? -1) - (left.metadataScore ?? -1) ||
        new Date(right.publishedAt) - new Date(left.publishedAt) ||
        left.externalId.localeCompare(right.externalId),
    ),
  );
}
