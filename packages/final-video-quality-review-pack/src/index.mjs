import crypto from 'node:crypto';

const REQUIRED_CHECKS = Object.freeze([
  ['visual_integrity', '画面无黑帧、花屏、卡顿、异常裁切或明显压缩损伤'],
  ['owned_media_match', '两段自有录屏与脚本对应，不含未授权第三方素材'],
  ['narration_sync', '中文配音与画面节奏同步，无明显抢拍、拖拍或断句错误'],
  ['subtitle_accuracy', '字幕无错别字、截断、遮挡和超出安全区'],
  ['claim_accuracy', '功能、限制、价格与结论均与已绑定证据一致'],
  ['privacy_redaction', '账号、邮箱、密钥、Cookie、通知和个人信息均已遮挡'],
  ['audio_quality', '人声清晰，响度稳定，无爆音、底噪或明显削波'],
  ['platform_framing', '1080×1920 竖屏构图适合抖音和 B 站竖版播放'],
  ['cta_and_branding', '片尾 CTA、品牌名和免责声明完整且可读'],
  ['full_playback', '审片人已从头到尾完整播放最终 MP4']
]);

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

export function createQualityReviewPack({
  projectId,
  finalVideoReceiptDigest,
  finalVideoSha256,
  finalVideoPath,
  expectedProfile,
  reviewerInstructionsVersion = '2026-08-06',
  createdAt
}) {
  if (!projectId?.trim()) throw new Error('projectId is required');
  if (!finalVideoPath?.trim()) throw new Error('finalVideoPath is required');
  assertSha256(finalVideoReceiptDigest, 'finalVideoReceiptDigest');
  assertSha256(finalVideoSha256, 'finalVideoSha256');
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) throw new Error('createdAt must be an ISO timestamp');

  const profile = {
    width: Number(expectedProfile?.width),
    height: Number(expectedProfile?.height),
    fps: Number(expectedProfile?.fps),
    durationSeconds: Number(expectedProfile?.durationSeconds)
  };
  if (profile.width !== 1080 || profile.height !== 1920 || profile.fps !== 30 || profile.durationSeconds !== 89) {
    throw new Error('expectedProfile must be the canonical 1080x1920, 30fps, 89s profile');
  }

  const pack = {
    schema: 'toolradar.final-video-quality-review-pack.v1',
    projectId: projectId.trim(),
    finalVideo: {
      path: finalVideoPath.trim(),
      sha256: finalVideoSha256,
      receiptDigest: finalVideoReceiptDigest,
      expectedProfile: profile
    },
    reviewerInstructionsVersion,
    checks: REQUIRED_CHECKS.map(([id, instruction]) => ({
      id,
      instruction,
      required: true,
      allowedVerdicts: ['PASS', 'FAIL'],
      verdict: null,
      note: null
    })),
    approval: {
      humanReviewRequired: true,
      qualityApproved: false,
      releaseAllowed: false,
      reviewer: null,
      reviewedAt: null,
      decision: null
    },
    createdAt
  };

  return Object.freeze({ ...pack, digest: sha256(pack) });
}

export function recordQualityDecision(pack, { reviewer, reviewedAt, decisions }) {
  if (pack?.schema !== 'toolradar.final-video-quality-review-pack.v1') throw new Error('unsupported review pack');
  if (!reviewer?.trim()) throw new Error('reviewer is required');
  if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) throw new Error('reviewedAt must be an ISO timestamp');
  const byId = new Map((decisions ?? []).map((item) => [item.id, item]));
  const checks = pack.checks.map((check) => {
    const decision = byId.get(check.id);
    if (!decision || !['PASS', 'FAIL'].includes(decision.verdict)) throw new Error(`missing valid verdict for ${check.id}`);
    return { ...check, verdict: decision.verdict, note: decision.note?.trim() || null };
  });
  const qualityApproved = checks.every((check) => check.verdict === 'PASS');
  const receipt = {
    schema: 'toolradar.final-video-quality-review-receipt.v1',
    projectId: pack.projectId,
    reviewPackDigest: pack.digest,
    finalVideoSha256: pack.finalVideo.sha256,
    checks,
    approval: {
      humanReviewRequired: true,
      qualityApproved,
      releaseAllowed: qualityApproved,
      reviewer: reviewer.trim(),
      reviewedAt,
      decision: qualityApproved ? 'APPROVE' : 'REJECT'
    }
  };
  return Object.freeze({ ...receipt, digest: sha256(receipt) });
}

export const qualityReviewCheckIds = Object.freeze(REQUIRED_CHECKS.map(([id]) => id));
