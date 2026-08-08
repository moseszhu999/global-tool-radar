import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame} from 'remotion';

export const PRODUCTION_POLISH_ALPHA_FPS = 30;
export const PRODUCTION_POLISH_ALPHA_FRAMES = 576;

const C = {
  bg: '#08172c',
  bgSoft: '#0b1d36',
  text: '#f6f9ff',
  muted: '#9fb4ce',
  cyan: '#5de2f2',
  amber: '#ffd166',
};

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Noto Sans SC, Microsoft YaHei, sans-serif';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeBackOut = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const opacityWindow = (frame: number, start: number, end: number, fade = 7) =>
  interpolate(frame, [start, start + fade, end - fade, end], [0, 1, 1, 0], clamp);

type Beat = {
  start: number;
  end: number;
  eyebrow: string;
  lead: string;
  accent: string;
  subtitle: string;
  accentColor: string;
};

// Header ownership is intentionally non-overlapping. These windows only control
// the polish overlay; the underlying animatic timing and retention anchors stay unchanged.
const beats: Beat[] = [
  {start:0,end:70,eyebrow:'TOOLRADAR · 先看结果',lead:'5 个焦点，',accent:'先留下来。',subtitle:'不是先加更多，而是先把注意力收拢。',accentColor:C.cyan},
  {start:70,end:151,eyebrow:'01 · 发现',lead:'先看到',accent:'14 个信号。',subtitle:'然后再决定，哪些值得继续看。',accentColor:C.amber},
  {start:151,end:231,eyebrow:'02 · 证据',lead:'不是盯着热度，',accent:'先看证据。',subtitle:'碎片汇聚到候选，未知仍然保持未知。',accentColor:C.cyan},
  {start:231,end:313,eyebrow:'03 · 对比',lead:'一边更吵，',accent:'一边更清楚。',subtitle:'差别来自信息顺序，而不是多堆一层界面。',accentColor:C.cyan},
  {start:313,end:400,eyebrow:'04 · 收敛',lead:'真正的升级，',accent:'是敢于减少。',subtitle:'噪声退出，未知待审，焦点保留。',accentColor:C.amber},
  {start:400,end:528,eyebrow:'05 · AGENT + HUMAN GATE',lead:'Agent 提议，',accent:'人来决定。',subtitle:'技术完成 ≠ 人工批准 ≠ 已发布。',accentColor:C.amber},
  {start:528,end:576,eyebrow:'LOOP',lead:'5 个焦点，',accent:'先留下来。',subtitle:'下一轮扫描，从这里继续。',accentColor:C.cyan},
];

const HeaderPolish: React.FC<{frame:number; beat:Beat}> = ({frame,beat}) => {
  const local = frame - beat.start;
  const opacity = opacityWindow(frame, beat.start, beat.end, 7);
  const eye = easeOut(interpolate(local,[0,10],[0,1],clamp));
  const lead = easeOut(interpolate(local,[4,18],[0,1],clamp));
  const accent = easeBackOut(interpolate(local,[9,24],[0,1],clamp));
  const sub = easeOut(interpolate(local,[17,32],[0,1],clamp));
  const underline = easeOut(interpolate(local,[13,31],[0,1],clamp));
  return (
    <div style={{position:'absolute',left:56,right:56,top:72,height:295,opacity,fontFamily}}>
      <div style={{display:'inline-flex',alignItems:'center',height:40,padding:'0 16px',borderRadius:999,background:'rgba(9,27,50,0.88)',border:`1px solid ${C.cyan}55`,color:C.cyan,fontSize:19,fontWeight:900,letterSpacing:2.2,transform:`translateY(${lerp(10,0,eye)}px)`,opacity:eye}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:beat.accentColor,marginRight:10,boxShadow:`0 0 14px ${beat.accentColor}`}} />
        {beat.eyebrow}
      </div>
      <div style={{marginTop:17,display:'flex',alignItems:'baseline',flexWrap:'wrap',maxWidth:930,lineHeight:1.02}}>
        <span style={{fontSize:58,fontWeight:950,color:C.text,letterSpacing:-1.6,transform:`translateY(${lerp(20,0,lead)}px)`,opacity:lead}}>{beat.lead}</span>
        <span style={{position:'relative',fontSize:62,fontWeight:1000,color:beat.accentColor,letterSpacing:-2,marginLeft:beat.lead.endsWith('，')?0:12,transform:`translateX(${lerp(22,0,accent)}px) scale(${lerp(0.94,1,accent)})`,opacity:Math.min(1,accent)}}>
          {beat.accent}
          <span style={{position:'absolute',left:0,right:0,bottom:-11,height:5,borderRadius:999,background:beat.accentColor,transformOrigin:'0 50%',transform:`scaleX(${underline})`,opacity:0.78}} />
        </span>
      </div>
      <div style={{marginTop:22,maxWidth:825,fontSize:24,fontWeight:560,lineHeight:1.45,color:C.muted,letterSpacing:0.3,transform:`translateY(${lerp(14,0,sub)}px)`,opacity:sub}}>{beat.subtitle}</div>
    </div>
  );
};

const AnchorPulse: React.FC<{frame:number; at:number; color:string}> = ({frame,at,color}) => {
  const d=Math.abs(frame-at);
  if (d>14) return null;
  const p=1-d/14;
  const size=lerp(160,620,1-p);
  return <div style={{position:'absolute',left:540-size/2,top:775-size/2,width:size,height:size,borderRadius:'50%',border:`${lerp(1,5,p)}px solid ${color}`,opacity:p*0.34,boxShadow:`0 0 ${lerp(0,36,p)}px ${color}44`}}/>;
};

const ProductionPolishAlphaOverlayV2: React.FC = () => {
  const frame=useCurrentFrame();
  const loopGuardOpacity=interpolate(frame,[540,550,560,569],[0,0.66,0.66,0],clamp);
  return (
    <AbsoluteFill data-alpha-production-polish style={{background:'transparent',overflow:'hidden'}}>
      <div data-loop-luminance-guard style={{position:'absolute',inset:0,background:C.bg,opacity:loopGuardOpacity}} />
      <div data-production-polish-shelf style={{position:'absolute',left:0,right:0,top:0,height:345,background:C.bg,borderBottom:'1px solid #15314f'}} />
      {beats.map((beat,i)=><HeaderPolish key={i} frame={frame} beat={beat}/>)}
      <AnchorPulse frame={frame} at={156} color={C.cyan}/>
      <AnchorPulse frame={frame} at={312} color={C.amber}/>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarExplainerProductionPolishAlphaOverlayV2"
    component={ProductionPolishAlphaOverlayV2}
    durationInFrames={PRODUCTION_POLISH_ALPHA_FRAMES}
    fps={PRODUCTION_POLISH_ALPHA_FPS}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
