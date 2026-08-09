import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame} from 'remotion';

export const RADAR_SCOUT_FPS = 30;
export const RADAR_SCOUT_FRAMES = 576;

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const C = {
  key: '#00ff00',
  shell: '#102b49',
  shell2: '#1b4269',
  cyan: '#5de2f2',
  cyanSoft: '#b9f5fb',
  amber: '#ffd166',
  white: '#f7fbff',
  ink: '#071421',
  shadow: '#03101d',
};

type PoseName = 'point' | 'inspect' | 'celebrate' | 'sweep' | 'stop' | 'loop';

type Pose = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  leftArm: number;
  rightArm: number;
  leftHandLift: number;
  rightHandLift: number;
  eyeSquint: number;
  sparkle: number;
  name: PoseName;
};

const poseForFrame = (frame: number): Pose => {
  const bob = Math.sin(frame * 0.11) * 7;
  const breathe = 1 + Math.sin(frame * 0.075) * 0.018;

  if (frame < 70) {
    const p = easeOut(interpolate(frame, [0, 24], [0, 1], clamp));
    return {
      x: lerp(32, 145, p), y: 1170 + bob, scale: 0.9 * breathe, rotation: lerp(-12, -4, p), opacity: p,
      leftArm: -34, rightArm: -74, leftHandLift: 4, rightHandLift: -12, eyeSquint: 0, sparkle: interpolate(frame, [12, 28, 46], [0, 1, 0.2], clamp), name: 'point',
    };
  }

  if (frame < 156) {
    const p = easeInOut(interpolate(frame, [70, 118], [0, 1], clamp));
    return {
      x: lerp(145, 835, p), y: lerp(1170, 1000, p) + bob, scale: lerp(0.86, 0.78, p) * breathe, rotation: lerp(-4, 8, p), opacity: 1,
      leftArm: lerp(-25, 24, p), rightArm: lerp(-74, -34, p), leftHandLift: 0, rightHandLift: -8, eyeSquint: 0, sparkle: interpolate(frame, [118, 136, 154], [0.2, 1, 0.15], clamp), name: 'point',
    };
  }

  if (frame < 238) {
    const p = easeOut(interpolate(frame, [156, 184], [0, 1], clamp));
    return {
      x: lerp(835, 810, p), y: 1010 + bob * 0.65, scale: 0.72 * breathe, rotation: lerp(8, -5, p), opacity: 1,
      leftArm: -18, rightArm: -118, leftHandLift: 0, rightHandLift: -18, eyeSquint: interpolate(frame, [170, 190], [0, 0.35], clamp), sparkle: interpolate(frame, [178, 198, 222], [0, 1, 0.05], clamp), name: 'inspect',
    };
  }

  if (frame < 324) {
    const p = easeInOut(interpolate(frame, [238, 285], [0, 1], clamp));
    return {
      x: lerp(810, 845, p), y: lerp(1010, 1430, p) + bob * 0.5, scale: 0.62 * breathe, rotation: lerp(-5, 5, p), opacity: interpolate(frame, [238, 252, 310, 324], [1, 0.82, 0.82, 0.35], clamp),
      leftArm: -52, rightArm: -128, leftHandLift: -4, rightHandLift: -4, eyeSquint: 0, sparkle: interpolate(frame, [292, 312, 323], [0, 1, 0], clamp), name: 'celebrate',
    };
  }

  if (frame < 408) {
    const p = easeInOut(interpolate(frame, [324, 365], [0, 1], clamp));
    return {
      x: lerp(845, 150, p), y: lerp(1430, 1060, p) + bob, scale: lerp(0.62, 0.8, p) * breathe, rotation: lerp(5, -8, p), opacity: interpolate(frame, [324, 338], [0.35, 1], clamp),
      leftArm: lerp(-52, 45, p), rightArm: lerp(-128, -35, p), leftHandLift: 2, rightHandLift: 2, eyeSquint: 0.05, sparkle: interpolate(frame, [350, 372, 401], [0, 1, 0.08], clamp), name: 'sweep',
    };
  }

  if (frame < 528) {
    const p = easeInOut(interpolate(frame, [408, 458], [0, 1], clamp));
    const stopPulse = Math.sin(Math.max(0, frame - 458) * 0.16) * 4;
    return {
      x: lerp(150, 760, p), y: lerp(1060, 1050, p) + bob * 0.45, scale: 0.76 * breathe, rotation: lerp(-8, 0, p), opacity: 1,
      leftArm: lerp(45, -18, p), rightArm: lerp(-35, -92, p) + stopPulse, leftHandLift: 0, rightHandLift: -22, eyeSquint: interpolate(frame, [470, 500], [0.05, 0.28], clamp), sparkle: interpolate(frame, [438, 462, 494], [0.1, 0.7, 0], clamp), name: 'stop',
    };
  }

  const p = easeInOut(interpolate(frame, [528, 575], [0, 1], clamp));
  return {
    x: lerp(760, 145, p), y: lerp(1050, 1170, p) + Math.sin(frame * 0.18) * 8, scale: lerp(0.76, 0.9, p) * breathe, rotation: lerp(0, -364, p), opacity: interpolate(frame, [528, 538, 567, 575], [1, 1, 0.92, 0.16], clamp),
    leftArm: lerp(-18, -34, p), rightArm: lerp(-92, -74, p), leftHandLift: 0, rightHandLift: -10, eyeSquint: 0, sparkle: interpolate(frame, [528, 546, 565, 575], [0.2, 1, 0.55, 0], clamp), name: 'loop',
  };
};

const Arm: React.FC<{side: 'left' | 'right'; angle: number; lift: number; pose: PoseName}> = ({side, angle, lift, pose}) => {
  const isLeft = side === 'left';
  const length = pose === 'stop' && !isLeft ? 82 : 68;
  return (
    <div
      style={{
        position: 'absolute',
        left: isLeft ? 17 : 164,
        top: 112,
        width: length,
        height: 16,
        borderRadius: 999,
        background: C.shell2,
        border: `3px solid ${C.cyan}`,
        transformOrigin: isLeft ? '8px 8px' : `${length - 8}px 8px`,
        transform: `rotate(${angle}deg) translateY(${lift}px)`,
        boxShadow: `0 0 14px ${C.cyan}2f`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: isLeft ? length - 13 : -13,
          top: -8,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: pose === 'stop' && !isLeft ? C.amber : C.cyanSoft,
          border: `3px solid ${C.shell}`,
        }}
      />
    </div>
  );
};

const Scout: React.FC<{frame: number}> = ({frame}) => {
  const p = poseForFrame(frame);
  const blinkPhase = frame % 97;
  const blink = blinkPhase > 91 ? 0.18 : 1 - p.eyeSquint;
  const antenna = Math.sin(frame * 0.095) * 8;
  const inspectRing = p.name === 'inspect' ? 1 : 0;
  const stopMark = p.name === 'stop' ? easeOut(interpolate(frame, [458, 478], [0, 1], clamp)) : 0;

  return (
    <div
      data-radar-scout
      style={{
        position: 'absolute',
        left: p.x,
        top: p.y,
        width: 210,
        height: 240,
        opacity: p.opacity,
        transform: `translate(-50%, -50%) scale(${p.scale}) rotate(${p.rotation}deg)`,
        transformOrigin: '50% 58%',
      }}
    >
      <div style={{position:'absolute',left:32,top:201,width:146,height:26,borderRadius:'50%',background:C.shadow,opacity:0.34,filter:'blur(7px)'}} />

      <div style={{position:'absolute',left:73,top:8,width:64,height:50,borderRadius:'50% 50% 16px 16px',border:`5px solid ${C.cyan}`,borderBottom:'none',transform:`rotate(${antenna}deg)`,transformOrigin:'50% 100%',opacity:0.92}} />
      <div style={{position:'absolute',left:101,top:1,width:10,height:54,borderRadius:999,background:C.cyan,transform:`rotate(${antenna}deg)`,transformOrigin:'50% 100%'}} />
      <div style={{position:'absolute',left:95,top:-7,width:22,height:22,borderRadius:'50%',background:C.amber,boxShadow:`0 0 22px ${C.amber}aa`}} />

      <Arm side="left" angle={p.leftArm} lift={p.leftHandLift} pose={p.name} />
      <Arm side="right" angle={p.rightArm} lift={p.rightHandLift} pose={p.name} />

      <div
        style={{
          position:'absolute',left:34,top:62,width:142,height:126,borderRadius:'58px 58px 48px 48px',
          background:`linear-gradient(145deg,${C.shell2},${C.shell})`,border:`5px solid ${C.cyan}`,
          boxShadow:`0 18px 42px #00152c88, 0 0 28px ${C.cyan}22 inset`,
        }}
      >
        <div style={{position:'absolute',left:25,top:31,width:92,height:57,borderRadius:29,background:'#eaf9ff',border:`3px solid ${C.cyanSoft}`,display:'flex',alignItems:'center',justifyContent:'space-around',padding:'0 13px'}}>
          {[0,1].map((i)=><div key={i} style={{width:18,height:Math.max(4,22*blink),borderRadius:999,background:i===0?C.cyan:C.amber,boxShadow:`0 0 13px ${i===0?C.cyan:C.amber}88`}} />)}
        </div>
        <div style={{position:'absolute',left:56,top:96,width:30,height:8,borderRadius:999,background:C.cyanSoft,opacity:p.name==='celebrate'?1:0.55,transform:`scaleX(${p.name==='celebrate'?1.35:0.82})`}} />
      </div>

      <div style={{position:'absolute',left:59,top:174,width:34,height:42,borderRadius:'0 0 18px 18px',background:C.shell2,border:`3px solid ${C.cyan}`}} />
      <div style={{position:'absolute',right:59,top:174,width:34,height:42,borderRadius:'0 0 18px 18px',background:C.shell2,border:`3px solid ${C.cyan}`}} />

      {inspectRing ? <div style={{position:'absolute',right:-13,top:54,width:92,height:92,borderRadius:'50%',border:`7px solid ${C.amber}`,boxShadow:`0 0 22px ${C.amber}66`}} /> : null}
      {stopMark > 0 ? <div style={{position:'absolute',right:-31,top:5,width:64,height:64,borderRadius:'50%',background:C.amber,color:C.ink,fontSize:42,fontWeight:1000,display:'flex',alignItems:'center',justifyContent:'center',opacity:stopMark,transform:`scale(${lerp(0.4,1,stopMark)})`}}>!</div> : null}

      {Array.from({length:4},(_,i)=>{
        const a = frame*0.055 + i*Math.PI/2;
        const r = 108 + i*7;
        return <div key={i} style={{position:'absolute',left:105+Math.cos(a)*r,top:112+Math.sin(a)*r,width:10+i*2,height:10+i*2,borderRadius:'50%',background:i%2?C.amber:C.cyan,opacity:p.sparkle*(0.82-i*0.11),boxShadow:`0 0 14px ${i%2?C.amber:C.cyan}`}} />;
      })}
    </div>
  );
};

const RadarScoutOverlayV1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor:C.key,overflow:'hidden'}}>
      <Scout frame={frame}/>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarExplainerRadarScoutOverlayV1"
    component={RadarScoutOverlayV1}
    durationInFrames={RADAR_SCOUT_FRAMES}
    fps={RADAR_SCOUT_FPS}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
