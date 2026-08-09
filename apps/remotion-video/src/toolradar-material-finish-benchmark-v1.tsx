import React from 'react';
import {AbsoluteFill, Composition, Img, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

export const MATERIAL_FINISH_BENCHMARK_FRAMES = 150;
export const MATERIAL_FINISH_BENCHMARK_FPS = 30;

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const fontFamily = 'Noto Sans CJK SC, Noto Sans SC, Microsoft YaHei, sans-serif';

const C = {
  bg0: '#040b15',
  bg1: '#07182b',
  text: '#f7fbff',
  muted: '#8da6bf',
  cyan: '#61e7f5',
  amber: '#ffd36a',
};

const signalAsset = staticFile('assets/m10-material-finish-v1/signal-module.svg');
const evidenceAsset = staticFile('assets/m10-material-finish-v1/evidence-card.svg');
const scoutAsset = staticFile('assets/m10-material-finish-v1/radar-scout.svg');

const AssetImg: React.FC<{
  src: string;
  left: number;
  top: number;
  width: number;
  transform?: string;
  opacity?: number;
}> = ({src,left,top,width,transform,opacity=1}) => (
  <Img
    src={src}
    style={{
      position:'absolute',
      left,
      top,
      width,
      height:'auto',
      transform,
      opacity,
      objectFit:'contain',
    }}
  />
);

const MaterialFinishBenchmarkV1: React.FC = () => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame,[0,18],[0,1],clamp);
  const sweep = interpolate(frame,[10,140],[-420,1380],clamp);
  const signalBob = (i:number) => Math.sin(frame * 0.055 + i * 0.9) * 7;
  const scoutBob = Math.sin(frame * 0.052) * 8;
  const scoutYaw = Math.sin(frame * 0.032) * 2.8;
  const cardYaw = Math.sin(frame * 0.028) * 1.4;

  return (
    <AbsoluteFill
      data-production-asset-preservation="svg-staticfile-img"
      style={{
        fontFamily,
        color:C.text,
        overflow:'hidden',
        background:`radial-gradient(circle at 42% 25%, #123c59 0%, ${C.bg1} 31%, ${C.bg0} 72%)`,
      }}
    >
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 82% 60%,rgba(97,231,245,.12),transparent 31%),radial-gradient(circle at 25% 72%,rgba(143,128,255,.08),transparent 28%)'}} />
      <div style={{position:'absolute',inset:0,opacity:.12,mixBlendMode:'soft-light',backgroundImage:'repeating-radial-gradient(circle at 17% 21%,rgba(255,255,255,.22) 0 .7px,transparent .8px 4px)',backgroundSize:'19px 17px'}} />

      <div style={{position:'absolute',left:58,right:58,top:64,opacity:intro}}>
        <div style={{fontSize:18,fontWeight:900,letterSpacing:4,color:C.cyan}}>M10 · ASSET PRESERVATION BENCHMARK</div>
        <div style={{fontSize:56,fontWeight:950,letterSpacing:-1.6,lineHeight:1.07,marginTop:14}}>概念资产<span style={{color:C.amber}}>直接进最终像素链</span>。</div>
        <div style={{fontSize:23,lineHeight:1.5,color:C.muted,marginTop:18,maxWidth:920}}>SVG 本体持久化在 public/assets；Remotion 只通过 staticFile() + Img 做位置、尺度、镜头与时间轴，不再用 CSS/DOM 重新描一遍素材。</div>
      </div>

      <div style={{position:'absolute',left:60,top:355,width:960,height:570,borderRadius:62,background:'linear-gradient(150deg,rgba(12,37,59,.84),rgba(5,17,31,.91))',border:'1px solid rgba(151,236,244,.20)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08),inset 0 -60px 90px rgba(0,0,0,.30),0 46px 90px rgba(0,0,0,.24)',overflow:'hidden'}}>
        <div style={{position:'absolute',left:40,top:34,fontSize:18,fontWeight:850,letterSpacing:2.4,color:'#83a8bc'}}>AUTHORED SVG · NO REMOTION REDRAW</div>
        <div style={{position:'absolute',left:98,top:135,width:755,height:280,borderRadius:'50%',border:'1px solid rgba(97,231,245,.18)',boxShadow:'inset 0 0 80px rgba(97,231,245,.04)'}} />
        {[230,385,540,695,850].map((x,i)=>(
          <AssetImg
            key={x}
            src={signalAsset}
            left={x-74}
            top={550 + (i===2?-32:Math.abs(2-i)*26) + signalBob(i)}
            width={148}
            transform={`rotate(${Math.sin(frame*.025+i)*2.2}deg) scale(${i===2?1.12:1})`}
          />
        ))}
      </div>

      <AssetImg
        src={evidenceAsset}
        left={92}
        top={1040}
        width={570}
        transform={`perspective(1100px) rotateX(3deg) rotateY(${cardYaw}deg) rotateZ(-2deg)`}
      />

      <AssetImg
        src={scoutAsset}
        left={668}
        top={900 + scoutBob}
        width={310}
        transform={`perspective(1200px) rotateY(${scoutYaw}deg)`}
      />

      <div style={{position:'absolute',left:58,right:58,bottom:92,height:158,borderRadius:36,background:'linear-gradient(160deg,rgba(10,28,47,.97),rgba(5,16,28,.97))',border:'1px solid rgba(255,211,106,.34)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08),0 22px 50px rgba(0,0,0,.28)',display:'flex',alignItems:'center',padding:'0 34px',gap:22}}>
        <div style={{width:60,height:60,borderRadius:20,background:'radial-gradient(circle at 35% 30%,#fff 0 8%,#ffd36a 22%,#81500f 75%)',border:'1px solid rgba(255,255,255,.55)',boxShadow:'0 0 22px rgba(255,211,106,.35)'}} />
        <div>
          <div style={{fontSize:23,fontWeight:900,color:C.amber}}>SOURCE-ASSET PIXELS ARE AUTHORITATIVE</div>
          <div style={{fontSize:20,color:C.muted,marginTop:5}}>后续 PNG / WebP / 分层渲染同理：先把高质量视觉做成 durable asset，再由 Remotion 合成；禁止“看概念图后重新画低配版”。</div>
        </div>
      </div>

      <div style={{position:'absolute',left:sweep,top:250,width:250,height:1330,transform:'rotate(12deg)',background:'linear-gradient(90deg,transparent,rgba(214,251,255,.08),rgba(255,255,255,.14),rgba(214,251,255,.06),transparent)',filter:'blur(10px)',mixBlendMode:'screen',pointerEvents:'none'}} />
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
