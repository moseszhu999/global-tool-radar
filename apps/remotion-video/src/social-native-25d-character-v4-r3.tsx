import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Audio} from '@remotion/media';

export const SOCIAL_NATIVE_25D_V4_R3_FPS = 30;
export const SOCIAL_NATIVE_25D_V4_R3_FRAMES = 576;
export const SOCIAL_NATIVE_25D_V4_R3_FIRST_PAYOFF_FRAME = 156;
export const SOCIAL_NATIVE_25D_V4_R3_FULL_REVEAL_FRAME = 312;
export const SOCIAL_NATIVE_25D_V4_R3_LOOP_START_FRAME = 528;

const C = {
  bg: '#08111d',
  bg2: '#13233a',
  text: '#f7fbff',
  muted: '#9fb1c7',
  blue: '#5badff',
  cyan: '#6feaff',
  green: '#68e7a5',
  yellow: '#ffd45f',
  red: '#ff6575',
  purple: '#a483ff',
  ink: '#071019',
};

const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing: ease});

const captions = [
  {from: 12, duration: 60, file: '01-hook.wav', text: '只删三样，看结果。'},
  {from: 72, duration: 84, file: '02-info.wav', text: '先删没用的信息。'},
  {from: 156, duration: 78, file: '03-color.wav', text: '七种颜色，收成三种。'},
  {from: 234, duration: 78, file: '04-cta.wav', text: '六个按钮，只留一个。'},
  {from: 312, duration: 102, file: '05-reveal.wav', text: '差的不是特效，是信息顺序。'},
  {from: 414, duration: 114, file: '06-takeaway.wav', text: '好设计，不是加，是敢删。'},
  {from: 528, duration: 48, file: '07-choice.wav', text: '你选左，还是右？'},
] as const;

const Caption: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      position: 'absolute',
      left: 54,
      right: 54,
      bottom: 68,
      zIndex: 300,
      textAlign: 'center',
      fontFamily,
      fontSize: 48,
      lineHeight: 1.12,
      fontWeight: 950,
      color: C.text,
      textShadow: '0 5px 26px rgba(0,0,0,.95)',
    }}
  >
    {children}
  </div>
);

const Studio: React.FC<{accent?: string; children: React.ReactNode}> = ({
  accent = C.blue,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        perspective: 1500,
        background: `radial-gradient(circle at 82% 14%, ${accent}2b, transparent 29%), linear-gradient(180deg, ${C.bg2}, ${C.bg} 70%)`,
        color: C.text,
        fontFamily,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 58,
          top: 116,
          width: 276,
          height: 108,
          borderRadius: 28,
          background: 'linear-gradient(145deg,#172840,#0d1726)',
          border: '1px solid #ffffff18',
          boxShadow: '0 20px 55px #0008',
        }}
      >
        <div style={{position: 'absolute', left: 22, top: 20, fontSize: 27, fontWeight: 1000}}>
          TOOLRADAR
        </div>
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 64,
            fontSize: 14,
            fontWeight: 900,
            color: accent,
            letterSpacing: 2,
          }}
        >
          DESIGN RESCUE LAB
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: -160,
          right: -160,
          bottom: -350,
          height: 850,
          transform: 'rotateX(68deg)',
          transformOrigin: '50% 100%',
          background: 'linear-gradient(180deg,#101a2a,#05080e)',
          borderTop: `2px solid ${accent}55`,
        }}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 45 + i * 208,
            bottom: 0,
            width: 2,
            height: 700,
            background: `linear-gradient(180deg,transparent,${accent}2d)`,
            transform: 'skewX(-12deg)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(108deg,transparent 20%,${accent}15 43%,transparent 61%)`,
          transform: `translateX(${Math.sin(frame / 38) * 115}px) skewX(-18deg)`,
          filter: 'blur(2px)',
        }}
      />
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 250,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 42%,transparent 58%,rgba(0,0,0,.42) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

type Pose = 'shock' | 'sweep' | 'pull' | 'press' | 'present';

const Host: React.FC<{pose: Pose; accent: string}> = ({pose, accent}) => {
  const frame = useCurrentFrame();
  const lean = pose === 'shock' ? -7 : pose === 'sweep' ? 12 : pose === 'pull' ? -9 : pose === 'press' ? 9 : 0;
  const armRight = pose === 'sweep' ? -78 : pose === 'pull' ? -18 : pose === 'press' ? -62 : -24;
  const armLeft = pose === 'pull' ? 72 : pose === 'shock' ? 54 : 16;
  const blink = frame % 83 > 77 ? 2 : 13;
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 820 + Math.sin(frame / 8) * 4,
        width: 270,
        height: 540,
        zIndex: 120,
        transform: `scale(1.12) rotate(${lean}deg)`,
        transformOrigin: '50% 91%',
        filter: 'drop-shadow(0 35px 28px #0008)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 62,
          top: 8,
          width: 144,
          height: 150,
          borderRadius: '48%',
          background: 'linear-gradient(135deg,#f5b792,#d98a66)',
          zIndex: 8,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -4,
            top: -14,
            width: 151,
            height: 72,
            borderRadius: '55% 55% 35% 32%',
            background: 'linear-gradient(160deg,#25304b,#192239)',
          }}
        />
        <div style={{position: 'absolute', left: 29, top: 70, width: 16, height: blink, borderRadius: 9, background: '#172137'}} />
        <div style={{position: 'absolute', right: 29, top: 70, width: 16, height: blink, borderRadius: 9, background: '#172137'}} />
        <div
          style={{
            position: 'absolute',
            left: 54,
            top: 112,
            width: 38,
            height: 9 + Math.abs(Math.sin(frame / 3)) * 8,
            borderRadius: 18,
            background: '#8f4e42',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 48,
          top: 152,
          width: 174,
          height: 226,
          borderRadius: '46px 46px 58px 58px',
          background: 'linear-gradient(150deg,#315dea,#213fa8)',
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 52,
            top: 36,
            width: 70,
            height: 74,
            borderRadius: 24,
            background: '#f2f5ff',
            color: '#142038',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 1000,
            fontSize: 24,
          }}
        >
          TR
        </div>
        <div
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            bottom: 20,
            height: 7,
            borderRadius: 6,
            background: accent,
            boxShadow: `0 0 18px ${accent}`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 182,
          width: 50,
          height: 204,
          borderRadius: 30,
          background: 'linear-gradient(#315dea,#223ea0)',
          transform: `rotate(${armLeft}deg)`,
          transformOrigin: '50% 10%',
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 180,
          width: 50,
          height: 214,
          borderRadius: 30,
          background: 'linear-gradient(#315dea,#223ea0)',
          transform: `rotate(${armRight}deg)`,
          transformOrigin: '50% 10%',
          zIndex: 10,
        }}
      />
      <div style={{position: 'absolute', left: 72, top: 360, width: 52, height: 150, borderRadius: 26, background: '#17243b'}} />
      <div style={{position: 'absolute', right: 72, top: 360, width: 52, height: 150, borderRadius: 26, background: '#17243b'}} />
    </div>
  );
};

const Page: React.FC<{clean?: boolean}> = ({clean = false}) => {
  const colors = clean
    ? [C.blue, C.green, C.yellow]
    : ['#ff5d7d', '#6b7cff', '#00d5ff', '#ffb21d', '#9a65ff', '#33d68f', '#ff6e40'];
  const tags = clean ? ['AI设计', '视频', '模型'] : ['AI设计', '视频', '模型', '研究', 'Agent', '写作', '效率'];
  const cards = clean ? ['FlowCanvas', 'ModelBench', 'ClipForge'] : ['FlowCanvas', 'ModelBench', 'ClipForge', 'AgentKit', 'DocMind'];
  const buttons = clean ? ['查看今日趋势'] : ['立即体验', '快速开始', '现在收藏'];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: 24,
        color: C.text,
        background: clean
          ? 'linear-gradient(155deg,#0b1320,#0d1a2c)'
          : 'linear-gradient(145deg,#35124c,#17305f 48%,#4d1d18)',
      }}
    >
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14}}>
        {tags.map((tag, i) => (
          <div
            key={tag}
            style={{
              padding: '7px 11px',
              borderRadius: clean ? 999 : 7,
              background: colors[i % colors.length],
              color: clean ? C.ink : 'white',
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            {tag}
          </div>
        ))}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: clean ? '1fr' : '1fr 1fr', gap: 10}}>
        {cards.map((name, i) => (
          <div
            key={name}
            style={{
              padding: 13,
              borderRadius: clean ? 18 : 8,
              border: `1px solid ${clean ? '#344866' : colors[(i + 2) % colors.length]}`,
              background: '#ffffff0d',
            }}
          >
            <div style={{fontSize: 20, fontWeight: 1000}}>{name}</div>
            <div style={{fontSize: 13, color: clean ? C.muted : '#ffffff99', marginTop: 4}}>
              热度 {86 - i * 7}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 24,
          display: 'grid',
          gridTemplateColumns: clean ? '1fr' : '1fr 1fr 1fr',
          gap: 8,
        }}
      >
        {buttons.map((button, i) => (
          <div
            key={button}
            style={{
              padding: '12px 8px',
              borderRadius: clean ? 15 : 6,
              textAlign: 'center',
              background: clean ? C.blue : colors[(i + 3) % colors.length],
              color: clean ? C.ink : 'white',
              fontSize: 15,
              fontWeight: 1000,
            }}
          >
            {button}
          </div>
        ))}
      </div>
    </div>
  );
};

const PageFrame: React.FC<{
  clean?: boolean;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotateY?: number;
}> = ({clean = false, left = 400, top = 285, width = 610, height = 850, rotateY = -7}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width,
      height,
      zIndex: 70,
      borderRadius: 34,
      overflow: 'hidden',
      border: `2px solid ${clean ? C.green : C.red}`,
      boxShadow: '0 38px 90px #0009',
      transform: `rotateY(${rotateY}deg) translateZ(70px)`,
      transformStyle: 'preserve-3d',
    }}
  >
    <Page clean={clean} />
  </div>
);

const AfterFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 11], [1.13, 1.02], clamp);
  return (
    <Studio accent={C.green}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`}}>
        <PageFrame clean left={174} top={300} width={732} height={1050} rotateY={0} />
      </div>
      <div style={{position: 'absolute', left: 54, top: 245, zIndex: 130, fontSize: 92, fontWeight: 1000, color: C.green}}>
        先看结果
      </div>
      <div style={{position: 'absolute', right: 80, top: 222, zIndex: 130, padding: '10px 18px', borderRadius: 999, background: C.green, color: C.ink, fontSize: 24, fontWeight: 1000}}>
        AFTER
      </div>
    </Studio>
  );
};

const Transform: React.FC = () => {
  const frame = useCurrentFrame();
  const phase: 'hook' | 'info' | 'color' | 'cta' =
    frame < 60 ? 'hook' : frame < 144 ? 'info' : frame < 222 ? 'color' : 'cta';
  const accent = phase === 'hook' ? C.red : phase === 'info' ? C.cyan : phase === 'color' ? C.yellow : C.blue;
  const pose: Pose = phase === 'hook' ? 'shock' : phase === 'info' ? 'sweep' : phase === 'color' ? 'pull' : 'press';
  const cards = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const palette = ['#ff5d7d', '#6b7cff', '#00d5ff', '#ffb21d', '#9a65ff', '#33d68f', '#ff6e40'];
  const ctas = ['打开', '收藏', '对比', '立即体验', '快速开始', '现在收藏'];
  const colorProgress = progress(frame, 144, 222);
  const ctaProgress = progress(frame, 222, 300);
  return (
    <Studio accent={accent}>
      <PageFrame />
      <Host pose={pose} accent={accent} />

      {phase === 'hook' ? (
        <>
          <div style={{position: 'absolute', left: 350, top: 500, zIndex: 135, fontSize: 78, lineHeight: 1.02, fontWeight: 1000}}>
            不是两个页面
            <br />
            <span style={{color: C.yellow}}>我只删三样</span>
          </div>
          <div style={{position: 'absolute', left: 650, top: 402, zIndex: 136, padding: '12px 20px', borderRadius: 999, background: C.red, fontSize: 25, fontWeight: 1000, transform: 'rotate(-6deg)'}}>
            先别划走
          </div>
        </>
      ) : null}

      {frame >= 60 && frame < 156 ? (
        <>
          {cards.map((i) => {
            const q = progress(frame, 62 + i * 5, 103 + i * 5);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 470 + (i % 3) * 150 + q * (i % 2 ? 390 : -390),
                  top: 395 + Math.floor(i / 3) * 160 - q * (100 + i * 17),
                  width: 128,
                  height: 84,
                  borderRadius: 18,
                  background: 'linear-gradient(145deg,#2d3850,#171e2c)',
                  border: `2px solid ${C.red}`,
                  zIndex: 145,
                  opacity: 1 - q,
                  transform: `rotate(${q * (i % 2 ? 36 : -34)}deg)`,
                  boxShadow: '0 20px 38px #0008',
                }}
              />
            );
          })}
          <div style={{position: 'absolute', left: 375, top: 390, zIndex: 150, fontSize: 78, fontWeight: 1000}}>
            <span style={{color: C.red}}>14</span> → <span style={{color: C.green}}>5</span>
          </div>
        </>
      ) : null}

      {frame >= 144 && frame < 234 ? (
        <>
          <div style={{position: 'absolute', left: 420, top: 330, width: 560, height: 560, zIndex: 146}}>
            {palette.map((color, i) => {
              const q = progress(frame, 147 + i * 4, 184 + i * 4);
              const targetX = i < 3 ? 40 + i * 155 : 250;
              const targetY = i < 3 ? 270 : 470;
              return (
                <div
                  key={color}
                  style={{
                    position: 'absolute',
                    left: (i % 4) * 125 + q * (targetX - (i % 4) * 125),
                    top: Math.floor(i / 4) * 140 + q * (targetY - Math.floor(i / 4) * 140),
                    width: 108,
                    height: 108,
                    borderRadius: 27,
                    background: color,
                    opacity: i < 3 ? 1 : 1 - q,
                    transform: `rotate(${(i - 3) * 7 * (1 - q)}deg) scale(${1 - q * 0.12})`,
                    boxShadow: `0 22px 45px ${color}35,0 16px 38px #0007`,
                  }}
                />
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 430, top: 415, zIndex: 152, fontSize: 76, fontWeight: 1000}}>
            <span style={{color: C.red}}>7 色</span> → <span style={{color: C.yellow}}>3 色</span>
          </div>
          <div style={{position: 'absolute', left: 330, top: 690, zIndex: 151, width: 180 + colorProgress * 250, height: 6, background: C.yellow, transform: 'rotate(8deg)', boxShadow: `0 0 20px ${C.yellow}`}} />
        </>
      ) : null}

      {frame >= 222 ? (
        <>
          <div style={{position: 'absolute', left: 420, top: 390, width: 560, zIndex: 146, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
            {ctas.map((label, i) => {
              const q = progress(frame, 225 + i * 4, 260 + i * 4);
              return (
                <div
                  key={label}
                  style={{
                    height: 112,
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: ['#7b61ff', '#ff6f61', '#24c8db', '#ffb020', '#33d68f', '#ff5d7d'][i],
                    fontSize: 26,
                    fontWeight: 1000,
                    opacity: 1 - q,
                    transform: `translate(${q * (i % 2 ? 180 : -180)}px,${q * (i < 3 ? -130 : 130)}px) rotate(${q * (i % 2 ? 18 : -18)}deg)`,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 500, right: 80, top: 570, height: 170, zIndex: 154, borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${C.blue},${C.cyan})`, color: C.ink, fontSize: 42, fontWeight: 1000, opacity: ctaProgress, transform: `scale(${0.72 + ctaProgress * 0.28})`, boxShadow: '0 36px 90px rgba(89,168,255,.38)'}}>
            查看今日趋势
          </div>
          <div style={{position: 'absolute', left: 430, top: 350, zIndex: 155, fontSize: 72, fontWeight: 1000}}>
            6 CTA → <span style={{color: C.blue}}>1</span>
          </div>
        </>
      ) : null}
    </Studio>
  );
};

const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const slider = interpolate(frame, [8, 52, 78, 101], [12, 88, 40, 72], {...clamp, easing: ease});
  return (
    <Studio accent={C.green}>
      <div style={{position: 'absolute', left: 58, top: 255, zIndex: 140, fontSize: 68, fontWeight: 1000}}>
        差的不是特效
      </div>
      <div style={{position: 'absolute', left: 58, top: 335, zIndex: 140, fontSize: 62, fontWeight: 1000, color: C.green}}>
        是信息顺序
      </div>
      <div style={{position: 'absolute', left: 130, top: 500, width: 820, height: 1040, zIndex: 90, borderRadius: 34, overflow: 'hidden', boxShadow: '0 40px 90px #0009'}}>
        <div style={{position: 'absolute', inset: 0}}><Page /></div>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - slider}% 0 0)`}}><Page clean /></div>
        <div style={{position: 'absolute', left: `calc(${slider}% - 3px)`, top: 0, bottom: 0, width: 6, background: 'white', boxShadow: '0 0 24px #fff', zIndex: 20}} />
      </div>
      <div style={{position: 'absolute', left: 145, top: 455, zIndex: 145, fontSize: 24, fontWeight: 1000, color: C.red}}>BEFORE</div>
      <div style={{position: 'absolute', right: 145, top: 455, zIndex: 145, fontSize: 24, fontWeight: 1000, color: C.green}}>AFTER</div>
    </Studio>
  );
};

const Takeaway: React.FC = () => {
  const frame = useCurrentFrame();
  const ghosts = ['多余卡片', '多余颜色', '多余按钮'];
  return (
    <Studio accent={C.yellow}>
      <PageFrame clean left={405} top={350} width={600} height={800} rotateY={-6} />
      <Host pose="present" accent={C.yellow} />
      <div style={{position: 'absolute', left: 55, right: 55, top: 255, zIndex: 150, textAlign: 'center', fontSize: 70, fontWeight: 1000}}>
        好设计，不是加
      </div>
      <div style={{position: 'absolute', left: 55, right: 55, top: 340, zIndex: 150, textAlign: 'center', fontSize: 80, fontWeight: 1000, color: C.yellow}}>
        是敢删
      </div>
      {ghosts.map((label, i) => {
        const q = progress(frame, 20 + i * 18, 50 + i * 18);
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: 450 + i * 35,
              top: 560 + i * 155,
              zIndex: 152,
              padding: '15px 22px',
              borderRadius: 20,
              background: '#ffffff12',
              border: `2px solid ${C.red}`,
              fontSize: 28,
              fontWeight: 1000,
              color: C.muted,
              opacity: 0.86 - q * 0.45,
              transform: `translateX(${q * 250}px) rotate(${q * 9}deg)`,
            }}
          >
            {label}
            <div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: 7, borderRadius: 8, background: C.red, transform: `scaleX(${q})`, transformOrigin: '0 50%'}} />
          </div>
        );
      })}
    </Studio>
  );
};

const Loop: React.FC = () => {
  const frame = useCurrentFrame();
  const snap = progress(frame, 30, 47);
  return (
    <Studio accent={C.purple}>
      <div style={{position: 'absolute', left: 55, right: 55, top: 275, zIndex: 150, textAlign: 'center', fontSize: 78, fontWeight: 1000}}>
        你选左，还是右？
      </div>
      <div style={{position: 'absolute', left: 110 - snap * 260, top: 520, width: 380, height: 650, zIndex: 100, opacity: 1 - snap, borderRadius: 32, overflow: 'hidden', border: `2px solid ${C.red}`}}>
        <Page />
      </div>
      <div style={{position: 'absolute', right: 110 - snap * 260, top: 500, width: 380, height: 670, zIndex: 100, opacity: 1 - snap, borderRadius: 32, overflow: 'hidden', border: `2px solid ${C.green}`}}>
        <Page clean />
      </div>
      {snap > 0.01 ? (
        <div style={{position: 'absolute', left: 390, top: 285, width: 620, height: 850, zIndex: 120, borderRadius: 34, overflow: 'hidden', border: `2px solid ${C.red}`, transform: `scale(${0.88 + snap * 0.12}) rotateY(-7deg)`, boxShadow: '0 38px 90px #0009'}}>
          <Page />
        </div>
      ) : null}
      <Host pose={snap > 0.4 ? 'shock' : 'present'} accent={C.red} />
    </Studio>
  );
};

const SoundBed: React.FC = () => (
  <>
    <Audio src={staticFile('assets/social-native-25d-v4-r3/bgm.wav')} volume={0.12} />
    {[0, 12, 72, 156, 234, 312, 414, 528].map((from, i) => (
      <Sequence key={`whoosh-${from}`} from={from} durationInFrames={18}>
        <Audio
          src={staticFile(i === 0 ? 'assets/social-native-25d-v4-r3/impact.wav' : 'assets/social-native-25d-v4-r3/whoosh.wav')}
          volume={i === 0 ? 0.45 : 0.2}
        />
      </Sequence>
    ))}
    {[105, 185, 268, 340, 467, 552].map((from) => (
      <Sequence key={`click-${from}`} from={from} durationInFrames={12}>
        <Audio src={staticFile('assets/social-native-25d-v4-r3/click.wav')} volume={0.28} />
      </Sequence>
    ))}
    {[154, 310, 412].map((from) => (
      <Sequence key={`sparkle-${from}`} from={from} durationInFrames={22}>
        <Audio src={staticFile('assets/social-native-25d-v4-r3/sparkle.wav')} volume={0.18} />
      </Sequence>
    ))}
  </>
);

export const ToolRadarSocialNative25DCharacterV4R3: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.bg, color: C.text, fontFamily}}>
    <Sequence from={0} durationInFrames={12}><AfterFlash /></Sequence>
    <Sequence from={12} durationInFrames={300} premountFor={20}><Transform /></Sequence>
    <Sequence from={312} durationInFrames={102} premountFor={20}><Reveal /></Sequence>
    <Sequence from={414} durationInFrames={114} premountFor={20}><Takeaway /></Sequence>
    <Sequence from={528} durationInFrames={48} premountFor={20}><Loop /></Sequence>
    {captions.map((item) => (
      <Sequence key={item.from} from={item.from} durationInFrames={item.duration}>
        <Audio src={staticFile(`assets/social-native-25d-v4-r3/${item.file}`)} volume={1} />
        <Caption>{item.text}</Caption>
      </Sequence>
    ))}
    <SoundBed />
  </AbsoluteFill>
);
