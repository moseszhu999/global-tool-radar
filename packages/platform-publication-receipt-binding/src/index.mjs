import { createHash } from 'node:crypto';

const SUPPORTED_PLATFORMS = new Set(['douyin', 'bilibili']);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function bindPlatformPublicationReceipt(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');

  const handoff = input.uploadHandoff;
  if (!handoff || handoff.status !== 'READY_FOR_HUMAN_PLATFORM_UPLOAD') {
    return {
      status: 'BLOCKED',
      reasons: ['upload handoff is not ready'],
      publicationConfirmed: false,
      analyticsIntakeAllowed: false,
    };
  }

  const receipt = input.publicationReceipt ?? {};
  const reasons = [];
  const platform = requiredText(receipt.platform, 'publicationReceipt.platform').toLowerCase();
  if (!SUPPORTED_PLATFORMS.has(platform)) throw new RangeError(`unsupported platform: ${platform}`);

  if (platform !== handoff.platform) reasons.push('platform does not match upload handoff');

  const handoffDigest = requiredText(receipt.uploadHandoffDigest, 'publicationReceipt.uploadHandoffDigest');
  if (handoffDigest !== handoff.handoffDigest) reasons.push('upload handoff digest mismatch');

  const mediaSha256 = requiredText(receipt.finalVideoSha256, 'publicationReceipt.finalVideoSha256').toLowerCase();
  if (!isSha256(mediaSha256)) throw new TypeError('publicationReceipt.finalVideoSha256 must be a SHA-256 hex digest');
  if (mediaSha256 !== handoff.finalVideo.sha256.toLowerCase()) reasons.push('final video digest mismatch');

  const platformVideoId = requiredText(receipt.platformVideoId, 'publicationReceipt.platformVideoId');
  const publicUrl = requiredText(receipt.publicUrl, 'publicationReceipt.publicUrl');
  if (!isHttpsUrl(publicUrl)) reasons.push('public URL must be HTTPS');

  const publishedAt = new Date(requiredText(receipt.publishedAt, 'publicationReceipt.publishedAt'));
  const capturedAt = new Date(requiredText(receipt.capturedAt, 'publicationReceipt.capturedAt'));
  if (Number.isNaN(publishedAt.getTime())) reasons.push('invalid publication timestamp');
  if (Number.isNaN(capturedAt.getTime())) reasons.push('invalid capture timestamp');
  if (!Number.isNaN(publishedAt.getTime()) && !Number.isNaN(capturedAt.getTime()) && capturedAt < publishedAt) {
    reasons.push('capture timestamp precedes publication timestamp');
  }

  if (receipt.operatorConfirmedPublication !== true) reasons.push('human publication confirmation is required');
  if (receipt.platformLoginPerformed !== true) reasons.push('platform login was not confirmed');
  if (receipt.uploadPerformed !== true) reasons.push('upload was not confirmed');
  if (receipt.publishActionPerformed !== true) reasons.push('publish action was not confirmed');

  if (reasons.length > 0) {
    return {
      status: 'BLOCKED',
      reasons,
      publicationConfirmed: false,
      analyticsIntakeAllowed: false,
    };
  }

  const core = {
    schema: 'toolradar.bound-publication-receipt.v1',
    platform,
    uploadHandoffDigest: handoffDigest,
    finalVideoSha256: mediaSha256,
    platformVideoId,
    publicUrl,
    publishedAt: publishedAt.toISOString(),
    capturedAt: capturedAt.toISOString(),
    operator: requiredText(receipt.operator, 'publicationReceipt.operator'),
  };

  return {
    ...core,
    status: 'PUBLICATION_CONFIRMED',
    receiptDigest: digest(core),
    publicationConfirmed: true,
    analyticsIntakeAllowed: true,
    platformApiVerified: false,
    metricsObserved: false,
  };
}
