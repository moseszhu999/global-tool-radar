import React from 'react';
import {AbsoluteFill, Composition, Img, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

export const RADAR_SCOUT_BIBLE_BENCHMARK_FPS = 30;
export const RADAR_SCOUT_BIBLE_BENCHMARK_FRAMES = 90;

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const RadarScoutCharacterBibleBenchmarkV2: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 12], [0, 1], clamp);
  const exit = interpolate(frame, [76, 89], [1, 0], clamp);
  const opacity = Math.min(enter, exit);
  const bob = Math.sin(frame * 0.075) * 8;
  const yaw = Math.sin(frame * 0.035) * 2.2;
  const push = interpolate(frame, [0, 89], [0.96, 1.035], clamp);
  const ring = interpolate(frame, [0, 89], [-22, 26], clamp);

  const hero = staticFile('assets/m10-material-finish-v1/radar-scout-character-bible-hero-v2.svg');

  return (
    <AbsoluteFill
      data-radar-scout-character-bible-benchmark-v2
      data-production-asset-preservation="svg-staticfile-img"
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 50% 39%, #153d5a 0%, #0b2035 28%, #07111d 62%, #040910 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, opacity: 0.32,
          backgroundImage:
            'radial-gradient(circle at 18% 22%, rgba(125,249,255,.18), transparent 24%), radial-gradient(circle at 84% 66%, rgba(155,125,255,.17), transparent 27%)',
        }}
      />

      <div style={{position: 'absolute', left: 540, top: 980, width: 770, height: 770, transform: 'translate(-50%,-50%)'}}>
        {[1, 0.76, 0.52].map((s, i) => (
          <div
            key={s}
            style={{
              position: 'absolute', left: '50%', top: '50%', width: `${100 * s}%`, height: `${100 * s}%`,
              borderRadius: '50%', border: `${i === 0 ? 3 : 2}px solid rgba(101,231,242,${0.18 + i * 0.08})`,
              transform: `translate(-50%,-50%) rotate(${ring * (i % 2 ? -1 : 1)}deg)`,
              boxShadow: i === 1 ? '0 0 44px rgba(101,231,242,.08)' : undefined,
            }}
          />
        ))}
      </div>

      <Img
        src={hero}
        style={{
          position: 'absolute',
          left: 540,
          top: 1010 + bob,
          width: 760,
          height: 1064,
          objectFit: 'contain',
          transform: `translate(-50%,-50%) perspective(1200px) rotateY(${yaw}deg) scale(${push})`,
          transformOrigin: '50% 58%',
          opacity,
          filter: 'drop-shadow(0 45px 52px rgba(0,0,0,.52))',
        }}
      />

      <div style={{position:'absolute',left:70,right:70,top:75,opacity}}>
        <div style={{fontSize:18,fontWeight:900,letterSpacing:3.5,color:'#7DF9FF'}}>M10 · CHARACTER BIBLE SOURCE ASSET BENCHMARK</div>
        <div style={{fontSize:51,fontWeight:950,lineHeight:1.08,color:'#F6FBFF',marginTop:12}}>不重画角色，只测试<span style={{color:'#FFD166'}}>源资产质感</span>。</div>
        <div style={{fontSize:21,lineHeight:1.5,color:'#9BB4C9',marginTop:15}}>Radar Scout hero SVG is the pixel authority. Remotion only moves / scales / composites it.</div>
      </div>

      <div style={{position:'absolute',left:70,right:70,bottom:74,display:'flex',justifyContent:'space-between',alignItems:'center',opacity}}>
        <div style={{padding:'12px 16px',borderRadius:999,border:'1px solid rgba(125,249,255,.36)',background:'rgba(5,19,31,.66)',fontSize:16,fontWeight:800,color:'#C8F8FF'}}>3.0s DIFFICULT-SHOT · LARGE HERO</div>
        <div style={{fontSize:16,color:'#7E98AF'}}>canonical 19.2s candidate unchanged</div>
      </div>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="ToolRadarRadarScoutCharacterBibleBenchmarkV2"
    component={RadarScoutCharacterBibleBenchmarkV2}
    durationInFrames={RADAR_SCOUT_BIBLE_BENCHMARK_FRAMES}
    fps={RADAR_SCOUT_BIBLE_BENCHMARK_FPS}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
