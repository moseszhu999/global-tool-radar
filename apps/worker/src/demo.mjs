import { assessOpportunity } from "../../../packages/scoring/src/index.mjs";

const assessment = assessOpportunity({
  toolId: "0198a52f-854d-7d93-a0c8-bc1952f4ef43",
  assessmentVersion: "v0.1",
  metrics: {
    youtubeRelativeVelocity: 92,
    crossChannelMentions: 78,
    productHuntVelocity: 85,
    githubVelocity: null,
    freshness: 96,
    chinaOpportunity: 84,
    videoPotential: 91,
    testability: 82,
  },
  rightsRisk: "review_required",
  securityRisk: "low",
});

console.log(JSON.stringify(assessment, null, 2));
