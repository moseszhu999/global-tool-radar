import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame} from 'remotion';

export const EXPLAINER_14_TO_5_FPS = 30;
export const EXPLAINER_14_TO_5_FRAMES = 150;
export const EXPLAINER_14_TO_5_WIDTH = 1080;
export const EXPLAINER_14_TO_5_HEIGHT = 1920;

const C = {
  bg: '#08172c',
  bg2: '#102649',
  ink: '#06111f',
  text: '#f4f8ff',
  muted: '#9eb3ce',
  cyan: '#5de2f2',
  blue: '#5f8cff',
  purple: '#9b7cff',
  green: '#65e6a2',
  amber: '#ffd166',
  red: '#ff7485',
  white: '#ffffff',
};

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Noto Sans SC, Microsoft YaHei, sans-serif';

const survivorIndices = new Set([0, 3, 6, 9, 12]);
const initialPositions = Array.from({length: 14}, (_, i) => {
  const angle = -Math.PI / 2 + (i / 14) * Math.PI * 2;
  const radius = 300 + (i % 3) * 42;
  return {
    x: 540 + Math.cos(angle) * radius,
    y: 760 + Math.sin(angle) * radius * 0.78,
  };
});
const finalPositions = [
  {x: 322, y: 820},
  {x: 432, y: 730},
  {x: 540, y: 700},
  {x: 648, y: 730},
  {x: 758, y: 820},
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const RadarField: React.FC<{frame: number}> = ({frame}) => {
  const reveal = interpolate(frame, [0, 24], [0, 1], clamp);
  const sweepAngle = interpolate(frame, [0, 42], [-120, 210], clamp);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 180,
          top: 365,
          width: 720,
          height: 720,
          borderRadius: '50%',
          border: `3px solid ${C.cyan}55`,
          opacity: reveal,
          boxShadow: `0 0 80px ${C.cyan}16 inset, 0 0 60px ${C.cyan}12`,
        }}
      />
      {[0.68, 0.43].map((scale) => (
        <div
          key={scale}
          style={{
            position: 'absolute',
            left: 540 - 360 * scale,
            top: 725 - 360 * scale,
            width: 720 * scale,
            height: 720 * scale,
            borderRadius: '50%',
            border: `2px solid ${C.cyan}30`,
            opacity: reveal,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 538,
          top: 725,
          width: 3,
          height: 350,
          transformOrigin: '50% 0%',
          transform: `rotate(${sweepAngle}deg)`,
          background: `linear-gradient(${C.cyan}, transparent)`,
          boxShadow: `0 0 18px ${C.cyan}`,
          opacity: interpolate(frame, [2, 10, 38, 46], [0, 0.9, 0.9, 0], clamp),
        }}
      />
    </>
  );
};

const FocusPulse: React.FC<{frame: number}> = ({frame}) => {
  const enter = easeOut(interpolate(frame, [82, 100], [0, 1], clamp));
  const leave = interpolate(frame, [116, 130], [1, 0], clamp);
  const pulse = 1 + Math.sin(Math.max(0, frame - 90) * 0.22) * 0.035;
  const size = lerp(330, 545, enter) * pulse;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - size / 2,
        top: 765 - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        opacity: enter * leave * 0.9,
        border: `4px solid ${C.green}66`,
        background: `radial-gradient(circle, ${C.green}18 0%, ${C.cyan}0d 42%, transparent 70%)`,
        boxShadow: `0 0 95px ${C.green}24`,
      }}
    />
  );
};

const CandidateSignals: React.FC<{frame: number}> = ({frame}) => {
  const surviveProgress = easeInOut(interpolate(frame, [48, 90], [0, 1], clamp));
  let survivorOrder = -1;
  return (
    <>
      {initialPositions.map((p, i) => {
        const survivor = survivorIndices.has(i);
        if (survivor) survivorOrder += 1;
        const appear = interpolate(frame, [8 + i * 1.1, 20 + i * 1.1], [0, 1], clamp);
        const phase = frame * 0.07 + i * 0.7;
        const wobbleX = Math.sin(phase) * 6;
        const wobbleY = Math.cos(phase * 0.9) * 5;

        let x = p.x + wobbleX;
        let y = p.y + wobbleY;
        let opacity = appear;
        let scale = 1;

        if (survivor) {
          const target = finalPositions[survivorOrder];
          x = lerp(x, target.x, surviveProgress);
          y = lerp(y, target.y, surviveProgress);
          scale = lerp(1, 1.3, surviveProgress);
        } else {
          const reject = easeOut(interpolate(frame, [44 + (i % 4) * 3, 74 + (i % 4) * 3], [0, 1], clamp));
          const dx = (p.x - 540) * (0.95 + (i % 2) * 0.3);
          const dy = (p.y - 760) * 0.55 - 90;
          x += dx * reject;
          y += dy * reject;
          opacity *= 1 - reject;
          scale = 1 - reject * 0.45;
        }

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 32,
              top: y - 32,
              width: 64,
              height: 64,
              borderRadius: 22,
              transform: `scale(${scale}) rotate(${Math.sin(phase) * 4}deg)`,
              opacity,
              background: survivor
                ? `linear-gradient(145deg, ${C.cyan}, ${C.blue})`
                : i % 3 === 0
                  ? C.amber
                  : i % 3 === 1
                    ? C.purple
                    : '#7aa0c8',
              border: `3px solid ${C.white}bb`,
              boxShadow: survivor ? `0 0 34px ${C.cyan}55` : '0 12px 24px #0004',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 18,
                top: 17,
                width: 23,
                height: 23,
                borderRadius: '50%',
                background: survivor ? C.white : '#0a1830',
                opacity: 0.9,
              }}
            />
          </div>
        );
      })}
    </>
  );
};

const EvidenceLinks: React.FC<{frame: number}> = ({frame}) => {
  const progress = interpolate(frame, [65, 98], [0, 1], clamp);
  const opacity = interpolate(frame, [62, 72, 106, 114], [0, 1, 1, 0], clamp);
  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{position: 'absolute', inset: 0, opacity, overflow: 'visible'}}
    >
      {finalPositions.map((p, i) => {
        const sx = 160 + i * 190;
        const sy = 1150 + (i % 2) * 85;
        const ex = lerp(sx, p.x, progress);
        const ey = lerp(sy, p.y, progress);
        return (
          <g key={i}>
            <path
              d={`M ${sx} ${sy} Q ${540} ${1030 - i * 18} ${ex} ${ey}`}
              fill="none"
              stroke={i % 2 === 0 ? C.green : C.cyan}
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.72"
            />
            <rect x={sx - 28} y={sy - 22} width="56" height="44" rx="12" fill={C.white} opacity="0.95" />
            <path d={`M ${sx - 13} ${sy - 7} h 26 M ${sx - 13} ${sy + 4} h 17`} stroke={C.blue} strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
};

const GateAndProof: React.FC<{frame: number}> = ({frame}) => {
  const gateIn = easeOut(interpolate(frame, [82, 102], [0, 1], clamp));
  const proofIn = easeOut(interpolate(frame, [100, 122], [0, 1], clamp));
  const gateY = lerp(1340, 1145, gateIn);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 185,
          top: gateY,
          width: 710,
          height: 158,
          borderRadius: 79,
          opacity: gateIn,
          background: `linear-gradient(90deg, ${C.green}22, ${C.cyan}18)`,
          border: `3px solid ${C.green}88`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          boxShadow: `0 24px 70px #0006, 0 0 50px ${C.green}18 inset`,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 25,
            background: C.green,
            color: C.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            fontWeight: 1000,
          }}
        >
          ✓
        </div>
        <div>
          <div style={{fontSize: 30, fontWeight: 900, color: C.text}}>5 个焦点已经形成</div>
          <div style={{fontSize: 18, color: C.muted, marginTop: 3}}>视觉示意 · 不代表发布批准</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: lerp(930, 180, proofIn),
          top: 1465,
          width: 720,
          height: 220,
          borderRadius: 38,
          opacity: proofIn,
          background: '#f8fbff',
          color: C.ink,
          padding: '29px 38px',
          boxShadow: '0 32px 80px #0007',
          transform: `rotate(${lerp(4.5, -1.2, proofIn)}deg)`,
        }}
      >
        <div style={{fontSize: 18, fontWeight: 800, color: '#4e6b88', letterSpacing: 2}}>TOOLRADAR · VISUAL BENCHMARK</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 9}}>
          <span style={{fontSize: 72, fontWeight: 1000, color: C.blue}}>14</span>
          <span style={{fontSize: 45, fontWeight: 900, color: '#8a9db2'}}>→</span>
          <span style={{fontSize: 72, fontWeight: 1000, color: '#20b879'}}>5</span>
        </div>
        <div style={{fontSize: 22, fontWeight: 800, marginTop: -2}}>收拢注意力，再进入真实产品证据。</div>
      </div>
    </>
  );
};

const PortalTransition: React.FC<{frame: number}> = ({frame}) => {
  const p = easeInOut(interpolate(frame, [128, 149], [0, 1], clamp));
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - lerp(58, 1350, p),
        top: 760 - lerp(58, 1350, p),
        width: lerp(116, 2700, p),
        height: lerp(116, 2700, p),
        borderRadius: '50%',
        background: C.cyan,
        opacity: interpolate(frame, [128, 133, 149], [0, 0.95, 1], clamp),
        boxShadow: `0 0 90px ${C.cyan}77`,
      }}
    />
  );
};

export const ToolRadarExplainer14to5BenchmarkV1: React.FC = () => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 14, 116, 130], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 34%, ${C.bg2}, ${C.bg} 58%, #050d19 100%)`,
        color: C.text,
        fontFamily,
        overflow: 'hidden',
      }}
    >
      <div style={{position: 'absolute', inset: 0, opacity: 0.12, backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '42px 42px'}} />

      <div style={{position: 'absolute', left: 62, right: 62, top: 105, opacity: headerOpacity}}>
        <div style={{fontSize: 24, fontWeight: 900, color: C.cyan, letterSpacing: 3}}>TOOLRADAR · EXPLAINER BENCHMARK</div>
        <div style={{fontSize: 58, fontWeight: 1000, marginTop: 12, lineHeight: 1.08, whiteSpace: 'nowrap'}}>14 个信号 → 5 个焦点</div>
        <div style={{fontSize: 27, color: C.muted, marginTop: 16}}>发现 → 筛选 → 聚焦</div>
      </div>

      <RadarField frame={frame} />
      <EvidenceLinks frame={frame} />
      <FocusPulse frame={frame} />
      <CandidateSignals frame={frame} />
      <GateAndProof frame={frame} />
      <PortalTransition frame={frame} />

      <div
        style={{
          position: 'absolute',
          right: 58,
          bottom: 74,
          fontSize: 18,
          color: '#9fb3ca88',
          letterSpacing: 1.4,
          opacity: interpolate(frame, [0, 12, 126, 138], [0, 1, 1, 0], clamp),
        }}
      >
        ORIGINAL FLAT-GEOMETRIC MOTION STUDY
      </div>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarExplainer14to5BenchmarkV1"
    component={ToolRadarExplainer14to5BenchmarkV1}
    durationInFrames={EXPLAINER_14_TO_5_FRAMES}
    fps={EXPLAINER_14_TO_5_FPS}
    width={EXPLAINER_14_TO_5_WIDTH}
    height={EXPLAINER_14_TO_5_HEIGHT}
  />
);

registerRoot(Root);
