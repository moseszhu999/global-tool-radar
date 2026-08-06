import {createHash} from 'node:crypto';
import {posix} from 'node:path';

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

const assertInputs = ({productionCase, storyboardPackage, finalProps, projectLedger}) => {
  if (productionCase?.schemaVersion !== 'toolradar.video-production-case.v1') throw new TypeError('production case v1 is required');
  if (productionCase.caseId !== 'video-case:aw_nlbkzvyy') throw new Error('unexpected production case');
  if (storyboardPackage?.schemaVersion !== 'toolradar.storyboard-package.v1') throw new TypeError('storyboard package v1 is required');
  if (storyboardPackage.sourceCaseId !== productionCase.caseId) throw new Error('storyboard case mismatch');
  if (storyboardPackage.gates?.humanCaptureRequired !== true || storyboardPackage.gates?.renderAllowed !== false) {
    throw new Error('storyboard is not at the expected owned-media blocker');
  }
  if (!finalProps || typeof finalProps !== 'object' || Array.isArray(finalProps)) throw new TypeError('finalProps must be an object');
  for (const key of ['designRecording','buildLimitRecording','voiceover']) requiredText(finalProps[key], `finalProps.${key}`);
  if (projectLedger?.project?.schemaVersion !== 'toolradar.video-project.v1') throw new TypeError('video project ledger is required');
  if (projectLedger.project.projectId !== 'video-project:aw_nlbkzvyy:v1') throw new Error('unexpected video project');
  if (projectLedger.project.stage !== 'STORYBOARD_READY' || projectLedger.project.status !== 'BLOCKED') {
    throw new Error('video project is not at the expected blocker');
  }
};

const repositoryTarget = (staticPath) => posix.join('apps/remotion-video/public', staticPath);
const coverageFor = (storyboardPackage, assetId) => storyboardPackage.storyboard.shots
  .filter((shot) => shot.requiredAssetIds.includes(assetId))
  .map((shot) => ({
    shotId: shot.shotId,
    narrationRole: shot.narrationRole,
    startSecond: shot.startSecond,
    endSecond: shot.endSecond,
    durationSeconds: shot.durationSeconds,
    visualInstruction: shot.visualInstruction,
    onScreenText: shot.onScreenText,
  }));

const captureTaskFor = (storyboardPackage, assetId) => {
  const task = storyboardPackage.assetManifest.captureTasks.find((item) => item.assetId === assetId);
  if (!task) throw new Error(`capture task missing for ${assetId}`);
  return {
    taskId: task.taskId,
    humanBoundary: task.humanBoundary,
    steps: task.steps,
    redactionRequired: task.redactionRequired === true,
  };
};

const buildRecordingFile = ({role, assetId, finalPropKey, finalProps, storyboardPackage}) => {
  const staticPath = requiredText(finalProps[finalPropKey], `finalProps.${finalPropKey}`);
  const coverage = coverageFor(storyboardPackage, assetId);
  if (coverage.length === 0) throw new Error(`storyboard coverage missing for ${assetId}`);
  return {
    role,
    assetId,
    kind: 'owned_screen_recording',
    required: true,
    currentState: 'HUMAN_CAPTURE_AND_VERIFICATION_REQUIRED',
    finalPropKey,
    remotionStaticPath: staticPath,
    repositoryTargetPath: repositoryTarget(staticPath),
    requiredExtension: '.mp4',
    timelineCoverageSeconds: coverage.reduce((sum, item) => sum + item.durationSeconds, 0),
    timelineCoverage: coverage,
    captureTask: captureTaskFor(storyboardPackage, assetId),
    acceptanceChecks: [
      'The recording is made from the operator-owned isolated test session.',
      'No personal, production, payment or credential data is visible.',
      'No official YouTube or third-party demo footage is used.',
      'The recording clearly shows the storyboard evidence boundary.',
      'A human explicitly confirms the exact file before preflight.',
    ],
  };
};

export const buildReplitOwnedMediaTaskPack = ({productionCase, storyboardPackage, finalProps, projectLedger} = {}) => {
  assertInputs({productionCase, storyboardPackage, finalProps, projectLedger});
  const voiceoverPath = requiredText(finalProps.voiceover, 'finalProps.voiceover');
  const files = [
    buildRecordingFile({
      role: 'design_recording',
      assetId: 'asset:test-recording',
      finalPropKey: 'designRecording',
      finalProps,
      storyboardPackage,
    }),
    buildRecordingFile({
      role: 'build_limit_recording',
      assetId: 'asset:build-limit-recording',
      finalPropKey: 'buildLimitRecording',
      finalProps,
      storyboardPackage,
    }),
    {
      role: 'voiceover',
      assetId: 'asset:voiceover',
      kind: 'owned_or_licensed_voiceover',
      required: true,
      currentState: 'RECORDING_OR_TTS_AND_HUMAN_APPROVAL_REQUIRED',
      finalPropKey: 'voiceover',
      remotionStaticPath: voiceoverPath,
      repositoryTargetPath: repositoryTarget(voiceoverPath),
      requiredExtension: '.wav',
      targetDurationSeconds: productionCase.script.estimatedDurationSeconds,
      targetLanguage: productionCase.script.language,
      fullVoiceover: productionCase.script.fullVoiceover,
      segments: productionCase.script.voiceoverSegments.map(({order, role, text, estimatedSeconds}) => ({order, role, text, estimatedSeconds})),
      acceptanceChecks: [
        'The voice is owned by the operator or generated under a usable license.',
        'Every sentence matches the approved original Chinese script.',
        'The narration preserves all claim limits and non-claims.',
        'Pacing remains intelligible across the 89-second storyboard.',
        'A human listens to and explicitly approves the exact WAV file.',
      ],
    },
  ];

  const env = {
    REMOTION_DESIGN_RECORDING: files[0].repositoryTargetPath,
    REMOTION_BUILD_LIMIT_RECORDING: files[1].repositoryTargetPath,
    REMOTION_VOICEOVER: files[2].repositoryTargetPath,
    REMOTION_DESIGN_RECORDING_VERIFIED: 'true',
    REMOTION_BUILD_LIMIT_RECORDING_VERIFIED: 'true',
    REMOTION_VOICEOVER_VERIFIED: 'true',
    REMOTION_PREFLIGHT_OUTPUT: 'artifacts/replit-design-remotion-media-preflight.json',
  };
  const shellLines = Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)} \\`);
  const preflightCommand = `${shellLines.join('\n')}\nnode packages/remotion-media-preflight/src/cli.mjs`;

  const core = {
    schemaVersion: 'toolradar.owned-media-task-pack.v1',
    taskPackId: 'owned-media-task-pack:aw_nlbkzvyy:v1',
    projectId: projectLedger.project.projectId,
    sourceCaseId: productionCase.caseId,
    generatedFromProjectDigest: projectLedger.project.projectDigest,
    generatedAt: projectLedger.project.updatedAt,
    status: 'HUMAN_MEDIA_WORK_REQUIRED',
    truthBoundary: 'task_plan_only_no_media_claimed',
    finalRenderAllowed: false,
    propsVerificationFlagsAreEvidence: false,
    files,
    preflight: {
      command: preflightCommand,
      outputPath: env.REMOTION_PREFLIGHT_OUTPUT,
      successTruthBoundary: 'owned_media_verified',
      successExitCode: 0,
      blockedExitCode: 2,
    },
    lifecycleAfterCompletion: ['RESUME_PROJECT','VERIFY_ASSETS'],
    sourceDigests: {
      productionCaseSha256: digest(productionCase),
      storyboardPackageSha256: digest(storyboardPackage),
      finalPropsSha256: digest(finalProps),
      videoProjectLedgerSha256: digest(projectLedger),
    },
    policy: {
      sourceVideoDownloadAllowed: false,
      sourceVideoReuseAllowed: false,
      thirdPartyFootageAllowed: false,
      sensitiveDataAllowed: false,
      humanFileVerificationRequired: true,
      automaticRenderAuthorizationAllowed: false,
    },
  };
  return Object.freeze({...core, taskPackDigest: digest(core)});
};

export const validateReplitOwnedMediaTaskPack = (pack) => {
  if (pack?.schemaVersion !== 'toolradar.owned-media-task-pack.v1') throw new TypeError('unsupported task pack schema');
  const {taskPackDigest, ...core} = pack;
  if (!/^[a-f0-9]{64}$/.test(taskPackDigest ?? '') || digest(core) !== taskPackDigest) throw new Error('task pack digest mismatch');
  if (pack.status !== 'HUMAN_MEDIA_WORK_REQUIRED' || pack.finalRenderAllowed !== false) throw new Error('task pack truth boundary invalid');
  if (pack.propsVerificationFlagsAreEvidence !== false) throw new Error('props flags must not be accepted as evidence');
  if (!Array.isArray(pack.files) || pack.files.length !== 3) throw new Error('exactly three media files are required');
  if (pack.files.some((item) => item.currentState.includes('VERIFIED'))) throw new Error('task pack must not claim files are verified');
  if (pack.policy?.humanFileVerificationRequired !== true || pack.policy?.automaticRenderAuthorizationAllowed !== false) {
    throw new Error('task pack human boundary invalid');
  }
  return true;
};
