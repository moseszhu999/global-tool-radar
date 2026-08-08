import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';

export const SOCIAL_NATIVE_25D_FPS = 30;
export const SOCIAL_NATIVE_25D_FRAMES = 900;

const slots = [
  {from: 0, duration: 118, audio: 'assets/social-native-25d-v2/01-hook.wav'},
  {from: 118, duration: 132, audio: 'assets/social-native-25d-v2/02-problem.wav'},
  {from: 250, duration: 138, audio: 'assets/social-native-25d-v2/03-cut-info.wav'},
  {from: 388, duration: 139, audio: 'assets/social-native-25d-v2/04-cut-color.wav'},
  {from: 527, duration: 118, audio: 'assets/social-native-25d-v2/05-one-cta.wav'},
  {from: 645, duration: 123, audio: 'assets/social-native-25d-v2/06-reveal.wav'},
  {from: 768, duration: 132, audio: 'assets/social-native-25d-v2/07-payoff.wav'},
] as const;

const c = {
  bg: '#07090e',
  wall: '#111829',
  wall2: '#18233a',
  floor: '#0b0f18',
  line: '#31405b',
  text: '#f5f8ff',
  muted: '#9da9bd',
  blue: '#59a8ff',
  cyan: '#68e5ff',
  green: '#66e3a3',
  yellow: '#ffd45f',
  red: '#ff6674',
  purple: '#9b7cff',
  skin: '#f4b58f',
  skin2: '#df8f6a',
  hair: '#182033',
  shirt: '#466cff',
};

const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const p = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], {...clamp, easing: ease});

const Caption: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 54, right: 54, bottom: 78, zIndex: 90, textAlign: 'center', fontFamily, fontSize: 48, lineHeight: 1.17, fontWeight: 950, color: c.text, textShadow: '0 5px 24px rgba(0,0,0,.95)'}}>
    {children}
  </div>
);

const Badge: React.FC<{children: React.ReactNode; color?: string; top?: number; left?: number; rotate?: number; scale?: number}> = ({children, color = c.yellow, top = 80, left = 58, rotate = -2, scale = 1}) => (
  <div style={{position: 'absolute', top, left, zIndex: 70, padding: '10px 18px', borderRadius: 999, backgroundColor: color, color: '#071019', fontFamily, fontSize: 24, fontWeight: 1000, letterSpacing: 1, transform: `rotate(${rotate}deg) scale(${scale})`, boxShadow: '0 14px 40px rgba(0,0,0,.28)'}}>{children}</div>
);

const Stage: React.FC<{cameraX?: number; cameraY?: number; cameraScale?: number; children: React.ReactNode}> = ({cameraX = 0, cameraY = 0, cameraScale = 1, children}) => (
  <AbsoluteFill style={{background: `radial-gradient(circle at 78% 18%, rgba(89,168,255,.18), transparent 28%), linear-gradient(180deg, ${c.wall2}, ${c.wall} 55%, ${c.floor})`, overflow: 'hidden', perspective: 1300}}>
    <div style={{position: 'absolute', left: -160, right: -160, bottom: -330, height: 880, background: 'linear-gradient(180deg,#111827,#080b12)', transform: 'rotateX(69deg)', transformOrigin: '50% 100%', borderTop: `2px solid ${c.line}`}} />
    {[0,1,2,3,4].map((i) => <div key={i} style={{position: 'absolute', left: 100 + i * 220, bottom: 0, width: 2, height: 760, background: 'linear-gradient(180deg,rgba(89,168,255,0),rgba(89,168,255,.13))', transform: 'skewX(-12deg)', opacity: .7}} />)}
    <div style={{position: 'absolute', inset: 0, transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`, transformOrigin: '50% 50%', transformStyle: 'preserve-3d'}}>{children}</div>
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(0,0,0,.06),transparent 50%,rgba(0,0,0,.32))'}} />
  </AbsoluteFill>
);

const Character: React.FC<{x?: number; y?: number; scale?: number; pose?: 'shock'|'push'|'slice'|'paint'|'press'|'present'; facing?: 1|-1}> = ({x = 120, y = 760, scale = 1, pose = 'present', facing = 1}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 8) * 4;
  const shock = pose === 'shock' ? Math.sin(frame * 1.4) * 4 : 0;
  const arm = pose === 'push' ? -58 : pose === 'slice' ? -72 : pose === 'paint' ? -35 : pose === 'press' ? -48 : pose === 'present' ? -20 : -5;
  const arm2 = pose === 'shock' ? 55 : pose === 'present' ? 28 : 12;
  const lean = pose === 'shock' ? -8 : pose === 'push' ? 8 : pose === 'slice' ? 10 : 0;
  const eyeY = pose === 'shock' ? 0 : 2;
  return <div style={{position: 'absolute', left: x, top: y + bob, width: 250, height: 520, transform: `scale(${scale * facing},${scale}) rotate(${lean + shock}deg)`, transformOrigin: '50% 90%', zIndex: 55, filter: 'drop-shadow(0 30px 24px rgba(0,0,0,.36))'}}>
    <div style={{position: 'absolute', left: 60, top: 10, width: 130, height: 142, borderRadius: '48% 48% 46% 46%', background: `linear-gradient(135deg,${c.skin},${c.skin2})`, boxShadow: 'inset -14px -10px 18px rgba(110,45,28,.12)', zIndex: 5}}>
      <div style={{position: 'absolute', left: -2, top: -12, width: 136, height: 62, borderRadius: '54% 54% 34% 30%', background: c.hair, transform: 'rotate(-5deg)'}} />
      <div style={{position: 'absolute', left: 30, top: 66 + eyeY, width: 12, height: pose === 'shock' ? 18 : 12, borderRadius: 10, background: '#152035'}} />
      <div style={{position: 'absolute', right: 30, top: 66 + eyeY, width: 12, height: pose === 'shock' ? 18 : 12, borderRadius: 10, background: '#152035'}} />
      <div style={{position: 'absolute', left: 55, top: 103, width: 28, height: pose === 'shock' ? 22 : 8, borderRadius: 20, border: pose === 'shock' ? '5px solid #8f4e42' : 'none', background: pose === 'shock' ? 'rgba(255,255,255,.38)' : '#8f4e42'}} />
    </div>
    <div style={{position: 'absolute', left: 48, top: 142, width: 154, height: 220, borderRadius: '44px 44px 54px 54px', background: `linear-gradient(145deg,${c.shirt},#2848d1)`, boxShadow: 'inset -18px -12px 30px rgba(5,18,70,.28)', zIndex: 3}}>
      <div style={{position: 'absolute', left: 40, top: 34, color: '#fff', fontFamily, fontSize: 23, fontWeight: 1000}}>TR</div>
    </div>
    <div style={{position: 'absolute', left: 23, top: 170, width: 48, height: 190, borderRadius: 30, background: `linear-gradient(${c.skin},${c.skin2})`, transform: `rotate(${arm2}deg)`, transformOrigin: '50% 12%', zIndex: 2}}>
      <div style={{position: 'absolute', left: -4, bottom: -22, width: 58, height: 58, borderRadius: '50%', background: c.skin}} />
    </div>
    <div style={{position: 'absolute', right: 20, top: 168, width: 48, height: 205, borderRadius: 30, background: `linear-gradient(${c.skin},${c.skin2})`, transform: `rotate(${arm}deg)`, transformOrigin: '50% 12%', zIndex: 6}}>
      <div style={{position: 'absolute', left: -5, bottom: -24, width: 60, height: 60, borderRadius: '50%', background: c.skin}} />
    </div>
    <div style={{position: 'absolute', left: 70, top: 345, width: 46, height: 148, borderRadius: 24, background: '#1b2740', transform: 'rotate(4deg)'}} />
    <div style={{position: 'absolute', right: 70, top: 345, width: 46, height: 148, borderRadius: 24, background: '#1b2740', transform: 'rotate(-4deg)'}} />
    <div style={{position: 'absolute', left: 54, top: 475, width: 78, height: 28, borderRadius: 20, background: '#0c111b'}} />
    <div style={{position: 'absolute', right: 54, top: 475, width: 78, height: 28, borderRadius: 20, background: '#0c111b'}} />
  </div>;
};

const FloatingPanel: React.FC<{x:number;y:number;width:number;height:number;rotateY?:number;rotateZ?:number;z?:number;children:React.ReactNode;border?:string;opacity?:number;scale?:number}> = ({x,y,width,height,rotateY=0,rotateZ=0,z=0,children,border=c.line,opacity=1,scale=1}) => (
  <div style={{position:'absolute',left:x,top:y,width,height,borderRadius:34,border:`2px solid ${border}`,background:'linear-gradient(145deg,rgba(20,29,47,.98),rgba(8,13,23,.98))',boxShadow:'0 34px 70px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.06)',overflow:'hidden',transform:`translateZ(${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,transformStyle:'preserve-3d',opacity,zIndex:36}}>{children}</div>
);

const MiniToolPage: React.FC<{clean?: boolean}> = ({clean=false}) => {
  const colors = clean ? [c.blue,c.green,c.yellow] : ['#ff5d7d','#6b7cff','#00d5ff','#ffb21d','#9a65ff','#33d68f','#ff6e40'];
  const cards = clean ? ['FlowCanvas','ModelBench','ClipForge'] : ['FlowCanvas','ModelBench','ClipForge','AgentKit','DocMind'];
  return <div style={{height:'100%',padding:22,fontFamily,color:c.text,background:clean?'linear-gradient(155deg,#0b1320,#0d1a2c)':'linear-gradient(145deg,#35124c,#17305f 48%,#4d1d18)'}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(clean?['AI设计','视频','模型']:['AI设计','视频','模型','研究','Agent','写作','效率']).map((t,i)=><div key={t} style={{padding:'7px 11px',borderRadius:clean?999:7,background:colors[i%colors.length],color:clean?'#071019':'white',fontSize:14,fontWeight:900}}>{t}</div>)}</div>
    <div style={{display:'grid',gridTemplateColumns:clean?'1fr':'1fr 1fr',gap:9,marginTop:14}}>{cards.map((name,i)=><div key={name} style={{padding:12,borderRadius:clean?18:8,border:`1px solid ${clean?c.line:colors[(i+2)%colors.length]}`,background:'rgba(255,255,255,.06)'}}><div style={{fontSize:19,fontWeight:1000}}>{name}</div><div style={{fontSize:13,color:clean?c.muted:'#fff9',marginTop:4}}>热度 {86-i*7}</div>{!clean?<div style={{display:'flex',gap:4,marginTop:7}}>{['打开','收藏','对比'].map((b,j)=><div key={b} style={{flex:1,padding:'5px 2px',textAlign:'center',borderRadius:4,background:colors[(i+j)%colors.length],fontSize:11,fontWeight:800}}>{b}</div>)}</div>:null}</div>)}</div>
    <div style={{position:'absolute',left:22,right:22,bottom:22,display:'grid',gridTemplateColumns:clean?'1fr':'1fr 1fr 1fr',gap:7}}>{(clean?['查看今日趋势']:['立即体验','快速开始','现在收藏']).map((b,i)=><div key={b} style={{padding:'11px 7px',borderRadius:clean?15:6,textAlign:'center',background:clean?c.blue:colors[(i+3)%colors.length],color:clean?'#071019':'white',fontSize:14,fontWeight:1000}}>{b}</div>)}</div>
  </div>;
};

const TransitionSfx = () => <>
  {[0,118,250,388,527,645,768].map((from,i)=><Sequence key={from} from={from} durationInFrames={18}><Audio src={staticFile(i===0?'assets/social-native-25d-v2/impact.wav':'assets/social-native-25d-v2/whoosh.wav')} volume={i===0?0.42:0.22}/></Sequence>)}
  {[320,470,590,700].map((from)=><Sequence key={from} from={from} durationInFrames={12}><Audio src={staticFile('assets/social-native-25d-v2/click.wav')} volume={0.32}/></Sequence>)}
</>;

const HookScene: React.FC = () => {
  const frame=useCurrentFrame();
  const hit=p(frame,0,16);
  const camera=interpolate(frame,[0,40,117],[1.18,1.02,1.08],{...clamp,easing:ease});
  const panelRot=interpolate(frame,[0,22],[-18,-7],{...clamp,easing:ease});
  return <Stage cameraX={interpolate(frame,[0,18],[34,0],clamp)} cameraScale={camera}>
    <Badge color={c.red} scale={0.75+hit*.25}>页面急救现场</Badge>
    <FloatingPanel x={385} y={280} width={610} height={860} rotateY={panelRot} rotateZ={-3} z={40} border={c.red}><MiniToolPage/></FloatingPanel>
    <Character x={80} y={830} scale={1.08} pose="shock"/>
    <div style={{position:'absolute',left:330,top:530,zIndex:72,fontFamily,fontSize:110,fontWeight:1000,color:c.red,textShadow:'0 18px 45px rgba(0,0,0,.55)',transform:`rotate(-8deg) scale(${.6+hit*.4})`}}>太 挤 了</div>
    <Caption>这页面丑到我都不想点。<span style={{color:c.yellow}}>三刀，救回来。</span></Caption>
  </Stage>;
};

const ProblemScene: React.FC = () => {
  const frame=useCurrentFrame();
  const orbit=p(frame,8,86);
  const labels=[['按钮太多',c.red,-220,-40],['颜色太多',c.yellow,130,-170],['信息太挤',c.purple,240,70]] as const;
  return <Stage cameraX={-30} cameraScale={1.03}>
    <FloatingPanel x={430} y={285} width={530} height={800} rotateY={-12} rotateZ={2}><MiniToolPage/></FloatingPanel>
    <Character x={110} y={845} scale={1.06} pose="push"/>
    <div style={{position:'absolute',left:58,top:92,fontFamily,fontSize:62,lineHeight:1.02,fontWeight:1000}}>三个问题<br/><span style={{color:c.red}}>一起抢注意力</span></div>
    {labels.map(([text,color,dx,dy],i)=>{
      const local=p(frame,12+i*23,28+i*23);
      return <div key={text} style={{position:'absolute',left:560+dx*orbit,top:650+dy*orbit,zIndex:68,padding:'12px 18px',borderRadius:999,background:color,color:'#071019',fontFamily,fontSize:27,fontWeight:1000,transform:`scale(${.55+local*.45}) rotate(${(i-1)*8}deg)`,boxShadow:'0 18px 35px rgba(0,0,0,.3)'}}>{text}</div>;
    })}
    <Caption>信息太挤，颜色太吵，<span style={{color:c.red}}>按钮太多。</span></Caption>
  </Stage>;
};

const CutInfoScene: React.FC = () => {
  const frame=useCurrentFrame();
  const sweep=p(frame,18,85);
  const cards=[0,1,2,3].map((i)=>({x:510+(i%2)*220,y:420+Math.floor(i/2)*210,delay:18+i*10}));
  return <Stage cameraScale={1.05}>
    <Badge>第一刀 · 砍信息</Badge>
    <Character x={80} y={830} scale={1.08} pose="slice"/>
    <FloatingPanel x={455} y={315} width={500} height={780} rotateY={-10} opacity={1-sweep*.85}><MiniToolPage/></FloatingPanel>
    <FloatingPanel x={520} y={365} width={430} height={690} rotateY={-6} z={50} border={c.green} opacity={sweep} scale={.88+sweep*.12}><MiniToolPage clean/></FloatingPanel>
    {cards.map((card,i)=>{const q=p(frame,card.delay,card.delay+34);return <div key={i} style={{position:'absolute',left:card.x+q*(i%2?370:-420),top:card.y-q*(120+i*35),zIndex:65,width:180,height:120,borderRadius:22,background:'linear-gradient(145deg,#2d3850,#171e2c)',border:`2px solid ${c.red}`,boxShadow:'0 20px 40px rgba(0,0,0,.35)',transform:`rotate(${q*(i%2?28:-34)}deg) scale(${1-q*.25})`,opacity:1-q*.4}}/>})}
    <div style={{position:'absolute',left:380,top:570,width:420,height:18,borderRadius:20,background:`linear-gradient(90deg,transparent,${c.cyan},white,transparent)`,zIndex:75,transform:`translateX(${interpolate(frame,[10,72],[-260,360],clamp)}px) rotate(-18deg)`,boxShadow:`0 0 28px ${c.cyan}`}}/>
    <Caption>没用的卡片，<span style={{color:c.green}}>直接扫出去。</span></Caption>
  </Stage>;
};

const CutColorScene: React.FC = () => {
  const frame=useCurrentFrame();
  const settle=p(frame,22,96);
  const palette=['#ff5d7d','#6b7cff','#00d5ff','#ffb21d','#9a65ff','#33d68f','#ff6e40'];
  return <Stage cameraX={-16} cameraScale={1.04}>
    <Badge>第二刀 · 砍颜色</Badge>
    <Character x={85} y={830} scale={1.08} pose="paint"/>
    <div style={{position:'absolute',left:500,top:380,width:470,height:520,zIndex:40,transform:'rotateY(-10deg)',transformStyle:'preserve-3d'}}>
      {palette.map((color,i)=>{const q=p(frame,16+i*5,58+i*5);const targetX=(i<3?i*138:196);const targetY=i<3?300:500;return <div key={color} style={{position:'absolute',left:(i%4)*108+q*(targetX-(i%4)*108),top:Math.floor(i/4)*138+q*(targetY-Math.floor(i/4)*138),width:96,height:96,borderRadius:24,background:color,boxShadow:'0 22px 40px rgba(0,0,0,.3)',transform:`rotate(${(i-3)*7*(1-q)}deg) scale(${1-q*.18})`,opacity:i<3?1:1-q}}/>})}
      <div style={{position:'absolute',left:70,top:300,width:360,height:220,borderRadius:36,border:`2px solid ${c.line}`,background:'rgba(9,14,24,.86)',opacity:settle,boxShadow:'0 30px 60px rgba(0,0,0,.34)'}}>
        {[['背景',c.bg],['强调',c.blue],['成功',c.green]].map(([label,color],i)=><div key={label} style={{position:'absolute',left:28+i*108,top:66,width:88,height:88,borderRadius:22,background:color as string,border:'1px solid rgba(255,255,255,.12)'}}><div style={{position:'absolute',top:100,left:-4,width:96,textAlign:'center',fontFamily,fontSize:18,fontWeight:900,color:c.text}}>{label}</div></div>)}
      </div>
    </div>
    <Caption>七种颜色，<span style={{color:c.yellow}}>收成三套。</span></Caption>
  </Stage>;
};

const OneCtaScene: React.FC = () => {
  const frame=useCurrentFrame();
  const press=p(frame,28,72);
  const labels=['打开','收藏','对比','立即体验'];
  return <Stage cameraScale={1.07}>
    <Badge>第三刀 · 只留一个按钮</Badge>
    <Character x={100} y={845} scale={1.08} pose="press"/>
    <div style={{position:'absolute',left:450,right:70,top:410,zIndex:45}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,opacity:1-press}}>{labels.map((x,i)=><div key={x} style={{height:130,borderRadius:27,display:'flex',alignItems:'center',justifyContent:'center',background:['#7b61ff','#ff6f61','#24c8db','#ffb020'][i],fontFamily,fontSize:29,fontWeight:1000,transform:`translateY(${press*(i%2?150:-150)}px) rotate(${press*(i%2?16:-16)}deg)`,opacity:1-press}}>{x}</div>)}</div>
      <div style={{position:'absolute',left:0,right:0,top:96,height:170,borderRadius:38,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(135deg,${c.blue},${c.cyan})`,color:'#071019',fontFamily,fontSize:42,fontWeight:1000,transform:`scale(${.72+press*.28}) translateZ(70px)`,opacity:press,boxShadow:'0 32px 80px rgba(89,168,255,.35)'}}>查看今日趋势</div>
    </div>
    <div style={{position:'absolute',left:720,top:480,zIndex:75,width:92,height:92,borderRadius:'50%',border:`8px solid ${c.yellow}`,opacity:press,transform:`scale(${1+Math.sin(frame/4)*.08})`}}/>
    <Caption>一个主按钮。<span style={{color:c.blue}}>别让用户猜。</span></Caption>
  </Stage>;
};

const RevealScene: React.FC = () => {
  const frame=useCurrentFrame();
  const turn=p(frame,8,58);
  return <Stage cameraScale={interpolate(frame,[0,60,122],[1.12,1.0,1.05],clamp)}>
    <div style={{position:'absolute',left:58,top:90,fontFamily,fontSize:67,fontWeight:1000}}>看前后</div>
    <FloatingPanel x={80} y={330} width={410} height={680} rotateY={interpolate(turn,[0,1],[-24,-8])} rotateZ={-2} border={c.red}><MiniToolPage/></FloatingPanel>
    <FloatingPanel x={590} y={300} width={410} height={700} rotateY={interpolate(turn,[0,1],[26,8])} rotateZ={2} border={c.green} z={45}><MiniToolPage clean/></FloatingPanel>
    <div style={{position:'absolute',left:146,top:260,fontFamily,fontSize:28,fontWeight:1000,color:c.red}}>BEFORE</div>
    <div style={{position:'absolute',right:157,top:230,fontFamily,fontSize:28,fontWeight:1000,color:c.green}}>AFTER</div>
    <Character x={405} y={835} scale={.9} pose="present"/>
    <Caption>左边像仓库，<span style={{color:c.green}}>右边终于像产品。</span></Caption>
  </Stage>;
};

const PayoffScene: React.FC = () => {
  const frame=useCurrentFrame();
  const inP=p(frame,0,24);
  const pulse=1+Math.sin(frame/7)*.025;
  return <Stage cameraScale={1.08}>
    <div style={{position:'absolute',left:55,right:55,top:110,fontFamily,fontSize:73,lineHeight:1.02,fontWeight:1000,textAlign:'center',transform:`translateY(${36-36*inP}px)`,opacity:inP}}>AI 不替你审美</div>
    <div style={{position:'absolute',left:70,right:70,top:285,fontFamily,fontSize:60,lineHeight:1.05,fontWeight:1000,textAlign:'center',color:c.yellow,transform:`scale(${pulse})`}}>但能让你试错更快</div>
    <FloatingPanel x={130} y={520} width={330} height={470} rotateY={-13} border={c.red}><MiniToolPage/></FloatingPanel>
    <FloatingPanel x={620} y={500} width={330} height={490} rotateY={13} border={c.green}><MiniToolPage clean/></FloatingPanel>
    <Character x={390} y={790} scale={1.02} pose="present"/>
    <div style={{position:'absolute',left:364,right:364,bottom:305,zIndex:75,padding:'15px 18px',borderRadius:999,background:c.yellow,color:'#071019',fontFamily,fontSize:31,fontWeight:1000,textAlign:'center'}}>你选哪边？</div>
    <Caption>AI不替你审美，但能让你试错更快。<span style={{color:c.yellow}}>你选哪边？</span></Caption>
  </Stage>;
};

const scenes = [HookScene,ProblemScene,CutInfoScene,CutColorScene,OneCtaScene,RevealScene,PayoffScene] as const;

export const ToolRadarSocialNative25DCharacterV2: React.FC = () => (
  <AbsoluteFill style={{backgroundColor:c.bg}}>
    {slots.map((slot,i)=>{
      const Scene=scenes[i];
      return <Sequence key={slot.from} from={slot.from} durationInFrames={slot.duration} premountFor={20}>
        <Scene/>
        <Audio src={staticFile(slot.audio)} volume={1}/>
      </Sequence>;
    })}
    <TransitionSfx/>
  </AbsoluteFill>
);
