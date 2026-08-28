import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import aiDesignStoryboardPackage from '../../web/data/ai-design-workflow-storyboard-package.json';
import {ToolRadarVideo} from './tool-radar-video';

export type ToolRadarGoldMotionPolishProps = {
  title: string;
  subtitle: string;
  voiceover: string;
  voiceoverReady: boolean;
};

const activeCaptionCues = aiDesignStoryboardPackage.storyboard.shots.map((shot) => ({
  shotId: shot.shotId,
  startSecond: shot.startSecond,
  endSecond: shot.endSecond,
  text: shot.narrationText,
}));

const TimedCaptionLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentSecond = frame / fps;
  const cue = activeCaptionCues.find(
    (candidate) => currentSecond >= candidate.startSecond && currentSecond < candidate.endSecond,
  );

  if (!cue) return null;

  return (
    <div
      data-caption-shot-id={cue.shotId}
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        bottom: 116,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 936,
          padding: '18px 28px 20px',
          borderRadius: 28,
          backgroundColor: 'rgba(3, 10, 18, 0.82)',
          border: '1px solid rgba(238, 246, 255, 0.16)',
          boxShadow: '0 18px 50px rgba(0,0,0,.28)',
          color: '#f7fbff',
          fontFamily: 'Arial, Microsoft YaHei, sans-serif',
          fontSize: 52,
          lineHeight: 1.35,
          fontWeight: 800,
          letterSpacing: 0.4,
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,.72)',
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

/**
 * Gold-only motion layer for the existing self-owned AI Design composition.
 *
 * The camera stays locked. Motion is restricted to monotonic, path-bound infographic
 * signals and a continuous progress rail, matching the Gold rule that finished motion
 * must not come from random/sinusoidal camera wobble. ToolRadarVideo remains the content
 * source and the existing Remotion/Shared Media render path remains authoritative.
 *
 * Timed caption pixels consume the same human-approved storyboard timing/narration source
 * that the existing Shared Media buildRenderPreviewPackage()/buildSrt() workflow validates
 * and persists. This is presentation-only; it does not introduce another caption timeline
 * owner or infer mobile-readability approval.
 */
export const ToolRadarGoldMotionPolishV1: React.FC<ToolRadarGoldMotionPolishProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  const globalProgress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cycleFrames = Math.round(fps * 8);
  const pathProgress = (frame % cycleFrames) / cycleFrames;
  const sweepX = interpolate(pathProgress, [0, 1], [-260, 1340]);
  const nodeA = interpolate(pathProgress, [0, 1], [-120, 1200]);
  const nodeB = interpolate(pathProgress, [0, 1], [1160, -140]);

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#07111f'}}>
      <ToolRadarVideo {...props} />

      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div
          style={{
            position: 'absolute',
            top: 330,
            left: 58,
            right: 58,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(120,183,255,.18), transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 330,
            left: nodeA,
            width: 120,
            height: 3,
            borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, rgba(120,183,255,.72), transparent)',
            boxShadow: '0 0 24px rgba(120,183,255,.28)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 226,
            left: 58,
            right: 58,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(116,224,173,.14), transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 226,
            left: nodeB,
            width: 96,
            height: 3,
            borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, rgba(116,224,173,.66), transparent)',
            boxShadow: '0 0 22px rgba(116,224,173,.24)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: -240,
            bottom: -240,
            left: sweepX,
            width: 150,
            transform: 'rotate(11deg)',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.032), transparent)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 26,
            top: 120,
            bottom: 120,
            width: 3,
            borderRadius: 999,
            backgroundColor: 'rgba(159,178,199,.13)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${globalProgress * 100}%`,
              background: 'linear-gradient(180deg, #78b7ff, #74e0ad)',
              boxShadow: '0 0 18px rgba(120,183,255,.35)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            right: 20,
            top: 114 + globalProgress * 1680,
            width: 15,
            height: 15,
            borderRadius: '50%',
            backgroundColor: '#eef6ff',
            boxShadow: '0 0 18px rgba(120,183,255,.65)',
          }}
        />
      </AbsoluteFill>

      <TimedCaptionLayer />
    </AbsoluteFill>
  );
};
