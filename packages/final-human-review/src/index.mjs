const REQUIRED_CHECKS = Object.freeze([
  "visuals_match_script",
  "subtitles_accurate",
  "voice_approved",
  "claims_match_evidence",
  "sensitive_data_absent",
  "copyright_boundary_respected",
  "platform_copy_approved",
]);

function validSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function buildFinalHumanReviewReceipt({ qualityReport, reviewer, checks, reviewedAt = new Date().toISOString(), notes = "" }) {
  if (qualityReport?.schemaVersion !== "toolradar.video-quality-report.v1") throw new TypeError("quality report is required");
  if (!reviewer?.trim()) throw new TypeError("reviewer is required");
  if (!checks || typeof checks !== "object") throw new TypeError("review checks are required");
  if (!validSha256(qualityReport.metrics?.sha256)) throw new TypeError("quality report media sha256 is required");

  const normalizedChecks = Object.freeze(REQUIRED_CHECKS.map((id) => Object.freeze({ id, passed: checks[id] === true })));
  const failedCheckIds = Object.freeze(normalizedChecks.filter((item) => !item.passed).map((item) => item.id));
  const upstreamBlockers = Object.freeze([...(qualityReport.releaseBlockers ?? [])]);
  const blockers = Object.freeze([
    ...upstreamBlockers,
    ...(failedCheckIds.length ? ["HUMAN_REVIEW_CHECKS_FAILED"] : []),
    ...(qualityReport.automatedGate !== "PASS" ? ["AUTOMATED_QA_NOT_PASSED"] : []),
  ]);
  const approved = blockers.length === 0;

  return Object.freeze({
    schemaVersion: "toolradar.final-human-review-receipt.v1",
    receiptId: `${qualityReport.reportId}:human-review:v1`,
    reviewedAt,
    reviewer: reviewer.trim(),
    sourceQualityReportId: qualityReport.reportId,
    mediaSha256: qualityReport.metrics.sha256,
    checks: normalizedChecks,
    failedCheckIds,
    upstreamBlockers,
    notes: String(notes),
    decision: approved ? "APPROVED_FOR_RELEASE_HANDOFF" : "BLOCKED",
    publicationAllowed: false,
    releaseHandoffAllowed: approved,
    nextAction: approved ? "PLATFORM_ACCOUNT_AUTHORIZATION" : "RESOLVE_REVIEW_BLOCKERS",
  });
}

export function validateFinalHumanReviewReceipt(receipt) {
  if (receipt?.schemaVersion !== "toolradar.final-human-review-receipt.v1") throw new TypeError("unsupported human review receipt");
  if (!validSha256(receipt.mediaSha256)) throw new TypeError("media sha256 is required");
  if (!Array.isArray(receipt.checks) || receipt.checks.length !== REQUIRED_CHECKS.length) throw new TypeError("complete review checklist is required");
  if (receipt.publicationAllowed !== false) throw new TypeError("human review receipt cannot publish media");
  if (receipt.releaseHandoffAllowed && receipt.decision !== "APPROVED_FOR_RELEASE_HANDOFF") throw new TypeError("handoff permission requires approval");
  if (receipt.releaseHandoffAllowed && (receipt.failedCheckIds.length || receipt.upstreamBlockers.length)) throw new TypeError("approved handoff cannot contain blockers");
  return true;
}

export { REQUIRED_CHECKS };