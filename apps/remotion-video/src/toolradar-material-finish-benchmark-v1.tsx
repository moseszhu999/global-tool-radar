import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame} from 'remotion';

export const MATERIAL_FINISH_BENCHMARK_FRAMES = 150;
export const MATERIAL_FINISH_BENCHMARK_FPS = 30;

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Noto Sans SC, Microsoft YaHei, sans-serif';

const C = {
  bg0: '#040b15',
  bg1: '#07182b',
  bg2: '#0c2840',
  text: '#f7fbff',
  muted: '#8da6bf',
  cyan: '#61e7f5',
  cyanDeep: '#138ca9',
  amber: '#ffd36a',
  amberDeep: '#a96412',
  mint: '#7cf0b2',
  violet: '#9b8cff',
};

const SurfaceNoise: React.FC<{opacity?: number}> = ({opacity = 0.12}) => (
  <div
    data-surface-noise
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity,
      mixBlendMode: 'soft-light',
      backgroundImage:
        'repeating-radial-gradient(circle at 17% 21%, rgba(255,255,255,.22) 0 0.7px, transparent 0.8px 4px), repeating-linear-gradient(132deg, rgba(255,255,255,.045) 0 1px, transparent 1px 7px)',
      backgroundSize: '19px 17px, 37px 31px',
    }}
  />
);

const MaterialSignal: React.FC<{x: number; y: number; tone: 'cyan' | 'amber'; frame: number; index: number}> = ({x, y, tone, frame, index}) => {
  const accent = tone === 'cyan' ? C.cyan : C.amber;
  const deep = tone === 'cyan' ? C.cyanDeep : C.amberDeep;
  const bob = Math.sin(frame * 0.055 + index * 0.9) * 6;
  const tilt = Math.sin(frame * 0.035 + index * 0.6) * 2.3;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 58,
        top: y - 58 + bob,
        width: 116,
        height: 116,
        borderRadius: 34,
        transform: `perspective(800px) rotateX(-7deg) rotateY(${tilt}deg)`,
        filter: 'drop-shadow(0 28px 34px rgba(0,0,0,.42))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 34,
          background: `linear-gradient(145deg, rgba(255,255,255,.42) 0%, ${accent} 18%, ${deep} 62%, #071c2d 100%)`,
          border: '1px solid rgba(255,255,255,.62)',
          boxShadow: `inset 0 2px 2px rgba(255,255,255,.45), inset 0 -13px 24px rgba(0,0,0,.28), 0 0 34px ${accent}33`,
          overflow: 'hidden',
        }}
      >
        <div style={{position:'absolute',left:11,right:11,top:9,height:28,borderRadius:22,background:'linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0))',opacity:.64}} />
        <div style={{position:'absolute',inset:9,borderRadius:27,border:'1px solid rgba(255,255,255,.20)',boxShadow:'inset 0 0 18px rgba(255,255,255,.08)'}} />
        <SurfaceNoise opacity={0.18} />
        <div
          style={{
            position:'absolute',left:36,top:36,width:44,height:44,borderRadius:'50%',
            background:`radial-gradient(circle at 38% 34%, #ffffff 0 22%, ${accent} 34%, ${deep} 68%, #061521 100%)`,
            border:'2px solid rgba(255,255,255,.68)',
            boxShadow:`0 0 14px #ffffff66, 0 0 34px ${accent}aa, inset 0 -7px 10px rgba(0,0,0,.28)`,
          }}
        />
      </div>
    </div>
  );
};

const EvidenceCard: React.FC<{frame:number}> = ({frame}) => {
  const tilt = Math.sin(frame * 0.03) * 1.2;
  return (
    <div style={{position:'absolute',left:126,top:1070,width:510,height:300,transform:`perspective(1100px) rotateX(5deg) rotateY(${tilt}deg) rotateZ(-2.2deg)`,filter:'drop-shadow(0 38px 42px rgba(0,0,0,.45))'}}>
      <div style={{position:'absolute',inset:0,borderRadius:34,background:'linear-gradient(160deg,#ffffff 0%,#eef5f8 46%,#d8e3e8 100%)',border:'1px solid rgba(255,255,255,.95)',boxShadow:'inset 0 2px 2px rgba(255,255,255,.98), inset 0 -16px 26px rgba(27,53,67,.12)',overflow:'hidden'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:9,background:`linear-gradient(180deg,${C.cyan},${C.mint})`,boxShadow:`0 0 26px ${C.cyan}66`}} />
        <div style={{position:'absolute',left:38,top:34,fontSize:18,fontWeight:850,letterSpacing:2,color:'#3f6171'}}>EVIDENCE CARD</div>
        <div style={{position:'absolute',left:38,top:80,fontSize:42,fontWeight:950,letterSpacing:-1,color:'#071521'}}>候选方案</div>
        <div style={{position:'absolute',left:38,top:143,fontSize:22,fontWeight:650,color:'#647b86'}}>等待人工判断 · UNKNOWN 保持 UNKNOWN</div>
        <div style={{position:'absolute',left:38,top:210,display:'flex',gap:13}}>
          {[['来源','已绑定'],['证据','待审'],['发布','未授权']].map(([k,v],i)=><div key={k} style={{minWidth:122,padding:'13px 15px',borderRadius:18,background:i===0?'rgba(20,140,169,.10)':'rgba(7,21,33,.055)',border:'1px solid rgba(7,21,33,.11)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.82)'}}><div style={{fontSize:14,fontWeight:850,color:'#617985'}}>{k}</div><div style={{fontSize:17,fontWeight:900,color:i===0?'#0b8da7':'#182e3a',marginTop:3}}>{v}</div></div>)}
        </div>
        <div style={{position:'absolute',left:25,right:25,top:12,height:52,borderRadius:24,background:'linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0))',opacity:.55}} />
        <SurfaceNoise opacity={0.09} />
      </div>
    </div>
  );
};

const PremiumScout: React.FC<{frame:number}> = ({frame}) => {
  const bob = Math.sin(frame * 0.06) * 8;
  const yaw = Math.sin(frame * 0.035) * 3.5;
  return (
    <div style={{position:'absolute',left:665,top:945 + bob,width:300,height:420,transform:`perspective(1000px) rotateY(${yaw}deg)`,transformOrigin:'50% 60%',filter:'drop-shadow(0 42px 46px rgba(0,0,0,.50))'}}>
      <div style={{position:'absolute',left:96,top:0,width:108,height:64}}>
        <div style={{position:'absolute',left:50,top:18,width:9,height:48,borderRadius:7,background:'linear-gradient(90deg,#17384b,#d9fbff 45%,#1a5168)',boxShadow:'0 0 9px rgba(97,231,245,.45)'}} />
        <div style={{position:'absolute',left:39,top:0,width:31,height:31,borderRadius:'50%',background:`radial-gradient(circle at 35% 30%,#fff 0 15%,${C.amber} 28%,#e69b21 58%,#47240a 100%)`,border:'1px solid rgba(255,255,255,.8)',boxShadow:`0 0 20px ${C.amber}88`}} />
      </div>
      <div style={{position:'absolute',left:34,top:56,width:232,height:244,borderRadius:'82px 82px 70px 70px',background:'linear-gradient(145deg,#2a5e70 0%,#123a50 42%,#071c2f 80%,#04111d 100%)',border:'2px solid rgba(159,240,248,.72)',boxShadow:`inset 0 4px 3px rgba(255,255,255,.22), inset -18px -24px 35px rgba(0,0,0,.36), inset 14px 15px 34px rgba(97,231,245,.08), 0 0 38px ${C.cyan}2e`,overflow:'hidden'}}>
        <div style={{position:'absolute',left:18,right:18,top:18,height:108,borderRadius:48,background:'linear-gradient(155deg,rgba(140,242,255,.38) 0%,rgba(20,83,111,.34) 30%,rgba(4,18,31,.92) 78%)',border:'1px solid rgba(190,250,255,.56)',boxShadow:'inset 0 3px 7px rgba(255,255,255,.12), inset 0 -16px 26px rgba(0,0,0,.36)'}}>
          <div style={{position:'absolute',left:42,top:40,width:35,height:29,borderRadius:18,background:`radial-gradient(circle at 36% 30%,#fff 0 15%,${C.cyan} 36%,#1ba6bd 70%,#082832 100%)`,boxShadow:`0 0 22px ${C.cyan}, 0 0 42px ${C.cyan}66`}} />
          <div style={{position:'absolute',right:42,top:40,width:35,height:29,borderRadius:18,background:`radial-gradient(circle at 36% 30%,#fff 0 15%,${C.amber} 36%,#c27e17 70%,#3c2407 100%)`,boxShadow:`0 0 22px ${C.amber}, 0 0 42px ${C.amber}55`}} />
          <div style={{position:'absolute',left:24,right:24,top:10,height:28,borderRadius:18,background:'linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,0))',transform:'rotate(-3deg)'}} />
        </div>
        <div style={{position:'absolute',left:70,top:154,width:92,height:36,borderRadius:18,background:'linear-gradient(180deg,#0f2e3f,#071722)',border:'1px solid rgba(159,240,248,.34)',boxShadow:'inset 0 2px 8px rgba(0,0,0,.5)'}} />
        <div style={{position:'absolute',left:27,right:27,bottom:17,height:14,borderRadius:9,background:'linear-gradient(90deg,#14394a,#65e6a2 50%,#14394a)',opacity:.85,boxShadow:`0 0 18px ${C.mint}55`}} />
        <div style={{position:'absolute',left:18,right:18,top:12,height:62,borderRadius:50,background:'linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0))'}} />
        <SurfaceNoise opacity={0.13} />
      </div>
      <div style={{position:'absolute',left:58,top:278,width:72,height:88,borderRadius:'20px 20px 28px 28px',background:'linear-gradient(150deg,#2a5c6c,#0d3145 62%,#061623)',border:'1px solid rgba(152,237,244,.58)',boxShadow:'inset 0 2px 4px rgba(255,255,255,.18), 0 16px 22px rgba(0,0,0,.28)'}} />
      <div style={{position:'absolute',right:58,top:278,width:72,height:88,borderRadius:'20px 20px 28px 28px',background:'linear-gradient(150deg,#2a5c6c,#0d3145 62%,#061623)',border:'1px solid rgba(152,237,244,.58)',boxShadow:'inset 0 2px 4px rgba(255,255,255,.18), 0 16px 22px rgba(0,0,0,.28)'}} />
      <div style={{position:'absolute',left:36,top:334,width:228,height:38,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(83,231,242,.28),rgba(0,0,0,0) 70%)',filter:'blur(9px)'}} />
      <div style={{position:'absolute',left:5,top:175,width:42,height:91,borderRadius:22,background:'linear-gradient(90deg,#071522,#2a566a,#74eaf1)',border:'1px solid rgba(255,255,255,.28)'}} />
      <div style={{position:'absolute',right:5,top:175,width:42,height:91,borderRadius:22,background:'linear-gradient(90deg,#74eaf1,#2a566a,#071522)',border:'1px solid rgba(255,255,255,.28)'}} />
    </div>
  );
};

const MaterialFinishBenchmarkV1: React.FC = () => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame,[0,18],[0,1],clamp);
  const sweep = interpolate(frame,[15,135],[-380,1320],clamp);
  const orbShift = Math.sin(frame * 0.025) * 26;
  return (
    <AbsoluteFill style={{fontFamily,color:C.text,overflow:'hidden',background:`radial-gradient(circle at ${38 + orbShift/18}% 28%, #123c59 0%, ${C.bg1} 31%, ${C.bg0} 72%)`}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 80% 58%,rgba(97,231,245,.11),transparent 32%), radial-gradient(circle at 28% 68%,rgba(155,140,255,.08),transparent 28%)'}} />
      <SurfaceNoise opacity={0.15} />
      <div style={{position:'absolute',left:58,right:58,top:64,opacity:intro}}>
        <div style={{fontSize:18,fontWeight:900,letterSpacing:4,color:C.cyan}}>M10 · MATERIAL FINISH BENCHMARK V1</div>
        <div style={{fontSize:58,fontWeight:950,letterSpacing:-1.8,lineHeight:1.06,marginTop:14}}>同样的信息，先把<span style={{color:C.amber}}>材质完成度</span>做上去。</div>
        <div style={{fontSize:23,lineHeight:1.5,color:C.muted,marginTop:18,maxWidth:900}}>只测试三类资产：信号模块、证据卡、Radar Scout。故事、19.2 秒结构与发布真相均不在本实验范围。</div>
      </div>

      <div style={{position:'absolute',left:60,top:370,width:960,height:560,borderRadius:62,background:'linear-gradient(150deg,rgba(12,37,59,.84),rgba(5,17,31,.88))',border:'1px solid rgba(151,236,244,.20)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08), inset 0 -60px 90px rgba(0,0,0,.30), 0 46px 90px rgba(0,0,0,.24)',overflow:'hidden'}}>
        <div style={{position:'absolute',left:40,top:34,fontSize:18,fontWeight:850,letterSpacing:2.4,color:'#83a8bc'}}>COATED MODULES · DISTINCT SURFACE RESPONSE</div>
        <div style={{position:'absolute',left:95,top:122,width:760,height:270,borderRadius:'50%',border:'1px solid rgba(97,231,245,.18)',boxShadow:'inset 0 0 80px rgba(97,231,245,.04)'}} />
        <MaterialSignal x={230} y={660} tone="cyan" frame={frame} index={0}/>
        <MaterialSignal x={385} y={590} tone="cyan" frame={frame} index={1}/>
        <MaterialSignal x={540} y={555} tone="amber" frame={frame} index={2}/>
        <MaterialSignal x={695} y={590} tone="cyan" frame={frame} index={3}/>
        <MaterialSignal x={850} y={660} tone="cyan" frame={frame} index={4}/>
        <SurfaceNoise opacity={0.10}/>
      </div>

      <EvidenceCard frame={frame}/>
      <PremiumScout frame={frame}/>

      <div style={{position:'absolute',left:58,right:58,bottom:104,height:150,borderRadius:36,background:'linear-gradient(160deg,rgba(10,28,47,.96),rgba(5,16,28,.96))',border:'1px solid rgba(255,211,106,.34)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08), 0 22px 50px rgba(0,0,0,.28)',display:'flex',alignItems:'center',padding:'0 34px',gap:22}}>
        <div style={{width:58,height:58,borderRadius:19,background:`radial-gradient(circle at 35% 30%,#fff 0 8%,${C.amber} 22%,#81500f 75%)`,border:'1px solid rgba(255,255,255,.55)',boxShadow:`0 0 22px ${C.amber}55`}} />
        <div><div style={{fontSize:23,fontWeight:900,color:C.amber}}>MATERIAL FINISH ONLY · NOT CANONICAL</div><div style={{fontSize:20,color:C.muted,marginTop:5}}>通过标准：不再像“加了 glow 的 SVG/CSS”，而要读成统一灯光下的专业 2.5D 资产系统。</div></div>
      </div>

      <div style={{position:'absolute',left:sweep,top:250,width:250,height:1320,transform:'rotate(12deg)',background:'linear-gradient(90deg,transparent,rgba(214,251,255,.08),rgba(255,255,255,.14),rgba(214,251,255,.06),transparent)',filter:'blur(10px)',mixBlendMode:'screen',pointerEvents:'none'}} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarMaterialFinishBenchmarkV1"
    component={MaterialFinishBenchmarkV1}
    durationInFrames={MATERIAL_FINISH_BENCHMARK_FRAMES}
    fps={MATERIAL_FINISH_BENCHMARK_FPS}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
