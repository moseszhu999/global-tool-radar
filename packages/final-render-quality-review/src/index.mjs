import crypto from 'node:crypto';

const REQUIRED_CHECKS = Object.freeze([
  'visualContinuity',
  'textLegibility',
  'audioClarity',
  'audioVideoSync',
  'brandAndClaimsAccuracy',
  'privacyAndRights',
  'platformSafeFraming'
]);

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function normalizeCheck(check, name) {
  assertObject(check, name);
  const status = String(check.status ?? '').trim().toUpperCase();
  if (!['PASS', 'FAIL', 'NOT_REVIEWED'].includes(status)) {
    throw new Error(`${name}.status must be PASS, FAIL, or NOT_REVIEWED`);
  }
  const note = String(check.note ?? '').trim();
  if (status !== 'PASS' && note.length < 8) {
    throw new Error(`${name}.note must explain non-passing status`);
  }
  return { status, note };
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createFinalRenderQualityReview(input) {
  assertObject(input, 'input');
  assertObject(input.renderEvidenceReceipt, 'renderEvidenceReceipt');
  assertObject(input.checks, 'checks');

  const receipt = input.renderEvidenceReceipt;
  if (receipt.status !== 'READY_FOR_M10_REVIEW') {
    return {
      schemaVersion: 'toolradar.final-render-quality-review.v1',
      status: 'BLOCKED',
      reason: 'render evidence receipt is not ready for M10 review',
      publicationAllowed: false,
      humanApprovalRequired: true
    };
  }

  if (!receipt.outputSha256 || !receipt.renderCommandManifestSha256) {
    throw new Error('render evidence receipt must include output and command manifest digests');
  }

  const checks = Object.fromEntries(
    REQUIRED_CHECKS.map((name) => [name, normalizeCheck(input.checks[name], `checks.${name}`)])
  );
  const failedChecks = REQUIRED_CHECKS.filter((name) => checks[name].status === 'FAIL');
  const pendingChecks = REQUIRED_CHECKS.filter((name) => checks[name].status === 'NOT_REVIEWED');
  const reviewer = String(input.reviewer ?? '').trim();
  const reviewedAt = String(input.reviewedAt ?? '').trim();
  const reviewerApproved = input.reviewerApproved === true;

  const ready = failedChecks.length === 0
    && pendingChecks.length === 0
    && reviewer.length > 0
    && reviewedAt.length > 0
    && reviewerApproved;

  const canonical = {
    outputSha256: receipt.outputSha256,
    renderCommandManifestSha256: receipt.renderCommandManifestSha256,
    checks,
    reviewer,
    reviewedAt,
    reviewerApproved
  };

  return {
    schemaVersion: 'toolradar.final-render-quality-review.v1',
    status: ready ? 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION' : 'BLOCKED',
    reviewSha256: digest(canonical),
    ...canonical,
    failedChecks,
    pendingChecks,
    releasePreparationAllowed: ready,
    platformLoginPerformed: false,
    uploadPerformed: false,
    publicationAllowed: false,
    humanPlatformAuthorizationRequired: true
  };
}

export { REQUIRED_CHECKS };
