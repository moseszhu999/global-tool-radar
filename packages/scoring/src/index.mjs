import { validateOpportunityInput } from "../../contracts/src/index.mjs";

const round = (value) => Math.round(value * 100) / 100;

export function weightedScore(metrics) {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    throw new TypeError("metrics must be a non-empty array");
  }

  const configuredWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const available = metrics.filter((metric) => metric.value !== null);
  const availableWeight = available.reduce((sum, metric) => sum + metric.weight, 0);

  if (availableWeight === 0 || configuredWeight === 0) {
    return {
      score: null,
      coverage: 0,
      components: [],
      missing: metrics.map((metric) => metric.key),
    };
  }

  const components = available.map((metric) => {
    const normalizedWeight = metric.weight / availableWeight;
    return {
      key: metric.key,
      configuredWeight: metric.weight,
      normalizedWeight: round(normalizedWeight),
      value: metric.value,
      contribution: round(metric.value * normalizedWeight),
    };
  });

  return {
    score: round(components.reduce((sum, component) => sum + component.contribution, 0)),
    coverage: round(availableWeight / configuredWeight),
    components,
    missing: metrics.filter((metric) => metric.value === null).map((metric) => metric.key),
  };
}

function determineGate(input) {
  if (input.rightsRisk === "prohibited") return "CANNOT_PRODUCE";
  if (input.securityRisk === "critical") return "CANNOT_TEST_AUTOMATICALLY";
  if (input.rightsRisk === "review_required") return "RIGHTS_REVIEW_REQUIRED";
  if (input.securityRisk === "review_required") return "SECURITY_REVIEW_REQUIRED";
  return "OPEN";
}

export function assessOpportunity(rawInput) {
  const input = validateOpportunityInput(rawInput);

  const overseasMomentum = weightedScore([
    { key: "youtubeRelativeVelocity", weight: 0.35, value: input.metrics.youtubeRelativeVelocity },
    { key: "crossChannelMentions", weight: 0.2, value: input.metrics.crossChannelMentions },
    { key: "productHuntVelocity", weight: 0.15, value: input.metrics.productHuntVelocity },
    { key: "githubVelocity", weight: 0.2, value: input.metrics.githubVelocity },
    { key: "freshness", weight: 0.1, value: input.metrics.freshness },
  ]);

  const total = weightedScore([
    { key: "overseasMomentum", weight: 0.35, value: overseasMomentum.score },
    { key: "chinaOpportunity", weight: 0.3, value: input.metrics.chinaOpportunity },
    { key: "videoPotential", weight: 0.2, value: input.metrics.videoPotential },
    { key: "testability", weight: 0.15, value: input.metrics.testability },
  ]);

  const productionGate = determineGate(input);
  return {
    toolId: input.toolId,
    assessmentVersion: input.assessmentVersion,
    overseasMomentum,
    total,
    productionGate,
    explanation: [
      `Overseas signal coverage: ${Math.round(overseasMomentum.coverage * 100)}%.`,
      overseasMomentum.missing.length
        ? `Missing overseas signals: ${overseasMomentum.missing.join(", ")}.`
        : "All configured overseas signals are present.",
      `Production gate: ${productionGate}.`,
    ],
  };
}
