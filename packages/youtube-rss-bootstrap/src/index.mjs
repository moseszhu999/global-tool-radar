function assertInterface(value, method, field) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${field}.${method} must be a function`);
  }
}

function assertChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("channels must be a non-empty array");
  }
  for (const [index, channel] of channels.entries()) {
    if (!channel || typeof channel.channelId !== "string") {
      throw new TypeError(`channels[${index}].channelId is required`);
    }
  }
}

function safeFailure(error) {
  return String(error?.message ?? error ?? "unknown error")
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]")
    .slice(0, 500);
}

export async function runYouTubeRssBootstrap({
  repository,
  rssClient,
  channels,
  capturedAt,
} = {}) {
  assertInterface(repository, "persistSourceCapture", "repository");
  assertInterface(rssClient, "getChannelFeed", "rssClient");
  assertChannels(channels);
  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) {
    throw new TypeError("capturedAt must be an ISO-compatible timestamp");
  }
  const capturedIso = captured.toISOString();

  const channelResults = [];
  let discoveredVideos = 0;
  let insertedRevisions = 0;
  let insertedSnapshots = 0;
  let failedChannels = 0;

  for (const channel of channels) {
    try {
      const feed = await rssClient.getChannelFeed({
        channelId: channel.channelId,
        capturedAt: capturedIso,
      });
      let channelRevisions = 0;
      let channelSnapshots = 0;
      for (const video of feed.videos) {
        const persisted = await repository.persistSourceCapture({
          sourceItem: video.sourceItem,
          metricSnapshot: video.metricSnapshot,
        });
        if (persisted.revisionInserted) channelRevisions += 1;
        if (persisted.snapshotInserted) channelSnapshots += 1;
      }
      discoveredVideos += feed.videos.length;
      insertedRevisions += channelRevisions;
      insertedSnapshots += channelSnapshots;
      channelResults.push(
        Object.freeze({
          channelId: channel.channelId,
          status: "succeeded",
          discoveredVideos: feed.videos.length,
          insertedRevisions: channelRevisions,
          insertedSnapshots: channelSnapshots,
          error: null,
        }),
      );
    } catch (error) {
      failedChannels += 1;
      channelResults.push(
        Object.freeze({
          channelId: channel.channelId,
          status: "failed",
          discoveredVideos: 0,
          insertedRevisions: 0,
          insertedSnapshots: 0,
          error: safeFailure(error),
        }),
      );
    }
  }

  return Object.freeze({
    capturedAt: capturedIso,
    requestedChannels: channels.length,
    succeededChannels: channels.length - failedChannels,
    failedChannels,
    discoveredVideos,
    insertedRevisions,
    insertedSnapshots,
    channels: Object.freeze(channelResults),
  });
}
