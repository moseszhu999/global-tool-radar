import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame} from 'remotion';

export const EXPLAINER_19S_FPS = 30;
export const EXPLAINER_19S_FRAMES = 576;
export const EXPLAINER_19S_FIRST_PAYOFF_FRAME = 156;
export const EXPLAINER_19S_FULL_REVEAL_FRAME = 312;
export const EXPLAINER_19S_LOOP_START_FRAME = 528;

const C = {
  bg: '#08172c',
  bg2: '#12284a',
  ink: '#06111f',
  text: '#f5f8ff',
  muted: '#9fb4ce',
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const phaseOpacity = (frame: number, start: number, end: number, fade = 10) =>
  interpolate(frame, [start, start + fade, end - fade, end], [0, 1, 1, 0], clamp);

const Background: React.FC<{frame: number}> = ({frame}) => {
  const shift = Math.sin(frame * 0.012) * 4;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + shift}% 34%, ${C.bg2}, ${C.bg} 58%, #050d19 100%)`,
      }}
    >
      <div style={{position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#ffffff 1.4px, transparent 1.4px)', backgroundSize: '44px 44px'}} />
    </AbsoluteFill>
  );
};

const Header: React.FC<{eyebrow: string; title: string; subtitle?: string; opacity?: number}> = ({eyebrow, title, subtitle, opacity = 1}) => (
  <div style={{position: 'absolute', left: 62, right: 62, top: 95, opacity}}>
    <div style={{fontSize: 22, fontWeight: 900, color: C.cyan, letterSpacing: 3}}>{eyebrow}</div>
    <div style={{fontSize: 62, fontWeight: 1000, lineHeight: 1.07, marginTop: 11}}>{title}</div>
    {subtitle ? <div style={{fontSize: 27, color: C.muted, marginTop: 13}}>{subtitle}</div> : null}
  </div>
);

const RadarRings: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 1}) => {
  const sweep = interpolate(frame, [0, 80], [-120, 300], clamp);
  return (
    <>
      {[720, 490, 290].map((size, i) => (
        <div
          key={size}
          style={{
            position: 'absolute',
            left: 540 - size / 2,
            top: 775 - size / 2,
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${i === 0 ? 3 : 2}px solid ${C.cyan}${i === 0 ? '55' : '2d'}`,
            opacity,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 539,
          top: 775,
          width: 3,
          height: 350,
          transformOrigin: '50% 0%',
          transform: `rotate(${sweep}deg)`,
          background: `linear-gradient(${C.cyan}, transparent)`,
          boxShadow: `0 0 16px ${C.cyan}`,
          opacity: opacity * 0.75,
        }}
      />
    </>
  );
};

const fivePositions = [
  {x: 330, y: 820},
  {x: 435, y: 725},
  {x: 540, y: 690},
  {x: 645, y: 725},
  {x: 750, y: 820},
];

const Signal: React.FC<{x: number; y: number; scale?: number; color?: string; opacity?: number; frame: number; index: number}> = ({x, y, scale = 1, color = C.cyan, opacity = 1, frame, index}) => {
  const bob = Math.sin(frame * 0.065 + index * 0.9) * 5;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 31,
        top: y - 31 + bob,
        width: 62,
        height: 62,
        borderRadius: 21,
        background: color,
        border: '3px solid #ffffffc9',
        boxShadow: `0 0 32px ${color}55`,
        transform: `scale(${scale}) rotate(${Math.sin(frame * 0.04 + index) * 4}deg)`,
        opacity,
      }}
    >
      <div style={{position: 'absolute', left: 18, top: 18, width: 21, height: 21, borderRadius: '50%', background: C.white}} />
    </div>
  );
};

const OpeningAfter: React.FC<{frame: number}> = ({frame}) => {
  const opacity = phaseOpacity(frame, 0, 82, 10);
  const lock = easeOut(interpolate(frame, [8, 34], [0, 1], clamp));
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <Header eyebrow="TOOLRADAR · 先看结果" title="5 个焦点，先留下来。" subtitle="不是先加更多，而是先把注意力收拢。" />
      <RadarRings frame={frame} opacity={0.52} />
      <div
        style={{
          position: 'absolute', left: 540 - 280, top: 760 - 280, width: 560, height: 560, borderRadius: '50%',
          border: `4px solid ${C.green}66`, background: `radial-gradient(circle,${C.green}16,transparent 68%)`,
          transform: `scale(${lerp(0.72, 1, lock)})`, opacity: lock,
        }}
      />
      {fivePositions.map((p, i) => <Signal key={i} {...p} frame={frame} index={i} scale={1.25} color={i === 2 ? C.green : C.cyan} />)}
      <div style={{position:'absolute',left:240,right:240,top:1110,height:126,borderRadius:63,border:`3px solid ${C.green}88`,background:`${C.green}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:900,color:C.text}}>
        AFTER · 聚焦完成
      </div>
    </div>
  );
};

const RewindFilter: React.FC<{frame: number}> = ({frame}) => {
  const start = 70;
  const end = EXPLAINER_19S_FIRST_PAYOFF_FRAME + 8;
  const opacity = phaseOpacity(frame, start, end, 10);
  const local = frame - start;
  const expansion = easeInOut(interpolate(local, [0, 38], [0, 1], clamp));
  const filter = easeInOut(interpolate(local, [42, 82], [0, 1], clamp));
  const positions = Array.from({length: 14}, (_, i) => {
    const angle = -Math.PI / 2 + i / 14 * Math.PI * 2;
    const r = 300 + (i % 3) * 38;
    return {x: 540 + Math.cos(angle) * r, y: 775 + Math.sin(angle) * r * 0.78};
  });
  const survivors = new Set([0, 3, 6, 9, 12]);
  let survivorOrder = -1;
  return (
    <div style={{position:'absolute',inset:0,opacity}}>
      <Header eyebrow="01 · 发现" title="先看到 14 个信号。" subtitle="然后再决定，哪些值得继续看。" />
      <RadarRings frame={local} opacity={0.8} />
      {positions.map((p, i) => {
        const survivor = survivors.has(i);
        if (survivor) survivorOrder += 1;
        const origin = fivePositions[Math.min(4, survivorOrder < 0 ? i % 5 : survivorOrder)];
        let x = lerp(origin.x, p.x, expansion);
        let y = lerp(origin.y, p.y, expansion);
        let itemOpacity = 1;
        let scale = 1;
        if (filter > 0) {
          if (survivor) {
            const target = fivePositions[survivorOrder];
            x = lerp(x, target.x, filter);
            y = lerp(y, target.y, filter);
            scale = lerp(1, 1.26, filter);
          } else {
            x += (p.x - 540) * filter * 0.9;
            y += (p.y - 775) * filter * 0.4;
            itemOpacity = 1 - filter;
            scale = 1 - filter * 0.4;
          }
        }
        const color = survivor ? C.cyan : i % 3 === 0 ? C.amber : i % 3 === 1 ? C.purple : '#7897b9';
        return <Signal key={i} x={x} y={y} frame={local} index={i} color={color} opacity={itemOpacity} scale={scale} />;
      })}
      <div style={{position:'absolute',left:170,right:170,top:1160,height:150,borderRadius:75,border:`3px solid ${C.green}77`,background:`${C.green}16`,opacity:filter,display:'flex',alignItems:'center',justifyContent:'center',gap:22}}>
        <div style={{width:70,height:70,borderRadius:24,background:C.green,color:C.ink,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,fontWeight:1000}}>5</div>
        <div><div style={{fontSize:30,fontWeight:900}}>第一段 payoff：焦点形成</div><div style={{fontSize:18,color:C.muted}}>5.2s 锚点保持</div></div>
      </div>
    </div>
  );
};

const EvidenceConverge: React.FC<{frame: number}> = ({frame}) => {
  const start = 148;
  const end = 238;
  const opacity = phaseOpacity(frame, start, end, 10);
  const local = frame - start;
  const p = easeInOut(interpolate(local, [10, 60], [0, 1], clamp));
  return (
    <div style={{position:'absolute',inset:0,opacity}}>
      <Header eyebrow="02 · 证据" title="不是盯着热度，先看证据。" subtitle="碎片汇聚到候选，未知仍然保持未知。" />
      <svg width={1080} height={1920} style={{position:'absolute',inset:0}}>
        {fivePositions.map((target, i) => {
          const sx = 135 + i * 200;
          const sy = 1210 + (i % 2) * 100;
          const ex = lerp(sx, target.x, p);
          const ey = lerp(sy, target.y, p);
          return <g key={i}>
            <path d={`M${sx},${sy} Q540,1040 ${ex},${ey}`} fill="none" stroke={i % 2 ? C.cyan : C.green} strokeWidth="6" strokeLinecap="round" opacity="0.72" />
            <rect x={sx-33} y={sy-26} width={66} height={52} rx={14} fill={C.white} />
            <path d={`M${sx-14},${sy-8}h28 M${sx-14},${sy+5}h19`} stroke={C.blue} strokeWidth="5" strokeLinecap="round" />
          </g>;
        })}
      </svg>
      {fivePositions.map((pos, i) => <Signal key={i} {...pos} frame={local} index={i} scale={1.24} color={i === 1 ? C.amber : C.cyan} />)}
      <div style={{position:'absolute',left:196,right:196,top:1395,padding:'28px 34px',borderRadius:34,background:'#101f36',border:`2px solid ${C.amber}66`,textAlign:'center'}}>
        <div style={{fontSize:24,fontWeight:900,color:C.amber}}>UNKNOWN ≠ 0</div>
        <div style={{fontSize:21,color:C.muted,marginTop:5}}>没有证据，就不替它补结论。</div>
      </div>
    </div>
  );
};

const BeforeAfterReveal: React.FC<{frame: number}> = ({frame}) => {
  const start = 226;
  const end = EXPLAINER_19S_FULL_REVEAL_FRAME + 12;
  const opacity = phaseOpacity(frame, start, end, 10);
  const local = frame - start;
  const split = easeOut(interpolate(local, [6, 34], [0, 1], clamp));
  const after = easeOut(interpolate(local, [42, 78], [0, 1], clamp));
  return (
    <div style={{position:'absolute',inset:0,opacity}}>
      <Header eyebrow="03 · 对比" title="一边更吵，一边更清楚。" subtitle="10.4s 完整 reveal 锚点保持。" />
      <div style={{position:'absolute',left:70,top:410,width:445,height:900,borderRadius:48,background:'#111b2c',border:`3px solid ${C.red}77`,transform:`translateX(${lerp(-80,0,split)}px)`}}>
        <div style={{position:'absolute',left:28,top:28,padding:'8px 16px',borderRadius:999,background:C.red,color:C.ink,fontWeight:1000,fontSize:20}}>BEFORE</div>
        {Array.from({length:14},(_,i)=><div key={i} style={{position:'absolute',left:38+(i%2)*190,top:120+Math.floor(i/2)*92,width:170,height:58,borderRadius:18,background:i%3===0?'#663a5a':i%3===1?'#263d5e':'#35424f',border:'1px solid #ffffff29',transform:`rotate(${(i%5-2)*2.5}deg)`}} />)}
      </div>
      <div style={{position:'absolute',right:70,top:410,width:445,height:900,borderRadius:48,background:'#0c2130',border:`3px solid ${C.green}88`,transform:`translateX(${lerp(80,0,split)}px)`,boxShadow:`0 0 70px ${C.green}13 inset`}}>
        <div style={{position:'absolute',left:28,top:28,padding:'8px 16px',borderRadius:999,background:C.green,color:C.ink,fontWeight:1000,fontSize:20}}>AFTER</div>
        {Array.from({length:5},(_,i)=><div key={i} style={{position:'absolute',left:44,top:155+i*125,width:357,height:90,borderRadius:24,background:`linear-gradient(100deg,${C.cyan}28,${C.blue}18)`,border:`2px solid ${C.cyan}55`,opacity:after,transform:`translateY(${lerp(40,0,after)}px)`}}><div style={{position:'absolute',left:22,top:22,width:45,height:45,borderRadius:15,background:i===2?C.green:C.cyan}}/><div style={{position:'absolute',left:86,top:28,width:190,height:14,borderRadius:7,background:'#eaf7ff'}}/><div style={{position:'absolute',left:86,top:52,width:115,height:9,borderRadius:5,background:'#8aa7bf'}}/></div>)}
      </div>
      <div style={{position:'absolute',left:250,right:250,top:1375,textAlign:'center',fontSize:30,fontWeight:900,opacity:after}}>完整 reveal：差别来自信息顺序。</div>
    </div>
  );
};

const ReductionMetaphor: React.FC<{frame: number}> = ({frame}) => {
  const start = 304;
  const end = 408;
  const opacity = phaseOpacity(frame, start, end, 10);
  const local = frame - start;
  const p = easeInOut(interpolate(local, [10, 72], [0, 1], clamp));
  const gates = [
    {label:'噪声退出', color:C.red, y:620},
    {label:'未知待审', color:C.amber, y:850},
    {label:'焦点保留', color:C.green, y:1080},
  ];
  return (
    <div style={{position:'absolute',inset:0,opacity}}>
      <Header eyebrow="04 · 收敛" title="真正的升级，是敢于减少。" subtitle="不是所有东西都要一起进最终画面。" />
      <div style={{position:'absolute',left:190,top:470,width:700,height:770,borderRadius:350,border:`3px solid ${C.cyan}36`,background:`radial-gradient(circle,${C.blue}16,transparent 70%)`}} />
      {gates.map((g,i)=><div key={g.label} style={{position:'absolute',left:lerp(i%2?860:40,220,p),top:g.y,width:640,height:145,borderRadius:72,background:`${g.color}16`,border:`3px solid ${g.color}88`,display:'flex',alignItems:'center',gap:24,padding:'0 36px',transform:`scale(${lerp(0.82,1,p)})`}}><div style={{width:70,height:70,borderRadius:24,background:g.color}}/><div style={{fontSize:32,fontWeight:900}}>{g.label}</div></div>)}
    </div>
  );
};

const AgentHumanGate: React.FC<{frame: number}> = ({frame}) => {
  const start = 394;
  const end = EXPLAINER_19S_LOOP_START_FRAME + 8;
  const opacity = phaseOpacity(frame, start, end, 10);
  const local = frame - start;
  const handoff = easeInOut(interpolate(local, [20, 92], [0, 1], clamp));
  return (
    <div style={{position:'absolute',inset:0,opacity}}>
      <Header eyebrow="05 · Agent + Human Gate" title="Agent 提议，人来决定。" subtitle="技术完成 ≠ 人工批准 ≠ 已发布。" />
      <div style={{position:'absolute',left:130,top:570,width:250,height:250,borderRadius:90,background:`linear-gradient(145deg,${C.purple},${C.blue})`,border:'4px solid #ffffffb8',boxShadow:`0 0 60px ${C.purple}35`}}>
        <div style={{position:'absolute',left:60,top:67,width:42,height:42,borderRadius:'50%',background:C.white}}/><div style={{position:'absolute',right:60,top:67,width:42,height:42,borderRadius:'50%',background:C.white}}/><div style={{position:'absolute',left:67,right:67,bottom:58,height:18,borderRadius:9,background:'#dbe8ff'}}/>
      </div>
      <div style={{position:'absolute',left:790,top:570,width:180,height:250,borderRadius:48,background:'#f8fbff',color:C.ink,display:'flex',alignItems:'center',justifyContent:'center',fontSize:72,fontWeight:1000,boxShadow:'0 28px 70px #0008'}}>人</div>
      <div style={{position:'absolute',left:lerp(320,690,handoff),top:890,width:280,height:160,borderRadius:34,background:'#f8fbff',color:C.ink,padding:'26px 28px',transform:`rotate(${lerp(-7,3,handoff)}deg)`,boxShadow:'0 24px 60px #0007'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#59718a'}}>AGENT PROPOSAL</div><div style={{fontSize:34,fontWeight:1000,marginTop:12}}>候选方案</div><div style={{fontSize:18,color:'#72879c',marginTop:8}}>等待人工判断</div>
      </div>
      <svg width={1080} height={1920} style={{position:'absolute',inset:0}}><path d="M380 700 C540 650 650 700 790 700" fill="none" stroke={C.cyan} strokeWidth="7" strokeLinecap="round" strokeDasharray="14 18" opacity="0.7"/></svg>
      <div style={{position:'absolute',left:170,right:170,top:1260,padding:'28px 32px',borderRadius:34,background:'#0e2137',border:`2px solid ${C.amber}66`,textAlign:'center'}}><div style={{fontSize:24,fontWeight:1000,color:C.amber}}>HUMAN GATE</div><div style={{fontSize:21,color:C.muted,marginTop:4}}>继续 ≠ 自动批准；发布仍然是独立事实。</div></div>
    </div>
  );
};

const LoopReturn: React.FC<{frame: number}> = ({frame}) => {
  const start = EXPLAINER_19S_LOOP_START_FRAME;
  const local = frame - start;
  const p = easeInOut(interpolate(local, [0, 40], [0, 1], clamp));
  const ringSize = lerp(120, 2600, p);
  const settle = easeOut(interpolate(local, [22, 47], [0, 1], clamp));
  return (
    <div style={{position:'absolute',inset:0,opacity:interpolate(frame,[start,start+5],[0,1],clamp)}}>
      <div style={{position:'absolute',left:540-ringSize/2,top:760-ringSize/2,width:ringSize,height:ringSize,borderRadius:'50%',background:C.cyan,boxShadow:`0 0 90px ${C.cyan}66`,opacity:interpolate(local,[0,12,32,42],[0,1,1,0],clamp)}}/>
      <div style={{opacity:settle}}>
        <Header eyebrow="LOOP" title="5 个焦点，先留下来。" subtitle="下一轮扫描，从这里继续。" />
        <RadarRings frame={local+20} opacity={0.48}/>
        {fivePositions.map((pos,i)=><Signal key={i} {...pos} frame={local} index={i} color={i===2?C.green:C.cyan} scale={1.25}/>) }
      </div>
    </div>
  );
};

export const ToolRadarExplainer19sAnimaticV1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{color:C.text,fontFamily,overflow:'hidden'}}>
      <Background frame={frame}/>
      <OpeningAfter frame={frame}/>
      <RewindFilter frame={frame}/>
      <EvidenceConverge frame={frame}/>
      <BeforeAfterReveal frame={frame}/>
      <ReductionMetaphor frame={frame}/>
      <AgentHumanGate frame={frame}/>
      <LoopReturn frame={frame}/>
      <div style={{position:'absolute',right:54,bottom:62,fontSize:17,color:'#9fb4ce77',letterSpacing:1.5}}>STRUCTURAL ANIMATIC · NO AUDIO · NO PUBLICATION CLAIM</div>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarExplainer19sAnimaticV1"
    component={ToolRadarExplainer19sAnimaticV1}
    durationInFrames={EXPLAINER_19S_FRAMES}
    fps={EXPLAINER_19S_FPS}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
