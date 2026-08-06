import {createHash} from 'node:crypto';
import {
  applyVideoProjectEvent,
  createVideoProject,
  summarizeVideoProject,
  validateVideoProject,
} from '../../video-project-lifecycle/src/index.mjs';

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash('sha256').update(stableStringify(value)).digest('hex');

const addSeconds = (timestamp, seconds) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new TypeError('timestamp must be valid');
  return new Date(date.getTime() + seconds * 1000).toISOString();
};

const event = ({eventId, type, actor, occurredAt, reason = null, artifact = null}) => ({
  eventId,
  type,
  actor,
  occurredAt,
  reason,
  artifact,
});

const artifact = ({type, value, artifactId, status = null, truthBoundary = null, claims = {}}) => ({
  type,
  schemaVersion: value.schemaVersion ?? null,
  artifactId,
  digest: digest(value),
  status,
  truthBoundary,
  claims,
});

const assertCanonicalInputs = (productionCase, storyboardPackage) => {
  if (productionCase?.schemaVersion !== 'toolradar.video-production-case.v1') {
    throw new TypeError('Replit production case v1 is required');
  }
  if (productionCase.caseId !== 'video-case:aw_nlbkzvyy') throw new Error('unexpected Replit case ID');
  if (productionCase.status !== 'SCRIPT_READY_FOR_HUMAN_REVIEW') throw new Error('production case status changed');
  if (productionCase.gates?.publicationAllowed !== false) throw new Error('production case publication boundary changed');
  if (productionCase.policy?.sourceVideoDownloadAllowed !== false
    || productionCase.policy?.sourceVideoReuseAllowed !== false
    || productionCase.policy?.automaticPublishingAllowed !== false) {
    throw new Error('production case rights or publication policy changed');
  }
  if (productionCase.topicBrief?.schemaVersion !== 'toolradar.topic-brief.v1') throw new Error('topic brief v1 is required');
  if (productionCase.script?.schemaVersion !== 'toolradar.original-script.v1') throw new Error('original script v1 is required');

  if (storyboardPackage?.schemaVersion !== 'toolradar.storyboard-package.v1') {
    throw new TypeError('Replit storyboard package v1 is required');
  }
  if (storyboardPackage.sourceCaseId !== productionCase.caseId) throw new Error('storyboard source case mismatch');
  if (storyboardPackage.status !== 'STORYBOARD_AND_ASSET_MANIFEST_READY_FOR_REVIEW') {
    throw new Error('storyboard status changed');
  }
  if (storyboardPackage.gates?.humanCaptureRequired !== true
    || storyboardPackage.gates?.renderAllowed !== false
    || storyboardPackage.gates?.publicationAllowed !== false) {
    throw new Error('storyboard gate boundary changed');
  }
  if (storyboardPackage.policy?.sourceVideoDownloadAllowed !== false
    || storyboardPackage.policy?.sourceVideoReuseAllowed !== false
    || storyboardPackage.policy?.automaticPublishingAllowed !== false) {
    throw new Error('storyboard rights or publication policy changed');
  }
  const requiredCaptureTasks = storyboardPackage.assetManifest?.captureTasks ?? [];
  if (!Array.isArray(requiredCaptureTasks) || requiredCaptureTasks.length < 2) {
    throw new Error('required owned-media capture tasks are missing');
  }
};

export const buildReplitDesignVideoProjectLedger = ({
  productionCase,
  storyboardPackage,
  owner = 'moseszhu999',
  actor = 'toolradar-reconstruction-worker',
} = {}) => {
  assertCanonicalInputs(productionCase, storyboardPackage);
  const createdAt = productionCase.generatedAt;
  const storyboardAt = storyboardPackage.generatedAt;
  let project = createVideoProject({
    projectId: 'video-project:aw_nlbkzvyy:v1',
    owner,
    createdAt,
    sourceSignal: {
      id: productionCase.sourceSignal.id,
      title: productionCase.sourceSignal.title,
      platform: 'youtube',
      sourceUrl: productionCase.sourceSignal.sourceUrl,
    },
  });

  project = applyVideoProjectEvent(project, event({
    eventId: 'replit-select-v1',
    type: 'SELECT_CANDIDATE',
    actor,
    occurredAt: addSeconds(createdAt, 1),
    reason: 'Confirmed YouTube momentum and independent sandbox test evidence support an original Chinese review.',
  }));

  project = applyVideoProjectEvent(project, event({
    eventId: 'replit-topic-brief-v1',
    type: 'ATTACH_RESEARCH',
    actor,
    occurredAt: addSeconds(createdAt, 2),
    artifact: artifact({
      type: 'topic_brief',
      value: productionCase.topicBrief,
      artifactId: productionCase.topicBrief.topicId,
      claims: {
        sourceSignalId: productionCase.topicBrief.sourceSignalId,
        evidenceCount: productionCase.topicBrief.evidenceRefs.length,
        claimBoundary: productionCase.topicBrief.claimBoundary,
      },
    }),
  }));

  project = applyVideoProjectEvent(project, event({
    eventId: 'replit-production-case-v1',
    type: 'ATTACH_SCRIPT',
    actor,
    occurredAt: addSeconds(createdAt, 3),
    artifact: artifact({
      type: 'production_case',
      value: productionCase,
      artifactId: productionCase.caseId,
      status: productionCase.status,
      claims: {
        scriptId: productionCase.script.scriptId,
        targetDurationSeconds: productionCase.script.targetDurationSeconds,
        estimatedDurationSeconds: productionCase.script.estimatedDurationSeconds,
        rightsState: productionCase.gates.rightsState,
        testEvidenceState: productionCase.gates.testEvidenceState,
        humanScriptReviewRequired: productionCase.gates.humanScriptReviewRequired,
        publicationAllowed: productionCase.gates.publicationAllowed,
      },
    }),
  }));

  project = applyVideoProjectEvent(project, event({
    eventId: 'replit-storyboard-package-v1',
    type: 'ATTACH_STORYBOARD',
    actor,
    occurredAt: storyboardAt,
    artifact: artifact({
      type: 'storyboard_package',
      value: storyboardPackage,
      artifactId: storyboardPackage.packageId,
      status: storyboardPackage.status,
      claims: {
        timelineDurationSeconds: storyboardPackage.timelineDurationSeconds,
        shotCount: storyboardPackage.storyboard.shots.length,
        assetCount: storyboardPackage.assetManifest.assets.length,
        captureTaskCount: storyboardPackage.assetManifest.captureTasks.length,
        humanCaptureRequired: storyboardPackage.gates.humanCaptureRequired,
        renderAllowed: storyboardPackage.gates.renderAllowed,
        publicationAllowed: storyboardPackage.gates.publicationAllowed,
      },
    }),
  }));

  const pendingAssets = storyboardPackage.assetManifest.assets
    .filter((item) => item.required && ['human_capture_required', 'ready_for_tts'].includes(item.state))
    .map((item) => item.assetId);
  project = applyVideoProjectEvent(project, event({
    eventId: 'replit-owned-media-blocker-v1',
    type: 'BLOCK_PROJECT',
    actor,
    occurredAt: addSeconds(storyboardAt, 1),
    reason: `Waiting for verified owned media and approved narration: ${pendingAssets.join(', ')}`,
  }));

  validateVideoProject(project);
  return Object.freeze({
    project,
    summary: summarizeVideoProject(project),
    sourceDigests: Object.freeze({
      topicBriefSha256: digest(productionCase.topicBrief),
      productionCaseSha256: digest(productionCase),
      storyboardPackageSha256: digest(storyboardPackage),
    }),
  });
};
