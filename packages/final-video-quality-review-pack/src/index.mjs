import crypto from 'node:crypto';
import {
  createFinalRenderQualityReview,
  REQUIRED_CHECKS as OFFICIAL_REQUIRED_CHECKS,
} from '../../final-render-quality-review/src/index.mjs';

const GRANULAR_CHECKS = Object.freeze([
  ['visual_integrity', '画面无黑帧、花屏、卡顿、异常裁切或明显压缩损伤'],
  ['owned_media_match', '两段自有录屏与脚本对应，不含未授权第三方素材'],
  ['narration_sync', '中文配音与画面节奏同步，无明显抢拍、拖拍或断句错误'],
  ['subtitle_accuracy', '字幕无错别字、截断、遮挡和超出安全区'],
  ['claim_accuracy', '功能、限制、价格与结论均与已绑定证据一致'],
  ['privacy_redaction', '账号、邮箱、密钥、Cookie、通知和个人信息均已遮挡'],
  ['audio_quality', '人声清晰，响度稳定，无爆音、底噪或明显削波'],
  ['platform_framing', '1080×1920 竖屏构图适合抖音和 B 站竖版播放'],
  ['cta_and_branding', '片尾 CTA、品牌名和免责声明完整且可读'],
  ['full_playback', '审片人已从头到尾完整播放最终 MP4'],
]);

export const officialQualityCheckMap = Object.freeze({
  visualContinuity: Object.freeze(['visual_integrity', 'full_playback']),
  textLegibility: Object.freeze(['subtitle_accuracy', 'cta_and_branding']),
  audioClarity: Object.freeze(['audio_quality']),
  audioVideoSync: Object.freeze(['narration_sync']),
  brandAndClaimsAccuracy: Object.freeze(['owned_media_match', 'claim_accuracy', 'cta_and_branding']),
  privacyAndRights: Object.freeze(['privacy_redaction', 'owned_media_match']),
  platformSafeFraming: Object.freeze(['platform_framing']),
});

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function assertSha256(value, field) {
  if (!/^[a-f0-9]{64}$/u.test(value ?? '')) throw new Error(`${field} must be a lowercase SHA-256 digest`);
}

function assertTimestamp(value, field) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function assertPack(pack) {
  if (pack?.schemaVersion !== 'toolradar.final-video-quality-review-pack.v1') throw new Error('unsupported review pack');
  const {digest, ...core} = pack;
  assertSha256(digest, 'pack.digest');
  if (sha256(core) !== digest) throw new Error('review pack digest mismatch');
  if (!Array.isArray(pack.checks) || pack.checks.length !== GRANULAR_CHECKS.length) throw new Error('review pack check set invalid');
  if (pack.checks.some((check, index) => check.id !== GRANULAR_CHECKS[index][0])) throw new Error('review pack check order invalid');
  return true;
}

function normalizeDecision(check, decision) {
  const verdict = String(decision?.verdict ?? 'NOT_REVIEWED').trim().toUpperCase();
  if (!['PASS', 'FAIL', 'NOT_REVIEWED'].includes(verdict)) throw new Error(`invalid verdict for ${check.id}`);
  const suppliedNote = String(decision?.note ?? '').trim();
  const note = verdict === 'PASS'
    ? suppliedNote
    : suppliedNote || (verdict === 'FAIL'
      ? `manual review failed: ${check.instruction}`
      : `manual review is still pending: ${check.instruction}`);
  return Object.freeze({...check, verdict, note});
}

function aggregateOfficialCheck(ids, granularById) {
  const items = ids.map((id) => granularById.get(id));
  const failed = items.filter((item) => item.verdict === 'FAIL');
  if (failed.length > 0) {
    return {
      status: 'FAIL',
      note: failed.map((item) => `${item.id}: ${item.note}`).join('; '),
    };
  }
  const pending = items.filter((item) => item.verdict === 'NOT_REVIEWED');
  if (pending.length > 0) {
    return {
      status: 'NOT_REVIEWED',
      note: pending.map((item) => `${item.id}: ${item.note}`).join('; '),
    };
  }
  return {status: 'PASS', note: ''};
}

function buildOfficialChecks(granularChecks) {
  const granularById = new Map(granularChecks.map((check) => [check.id, check]));
  return Object.fromEntries(OFFICIAL_REQUIRED_CHECKS.map((name) => {
    const mappedIds = officialQualityCheckMap[name];
    if (!mappedIds) throw new Error(`official check mapping missing: ${name}`);
    return [name, aggregateOfficialCheck(mappedIds, granularById)];
  }));
}

export function createQualityReviewPack({
  projectId,
  finalVideoReceiptDigest,
  finalVideoSha256,
  finalVideoPath,
  renderCommandManifestSha256,
  expectedProfile,
  reviewerInstructionsVersion = '2026-08-06',
  createdAt,
}) {
  if (!projectId?.trim()) throw new Error('projectId is required');
  if (!finalVideoPath?.trim()) throw new Error('finalVideoPath is required');
  assertSha256(finalVideoReceiptDigest, 'finalVideoReceiptDigest');
  assertSha256(finalVideoSha256, 'finalVideoSha256');
  assertSha256(renderCommandManifestSha256, 'renderCommandManifestSha256');

  const profile = {
    width: Number(expectedProfile?.width),
    height: Number(expectedProfile?.height),
    fps: Number(expectedProfile?.fps),
    durationSeconds: Number(expectedProfile?.durationSeconds),
  };
  if (profile.width !== 1080 || profile.height !== 1920 || profile.fps !== 30 || profile.durationSeconds !== 89) {
    throw new Error('expectedProfile must be the canonical 1080x1920, 30fps, 89s profile');
  }

  const pack = {
    schemaVersion: 'toolradar.final-video-quality-review-pack.v1',
    truthBoundary: 'granular_human_review_tasks_prepared',
    projectId: projectId.trim(),
    finalVideo: {
      path: finalVideoPath.trim(),
      sha256: finalVideoSha256,
      receiptDigest: finalVideoReceiptDigest,
      renderCommandManifestSha256,
      expectedProfile: profile,
    },
    reviewerInstructionsVersion,
    checks: GRANULAR_CHECKS.map(([id, instruction]) => ({
      id,
      instruction,
      required: true,
      allowedVerdicts: ['PASS', 'FAIL', 'NOT_REVIEWED'],
      verdict: null,
      note: null,
    })),
    officialReviewSchema: 'toolradar.final-render-quality-review.v1',
    officialReviewCreated: false,
    publicationAllowed: false,
    createdAt: assertTimestamp(createdAt, 'createdAt'),
  };

  return Object.freeze({...pack, digest: sha256(pack)});
}

export function recordQualityDecision(pack, {
  reviewer,
  reviewedAt,
  decisions,
  reviewerApproved = false,
} = {}) {
  assertPack(pack);
  if (!reviewer?.trim()) throw new Error('reviewer is required');
  const normalizedReviewedAt = assertTimestamp(reviewedAt, 'reviewedAt');
  const byId = new Map((decisions ?? []).map((item) => [item.id, item]));
  const granularChecks = pack.checks.map((check) => normalizeDecision(check, byId.get(check.id)));
  const officialChecks = buildOfficialChecks(granularChecks);
  const renderEvidenceReceipt = {
    status: 'READY_FOR_M10_REVIEW',
    outputSha256: pack.finalVideo.sha256,
    renderCommandManifestSha256: pack.finalVideo.renderCommandManifestSha256,
    finalVideoReceiptDigest: pack.finalVideo.receiptDigest,
  };
  const officialReview = createFinalRenderQualityReview({
    renderEvidenceReceipt,
    checks: officialChecks,
    reviewer: reviewer.trim(),
    reviewedAt: normalizedReviewedAt,
    reviewerApproved: reviewerApproved === true,
  });

  const envelope = {
    schemaVersion: 'toolradar.final-video-quality-review-adapter.v1',
    truthBoundary: officialReview.status === 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION'
      ? 'official_m10_quality_review_created'
      : 'official_m10_quality_review_blocked',
    projectId: pack.projectId,
    reviewPackDigest: pack.digest,
    finalVideoReceiptDigest: pack.finalVideo.receiptDigest,
    finalVideoSha256: pack.finalVideo.sha256,
    granularChecks,
    officialCheckMapping: officialQualityCheckMap,
    officialReview,
    publicationAllowed: false,
  };
  return Object.freeze({...envelope, digest: sha256(envelope)});
}

export function validateQualityDecisionEnvelope(envelope, pack) {
  assertPack(pack);
  if (envelope?.schemaVersion !== 'toolradar.final-video-quality-review-adapter.v1') throw new Error('unsupported quality decision envelope');
  const {digest, ...core} = envelope;
  assertSha256(digest, 'envelope.digest');
  if (sha256(core) !== digest) throw new Error('quality decision envelope digest mismatch');
  if (envelope.reviewPackDigest !== pack.digest) throw new Error('quality decision pack binding mismatch');
  if (envelope.finalVideoSha256 !== pack.finalVideo.sha256) throw new Error('quality decision video binding mismatch');
  if (envelope.officialReview?.schemaVersion !== 'toolradar.final-render-quality-review.v1') {
    throw new Error('quality decision must contain the official M10 review');
  }
  if ('releaseAllowed' in envelope || envelope.schema === 'toolradar.final-video-quality-review-receipt.v1') {
    throw new Error('parallel quality approval truth is forbidden');
  }
  return true;
}

export const qualityReviewCheckIds = Object.freeze(GRANULAR_CHECKS.map(([id]) => id));
