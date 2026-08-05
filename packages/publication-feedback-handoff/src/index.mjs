import { createHash } from 'node:crypto';

const METRICS = ['views', 'likes', 'comments', 'shares', 'favorites', 'followers'];

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function assertDigest(value, name) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${name} must be a lowercase sha256 digest`);
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function buildPublicationFeedbackHandoff({ summary, owner, reviewDueAt, notes = [] }) {
  assertObject(summary, 'summary');
  assertDigest(summary.summaryDigest, 'summary.summaryDigest');

  if (summary.feedbackSummaryReady !== true) {
    throw new Error('feedback summary must be ready before handoff');
  }
  if (summary.interpretation !== 'descriptive-only') {
    throw new Error('only descriptive-only summaries may be handed off');
  }
  if (summary.causalClaimsAllowed !== false || summary.recommendationClaimsAllowed !== false) {
    throw new Error('causal and recommendation claims must remain disabled');
  }

  if (typeof owner !== 'string' || owner.trim().length < 2) {
    throw new TypeError('owner is required');
  }
  const due = new Date(reviewDueAt);
  if (Number.isNaN(due.getTime())) throw new TypeError('reviewDueAt must be an ISO timestamp');

  assertObject(summary.metricDeltas, 'summary.metricDeltas');
  const metricDeltas = {};
  for (const metric of METRICS) {
    const value = summary.metricDeltas[metric];
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`summary.metricDeltas.${metric} must be a non-negative integer`);
    }
    metricDeltas[metric] = value;
  }

  if (!Array.isArray(notes) || notes.some((note) => typeof note !== 'string' || note.trim() === '')) {
    throw new TypeError('notes must be an array of non-empty strings');
  }

  const core = {
    schemaVersion: 1,
    summaryDigest: summary.summaryDigest,
    owner: owner.trim(),
    reviewDueAt: due.toISOString(),
    metricDeltas,
    notes: notes.map((note) => note.trim()),
    requiredHumanChecks: [
      'confirm platform screenshots or exports match the bound observations',
      'record external context that may explain the observation window',
      'decide manually whether another observation window is needed',
    ],
    decisionBoundary: {
      automaticRecommendationAllowed: false,
      automaticContentChangeAllowed: false,
      causalClaimAllowed: false,
      platformApiVerified: false,
      humanReviewRequired: true,
    },
  };

  return {
    ...core,
    handoffDigest: digest(core),
    handoffReady: true,
  };
}
