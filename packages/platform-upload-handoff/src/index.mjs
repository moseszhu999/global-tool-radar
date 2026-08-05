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

function assertText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
}

export function buildPlatformUploadHandoff(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');
  const review = input.qualityReview;
  if (!review || review.status !== 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION' || review.releasePreparationAllowed !== true) {
    return {
      status: 'BLOCKED',
      reasons: ['quality review has not approved release preparation'],
      platformLoginPerformed: false,
      uploadPerformed: false,
      publicationAllowed: false,
    };
  }

  const platform = assertText(input.platform, 'platform').toLowerCase();
  if (!SUPPORTED_PLATFORMS.has(platform)) throw new RangeError(`unsupported platform: ${platform}`);

  const asset = input.asset ?? {};
  const metadata = input.metadata ?? {};
  const finalVideoSha256 = assertText(asset.sha256, 'asset.sha256');
  if (!/^[a-f0-9]{64}$/i.test(finalVideoSha256)) throw new TypeError('asset.sha256 must be a SHA-256 hex digest');

  const title = assertText(metadata.title, 'metadata.title');
  const description = assertText(metadata.description, 'metadata.description');
  const coverPath = assertText(metadata.coverPath, 'metadata.coverPath');
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map((tag) => assertText(tag, 'metadata.tags[]')) : [];
  if (tags.length === 0) throw new TypeError('metadata.tags must contain at least one tag');

  const handoffCore = {
    schemaVersion: 1,
    platform,
    qualityReviewDigest: assertText(review.reviewDigest, 'qualityReview.reviewDigest'),
    finalVideo: {
      path: assertText(asset.path, 'asset.path'),
      sha256: finalVideoSha256.toLowerCase(),
      durationSeconds: Number(asset.durationSeconds),
      width: Number(asset.width),
      height: Number(asset.height),
    },
    metadata: { title, description, coverPath, tags },
    humanSteps: [
      `log in to ${platform} using the authorized account`,
      'complete any verification or captcha challenge',
      'select the exact final video and cover files listed in this handoff',
      'review platform-generated preview and policy warnings',
      'obtain explicit human approval before clicking publish',
      'capture the platform publication receipt after a real publish action',
    ],
  };

  const invalidDimensions = !Number.isFinite(handoffCore.finalVideo.width) || !Number.isFinite(handoffCore.finalVideo.height) || handoffCore.finalVideo.width <= 0 || handoffCore.finalVideo.height <= 0;
  const invalidDuration = !Number.isFinite(handoffCore.finalVideo.durationSeconds) || handoffCore.finalVideo.durationSeconds <= 0;
  if (invalidDimensions || invalidDuration) {
    return {
      status: 'BLOCKED',
      reasons: [invalidDimensions ? 'invalid video dimensions' : null, invalidDuration ? 'invalid video duration' : null].filter(Boolean),
      platformLoginPerformed: false,
      uploadPerformed: false,
      publicationAllowed: false,
    };
  }

  return {
    ...handoffCore,
    status: 'READY_FOR_HUMAN_PLATFORM_UPLOAD',
    handoffDigest: digest(handoffCore),
    platformLoginRequired: true,
    humanAuthorizationRequired: true,
    captchaMayBeRequired: true,
    platformLoginPerformed: false,
    uploadPerformed: false,
    publishActionPerformed: false,
    publicationAllowed: false,
  };
}
