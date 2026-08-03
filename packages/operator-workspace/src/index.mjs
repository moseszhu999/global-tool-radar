const freeze = (value) => Object.freeze(value);

function nullableNumber(value, field) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) throw new TypeError(`${field} must be null or a finite number`);
  return value;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function youtubeUrl(externalId) {
  return /^[A-Za-z0-9_-]{6,20}$/.test(externalId)
    ? `https://www.youtube.com/watch?v=${externalId}`
    : null;
}

export function buildOperatorWorkspaceProjection(
  candidates,
  { generatedAt = new Date().toISOString() } = {},
) {
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  if (Number.isNaN(new Date(generatedAt).getTime())) {
    throw new TypeError("generatedAt must be a valid timestamp");
  }

  const projected = candidates.map((candidate) => {
    const sourceIdentityId = requiredString(candidate.sourceIdentityId, "sourceIdentityId");
    const externalId = requiredString(candidate.externalId, "externalId");
    const title = requiredString(candidate.title, "title");

    return freeze({
      candidateId: `youtube:${sourceIdentityId}`,
      sourceType: "youtube_video",
      sourceIdentityId,
      externalId,
      sourceUrl: youtubeUrl(externalId),
      title,
      channelId: candidate.channelId ?? null,
      publishedAt: candidate.publishedAt ?? null,
      observedAt: candidate.observedAt ?? null,
      metrics: freeze({
        currentViewsPerHour: nullableNumber(candidate.currentViewsPerHour, "currentViewsPerHour"),
        channelBaselineViewsPerHour: nullableNumber(
          candidate.channelBaselineViewsPerHour,
          "channelBaselineViewsPerHour",
        ),
        relativeRatio: nullableNumber(candidate.relativeRatio, "relativeRatio"),
        relativeVelocityScore: nullableNumber(
          candidate.relativeVelocityScore,
          "relativeVelocityScore",
        ),
        freshnessScore: nullableNumber(candidate.freshnessScore, "freshnessScore"),
        opportunityScore: nullableNumber(candidate.score, "score"),
        rankingScore: nullableNumber(candidate.rankingScore, "rankingScore"),
        coverage: nullableNumber(candidate.coverage, "coverage"),
        missing: freeze([...(candidate.missing ?? [])]),
      }),
      rightsState: "not_evaluated",
      securityState: "not_evaluated",
      testEvidenceState: "not_available",
      operatorStatus: "unreviewed",
      formalPublicationPriority: null,
    });
  });

  return freeze({
    schemaVersion: "toolradar.operator-workspace.v1",
    generatedAt,
    policy: freeze({
      missingValue: "UNKNOWN",
      missingNumericValueIsZero: false,
      opportunityScoreIsDecision: false,
      rightsGateIndependent: true,
      securityGateIndependent: true,
      automaticPublishingAllowed: false,
      sourceVideoDownloadAllowed: false,
    }),
    candidates: freeze(projected),
  });
}

export function validateOperatorWorkspaceProjection(projection) {
  if (projection?.schemaVersion !== "toolradar.operator-workspace.v1") {
    throw new TypeError("unsupported operator workspace schema");
  }
  if (projection.policy?.missingNumericValueIsZero !== false) {
    throw new TypeError("missing numeric values must not become zero");
  }
  if (projection.policy?.opportunityScoreIsDecision !== false) {
    throw new TypeError("opportunity score must not become a decision");
  }
  if (projection.policy?.automaticPublishingAllowed !== false) {
    throw new TypeError("automatic publishing must remain disabled");
  }
  if (!Array.isArray(projection.candidates)) {
    throw new TypeError("projection candidates must be an array");
  }
  for (const candidate of projection.candidates) {
    requiredString(candidate.candidateId, "candidateId");
    requiredString(candidate.title, "title");
    if (candidate.formalPublicationPriority !== null) {
      throw new TypeError("formal publication priority is not owned by this projection");
    }
  }
  return true;
}
