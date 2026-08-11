import {
  AIEXE_MCP_PROTOCOL_VERSION,
  AIEXE_P3_1_EXACT_HEAD,
  AIEXE_RUNTIME_REPOSITORY,
  SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1,
  aiexeDigest,
  canonicalize,
  consumeAiexeSharedMediaObservationEvidenceCoreV1,
} from './core.mjs';

export {
  AIEXE_MCP_PROTOCOL_VERSION,
  AIEXE_P3_1_EXACT_HEAD,
  AIEXE_RUNTIME_REPOSITORY,
  SHARED_MEDIA_AIEXE_RUNTIME_OBSERVATION_EVIDENCE_V1,
  aiexeDigest,
  canonicalize,
};

const object = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
};

export function consumeAiexeSharedMediaObservationEvidenceV1(input = {}) {
  const toolName = input.toolName;
  const args = object(input.toolArguments, 'toolArguments');
  const structured = object(object(input.mcpResult, 'mcpResult').structuredContent, 'mcpResult.structuredContent');

  if (toolName === 'media_get_artifact') {
    const artifact = object(structured.artifact, 'mcpResult.structuredContent.artifact');
    if (artifact.artifactId !== args.artifactId) {
      throw new TypeError('media_get_artifact result identity does not match requested artifactId');
    }
  } else if (toolName === 'media_get_job') {
    const job = object(structured.job, 'mcpResult.structuredContent.job');
    if (job.jobId !== args.jobId) {
      throw new TypeError('media_get_job result identity does not match requested jobId');
    }
  }

  return consumeAiexeSharedMediaObservationEvidenceCoreV1(input);
}
