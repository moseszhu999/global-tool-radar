import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {
  SOCIAL_NATIVE_25D_V4_R4_FIRST_PAYOFF_FRAME,
  SOCIAL_NATIVE_25D_V4_R4_FPS,
  SOCIAL_NATIVE_25D_V4_R4_FRAMES,
  SOCIAL_NATIVE_25D_V4_R4_FULL_REVEAL_FRAME,
  SOCIAL_NATIVE_25D_V4_R4_LOOP_START_FRAME,
  ToolRadarSocialNative25DCharacterV4R4,
} from './social-native-25d-character-v4-r4';

export const SOCIAL_NATIVE_25D_V4_R5_FPS = SOCIAL_NATIVE_25D_V4_R4_FPS;
export const SOCIAL_NATIVE_25D_V4_R5_FRAMES = SOCIAL_NATIVE_25D_V4_R4_FRAMES;
export const SOCIAL_NATIVE_25D_V4_R5_FIRST_PAYOFF_FRAME = SOCIAL_NATIVE_25D_V4_R4_FIRST_PAYOFF_FRAME;
export const SOCIAL_NATIVE_25D_V4_R5_FULL_REVEAL_FRAME = SOCIAL_NATIVE_25D_V4_R4_FULL_REVEAL_FRAME;
export const SOCIAL_NATIVE_25D_V4_R5_LOOP_START_FRAME = SOCIAL_NATIVE_25D_V4_R4_LOOP_START_FRAME;
export const SOCIAL_NATIVE_25D_V4_R5_HARD_MATCH_FRAME = 568;

const C = {
  text: '#f7fbff',
  muted: '#9fb1c7',
  blue: '#5badff',
  cyan: '#6feaff',
  green: '#68e7a5',
  yellow: '#ffd45f',
  ink: '#071019',
};
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';

const FinalOpeningMatch: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 564) return null;
  const opacity = interpolate(frame, [564, SOCIAL_NATIVE_25D_V4_R5_HARD_MATCH_FRAME], [0, 1], clamp);
  const pageScale = interpolate(frame, [SOCIAL_NATIVE_25D_V4_R5_HARD_MATCH_FRAME, 575], [1.02, 1.13], clamp);
  return (
    <AbsoluteFill
      style={{
        zIndex: 400,
        opacity,
        background: `radial-gradient(circle at 82% 14%,${C.green}2b,transparent 29%),linear-gradient(180deg,#13233a,#08111d 70%)`,
        color: C.text,
        fontFamily,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 174,
          top: 300,
          width: 732,
          height: 1050,
          transform: `scale(${pageScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 34,
            overflow: 'hidden',
            border: `2px solid ${C.green}`,
            background: 'linear-gradient(155deg,#0b1320,#0d1a2c)',
            boxShadow: '0 38px 90px #0009',
            padding: 34,
          }}
        >
          <div style={{display: 'flex', gap: 10, marginBottom: 26}}>
            {['AI设计', '视频', '模型'].map((x, i) => (
              <div
                key={x}
                style={{
                  padding: '10px 17px',
                  borderRadius: 999,
                  background: [C.blue, C.green, C.yellow][i],
                  color: C.ink,
                  fontSize: 20,
                  fontWeight: 1000,
                }}
              >
                {x}
              </div>
            ))}
          </div>
          {['FlowCanvas', 'ModelBench', 'ClipForge'].map((x, i) => (
            <div
              key={x}
              style={{
                height: 165,
                borderRadius: 24,
                border: '1px solid #344866',
                background: '#ffffff0d',
                marginBottom: 18,
                padding: 22,
              }}
            >
              <div style={{fontSize: 30, fontWeight: 1000}}>{x}</div>
              <div style={{fontSize: 18, color: C.muted, marginTop: 8}}>热度 {86 - i * 7}</div>
            </div>
          ))}
          <div
            style={{
              position: 'absolute',
              left: 34,
              right: 34,
              bottom: 34,
              height: 92,
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg,${C.blue},${C.cyan})`,
              color: C.ink,
              fontSize: 27,
              fontWeight: 1000,
            }}
          >
            查看今日趋势
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 54, top: 245, zIndex: 410, fontSize: 92, fontWeight: 1000, color: C.green}}>
        先看结果
      </div>
      <div style={{position: 'absolute', right: 80, top: 222, zIndex: 410, padding: '10px 18px', borderRadius: 999, background: C.green, color: C.ink, fontSize: 24, fontWeight: 1000}}>
        AFTER
      </div>
    </AbsoluteFill>
  );
};

export const ToolRadarSocialNative25DCharacterV4R5: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#08111d'}}>
    <ToolRadarSocialNative25DCharacterV4R4 />
    <FinalOpeningMatch />
  </AbsoluteFill>
);
