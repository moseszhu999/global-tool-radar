import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

export const SOCIAL_NATIVE_RESCUE_FPS = 30;
export const SOCIAL_NATIVE_RESCUE_FRAMES = 990;

const slots = [
  {from: 0, duration: 135, audio: 'assets/social-native-rescue-v1/01-hook.wav'},
  {from: 135, duration: 165, audio: 'assets/social-native-rescue-v1/02-problem.wav'},
  {from: 300, duration: 135, audio: 'assets/social-native-rescue-v1/03-cut-info.wav'},
  {from: 435, duration: 120, audio: 'assets/social-native-rescue-v1/04-cut-color.wav'},
  {from: 555, duration: 135, audio: 'assets/social-native-rescue-v1/05-one-cta.wav'},
  {from: 690, duration: 165, audio: 'assets/social-native-rescue-v1/06-reveal.wav'},
  {from: 855, duration: 135, audio: 'assets/social-native-rescue-v1/07-payoff.wav'},
] as const;

const c = {
  bg: '#080a0f',
  surface: '#111722',
  surface2: '#171f2d',
  line: '#2a3547',
  text: '#f5f8ff',
  muted: '#9aa7ba',
  blue: '#55a6ff',
  green: '#57e39b',
  yellow: '#ffd45a',
  red: '#ff606d',
};

const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const Caption: React.FC<{children: React.ReactNode; keyword?: string}> = ({children, keyword}) => (
  <div style={{position: 'absolute', left: 58, right: 58, bottom: 92, zIndex: 30, textAlign: 'center', fontFamily, fontSize: 52, lineHeight: 1.18, fontWeight: 950, color: c.text, textShadow: '0 4px 18px rgba(0,0,0,.82)'}}>
    {children}
    {keyword ? <div style={{display: 'inline', color: c.yellow}}> {keyword}</div> : null}
  </div>
);

const PhoneShell: React.FC<{children: React.ReactNode; accent?: string; rotate?: number; scale?: number}> = ({children, accent = c.line, rotate = 0, scale = 1}) => (
  <div style={{position: 'absolute', left: 86, right: 86, top: 190, bottom: 250, borderRadius: 48, border: `7px solid ${accent}`, backgroundColor: '#05070b', overflow: 'hidden', boxShadow: '0 35px 100px rgba(0,0,0,.55)', rotate: `${rotate}deg`, scale}}>
    <div style={{height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: '#0d1119', color: '#6d7890', fontFamily, fontSize: 18}}>
      <span>9:41</span><span>ToolRadar</span><span>5G</span>
    </div>
    {children}
  </div>
);

const UglyPage: React.FC<{compact?: boolean}> = ({compact = false}) => {
  const chips = compact ? ['AI设计', '视频', '模型'] : ['AI设计', '视频', '模型', '研究', 'Agent', '写作', '效率'];
  const cards = compact ? ['FlowCanvas', 'ModelBench', 'ClipForge'] : ['FlowCanvas', 'ModelBench', 'ClipForge', 'AgentKit', 'DocMind'];
  const colors = compact ? [c.blue, c.green, c.yellow] : ['#ff5d7d', '#6b7cff', '#00d5ff', '#ffb21d', '#9a65ff', '#33d68f', '#ff6e40'];
  return (
    <div style={{height: '100%', padding: compact ? 24 : 16, background: compact ? '#09101b' : 'linear-gradient(145deg,#38124d,#172d65 45%,#4b1d18)', fontFamily, color: c.text}}>
      <div style={{display: 'flex', gap: compact ? 12 : 6, flexWrap: 'wrap', marginBottom: compact ? 18 : 10}}>
        {chips.map((x, i) => <div key={x} style={{padding: compact ? '8px 14px' : '6px 9px', borderRadius: compact ? 999 : 8, backgroundColor: colors[i % colors.length], color: compact ? '#061019' : '#fff', fontSize: compact ? 20 : 17, fontWeight: 900}}>{x}</div>)}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: compact ? 14 : 8}}>
        {cards.map((name, i) => <div key={name} style={{borderRadius: compact ? 22 : 8, border: `1px solid ${compact ? c.line : colors[(i + 2) % colors.length]}`, backgroundColor: compact ? c.surface2 : 'rgba(255,255,255,.08)', padding: compact ? 18 : 11}}>
          <div style={{fontSize: compact ? 26 : 21, fontWeight: 950}}>{name}</div>
          <div style={{fontSize: compact ? 18 : 15, color: compact ? c.muted : '#fff9', marginTop: 5}}>AI 工具 · 热度 {86 - i * 7}</div>
          {!compact ? <div style={{display: 'flex', gap: 5, marginTop: 8}}>{['打开', '收藏', '对比'].map((b, j) => <div key={b} style={{flex: 1, padding: '6px 4px', textAlign: 'center', backgroundColor: colors[(i + j) % colors.length], borderRadius: 5, fontSize: 13, fontWeight: 800}}>{b}</div>)}</div> : null}
        </div>)}
      </div>
      <div style={{position: 'absolute', left: compact ? 24 : 16, right: compact ? 24 : 16, bottom: compact ? 24 : 16, display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1fr', gap: compact ? 10 : 7}}>
        {(compact ? ['查看今日趋势'] : ['立即体验', '快速开始', '现在收藏']).map((b, i) => <div key={b} style={{padding: compact ? '16px 12px' : '12px 6px', borderRadius: compact ? 18 : 7, backgroundColor: compact ? c.blue : colors[(i + 3) % colors.length], textAlign: 'center', color: compact ? '#061019' : '#fff', fontSize: compact ? 22 : 16, fontWeight: 950}}>{b}</div>)}
      </div>
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const shake = frame < 22 ? Math.sin(frame * 2.4) * 7 : 0;
  const zoom = interpolate(frame, [0, 34, 134], [1.18, 1.02, 1.06], {...clamp, easing: Easing.bezier(0.2, 0.8, 0.2, 1)});
  const stamp = interpolate(frame, [8, 19], [1.7, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return <AbsoluteFill style={{backgroundColor: c.bg, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, translate: `${shake}px 0px`, scale: zoom}}><PhoneShell accent={c.red}><UglyPage /></PhoneShell></div>
    <div style={{position: 'absolute', top: 115, left: 58, zIndex: 20, fontFamily, fontSize: 33, fontWeight: 950, color: c.red, letterSpacing: 2}}>页面急救现场</div>
    <div style={{position: 'absolute', top: 390, left: 170, right: 170, zIndex: 25, border: `8px solid ${c.red}`, color: c.red, fontFamily, fontSize: 94, lineHeight: 1, fontWeight: 1000, textAlign: 'center', padding: '28px 10px', rotate: '-8deg', scale: stamp, backgroundColor: 'rgba(8,10,15,.72)'}}>太 挤 了</div>
    <Caption>这个页面，丑到我自己都不想点。</Caption>
  </AbsoluteFill>;
};

const ProblemScene = () => {
  const frame = useCurrentFrame();
  const marks = [
    {t: 6, label: '按钮太多', top: 1230, left: 120},
    {t: 38, label: '颜色太多', top: 290, left: 650},
    {t: 76, label: '没有重点', top: 690, left: 110},
  ];
  return <AbsoluteFill style={{backgroundColor: c.bg}}>
    <PhoneShell><UglyPage /></PhoneShell>
    {marks.map((m) => {
      const s = interpolate(frame, [m.t, m.t + 10], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
      return <div key={m.label} style={{position: 'absolute', top: m.top, left: m.left, zIndex: 20, padding: '13px 18px', borderRadius: 999, backgroundColor: c.red, color: '#fff', fontFamily, fontSize: 28, fontWeight: 950, scale: s}}>{m.label}</div>;
    })}
    <div style={{position: 'absolute', top: 95, left: 60, right: 60, fontFamily, fontSize: 66, lineHeight: 1.02, fontWeight: 1000, color: c.text}}>所有东西都在<br/><span style={{color: c.red}}>抢注意力</span></div>
    <Caption>按钮太多，颜色太多，<span style={{color: c.red}}>没有重点。</span></Caption>
  </AbsoluteFill>;
};

const CutInfoScene = () => {
  const frame = useCurrentFrame();
  const cut = interpolate(frame, [20, 78], [0, 1], {...clamp, easing: Easing.bezier(0.2, 0.8, 0.2, 1)});
  const badScale = 1 - cut * 0.08;
  return <AbsoluteFill style={{backgroundColor: c.bg}}>
    <div style={{position: 'absolute', top: 90, left: 56, fontFamily, fontSize: 108, fontWeight: 1000, color: c.yellow}}>第一刀</div>
    <div style={{position: 'absolute', top: 200, left: 60, fontFamily, fontSize: 58, fontWeight: 950, color: c.text}}>砍信息</div>
    <div style={{opacity: 1 - cut, scale: badScale}}><PhoneShell accent={c.red}><UglyPage /></PhoneShell></div>
    <div style={{opacity: cut, scale: 0.92 + cut * 0.08}}><PhoneShell accent={c.green}><UglyPage compact /></PhoneShell></div>
    <Caption>首页只留搜索、趋势和三个推荐。</Caption>
  </AbsoluteFill>;
};

const CutColorScene = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [12, 82], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const rainbow = ['#ff5d7d','#6b7cff','#00d5ff','#ffb21d','#9a65ff','#33d68f','#ff6e40'];
  const clean = [c.bg, c.blue, c.green];
  return <AbsoluteFill style={{backgroundColor: c.bg, fontFamily}}>
    <div style={{position: 'absolute', top: 98, left: 58, fontSize: 100, fontWeight: 1000, color: c.yellow}}>第二刀</div>
    <div style={{position: 'absolute', top: 210, left: 60, fontSize: 58, fontWeight: 950}}>砍颜色</div>
    <div style={{position: 'absolute', left: 70, right: 70, top: 440, height: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24}}>
      <div style={{display: 'flex', gap: 12, opacity: 1 - p}}>{rainbow.map((x) => <div key={x} style={{flex: 1, height: 260, borderRadius: 28, backgroundColor: x}} />)}</div>
      <div style={{display: 'flex', gap: 24, opacity: p, translate: `0px ${70 - p * 70}px`}}>{clean.map((x, i) => <div key={x} style={{flex: 1, height: 310, borderRadius: 38, backgroundColor: x, border: `2px solid ${c.line}`, display: 'flex', alignItems: 'flex-end', padding: 20, color: i === 0 ? c.text : '#061019', fontSize: 25, fontWeight: 950}}>{['背景','强调','成功'][i]}</div>)}</div>
    </div>
    <Caption>背景、强调、成功。<span style={{color: c.yellow}}>就三套。</span></Caption>
  </AbsoluteFill>;
};

const OneCtaScene = () => {
  const frame = useCurrentFrame();
  const merge = interpolate(frame, [15, 80], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const buttons = ['打开', '收藏', '对比', '立即体验'];
  return <AbsoluteFill style={{backgroundColor: c.bg, fontFamily}}>
    <div style={{position: 'absolute', top: 98, left: 58, fontSize: 100, fontWeight: 1000, color: c.yellow}}>第三刀</div>
    <div style={{position: 'absolute', top: 210, left: 60, fontSize: 58, fontWeight: 950}}>只留一个主按钮</div>
    <div style={{position: 'absolute', left: 85, right: 85, top: 480, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, opacity: 1 - merge}}>{buttons.map((x, i) => <div key={x} style={{height: 150, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: ['#7b61ff','#ff6f61','#24c8db','#ffb020'][i], fontSize: 33, fontWeight: 950}}>{x}</div>)}</div>
    <div style={{position: 'absolute', left: 85, right: 85, top: 570, height: 180, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: c.blue, color: '#061019', fontSize: 48, fontWeight: 1000, opacity: merge, scale: 0.8 + merge * 0.2, boxShadow: '0 24px 70px rgba(85,166,255,.32)'}}>查看今日趋势</div>
    <Caption>用户不用猜：<span style={{color: c.blue}}>到底该点哪儿。</span></Caption>
  </AbsoluteFill>;
};

const RevealScene = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [18, 120], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const x = 70 + wipe * 940;
  return <AbsoluteFill style={{backgroundColor: c.bg, fontFamily}}>
    <div style={{position: 'absolute', top: 80, left: 55, right: 55, display: 'flex', justifyContent: 'space-between', fontSize: 38, fontWeight: 950}}><span style={{color: c.red}}>BEFORE</span><span style={{color: c.green}}>AFTER</span></div>
    <div style={{position: 'absolute', left: 70, right: 70, top: 190, bottom: 260, borderRadius: 44, overflow: 'hidden', border: `2px solid ${c.line}`}}>
      <AbsoluteFill><UglyPage /></AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${wipe * 100}%)`}}><UglyPage compact /></div>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: x - 70, width: 7, backgroundColor: '#fff', boxShadow: '0 0 30px rgba(255,255,255,.8)'}} />
      <div style={{position: 'absolute', top: '46%', left: x - 94, width: 48, height: 48, borderRadius: 999, backgroundColor: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 1000}}>›</div>
    </div>
    <Caption>左边像功能仓库。<span style={{color: c.green}}>右边才想继续逛。</span></Caption>
  </AbsoluteFill>;
};

const PayoffScene = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.018;
  const pop = interpolate(frame, [45, 70], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 35%, #17375a 0%, #080a0f 55%)', fontFamily, color: c.text}}>
    <div style={{position: 'absolute', left: 55, right: 55, top: 150, fontSize: 72, lineHeight: 1.06, fontWeight: 1000, textAlign: 'center'}}>AI 不是替你审美</div>
    <div style={{position: 'absolute', left: 55, right: 55, top: 330, fontSize: 80, lineHeight: 1.06, fontWeight: 1000, textAlign: 'center', color: c.yellow, scale: pulse}}>是让你更快试错</div>
    <div style={{position: 'absolute', left: 90, right: 90, top: 680, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, scale: pop}}>
      <div style={{height: 230, borderRadius: 38, border: `3px solid ${c.red}`, backgroundColor: 'rgba(255,96,109,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 78, fontWeight: 1000, color: c.red}}>左</div>
      <div style={{height: 230, borderRadius: 38, border: `3px solid ${c.green}`, backgroundColor: 'rgba(87,227,155,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 78, fontWeight: 1000, color: c.green}}>右</div>
    </div>
    <div style={{position: 'absolute', left: 55, right: 55, bottom: 140, textAlign: 'center', fontSize: 43, fontWeight: 900}}>你会选哪边？</div>
  </AbsoluteFill>;
};

const scenes = [HookScene, ProblemScene, CutInfoScene, CutColorScene, OneCtaScene, RevealScene, PayoffScene] as const;

export const ToolRadarSocialNativeRescueV1: React.FC = () => {
  return <AbsoluteFill style={{backgroundColor: c.bg}}>
    {slots.map((slot, index) => {
      const Scene = scenes[index];
      return <Sequence key={slot.from} from={slot.from} durationInFrames={slot.duration} layout="absolute-fill">
        <Scene />
        <Audio src={staticFile(slot.audio)} volume={0.98} />
      </Sequence>;
    })}
    <div style={{position: 'absolute', top: 34, right: 34, zIndex: 50, padding: '8px 13px', borderRadius: 999, backgroundColor: 'rgba(8,10,15,.72)', border: `1px solid ${c.line}`, color: c.muted, fontFamily, fontSize: 17, fontWeight: 800}}>ToolRadar · social-native prototype</div>
  </AbsoluteFill>;
};
