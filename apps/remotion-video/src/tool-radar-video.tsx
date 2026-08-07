import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {ToolRadarVideoProps} from './root';

const scenes = [
  {from: 0, duration: 424, kind: 'title', eyebrow: 'TOOLRADAR · 自有演示', title: '一句需求 → 一套界面', body: '不测第三方工具，直接展示一条可完全控制的 AI 设计工作流'},
  {from: 424, duration: 463, kind: 'brief', eyebrow: '01 · 定义任务', title: '先把需求写清楚', body: '工具雷达首页 · 搜索 · 分类 · 趋势 · 收藏'},
  {from: 887, duration: 451, kind: 'wireframe', eyebrow: '02 · 生成结构', title: '先结构，再装饰', body: '导航、搜索、筛选和内容卡片先建立信息层级'},
  {from: 1338, duration: 411, kind: 'tokens', eyebrow: '03 · 建立视觉系统', title: '颜色、字号、间距统一', body: '设计 token 让后续修改不靠逐个像素修补'},
  {from: 1749, duration: 367, kind: 'phone', eyebrow: '04 · 移动适配', title: '同一结构自动收敛到 390px', body: '信息优先级不变，布局改成单列和底部操作'},
  {from: 2116, duration: 508, kind: 'iterate', eyebrow: '05 · 快速迭代', title: '改一句要求，全局一起变', body: '强调趋势、降低卡片密度、把主要操作变得更清楚'},
  {from: 2624, duration: 455, kind: 'verdict', eyebrow: '结论', title: 'AI 加速的是探索，不是免审上线', body: '从需求到可视原型可以更快；生产交付仍然要经过工程和人工质检'},
] as const;

const palette = {
  bg: '#07111f',
  panel: '#0d1b2a',
  panel2: '#10243a',
  border: '#29435e',
  primary: '#eef6ff',
  secondary: '#9fb2c7',
  accent: '#78b7ff',
  success: '#74e0ad',
  warning: '#ffd27a',
};

const Shell: React.FC<{children: React.ReactNode; eyebrow: string; title: string; body: string}> = ({children, eyebrow, title, body}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = interpolate(frame, [0, 0.7 * fps], [44, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return (
    <AbsoluteFill style={{backgroundColor: palette.bg, color: palette.primary, fontFamily: 'Arial, Microsoft YaHei, sans-serif'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 12%, rgba(120,183,255,.20), transparent 34%), radial-gradient(circle at 12% 86%, rgba(116,224,173,.12), transparent 30%)'}} />
      <div style={{position: 'absolute', left: 64, right: 64, top: 86, bottom: 110, display: 'flex', flexDirection: 'column', gap: 28, transform: `translateY(${rise}px)`}}>
        <div style={{fontSize: 25, letterSpacing: 5, color: palette.accent, fontWeight: 800}}>{eyebrow}</div>
        <div style={{fontSize: 70, lineHeight: 1.08, fontWeight: 900}}>{title}</div>
        <div style={{fontSize: 31, color: palette.secondary, lineHeight: 1.5}}>{body}</div>
        <div style={{flex: 1, minHeight: 0}}>{children}</div>
      </div>
      <div style={{position: 'absolute', left: 64, right: 64, bottom: 34, display: 'flex', justifyContent: 'space-between', color: palette.secondary, fontSize: 20}}>
        <span>ToolRadar</span><span>自有代码生成画面 · 无第三方演示素材</span>
      </div>
    </AbsoluteFill>
  );
};

const SearchBar = () => <div style={{height: 72, borderRadius: 24, border: `2px solid ${palette.border}`, backgroundColor: '#081827', display: 'flex', alignItems: 'center', padding: '0 28px', color: palette.secondary, fontSize: 27}}>搜索 AI 工具、工作流或能力…</div>;

const ToolCard: React.FC<{name: string; tag: string; score: string}> = ({name, tag, score}) => (
  <div style={{borderRadius: 26, border: `1px solid ${palette.border}`, backgroundColor: palette.panel2, padding: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 14}}>
    <div><div style={{fontSize: 30, fontWeight: 800}}>{name}</div><div style={{fontSize: 21, color: palette.secondary, marginTop: 8}}>{tag}</div></div>
    <div style={{fontSize: 24, color: palette.success, fontWeight: 800}}>{score}</div>
  </div>
);

const BriefPanel = () => (
  <div style={{height: '100%', borderRadius: 38, border: `2px solid ${palette.border}`, backgroundColor: palette.panel, padding: 34, display: 'flex', flexDirection: 'column', gap: 24}}>
    <div style={{fontSize: 22, color: palette.accent, fontWeight: 800}}>DESIGN BRIEF</div>
    <div style={{fontSize: 42, fontWeight: 900}}>做一个“工具雷达”首页</div>
    {['首页先看到趋势与推荐', '支持关键词搜索和分类筛选', '每张卡片显示用途、热度和收藏入口', '桌面与手机保持同一信息优先级'].map((x, i) => (
      <div key={x} style={{display: 'flex', gap: 18, alignItems: 'flex-start', fontSize: 27, lineHeight: 1.45, color: palette.secondary}}><span style={{color: palette.success, fontWeight: 900}}>{String(i + 1).padStart(2, '0')}</span><span>{x}</span></div>
    ))}
  </div>
);

const WireframePanel = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 85], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{height: '100%', borderRadius: 38, border: `2px solid ${palette.border}`, backgroundColor: palette.panel, padding: 28, opacity: 0.65 + progress * 0.35}}>
      <div style={{display: 'grid', gridTemplateColumns: '180px 1fr', gap: 22, height: '100%'}}>
        <div style={{borderRadius: 24, backgroundColor: '#081827', padding: 20, display: 'flex', flexDirection: 'column', gap: 14}}>{['趋势', 'AI 设计', '编程', '视频', '研究'].map((x, i) => <div key={x} style={{height: 48, borderRadius: 16, backgroundColor: i === 0 ? 'rgba(120,183,255,.22)' : palette.panel2, color: i === 0 ? palette.accent : palette.secondary, display: 'flex', alignItems: 'center', paddingLeft: 16, fontSize: 21}}>{x}</div>)}</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}><SearchBar /><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}><ToolCard name="FlowCanvas" tag="界面原型" score="↑ 82"/><ToolCard name="ModelBench" tag="模型评估" score="↑ 74"/><ToolCard name="ClipForge" tag="视频生成" score="↑ 69"/><ToolCard name="AgentKit" tag="工作流" score="↑ 65"/></div></div>
      </div>
    </div>
  );
};

const TokensPanel = () => (
  <div style={{height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>
    <div style={{borderRadius: 34, backgroundColor: palette.panel, border: `2px solid ${palette.border}`, padding: 30}}><div style={{fontSize: 24, color: palette.secondary, marginBottom: 24}}>颜色</div>{[['背景', palette.bg], ['面板', palette.panel2], ['强调', palette.accent], ['成功', palette.success]].map(([label, color]) => <div key={label} style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22}}><div style={{width: 58, height: 58, borderRadius: 18, backgroundColor: color, border: `1px solid ${palette.border}`}}/><div style={{fontSize: 27, fontWeight: 700}}>{label}</div></div>)}</div>
    <div style={{borderRadius: 34, backgroundColor: palette.panel, border: `2px solid ${palette.border}`, padding: 30}}><div style={{fontSize: 24, color: palette.secondary, marginBottom: 24}}>排版与间距</div><div style={{fontSize: 48, fontWeight: 900, marginBottom: 22}}>标题 48 / 900</div><div style={{fontSize: 31, fontWeight: 700, marginBottom: 22}}>卡片标题 31 / 700</div><div style={{fontSize: 24, color: palette.secondary, marginBottom: 38}}>正文 24 / 1.5</div><div style={{display: 'flex', gap: 14}}>{[8, 16, 24, 32].map((x) => <div key={x} style={{flex: 1, height: x * 2.1, borderRadius: 12, backgroundColor: 'rgba(120,183,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.accent, fontWeight: 800}}>{x}</div>)}</div></div>
  </div>
);

const PhonePanel = () => (
  <div style={{height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}><div style={{width: 420, height: 720, borderRadius: 58, border: `8px solid ${palette.border}`, backgroundColor: '#081827', padding: 22, boxShadow: '0 25px 80px rgba(0,0,0,.35)'}}><div style={{width: 120, height: 18, backgroundColor: palette.border, borderRadius: 999, margin: '0 auto 24px'}}/><SearchBar /><div style={{height: 18}}/>{['FlowCanvas', 'ModelBench', 'ClipForge'].map((name, i) => <div key={name} style={{marginBottom: 14}}><ToolCard name={name} tag={['界面原型', '模型评估', '视频生成'][i]} score={`↑ ${82 - i * 8}`}/></div>)}<div style={{position: 'relative', marginTop: 20, height: 64, borderRadius: 22, backgroundColor: palette.accent, color: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 900}}>收藏当前筛选</div></div></div>
);

const IteratePanel = () => {
  const frame = useCurrentFrame();
  const changed = frame > 95;
  return (
    <div style={{height: '100%', display: 'grid', gridTemplateColumns: '310px 1fr', gap: 22}}>
      <div style={{borderRadius: 34, backgroundColor: palette.panel, border: `2px solid ${palette.border}`, padding: 28}}><div style={{fontSize: 22, color: palette.accent, fontWeight: 800, marginBottom: 22}}>ITERATION REQUEST</div><div style={{fontSize: 30, lineHeight: 1.5, fontWeight: 800}}>“趋势更突出，卡片少一点，把主要操作放得更明显。”</div></div>
      <div style={{borderRadius: 34, backgroundColor: palette.panel, border: `2px solid ${changed ? palette.success : palette.border}`, padding: 26, transition: 'none'}}><div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}><div style={{fontSize: 30, fontWeight: 900}}>趋势榜</div><div style={{padding: '8px 15px', borderRadius: 999, backgroundColor: changed ? 'rgba(116,224,173,.15)' : palette.panel2, color: changed ? palette.success : palette.secondary, fontSize: 20}}>{changed ? '已应用修改' : '初稿'}</div></div><div style={{display: 'flex', flexDirection: 'column', gap: changed ? 18 : 10}}>{(changed ? ['FlowCanvas', 'ModelBench', 'AgentKit'] : ['FlowCanvas', 'ModelBench', 'ClipForge', 'AgentKit', 'DocMind']).map((name, i) => <ToolCard key={name} name={name} tag="AI 工具" score={`↑ ${86 - i * 7}`}/>)}</div></div>
    </div>
  );
};

const VerdictPanel = () => (
  <div style={{height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}><div style={{borderRadius: 34, border: `2px solid ${palette.success}`, backgroundColor: 'rgba(116,224,173,.09)', padding: 34}}><div style={{fontSize: 24, color: palette.success, fontWeight: 900, marginBottom: 24}}>AI 很适合</div>{['快速结构探索', '设计语言统一', '响应式草图', '低成本迭代'].map((x) => <div key={x} style={{fontSize: 29, marginBottom: 20}}>✓ {x}</div>)}</div><div style={{borderRadius: 34, border: `2px solid ${palette.warning}`, backgroundColor: 'rgba(255,210,122,.08)', padding: 34}}><div style={{fontSize: 24, color: palette.warning, fontWeight: 900, marginBottom: 24}}>仍然需要人</div>{['事实与需求确认', '工程实现检查', '可访问性与性能', '最终成片质检'].map((x) => <div key={x} style={{fontSize: 29, marginBottom: 20}}>→ {x}</div>)}</div></div>
);

const Scene: React.FC<{scene: (typeof scenes)[number]}> = ({scene}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14, scene.duration - 14, scene.duration], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const panel = scene.kind === 'brief' ? <BriefPanel /> : scene.kind === 'wireframe' ? <WireframePanel /> : scene.kind === 'tokens' ? <TokensPanel /> : scene.kind === 'phone' ? <PhonePanel /> : scene.kind === 'iterate' ? <IteratePanel /> : scene.kind === 'verdict' ? <VerdictPanel /> : <div style={{height: '100%', borderRadius: 46, border: `2px solid ${palette.border}`, backgroundColor: palette.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 55}}><div><div style={{fontSize: 34, color: palette.accent, letterSpacing: 5, fontWeight: 800, marginBottom: 30}}>SELF-OWNED AI DESIGN DEMO</div><div style={{fontSize: 82, lineHeight: 1.08, fontWeight: 900}}>需求 → 结构 → 视觉 → 响应式 → 迭代</div></div></div>;
  return <div style={{position: 'absolute', inset: 0, opacity}}><Shell eyebrow={scene.eyebrow} title={scene.title} body={scene.body}>{panel}</Shell></div>;
};

export const ToolRadarVideo: React.FC<ToolRadarVideoProps> = (props) => (
  <AbsoluteFill style={{backgroundColor: palette.bg}}>
    {scenes.map((scene) => <Sequence key={scene.from} from={scene.from} durationInFrames={scene.duration} layout="absolute-fill"><Scene scene={scene} /></Sequence>)}
    {props.voiceoverReady ? <Audio src={staticFile(props.voiceover)} /> : null}
    {!props.voiceoverReady ? <div style={{position: 'absolute', top: 28, right: 28, zIndex: 20, borderRadius: 999, padding: '10px 16px', backgroundColor: 'rgba(255,210,122,.16)', border: `1px solid ${palette.warning}`, color: palette.warning, fontFamily: 'Arial, Microsoft YaHei, sans-serif', fontSize: 20, fontWeight: 700}}>配音待生成 · 当前为视觉预览</div> : null}
  </AbsoluteFill>
);
