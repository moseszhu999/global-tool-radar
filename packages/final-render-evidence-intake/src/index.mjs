import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SHA256 = /^[a-f0-9]{64}$/;

function block(reason, details = {}) {
  return {
    status: 'BLOCKED',
    reason,
    details,
    qualityReviewAllowed: false,
    publicationAllowed: false,
    platformUploadPerformed: false,
  };
}

export async function sha256File(path) {
  const bytes = await readFile(path);
  return createHash('sha256').update(bytes).digest('hex');
}

export async function createFinalRenderEvidenceReceipt(input) {
  if (!input || typeof input !== 'object') return block('missing_input');
  if (input.renderExecutionPerformed !== true) return block('render_not_confirmed');
  if (!input.outputPath) return block('missing_output_path');
  if (!SHA256.test(input.expectedSha256 ?? '')) return block('invalid_expected_sha256');
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) return block('invalid_duration');
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    return block('invalid_dimensions');
  }
  if (!Number.isFinite(input.audioSampleRateHz) || input.audioSampleRateHz <= 0) return block('invalid_audio_sample_rate');
  if (input.renderCommandManifestId == null || input.renderCommandManifestId === '') return block('missing_render_manifest_reference');

  let actualSha256;
  try {
    actualSha256 = await sha256File(input.outputPath);
  } catch (error) {
    return block('output_file_unreadable', { message: error.message });
  }

  if (actualSha256 !== input.expectedSha256) {
    return block('output_digest_mismatch', { expectedSha256: input.expectedSha256, actualSha256 });
  }

  return {
    status: 'READY_FOR_M10_REVIEW',
    renderCommandManifestId: input.renderCommandManifestId,
    output: {
      fileName: input.outputPath.split(/[\\/]/).pop(),
      sha256: actualSha256,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      audioSampleRateHz: input.audioSampleRateHz,
    },
    renderedAt: input.renderedAt ?? null,
    rendererIdentity: input.rendererIdentity ?? null,
    qualityReviewAllowed: true,
    humanReviewRequired: true,
    publicationAllowed: false,
    platformUploadPerformed: false,
  };
}
