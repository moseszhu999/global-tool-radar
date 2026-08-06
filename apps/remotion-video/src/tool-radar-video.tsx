import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio, Video} from '@remotion/media';
import type {ToolRadarVideoProps} from './root';

const scenes = [
  {from: 0, duration: 300, kind: 'title', eyebrow: 'TOOLRADAR · 独立实测', title: 'Replit Design', body: '3分钟出设计，能直接上线吗？'},
  {from: 300, duration: 420, kind: 'data', eyebrow: '为什么现在测', title: '6.455小时 +1500播放', body: '关注增长 ≠ 产品普及'},
  {from: 720, duration: 240, kind: 'recording', eyebrow: '测试方法', title: '固定任务 · 隔离环境', body: '无真实账号 · 无生产数据 · 无支付'},
  {from: 960, duration: 300, kind: 'recording', eyebrow: '已验证结果', title: '约3分钟', body: '桌面 + 390px 移动设计稿'},
  {from: 1260, duration: 690, kind: 'build-limit', eyebrow: '关键限制', title: 'Build：无可预览成品', body: '生产交付未证明'},
  {from: 1950, duration: 540, kind: 'verdict', eyebrow: '结论', title: '适合：设计探索', body: '不应：直接当上线代码'},
  {from: 2490, duration: 180, kind: 'end', eyebrow: '下一步', title: '修改 · 导出 · 交付', body: '你想看它和谁对比？'},
] as const;

const palette = {
  bg: '#07111f',
  panel: '#0d1b2a',
  border: '#29435e',
  primary: '#eef6ff',
  secondary: '#9fb2c7',
  accent: '#78b7ff',
  success: '#74e0ad',
  warning: '#ffd27a',
  danger: '#ff9a9a',
};

const RecordingPanel: React.FC<{src: string; verified: boolean; label: string}> = ({src, verified, label}) => {
  if (verified) {
    return (
      <div style={{position: 'absolute', inset: 90, borderRadius: 42, overflow: 'hidden', border: `2px solid ${palette.border}`, backgroundColor: '#000'}}>
        <Video src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <div style={{position: 'absolute', top: 24, left: 24, padding: '10px 18px', borderRadius: 999, backgroundColor: 'rgba(7,17,31,.84)', color: palette.success, fontSize: 28, fontWeight: 700}}>
          已核验自有录屏 · {label}
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'absolute', inset: 90, borderRadius: 42, border: `3px dashed ${palette.warning}`, backgroundColor: palette.panel, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center'}}>
      <div style={{fontSize: 42, fontWeight: 800, color: palette.warning, marginBottom: 24}}>真实录屏待替换</div>
      <div style={{fontSize: 30, color: palette.secondary, lineHeight: 1.5}}>{label}<br />不会用占位画面冒充真实测试</div>
    </div>
  );
};

const Scene: React.FC<{scene: (typeof scenes)[number]; props: ToolRadarVideoProps}> = ({scene, props}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [0, 0.45 * fps, scene.duration - 0.45 * fps, scene.duration], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const rise = interpolate(frame, [0, 0.7 * fps], [48, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const isRecording = scene.kind === 'recording' || scene.kind === 'build-limit';
  const recording = scene.kind === 'build-limit'
    ? {src: props.buildLimitRecording, verified: props.buildLimitRecordingVerified, label: 'Build 阶段无预览状态'}
    : {src: props.designRecording, verified: props.designRecordingVerified, label: '设计生成、390px 视图与一次可视化修改'};

  return (
    <AbsoluteFill style={{backgroundColor: palette.bg, color: palette.primary, fontFamily: 'Arial, Microsoft YaHei, sans-serif', opacity}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 12%, rgba(120,183,255,.22), transparent 34%), radial-gradient(circle at 12% 86%, rgba(116,224,173,.13), transparent 30%)'}} />
      {isRecording ? <RecordingPanel {...recording} /> : (
        <div style={{position: 'absolute', left: 76, right: 76, top: 180, bottom: 180, borderRadius: 52, backgroundColor: palette.panel, border: `2px solid ${palette.border}`, padding: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', translate: `0 ${rise}px`}}>
          <div style={{fontSize: 28, letterSpacing: 5, color: palette.accent, fontWeight: 800, marginBottom: 34}}>{scene.eyebrow}</div>
          <div style={{fontSize: scene.kind === 'title' ? 104 : 82, lineHeight: 1.08, fontWeight: 900, marginBottom: 36}}>{scene.title}</div>
          <div style={{fontSize: 42, lineHeight: 1.45, color: scene.kind === 'build-limit' ? palette.danger : palette.secondary, whiteSpace: 'pre-line'}}>{scene.body}</div>
        </div>
      )}
      {isRecording && (
        <div style={{position: 'absolute', left: 76, right: 76, bottom: 90, borderRadius: 32, backgroundColor: 'rgba(7,17,31,.92)', border: `1px solid ${palette.border}`, padding: '28px 34px'}}>
          <div style={{fontSize: 25, color: palette.accent, fontWeight: 800, marginBottom: 10}}>{scene.eyebrow}</div>
          <div style={{fontSize: 42, fontWeight: 900}}>{scene.title}</div>
          <div style={{fontSize: 28, color: scene.kind === 'build-limit' ? palette.danger : palette.secondary, marginTop: 8}}>{scene.body}</div>
        </div>
      )}
      <div style={{position: 'absolute', left: 76, right: 76, bottom: 30, display: 'flex', justifyContent: 'space-between', color: palette.secondary, fontSize: 20}}>
        <span>ToolRadar</span><span>独立测试 · 不使用第三方演示素材</span>
      </div>
    </AbsoluteFill>
  );
};

export const ToolRadarVideo: React.FC<ToolRadarVideoProps> = (props) => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.bg}}>
      {scenes.map((scene) => (
        <Sequence key={scene.from} from={scene.from} durationInFrames={scene.duration} layout="absolute-fill">
          <Scene scene={scene} props={props} />
        </Sequence>
      ))}
      {props.voiceoverVerified ? <Audio src={staticFile(props.voiceover)} /> : null}
      {!props.voiceoverVerified ? (
        <div style={{position: 'absolute', top: 28, right: 28, zIndex: 20, borderRadius: 999, padding: '10px 16px', backgroundColor: 'rgba(255,210,122,.16)', border: `1px solid ${palette.warning}`, color: palette.warning, fontFamily: 'Arial, Microsoft YaHei, sans-serif', fontSize: 20, fontWeight: 700}}>
          配音待核验 · 当前仅可作为静音预览
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
