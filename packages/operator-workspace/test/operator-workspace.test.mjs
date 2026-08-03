import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOperatorWorkspaceProjection,
  validateOperatorWorkspaceProjection,
} from "../src/index.mjs";

const candidate = {
  sourceIdentityId: "source-1",
  externalId: "abcDEF12345",
  title: "A real discovered video",
  channelId: "channel-1",
  publishedAt: "2026-08-01T00:00:00.000Z",
  observedAt: "2026-08-03T00:00:00.000Z",
  currentViewsPerHour: 120,
  channelBaselineViewsPerHour: null,
  relativeRatio: null,
  relativeVelocityScore: null,
  freshnessScore: 71.43,
  score: 71.43,
  rankingScore: 14.29,
  coverage: 0.2,
  missing: ["relativeVelocity"],
};

test("builds a privacy-bounded operator projection without fake zeroes", () => {
  const projection = buildOperatorWorkspaceProjection([candidate], {
    generatedAt: "2026-08-03T01:00:00.000Z",
  });
  assert.equal(validateOperatorWorkspaceProjection(projection), true);
  assert.equal(projection.candidates[0].metrics.channelBaselineViewsPerHour, null);
  assert.equal(projection.candidates[0].metrics.relativeRatio, null);
  assert.equal(projection.candidates[0].rightsState, "not_evaluated");
  assert.equal(projection.candidates[0].securityState, "not_evaluated");
  assert.equal(projection.candidates[0].formalPublicationPriority, null);
});

test("keeps opportunity score separate from rights, security and publication decisions", () => {
  const projection = buildOperatorWorkspaceProjection([candidate]);
  assert.equal(projection.policy.opportunityScoreIsDecision, false);
  assert.equal(projection.policy.rightsGateIndependent, true);
  assert.equal(projection.policy.securityGateIndependent, true);
  assert.equal(projection.policy.automaticPublishingAllowed, false);
  assert.equal(projection.policy.sourceVideoDownloadAllowed, false);
});

test("rejects projections that turn ranking into formal priority", () => {
  const projection = buildOperatorWorkspaceProjection([candidate]);
  const invalid = {
    ...projection,
    candidates: [{ ...projection.candidates[0], formalPublicationPriority: 1 }],
  };
  assert.throws(
    () => validateOperatorWorkspaceProjection(invalid),
    /formal publication priority/,
  );
});
