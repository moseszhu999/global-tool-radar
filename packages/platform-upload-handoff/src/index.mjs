import { createHash } from 'node:crypto';

const SUPPORTED_PLATFORMS = new Set(['douyin', 'bilibili']);
const SHA256 = /^[a-f0-9]{64}$/i;

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

function assertSha256(value, field) {
  const normalized = assertText(value, field).toLowerCase();
  if (!SHA256.test(normalized)) throw new TypeError(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

function buildHandoffCore({platform, qualityReviewDigest, finalVideo, metadata, humanSteps}) {
  return {
    schemaVersion: 1,
    platform,
    qualityReviewDigest,
    finalVideo,
    metadata,
    humanSteps,
  };
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
  const finalVideoSha256 = assertSha256(asset.sha256, 'asset.sha256');
  const qualityReviewDigest = assertSha256(
    review.reviewSha256 ?? review.reviewDigest,
    'qualityReview.reviewSha256',
  );

  const title = assertText(metadata.title, 'metadata.title');
  const description = assertText(metadata.description, 'metadata.description');
  const coverPath = assertText(metadata.coverPath, 'metadata.coverPath');
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map((tag) => assertText(tag, 'metadata.tags[]')) : [];
  if (tags.length === 0) throw new TypeError('metadata.tags must contain at least one tag');

  const handoffCore = buildHandoffCore({
    platform,
    qualityReviewDigest,
    finalVideo: {
      path: assertText(asset.path, 'asset.path'),
      sha256: finalVideoSha256,
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
  });

  const invalidDimensions = !Number.isFinite(handoffCore.finalVideo.width)
    || !Number.isFinite(handoffCore.finalVideo.height)
    || handoffCore.finalVideo.width <= 0
    || handoffCore.finalVideo.height <= 0;
  const invalidDuration = !Number.isFinite(handoffCore.finalVideo.durationSeconds)
    || handoffCore.finalVideo.durationSeconds <= 0;
  if (invalidDimensions || invalidDuration) {
    return {
      status: 'BLOCKED',
      reasons: [
        invalidDimensions ? 'invalid video dimensions' : null,
        invalidDuration ? 'invalid video duration' : null,
      ].filter(Boolean),
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

export function validatePlatformUploadHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
    throw new TypeError('handoff must be an object');
  }
  if (handoff.status !== 'READY_FOR_HUMAN_PLATFORM_UPLOAD') throw new Error('upload handoff is not ready');
  if (handoff.schemaVersion !== 1) throw new Error('unsupported upload handoff schema');
  if (!SUPPORTED_PLATFORMS.has(handoff.platform)) throw new Error('upload handoff platform is invalid');

  const core = buildHandoffCore({
    platform: handoff.platform,
    qualityReviewDigest: assertSha256(handoff.qualityReviewDigest, 'handoff.qualityReviewDigest'),
    finalVideo: {
      path: assertText(handoff.finalVideo?.path, 'handoff.finalVideo.path'),
      sha256: assertSha256(handoff.finalVideo?.sha256, 'handoff.finalVideo.sha256'),
      durationSeconds: Number(handoff.finalVideo?.durationSeconds),
      width: Number(handoff.finalVideo?.width),
      height: Number(handoff.finalVideo?.height),
    },
    metadata: {
      title: assertText(handoff.metadata?.title, 'handoff.metadata.title'),
      description: assertText(handoff.metadata?.description, 'handoff.metadata.description'),
      coverPath: assertText(handoff.metadata?.coverPath, 'handoff.metadata.coverPath'),
      tags: Array.isArray(handoff.metadata?.tags)
        ? handoff.metadata.tags.map((tag) => assertText(tag, 'handoff.metadata.tags[]'))
        : [],
    },
    humanSteps: Array.isArray(handoff.humanSteps)
      ? handoff.humanSteps.map((step) => assertText(step, 'handoff.humanSteps[]'))
      : [],
  });

  if (core.metadata.tags.length === 0) throw new Error('upload handoff tags are missing');
  if (core.humanSteps.length === 0) throw new Error('upload handoff human steps are missing');
  if (!Number.isFinite(core.finalVideo.durationSeconds) || core.finalVideo.durationSeconds <= 0) {
    throw new Error('upload handoff duration is invalid');
  }
  if (!Number.isFinite(core.finalVideo.width) || !Number.isFinite(core.finalVideo.height)
    || core.finalVideo.width <= 0 || core.finalVideo.height <= 0) {
    throw new Error('upload handoff dimensions are invalid');
  }
  if (!SHA256.test(handoff.handoffDigest ?? '') || digest(core) !== handoff.handoffDigest) {
    throw new Error('upload handoff digest mismatch');
  }
  if (handoff.platformLoginRequired !== true
    || handoff.humanAuthorizationRequired !== true
    || handoff.platformLoginPerformed !== false
    || handoff.uploadPerformed !== false
    || handoff.publishActionPerformed !== false
    || handoff.publicationAllowed !== false) {
    throw new Error('upload handoff human boundary is invalid');
  }
  return true;
}
