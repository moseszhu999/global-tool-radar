import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {
  SOCIAL_NATIVE_25D_V4_R3_FIRST_PAYOFF_FRAME,
  SOCIAL_NATIVE_25D_V4_R3_FPS,
  SOCIAL_NATIVE_25D_V4_R3_FRAMES,
  SOCIAL_NATIVE_25D_V4_R3_FULL_REVEAL_FRAME,
  SOCIAL_NATIVE_25D_V4_R3_LOOP_START_FRAME,
  ToolRadarSocialNative25DCharacterV4R3,
} from './social-native-25d-character-v4-r3';

export const SOCIAL_NATIVE_25D_V4_R4_FPS = SOCIAL_NATIVE_25D_V4_R3_FPS;
export const SOCIAL_NATIVE_25D_V4_R4_FRAMES = SOCIAL_NATIVE_25D_V4_R3_FRAMES;
export const SOCIAL_NATIVE_25D_V4_R4_FIRST_PAYOFF_FRAME = SOCIAL_NATIVE_25D_V4_R3_FIRST_PAYOFF_FRAME;
export const SOCIAL_NATIVE_25D_V4_R4_FULL_REVEAL_FRAME = SOCIAL_NATIVE_25D_V4_R3_FULL_REVEAL_FRAME;
export const SOCIAL_NATIVE_25D_V4_R4_LOOP_START_FRAME = SOCIAL_NATIVE_25D_V4_R3_LOOP_START_FRAME;

const C = {
  blue: '#5badff',
  cyan: '#6feaff',
  green: '#68e7a5',
  yellow: '#ffd45f',
  red: '#ff6575',
  purple: '#a483ff',
  text: '#f7fbff',
  ink: '#071019',
};

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';

const ContactHand: React.FC<{
  start: number;
  hit: number;
  release: number;
  end: number;
  targetX: number;
  targetY: number;
  accent: string;
  label: string;
}> = ({start, hit, release, end, targetX, targetY, accent, label}) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) return null;

  const q = interpolate(frame, [start, hit, release, end], [0, 1, 1, 0], clamp);
  const originX = 250;
  const originY = 980;
  const x = interpolate(q, [0, 1], [originX, targetX]);
  const y = interpolate(q, [0, 1], [originY, targetY]);
  const dx = x - originX;
  const dy = y - originY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const contact = interpolate(frame, [hit - 5, hit, release, release + 6], [0, 1, 1, 0], clamp);
  const ringScale = interpolate(frame, [hit - 2, hit + 12], [0.55, 1.55], clamp);
  const ringOpacity = interpolate(frame, [hit - 2, hit + 12], [0.95, 0], clamp);

  return (
    <AbsoluteFill style={{zIndex: 235, pointerEvents: 'none', fontFamily}}>
      <div
        style={{
          position: 'absolute',
          left: originX,
          top: originY,
          width: length,
          height: 28,
          borderRadius: 20,
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          background: 'linear-gradient(90deg,#315dea,#223ea0 72%,#f5b792)',
          boxShadow: `0 0 ${18 + contact * 22}px ${accent}55`,
          opacity: 0.92,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 31,
          top: y - 26,
          width: 62,
          height: 52,
          borderRadius: '22px 22px 25px 25px',
          background: 'linear-gradient(145deg,#f8c3a2,#d98a66)',
          border: `3px solid ${accent}`,
          boxShadow: `0 12px 34px #0009, 0 0 ${16 + contact * 26}px ${accent}88`,
          transform: `rotate(${angle + 6}deg) scale(${0.94 + contact * 0.08})`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 8 + i * 15,
              top: -28 - i * 2,
              width: 11,
              height: 37 + i * 3,
              borderRadius: 9,
              background: 'linear-gradient(180deg,#f8c3a2,#d98a66)',
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: targetX - 45,
          top: targetY - 45,
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: `5px solid ${accent}`,
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
          boxShadow: `0 0 30px ${accent}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: targetX + 34,
          top: targetY - 64,
          padding: '7px 12px',
          borderRadius: 999,
          background: accent,
          color: C.ink,
          fontSize: 20,
          fontWeight: 1000,
          opacity: contact,
          transform: `translateY(${(1 - contact) * 12}px)`,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

const ReactionBurst: React.FC<{from: number; accent: string; mark: string}> = ({from, accent, mark}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0 || local > 22) return null;
  const scale = interpolate(local, [0, 6, 22], [0.35, 1.18, 0.92], clamp);
  const opacity = interpolate(local, [0, 5, 18, 22], [0, 1, 1, 0], clamp);
  const tilt = interpolate(local, [0, 22], [-13, 10], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 170,
        top: 760,
        zIndex: 242,
        width: 92,
        height: 92,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle,#fff 0 12%,${accent} 13% 54%,transparent 56%)`,
        color: C.ink,
        fontFamily,
        fontSize: 46,
        fontWeight: 1000,
        opacity,
        transform: `scale(${scale}) rotate(${tilt}deg)`,
        filter: `drop-shadow(0 0 22px ${accent})`,
      }}
    >
      {mark}
    </div>
  );
};

const LoopBridge: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 558) return null;
  const q = interpolate(frame, [558, 575], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        zIndex: 245,
        pointerEvents: 'none',
        opacity: q,
        background: `radial-gradient(circle at 82% 14%,${C.green}2b,transparent 29%),linear-gradient(180deg,#13233a,#08111d 70%)`,
        fontFamily,
        color: C.text,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 174,
          top: 300,
          width: 732,
          height: 1050,
          borderRadius: 34,
          overflow: 'hidden',
          border: `2px solid ${C.green}`,
          background: 'linear-gradient(155deg,#0b1320,#0d1a2c)',
          boxShadow: '0 38px 90px #0009',
          padding: 34,
          transform: `scale(${0.95 + q * 0.05})`,
        }}
      >
        <div style={{display: 'flex', gap: 10, marginBottom: 26}}>
          {['AI设计', '视频', '模型'].map((x, i) => (
            <div key={x} style={{padding: '10px 17px', borderRadius: 999, background: [C.blue, C.green, C.yellow][i], color: C.ink, fontSize: 20, fontWeight: 1000}}>{x}</div>
          ))}
        </div>
        {['FlowCanvas', 'ModelBench', 'ClipForge'].map((x, i) => (
          <div key={x} style={{height: 165, borderRadius: 24, border: '1px solid #344866', background: '#ffffff0d', marginBottom: 18, padding: 22}}>
            <div style={{fontSize: 30, fontWeight: 1000}}>{x}</div>
            <div style={{fontSize: 18, color: '#9fb1c7', marginTop: 8}}>热度 {86 - i * 7}</div>
          </div>
        ))}
        <div style={{position: 'absolute', left: 34, right: 34, bottom: 34, height: 92, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${C.blue},${C.cyan})`, color: C.ink, fontSize: 27, fontWeight: 1000}}>
          查看今日趋势
        </div>
      </div>
      <div style={{position: 'absolute', left: 54, top: 245, zIndex: 250, fontSize: 92, fontWeight: 1000, color: C.green}}>先看结果</div>
      <div style={{position: 'absolute', right: 80, top: 222, zIndex: 250, padding: '10px 18px', borderRadius: 999, background: C.green, color: C.ink, fontSize: 24, fontWeight: 1000}}>AFTER</div>
    </AbsoluteFill>
  );
};

const DirectorLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const cameraScale = interpolate(
    frame,
    [0, 12, 72, 156, 234, 312, 414, 528, 575],
    [1.03, 1.02, 1.045, 1.07, 1.085, 1.03, 1.045, 1.015, 1.03],
    clamp,
  );
  const cameraX = interpolate(
    frame,
    [0, 72, 156, 234, 312, 414, 528, 575],
    [0, -10, -24, -30, 0, -8, 0, 0],
    clamp,
  );
  const cameraY = interpolate(
    frame,
    [0, 72, 156, 234, 312, 414, 528, 575],
    [0, -4, -12, -16, 0, -8, 0, 0],
    clamp,
  );

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#08111d'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${cameraX}px,${cameraY}px,0) scale(${cameraScale})`,
          transformOrigin: '58% 45%',
        }}
      >
        <ToolRadarSocialNative25DCharacterV4R3 />
      </div>

      <ContactHand start={82} hit={103} release={118} end={138} targetX={548} targetY={690} accent={C.cyan} label="删" />
      <ContactHand start={166} hit={184} release={201} end={220} targetX={660} targetY={560} accent={C.yellow} label="收" />
      <ContactHand start={246} hit={265} release={282} end={302} targetX={690} targetY={690} accent={C.blue} label="压" />

      <ReactionBurst from={148} accent={C.green} mark="!" />
      <ReactionBurst from={226} accent={C.yellow} mark="✓" />
      <ReactionBurst from={300} accent={C.blue} mark="✓" />

      <LoopBridge />
    </AbsoluteFill>
  );
};

export const ToolRadarSocialNative25DCharacterV4R4: React.FC = () => <DirectorLayer />;
