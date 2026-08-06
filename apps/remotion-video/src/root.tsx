import React from 'react';
import {Composition} from 'remotion';
import {z} from 'zod';
import {ToolRadarVideo} from './tool-radar-video';

export const toolRadarVideoSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  designRecording: z.string(),
  buildLimitRecording: z.string(),
  voiceover: z.string(),
  designRecordingVerified: z.boolean(),
  buildLimitRecordingVerified: z.boolean(),
  voiceoverVerified: z.boolean(),
});

export type ToolRadarVideoProps = z.infer<typeof toolRadarVideoSchema>;

const defaultProps: ToolRadarVideoProps = {
  title: 'Replit Design 独立实测',
  subtitle: '设计探索通过，生产交付未证明',
  designRecording: 'assets/replit-design-owned-recording.mp4',
  buildLimitRecording: 'assets/replit-build-limit-owned-recording.mp4',
  voiceover: 'assets/replit-design-voiceover.wav',
  designRecordingVerified: false,
  buildLimitRecordingVerified: false,
  voiceoverVerified: false,
};

export const ToolRadarRoot: React.FC = () => {
  return (
    <Composition
      id="ToolRadarReplitPortrait"
      component={ToolRadarVideo}
      durationInFrames={2670}
      fps={30}
      width={1080}
      height={1920}
      schema={toolRadarVideoSchema}
      defaultProps={defaultProps}
    />
  );
};
