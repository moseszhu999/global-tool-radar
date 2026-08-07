import React from 'react';
import {Composition} from 'remotion';
import {z} from 'zod';
import {ToolRadarVideo} from './tool-radar-video';

export const toolRadarVideoSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  voiceover: z.string(),
  voiceoverReady: z.boolean(),
});

export type ToolRadarVideoProps = z.infer<typeof toolRadarVideoSchema>;

const defaultProps: ToolRadarVideoProps = {
  title: 'AI 设计工作流演示',
  subtitle: '从一句需求到可视界面',
  voiceover: 'assets/toolradar-ai-design-voiceover.wav',
  voiceoverReady: false,
};

export const ToolRadarRoot: React.FC = () => {
  return (
    <Composition
      id="ToolRadarAIDesignPortrait"
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
