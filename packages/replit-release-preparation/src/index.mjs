import crypto from 'node:crypto';

const PLATFORM_REQUIREMENTS = {
  douyin: {
    titleMax: 30,
    descriptionMax: 2000,
    requiredHumanSteps: ['login', 'account_authorization', 'captcha_if_prompted', 'final_preview', 'publish_confirmation'],
  },
  bilibili: {
    titleMax: 80,
    descriptionMax: 2000,
    requiredHumanSteps: ['login', 'account_authorization', 'category_selection', 'copyright_declaration', 'final_preview', 'publish_confirmation'],
  },
};

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
}

function assertText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
}

function assertDigest(value, name) {
  if (!/^[a-f0-9]{64}$/.test(value ?? '')) throw new Error(`${name} must be a sha256 digest`);
  return value;
}

export function createReleasePreparation({ project, qualityApproval, finalVideo, copy, operator, preparedAt }) {
  if (project?.schema !== 'toolradar.video-project.v1') throw new Error('invalid project schema');
  if (project.stage !== 'QUALITY_APPROVED' || project.status !== 'ACTIVE') throw new Error('project is not quality approved');
  if (project.nextEvent !== 'PREPARE_RELEASE') throw new Error('project is not ready for release preparation');
  if (qualityApproval?.schema !== 'toolradar.quality-approval.v1') throw new Error('invalid quality approval');
  if (qualityApproval.projectId !== project.projectId) throw new Error('quality approval project mismatch');
  if (qualityApproval.status !== 'QUALITY_APPROVED_FOR_RELEASE_PREPARATION') throw new Error('quality is not approved');
  if (qualityApproval.publicationAllowed !== false) throw new Error('quality approval must not grant publication');
  if (finalVideo?.schema !== 'toolradar.final-video-file-receipt.v1') throw new Error('invalid final video receipt');
  if (finalVideo.projectId !== project.projectId) throw new Error('final video project mismatch');

  const video = {
    path: assertText(finalVideo.outputPath, 'finalVideo.outputPath'),
    sha256: assertDigest(finalVideo.fileSha256, 'finalVideo.fileSha256'),
    receiptDigest: assertDigest(finalVideo.receiptDigest, 'finalVideo.receiptDigest'),
    width: finalVideo.media?.width,
    height: finalVideo.media?.height,
    fps: finalVideo.media?.fps,
    durationSeconds: finalVideo.media?.durationSeconds,
  };
  if (video.width !== 1080 || video.height !== 1920 || video.fps !== 30) throw new Error('final video profile mismatch');

  const title = assertText(copy?.title, 'copy.title');
  const description = assertText(copy?.description, 'copy.description');
  const tags = Array.isArray(copy?.tags) ? copy.tags.map((tag) => assertText(tag, 'copy.tags[]')) : [];
  const covers = Array.isArray(copy?.coverCandidates) ? copy.coverCandidates : [];
  if (covers.length < 1) throw new Error('at least one cover candidate is required');

  const platformPackages = Object.entries(PLATFORM_REQUIREMENTS).map(([platform, rules]) => {
    if (title.length > rules.titleMax) throw new Error(`${platform} title exceeds limit`);
    if (description.length > rules.descriptionMax) throw new Error(`${platform} description exceeds limit`);
    return {
      platform,
      title,
      description,
      tags,
      coverCandidates: covers,
      uploadReady: true,
      publicationAllowed: false,
      humanOnly: true,
      requiredHumanSteps: rules.requiredHumanSteps,
      publicationEvidenceRequired: ['platformContentId', 'publishedUrl', 'publishedAt', 'operatorConfirmation'],
    };
  });

  const payload = {
    schema: 'toolradar.release-preparation.v1',
    projectId: project.projectId,
    operator: assertText(operator, 'operator'),
    preparedAt: assertText(preparedAt, 'preparedAt'),
    stageBefore: 'QUALITY_APPROVED',
    nextEvent: 'PREPARE_RELEASE',
    qualityApprovalDigest: assertDigest(qualityApproval.receiptDigest, 'qualityApproval.receiptDigest'),
    finalVideo: video,
    platformPackages,
    releasePackageReady: true,
    publicationAllowed: false,
    truthBoundary: 'upload_materials_prepared_human_platform_publication_required',
  };
  return {...payload, receiptDigest: sha256(payload)};
}

export function validateReleasePreparation(receipt) {
  if (receipt?.schema !== 'toolradar.release-preparation.v1') return false;
  const {receiptDigest, ...payload} = receipt;
  if (sha256(payload) !== receiptDigest) return false;
  return receipt.releasePackageReady === true && receipt.publicationAllowed === false &&
    receipt.platformPackages?.every((item) => item.uploadReady === true && item.publicationAllowed === false && item.humanOnly === true);
}
