import assert from "node:assert/strict";
import test from "node:test";
import { assessOpportunity, weightedScore } from "../src/index.mjs";

const toolId = "0198a52f-854d-7d93-a0c8-bc1952f4ef43";

test("unknown metrics are renormalized instead of converted to zero", () => {
  const result = weightedScore([
    { key: "available", weight: 0.5, value: 80 },
    { key: "unknown", weight: 0.5, value: null },
  ]);
  assert.equal(result.score, 80);
  assert.equal(result.coverage, 0.5);
  assert.deepEqual(result.missing, ["unknown"]);
});

test("no evidence produces null score", () => {
  const result = weightedScore([{ key: "unknown", weight: 1, value: null }]);
  assert.equal(result.score, null);
  assert.equal(result.coverage, 0);
});

test("rights hard gate is independent of a high opportunity score", () => {
  const result = assessOpportunity({
    toolId,
    assessmentVersion: "v0.1",
    metrics: {
      youtubeRelativeVelocity: 95,
      crossChannelMentions: 90,
      productHuntVelocity: 88,
      githubVelocity: 92,
      freshness: 100,
      chinaOpportunity: 90,
      videoPotential: 95,
      testability: 90,
    },
    rightsRisk: "prohibited",
    securityRisk: "low",
  });
  assert.ok(result.total.score > 90);
  assert.equal(result.productionGate, "CANNOT_PRODUCE");
});

test("missing GitHub data does not disqualify a closed-source tool", () => {
  const result = assessOpportunity({
    toolId,
    assessmentVersion: "v0.1",
    metrics: {
      youtubeRelativeVelocity: 80,
      crossChannelMentions: 70,
      productHuntVelocity: 75,
      githubVelocity: null,
      freshness: 90,
      chinaOpportunity: 85,
      videoPotential: 88,
      testability: 80,
    },
    rightsRisk: "low",
    securityRisk: "low",
  });
  assert.ok(result.overseasMomentum.missing.includes("githubVelocity"));
  assert.notEqual(result.overseasMomentum.score, null);
  assert.equal(result.productionGate, "OPEN");
});
