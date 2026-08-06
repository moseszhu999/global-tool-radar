import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const digest = (value) => createHash('sha256').update(value).digest('hex');

const normalizeProbe = (probe) => ({
  width: Number(probe?.width),
  height: Number(probe?.height),
  durationSeconds: Number(probe?.durationSeconds),
  fps: Number(probe?.fps),
  codec: String(probe?.codec ?? ''),
  audioCodec: String(probe?.audioCodec ?? ''),
});

export const buildFinalRenderReceipt = async ({gateReceiptPath, videoPath, probeVideo}) => {
  const gateReceipt = JSON.parse(await readFile(resolve(gateReceiptPath), 'utf8'));
  const errors = [];

  if (gateReceipt?.version !== 1) errors.push('unsupported_gate_receipt_version');
  if (gateReceipt?.finalRenderAllowed !== true) errors.push('render_gate_not_allowed');
  if (gateReceipt?.truthBoundary !== 'render_execution_authorized') errors.push('render_gate_truth_boundary_invalid');
  if (!gateReceipt?.gateDigest) errors.push('missing_gate_digest');

  const absoluteVideoPath = resolve(videoPath);
  let sizeBytes = null;
  let videoSha256 = null;
  let probe = null;

  try {
    const info = await stat(absoluteVideoPath);
    if (!info.isFile()) errors.push('video_not_a_file');
    else if (info.size === 0) errors.push('video_empty');
    else {
      sizeBytes = info.size;
      videoSha256 = digest(await readFile(absoluteVideoPath));
      probe = normalizeProbe(await probeVideo(absoluteVideoPath));
      if (probe.width !== 1080 || probe.height !== 1920) errors.push('unexpected_dimensions');
      if (Math.abs(probe.durationSeconds - 89) > 0.5) errors.push('unexpected_duration');
      if (Math.abs(probe.fps - 30) > 0.01) errors.push('unexpected_fps');
      if (!probe.codec) errors.push('missing_video_codec');
      if (!probe.audioCodec) errors.push('missing_audio_codec');
    }
  } catch (error) {
    if (error?.code === 'ENOENT') errors.push('video_missing');
    else throw error;
  }

  const finalVideoVerified = errors.length === 0;
  const canonical = JSON.stringify({
    version: 1,
    gateDigest: gateReceipt?.gateDigest ?? null,
    videoPath,
    sizeBytes,
    videoSha256,
    probe,
    finalVideoVerified,
  });

  return {
    version: 1,
    gateReceiptPath,
    gateDigest: gateReceipt?.gateDigest ?? null,
    videoPath,
    sizeBytes,
    videoSha256,
    probe,
    finalVideoVerified,
    truthBoundary: finalVideoVerified ? 'final_video_file_verified' : 'final_video_verification_blocked',
    errors,
    receiptDigest: digest(canonical),
  };
};
