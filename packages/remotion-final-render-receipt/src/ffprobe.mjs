import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const parseRate = (value) => {
  if (typeof value === 'number') return value;
  const [numerator, denominator = '1'] = String(value ?? '').split('/');
  const top = Number(numerator);
  const bottom = Number(denominator);
  return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : Number.NaN;
};

export const parseFfprobeJson = (payload) => {
  const video = payload?.streams?.find((stream) => stream.codec_type === 'video') ?? null;
  const audio = payload?.streams?.find((stream) => stream.codec_type === 'audio') ?? null;
  const duration = Number(payload?.format?.duration ?? video?.duration);
  return {
    width: Number(video?.width),
    height: Number(video?.height),
    durationSeconds: duration,
    fps: parseRate(video?.avg_frame_rate ?? video?.r_frame_rate),
    codec: String(video?.codec_name ?? ''),
    audioCodec: String(audio?.codec_name ?? ''),
  };
};

export const probeVideoWithFfprobe = async (videoPath, {run = execFileAsync} = {}) => {
  const {stdout} = await run('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    videoPath,
  ], {maxBuffer: 10 * 1024 * 1024});
  return parseFfprobeJson(JSON.parse(stdout));
};
