export const SOURCE_TYPES = Object.freeze([
  "youtube_video",
  "product_hunt_post",
  "github_repository",
  "github_release",
  "official_page",
  "pricing_page",
]);

export const RIGHTS_RISKS = Object.freeze([
  "low",
  "review_required",
  "prohibited",
]);

export const SECURITY_RISKS = Object.freeze([
  "low",
  "review_required",
  "critical",
]);

const METRIC_KEYS = Object.freeze([
  "youtubeRelativeVelocity",
  "crossChannelMentions",
  "productHuntVelocity",
  "githubVelocity",
  "freshness",
  "chinaOpportunity",
  "videoPotential",
  "testability",
]);

function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${field} must be one of: ${allowed.join(", ")}`);
  }
}

function assertMetric(value, field) {
  if (value === null) return;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError(`${field} must be null or a number from 0 to 100`);
  }
}

export function validateOpportunityInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("opportunity input must be an object");
  }
  if (typeof input.toolId !== "string" || input.toolId.length === 0) {
    throw new TypeError("toolId must be a non-empty string");
  }
  if (typeof input.assessmentVersion !== "string" || input.assessmentVersion.length === 0) {
    throw new TypeError("assessmentVersion must be a non-empty string");
  }
  if (!input.metrics || typeof input.metrics !== "object") {
    throw new TypeError("metrics must be an object");
  }

  for (const key of METRIC_KEYS) {
    if (!(key in input.metrics)) {
      throw new TypeError(`metrics.${key} is required; use null when unknown`);
    }
    assertMetric(input.metrics[key], `metrics.${key}`);
  }

  assertEnum(input.rightsRisk, RIGHTS_RISKS, "rightsRisk");
  assertEnum(input.securityRisk, SECURITY_RISKS, "securityRisk");
  return input;
}
