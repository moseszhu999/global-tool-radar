import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ToolRadarVideo} from './tool-radar-video';

export type ToolRadarGoldMotionPolishProps = {
  title: string;
  subtitle: string;
  voiceover: string;
  voiceoverReady: boolean;
};

/**
 * Gold-only visual polish wrapper for the existing self-owned AI Design composition.
 *
 * This stays composition-level on purpose: ToolRadarVideo remains the content source
 * and the existing Remotion/Shared Media render path remains authoritative. The wrapper
 * adds bounded camera drift and ambient depth so long card-oriented beats do not read
 * as fully static presentation slides.
 */
export const ToolRadarGoldMotionPolishV1: React.FC<ToolRadarGoldMotionPolishProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;

  const driftX = Math.sin(seconds * 0.38) * 8;
  const driftY = Math.cos(seconds * 0.31) * 10;
  const scale = 1.012 + Math.sin(seconds * 0.22) * 0.004;
  const glowX = Math.sin(seconds * 0.18) * 90;
  const glowY = Math.cos(seconds * 0.16) * 80;
  const sweepX = -420 + ((frame % Math.round(fps * 12)) / (fps * 12)) * 1920;

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#07111f'}}>
      <AbsoluteFill
        style={{
          transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(${scale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <ToolRadarVideo {...props} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(circle at calc(78% + ${glowX}px) calc(18% + ${glowY}px), rgba(120,183,255,.11), transparent 28%), radial-gradient(circle at calc(18% - ${glowX * 0.45}px) calc(80% - ${glowY * 0.5}px), rgba(116,224,173,.07), transparent 24%)`,
          mixBlendMode: 'screen',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: -180,
          bottom: -180,
          left: sweepX,
          width: 220,
          transform: 'rotate(12deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.035), transparent)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
