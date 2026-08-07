import {createHash} from 'node:crypto';

const SHA256 = /^[a-f0-9]{64}$/;
const SUPPORTED_STAGES = new Set([
  'STORYBOARD_READY',
  'ASSETS_VERIFIED',
  'RENDER_AUTHORIZED',
  'RENDER_COMPLETED',
  'QUALITY_APPROVED',
  'RELEASE_READY',
  'PUBLISHED',
  'FEEDBACK_READY',
]);

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be non-empty`);
  return value.trim();
};

const coreOf = (pack) => ({
  schemaVersion: pack.schemaVersion,
  packId: pack.packId,
  projectId: pack.projectId,
  projectDigest: pack.projectDigest,
  sourceStage: pack.sourceStage,
  sourceStatus: pack.sourceStatus,
  generatedAt: pack.generatedAt,
  operator: pack.operator,
  status: pack.status,
  nextHumanAction: pack.nextHumanAction,
  checkpoints: pack.checkpoints,
  blankReceipts: pack.blankReceipts,
  truthBoundary: pack.truthBoundary,
});

const assertProject = (projectLedger) => {
  const project = projectLedger?.project;
  if (project?.schemaVersion !== 'toolradar.video-project.v1') throw new TypeError('video project ledger is required');
  requiredText(project.projectId, 'project.projectId');
  if (!SHA256.test(project.projectDigest ?? '')) throw new Error('project digest is invalid');
  if (!SUPPORTED_STAGES.has(project.stage)) throw new Error('unsupported video project stage');
  if (!['ACTIVE', 'BLOCKED', 'COMPLETED'].includes(project.status)) throw new Error('unsupported video project status');
  return project;
};

const actionForStage = (stage) => ({
  STORYBOARD_READY: 'M9_CAPTURE_AND_VERIFY_OWNED_MEDIA',
  ASSETS_VERIFIED: 'M9_AUTHORIZE_AND_RUN_FINAL_RENDER',
  RENDER_AUTHORIZED: 'M9_COMPLETE_REAL_MAC_RENDER',
  RENDER_COMPLETED: 'M10_COMPLETE_HUMAN_QUALITY_REVIEW',
  QUALITY_APPROVED: 'M11_PREPARE_PLATFORM_HANDOFFS',
  RELEASE_READY: 'M11_HUMAN_LOGIN_UPLOAD_AND_PUBLISH',
  PUBLISHED: 'M12_CAPTURE_TWO_PLATFORM_UI_OBSERVATIONS',
  FEEDBACK_READY: 'CLOSED',
})[stage];

const checkpoints = () => [
  {
    milestone: 'M9',
    checkpointId: 'owned-media-and-final-render',
    requiredInputs: [
      'apps/remotion-video/public/assets/replit-design-owned-recording.mp4',
      'apps/remotion-video/public/assets/replit-build-limit-owned-recording.mp4',
      'apps/remotion-video/public/assets/replit-design-voiceover.wav',
    ],
    humanConfirmations: [
      'design recording is owned and redacted',
      'build-limit recording is owned and redacted',
      'voiceover matches the approved Chinese script',
      'all three exact files were reviewed by a human',
    ],
    automatedAfterHumanInput: [
      'owned-media preflight',
      'project asset verification',
      'render authorization',
      'Mac Remotion runner submission and polling',
      'final MP4 SHA-256 and media-probe receipt',
    ],
    completionEvidence: ['owned-media intake receipt', 'render run receipt', 'final-video receipt'],
  },
  {
    milestone: 'M10',
    checkpointId: 'human-final-video-quality-review',
    humanConfirmations: [
      'full video watched from start to finish',
      'visual continuity and framing pass',
      'voiceover, subtitles and timing pass',
      'claims, privacy, rights, branding and CTA pass',
      'reviewer explicitly approves release preparation',
    ],
    completionEvidence: ['official quality review', 'quality approval receipt'],
    publicationAuthorityGranted: false,
  },
  {
    milestone: 'M11',
    checkpointId: 'douyin-or-bilibili-publication',
    humanOnlyActions: [
      'select exactly one platform handoff',
      'log in with an authorized account',
      'handle account authorization or CAPTCHA',
      'upload the exact approved MP4 and cover',
      'perform final preview review',
      'click publish and confirm real publication',
    ],
    requiredReceiptFields: ['platform', 'platformContentId', 'publicHttpsUrl', 'publishedAt', 'operator'],
    completionEvidence: ['bound publication receipt'],
    automatedPublicationAllowed: false,
  },
  {
    milestone: 'M12',
    checkpointId: 'bounded-publication-feedback',
    humanOnlyActions: [
      'copy the first metric snapshot from the platform UI',
      'copy a later second metric snapshot from the same platform content',
    ],
    seriesRules: [
      'at least two observations',
      'timestamps strictly increase',
      'cumulative metrics never decrease',
      'same platform, publication receipt and platform content ID',
    ],
    metricFields: ['views', 'likes', 'comments', 'shares', 'favorites', 'followersGained'],
    completionEvidence: ['observation series', 'bounded descriptive feedback summary'],
    causalClaimsAllowed: false,
    automaticRecommendationsAllowed: false,
  },
];

export function buildVideoClosureOperatorPack({projectLedger, operator, generatedAt} = {}) {
  const project = assertProject(projectLedger);
  const time = new Date(requiredText(generatedAt, 'generatedAt'));
  if (Number.isNaN(time.getTime())) throw new Error('generatedAt must be an ISO timestamp');

  const pack = {
    schemaVersion: 'toolradar.video-closure-operator-pack.v1',
    packId: `video-closure-operator-pack:${project.projectId}:v1`,
    projectId: project.projectId,
    projectDigest: project.projectDigest,
    sourceStage: project.stage,
    sourceStatus: project.status,
    generatedAt: time.toISOString(),
    operator: requiredText(operator, 'operator'),
    status: project.stage === 'FEEDBACK_READY' ? 'CLOSED' : 'HUMAN_ACTION_REQUIRED',
    nextHumanAction: actionForStage(project.stage),
    checkpoints: checkpoints(),
    blankReceipts: {
      ownedMediaVerified: false,
      finalMp4Sha256: null,
      qualityApproved: false,
      publicationConfirmed: false,
      platform: null,
      platformContentId: null,
      publicHttpsUrl: null,
      firstMetricsObservedAt: null,
      secondMetricsObservedAt: null,
      analyticsCompleted: false,
    },
    truthBoundary: {
      realMediaClaimed: false,
      realRenderClaimed: false,
      humanQualityApprovalClaimed: false,
      platformPublicationClaimed: false,
      platformApiVerified: false,
      platformMetricsClaimed: false,
    },
  };
  return {...pack, packDigest: digest(coreOf(pack))};
}

export function validateVideoClosureOperatorPack(pack) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) throw new TypeError('pack must be an object');
  if (pack.schemaVersion !== 'toolradar.video-closure-operator-pack.v1') throw new Error('unsupported operator pack schema');
  requiredText(pack.packId, 'pack.packId');
  requiredText(pack.projectId, 'pack.projectId');
  requiredText(pack.operator, 'pack.operator');
  if (!SHA256.test(pack.projectDigest ?? '')) throw new Error('project digest is invalid');
  if (!SHA256.test(pack.packDigest ?? '') || digest(coreOf(pack)) !== pack.packDigest) throw new Error('operator pack digest mismatch');
  if (!Array.isArray(pack.checkpoints) || pack.checkpoints.map((item) => item.milestone).join(',') !== 'M9,M10,M11,M12') {
    throw new Error('operator pack milestone order is invalid');
  }
  if (Object.values(pack.truthBoundary ?? {}).some((value) => value !== false)) {
    throw new Error('operator pack fabricated downstream truth');
  }
  if (pack.blankReceipts?.ownedMediaVerified !== false
      || pack.blankReceipts?.qualityApproved !== false
      || pack.blankReceipts?.publicationConfirmed !== false
      || pack.blankReceipts?.analyticsCompleted !== false
      || pack.blankReceipts?.finalMp4Sha256 !== null
      || pack.blankReceipts?.platformContentId !== null
      || pack.blankReceipts?.publicHttpsUrl !== null) {
    throw new Error('operator pack receipt template must be blank');
  }
  return true;
}
