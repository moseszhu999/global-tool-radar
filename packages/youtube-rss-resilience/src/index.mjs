const RETRYABLE_STATUS = new Set([404, 408, 425, 429, 500, 502, 503, 504]);

function assertInterface(value, method, field) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${field}.${method} must be a function`);
  }
}

function assertRatio(value, field) {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new TypeError(`${field} must be greater than 0 and at most 1`);
  }
}

function retryableStatus(error) {
  const match = String(error?.message ?? error ?? "").match(/HTTP\s+(\d{3})/i);
  if (!match) return null;
  const status = Number(match[1]);
  return RETRYABLE_STATUS.has(status) ? status : null;
}

function safeFailure(error) {
  return String(error?.message ?? error ?? "unknown error")
    .replace(/postgres(?:ql)?:\/\/[^\s'\"]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/npg_[A-Za-z0-9_-]+/g, "[REDACTED_DATABASE_PASSWORD]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 500);
}

export function createResilientYouTubeRssClient({
  client,
  maxAttempts = 3,
  retryDelayMs = 250,
  maximumRetryDelayMs = 2000,
  sleepImpl = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
} = {}) {
  assertInterface(client, "getChannelFeed", "client");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new TypeError("maxAttempts must be an integer from 1 to 5");
  }
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 5000) {
    throw new TypeError("retryDelayMs must be an integer from 0 to 5000");
  }
  if (
    !Number.isInteger(maximumRetryDelayMs) ||
    maximumRetryDelayMs < retryDelayMs ||
    maximumRetryDelayMs > 10000
  ) {
    throw new TypeError(
      "maximumRetryDelayMs must be an integer at least retryDelayMs and at most 10000",
    );
  }
  if (typeof sleepImpl !== "function") {
    throw new TypeError("sleepImpl must be a function");
  }

  return Object.freeze({
    async getChannelFeed(input) {
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await client.getChannelFeed(input);
        } catch (error) {
          lastError = error;
          const status = retryableStatus(error);
          if (status === null || attempt === maxAttempts) break;
          const delay = Math.min(
            maximumRetryDelayMs,
            retryDelayMs * 2 ** (attempt - 1),
          );
          await sleepImpl(delay);
        }
      }
      const reason = safeFailure(lastError);
      throw new Error(
        `YouTube RSS request exhausted ${maxAttempts} attempt(s): ${reason}`,
      );
    },
  });
}

export function assertYouTubeRssCoverage(
  artifact,
  { minimumSuccessRatio = 0.8 } = {},
) {
  if (!artifact || typeof artifact !== "object") {
    throw new TypeError("artifact must be an object");
  }
  assertRatio(minimumSuccessRatio, "minimumSuccessRatio");
  const requested = artifact.requestedChannels;
  const succeeded = artifact.succeededChannels;
  if (!Number.isInteger(requested) || requested < 1) {
    throw new TypeError("artifact.requestedChannels must be positive");
  }
  if (!Number.isInteger(succeeded) || succeeded < 0 || succeeded > requested) {
    throw new TypeError("artifact.succeededChannels is invalid");
  }
  const required = Math.ceil(requested * minimumSuccessRatio);
  const successRatio = succeeded / requested;
  if (succeeded < required) {
    const error = new Error(
      `YouTube RSS coverage gate failed: ${succeeded}/${requested} channels succeeded; ${required} required`,
    );
    error.channelResults = artifact.channels ?? [];
    error.coverage = Object.freeze({
      requestedChannels: requested,
      succeededChannels: succeeded,
      requiredChannels: required,
      minimumSuccessRatio,
      actualSuccessRatio: successRatio,
    });
    throw error;
  }
  return Object.freeze({
    requestedChannels: requested,
    succeededChannels: succeeded,
    requiredChannels: required,
    minimumSuccessRatio,
    actualSuccessRatio: successRatio,
  });
}
