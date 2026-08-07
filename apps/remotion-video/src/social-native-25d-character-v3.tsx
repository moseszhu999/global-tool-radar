import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';

export const SOCIAL_NATIVE_25D_V3_FPS = 30;
export const SOCIAL_NATIVE_25D_V3_FRAMES = 884;

const slots = [
  {from: 0, duration: 118, audio: 'assets/social-native-25d-v3/01-hook.wav'},
  {from: 118, duration: 132, audio: 'assets/social-native-25d-v3/02-problem.wav'},
  {from: 250, duration: 138, audio: 'assets/social-native-25d-v3/03-cut-info.wav'},
  {from: 388, duration: 123, audio: 'assets/social-native-25d-v3/04-cut-color.wav'},
  {from: 511, duration: 118, audio: 'assets/social-native-25d-v3/05-one-cta.wav'},
  {from: 629, duration: 123, audio: 'assets/social-native-25d-v3/06-reveal.wav'},
  {from: 752, duration: 132, audio: 'assets/social-native-25d-v3/07-payoff.wav'},
] as const;

const c = {
  ink: '#070a11', wall: '#10182a', wall2: '#172640', floor: '#0a0e17', line: '#344866',
  text: '#f6f9ff', muted: '#a6b4c9', blue: '#5badff', cyan: '#6feaff', green: '#68e7a5',
  yellow: '#ffd45f', red: '#ff6575', purple: '#a483ff', skin: '#f5b792', skin2: '#d98a66',
  hair: '#192239', jacket: '#315dea', shirt: '#f2f5ff', pants: '#17243b', shoe: '#0a0f18',
};
const fontFamily = 'Noto Sans CJK SC, Microsoft YaHei, sans-serif';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const p = (frame:number,a:number,b:number) => interpolate(frame,[a,b],[0,1],{...clamp,easing:ease});

const Caption: React.FC<{children:React.ReactNode}> = ({children}) => (
  <div style={{position:'absolute',left:54,right:54,bottom:66,zIndex:120,textAlign:'center',fontFamily,fontSize:48,lineHeight:1.16,fontWeight:950,color:c.text,textShadow:'0 5px 24px rgba(0,0,0,.98)'}}>{children}</div>
);

const Badge: React.FC<{children:React.ReactNode;color?:string;top?:number;left?:number;rotate?:number}> = ({children,color=c.yellow,top=72,left=58,rotate=-2}) => (
  <div style={{position:'absolute',top,left,zIndex:110,padding:'10px 18px',borderRadius:999,background:color,color:'#071019',fontFamily,fontSize:23,fontWeight:1000,letterSpacing:.8,transform:`rotate(${rotate}deg)`,boxShadow:'0 14px 40px rgba(0,0,0,.3)'}}>{children}</div>
);

const StudioStage: React.FC<{cameraX?:number;cameraY?:number;cameraScale?:number;accent?:string;children:React.ReactNode}> = ({cameraX=0,cameraY=0,cameraScale=1,accent=c.blue,children}) => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{overflow:'hidden',perspective:1500,background:`radial-gradient(circle at 82% 13%, ${accent}22, transparent 27%), linear-gradient(180deg,${c.wall2},${c.wall} 58%,${c.floor})`}}>
    <div style={{position:'absolute',left:64,top:126,width:262,height:108,borderRadius:28,border:'1px solid #ffffff15',background:'linear-gradient(145deg,#18263d,#0d1422)',boxShadow:'0 18px 50px #0008'}}>
      <div style={{position:'absolute',left:24,top:24,fontFamily,fontSize:26,fontWeight:1000,color:c.text}}>TOOLRADAR</div>
      <div style={{position:'absolute',left:24,top:64,fontFamily,fontSize:14,fontWeight:800,color:accent,letterSpacing:2}}>DESIGN RESCUE LAB</div>
    </div>
    <div style={{position:'absolute',right:54,top:110,width:230,height:410,borderRadius:26,border:'1px solid #ffffff12',background:'linear-gradient(180deg,#111d31,#0b1220)',boxShadow:'0 28px 70px #0007'}}>
      {[0,1,2].map(i=><div key={i} style={{position:'absolute',left:24,right:24,top:40+i*112,height:74,borderRadius:18,background:i===0?'linear-gradient(135deg,#5badff33,#6feaff15)':'#ffffff0b',border:'1px solid #ffffff0d'}}><div style={{position:'absolute',left:18,top:18,width:34,height:34,borderRadius:12,background:[c.blue,c.yellow,c.green][i]}}/><div style={{position:'absolute',left:66,top:22,width:90,height:10,borderRadius:9,background:'#ffffff28'}}/></div>)}
    </div>
    <div style={{position:'absolute',left:78,bottom:210,width:250,height:240}}>
      <div style={{position:'absolute',left:105,bottom:0,width:34,height:118,borderRadius:17,background:'linear-gradient(90deg,#2d3c54,#19263b)'}}/>
      {[[-32,20,-26],[20,-5,18],[68,15,34],[6,58,-12]].map((v,i)=><div key={i} style={{position:'absolute',left:58+v[0],top:35+v[1],width:92,height:46,borderRadius:'50% 50% 46% 54%',background:`linear-gradient(135deg,${i%2?c.green:'#49ba78'},#1f7b52)`,transform:`rotate(${v[2]}deg)`,boxShadow:'inset -12px -8px 16px #0b3a2a55'}}/>)}
      <div style={{position:'absolute',left:67,bottom:0,width:112,height:68,borderRadius:'20px 20px 28px 28px',background:'linear-gradient(145deg,#46536a,#1d2736)'}}/>
    </div>
    <div style={{position:'absolute',left:-180,right:-180,bottom:-330,height:860,transform:'rotateX(69deg)',transformOrigin:'50% 100%',background:'linear-gradient(180deg,#101827,#060910)',borderTop:`2px solid ${c.line}`}}/>
    {[0,1,2,3,4,5].map(i=><div key={i} style={{position:'absolute',left:40+i*210,bottom:0,width:2,height:720,background:`linear-gradient(180deg,transparent,${accent}26)`,transform:'skewX(-12deg)',opacity:.7}}/>)}
    <div style={{position:'absolute',left:0,right:0,top:0,height:520,pointerEvents:'none',background:`linear-gradient(105deg,transparent 18%,${accent}12 42%,transparent 58%)`,transform:`translateX(${Math.sin(frame/55)*90}px) skewX(-18deg)`,filter:'blur(2px)'}}/>
    {[0,1,2,3,4,5,6,7,8].map(i=>{
      const x=(i*137+53)%1030; const y=(i*211+110)%1200; const drift=Math.sin(frame/25+i)*18;
      return <div key={i} style={{position:'absolute',left:x+drift,top:y+Math.cos(frame/31+i)*20,width:5+(i%3)*3,height:5+(i%3)*3,borderRadius:'50%',background:'#ffffff',opacity:.08+(i%4)*.025,filter:'blur(1px)'}}/>;
    })}
    <div style={{position:'absolute',inset:0,transform:`translate3d(${cameraX}px,${cameraY}px,0) scale(${cameraScale})`,transformOrigin:'50% 50%',transformStyle:'preserve-3d'}}>{children}</div>
    <div style={{position:'absolute',left:-120,bottom:-40,width:340,height:420,borderRadius:'48%',background:`radial-gradient(circle,${accent}22,transparent 66%)`,filter:'blur(18px)',zIndex:100,pointerEvents:'none'}}/>
    <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:130,background:'radial-gradient(circle at 50% 42%,transparent 54%,rgba(0,0,0,.38) 100%), repeating-radial-gradient(circle at 40% 30%,#fff 0 1px,transparent 1px 4px)',backgroundBlendMode:'normal',opacity:.22}}/>
  </AbsoluteFill>;
};

type Pose='shock'|'push'|'slice'|'paint'|'press'|'present';
const Host: React.FC<{x?:number;y?:number;scale?:number;pose?:Pose;facing?:1|-1;accent?:string}> = ({x=100,y=760,scale=1,pose='present',facing=1,accent=c.blue}) => {
  const frame=useCurrentFrame();
  const bob=Math.sin(frame/8)*4;
  const breathe=Math.sin(frame/18)*2.5;
  const shock=pose==='shock'?Math.sin(frame*1.35)*3:0;
  const lean=pose==='shock'?-7:pose==='push'?8:pose==='slice'?10:pose==='press'?5:0;
  const armR=pose==='push'?-62:pose==='slice'?-76:pose==='paint'?-42:pose==='press'?-54:pose==='present'?-22:-8;
  const armL=pose==='shock'?58:pose==='present'?26:pose==='paint'?18:10;
  const mouthOpen=pose==='shock'?18:7+Math.abs(Math.sin(frame/3.3))*6;
  const blink=(frame%91)>84?2:13;
  return <div style={{position:'absolute',left:x,top:y+bob,width:270,height:540,transform:`scale(${scale*facing},${scale}) rotate(${lean+shock}deg)`,transformOrigin:'50% 91%',zIndex:72,filter:'drop-shadow(0 36px 28px rgba(0,0,0,.45))'}}>
    <div style={{position:'absolute',left:63,top:8,width:142,height:150,borderRadius:'48% 48% 46% 46%',background:`linear-gradient(135deg,${c.skin},${c.skin2})`,boxShadow:'inset -18px -12px 24px rgba(100,40,22,.14), 0 4px 0 #fff0',zIndex:8}}>
      <div style={{position:'absolute',left:-5,top:-14,width:151,height:70,borderRadius:'55% 55% 35% 32%',background:`linear-gradient(160deg,#25304b,${c.hair})`,transform:'rotate(-5deg)',boxShadow:'inset -10px -8px 16px #070b1355'}}/>
      <div style={{position:'absolute',left:-10,top:70,width:20,height:34,borderRadius:14,background:c.skin2}}/><div style={{position:'absolute',right:-10,top:70,width:20,height:34,borderRadius:14,background:c.skin2}}/>
      <div style={{position:'absolute',left:29,top:69,width:16,height:blink,borderRadius:9,background:'#172137'}}/><div style={{position:'absolute',right:29,top:69,width:16,height:blink,borderRadius:9,background:'#172137'}}/>
      <div style={{position:'absolute',left:34,top:71,width:5,height:5,borderRadius:'50%',background:'#fff',opacity:.86}}/><div style={{position:'absolute',right:34,top:71,width:5,height:5,borderRadius:'50%',background:'#fff',opacity:.86}}/>
      <div style={{position:'absolute',left:57,top:80,width:12,height:22,borderRadius:'50%',borderRight:'3px solid #b66e55',transform:'rotate(8deg)'}}/>
      <div style={{position:'absolute',left:53,top:112,width:36,height:mouthOpen,borderRadius:18,background:'#8f4e42',boxShadow:'inset 0 5px 0 #5c2a2d55'}}/>
      <div style={{position:'absolute',left:25,top:54,width:28,height:5,borderRadius:6,background:'#4b3240',transform:pose==='shock'?'rotate(-12deg)':'rotate(-3deg)'}}/><div style={{position:'absolute',right:25,top:54,width:28,height:5,borderRadius:6,background:'#4b3240',transform:pose==='shock'?'rotate(12deg)':'rotate(3deg)'}}/>
      <div style={{position:'absolute',right:3,top:24,width:40,height:64,borderRadius:'40%',background:`linear-gradient(135deg,${accent}45,transparent)`,filter:'blur(4px)',opacity:.5}}/>
    </div>
    <div style={{position:'absolute',left:48,top:150+breathe,width:174,height:228,borderRadius:'46px 46px 58px 58px',background:`linear-gradient(150deg,${c.jacket},#213fa8)`,boxShadow:'inset -22px -18px 34px #07184455',zIndex:5}}>
      <div style={{position:'absolute',left:19,top:14,width:136,height:194,borderRadius:38,background:`linear-gradient(160deg,#ffffff16,transparent 42%)`}}/>
      <div style={{position:'absolute',left:72,top:6,width:30,height:212,background:'linear-gradient(90deg,#ffffff18,transparent)'}}/>
      <div style={{position:'absolute',left:53,top:38,width:68,height:74,borderRadius:24,background:c.shirt,color:'#142038',display:'flex',alignItems:'center',justifyContent:'center',fontFamily,fontWeight:1000,fontSize:24}}>TR</div>
      <div style={{position:'absolute',left:18,right:18,bottom:20,height:7,borderRadius:6,background:accent,boxShadow:`0 0 16px ${accent}99`}}/>
    </div>
    <div style={{position:'absolute',left:18,top:180,width:50,height:204,borderRadius:30,background:`linear-gradient(${c.jacket},#223ea0)`,transform:`rotate(${armL}deg)`,transformOrigin:'50% 10%',zIndex:4}}><div style={{position:'absolute',left:-4,bottom:-24,width:60,height:60,borderRadius:'50%',background:`linear-gradient(145deg,${c.skin},${c.skin2})`}}/></div>
    <div style={{position:'absolute',right:18,top:178,width:50,height:214,borderRadius:30,background:`linear-gradient(${c.jacket},#223ea0)`,transform:`rotate(${armR}deg)`,transformOrigin:'50% 10%',zIndex:10}}><div style={{position:'absolute',left:-5,bottom:-24,width:62,height:62,borderRadius:'50%',background:`linear-gradient(145deg,${c.skin},${c.skin2})`}}/></div>
    <div style={{position:'absolute',left:72,top:360,width:52,height:150,borderRadius:26,background:`linear-gradient(${c.pants},#0e1727)`,transform:'rotate(4deg)'}}/><div style={{position:'absolute',right:72,top:360,width:52,height:150,borderRadius:26,background:`linear-gradient(${c.pants},#0e1727)`,transform:'rotate(-4deg)'}}/>
    <div style={{position:'absolute',left:49,top:493,width:92,height:34,borderRadius:'24px 34px 18px 18px',background:`linear-gradient(180deg,#dfe8fa,${c.shoe})`,border:'2px solid #ffffff22'}}/><div style={{position:'absolute',right:49,top:493,width:92,height:34,borderRadius:'34px 24px 18px 18px',background:`linear-gradient(180deg,#dfe8fa,${c.shoe})`,border:'2px solid #ffffff22'}}/>
  </div>;
};

const Panel: React.FC<{x:number;y:number;width:number;height:number;rotateY?:number;rotateZ?:number;z?:number;children:React.ReactNode;border?:string;opacity?:number;scale?:number;blur?:number}> = ({x,y,width,height,rotateY=0,rotateZ=0,z=0,children,border=c.line,opacity=1,scale=1,blur=0}) => (
  <div style={{position:'absolute',left:x,top:y,width,height,borderRadius:34,border:`2px solid ${border}`,background:'linear-gradient(145deg,rgba(20,29,47,.99),rgba(8,13,23,.99))',boxShadow:'0 38px 88px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.08)',overflow:'hidden',transform:`translateZ(${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,transformStyle:'preserve-3d',opacity,zIndex:50,filter:`blur(${blur}px)`}}>{children}</div>
);

const MiniToolPage: React.FC<{clean?:boolean}> = ({clean=false}) => {
  const colors=clean?[c.blue,c.green,c.yellow]:['#ff5d7d','#6b7cff','#00d5ff','#ffb21d','#9a65ff','#33d68f','#ff6e40'];
  const cards=clean?['FlowCanvas','ModelBench','ClipForge']:['FlowCanvas','ModelBench','ClipForge','AgentKit','DocMind'];
  return <div style={{height:'100%',padding:22,fontFamily,color:c.text,background:clean?'linear-gradient(155deg,#0b1320,#0d1a2c)':'linear-gradient(145deg,#35124c,#17305f 48%,#4d1d18)'}}>
    <div style={{height:34,display:'flex',alignItems:'center',gap:8,marginBottom:10}}><div style={{width:12,height:12,borderRadius:'50%',background:c.red}}/><div style={{width:12,height:12,borderRadius:'50%',background:c.yellow}}/><div style={{width:12,height:12,borderRadius:'50%',background:c.green}}/><div style={{marginLeft:8,width:145,height:10,borderRadius:8,background:'#ffffff22'}}/></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(clean?['AI设计','视频','模型']:['AI设计','视频','模型','研究','Agent','写作','效率']).map((t,i)=><div key={t} style={{padding:'7px 11px',borderRadius:clean?999:7,background:colors[i%colors.length],color:clean?'#071019':'white',fontSize:14,fontWeight:900}}>{t}</div>)}</div>
    <div style={{display:'grid',gridTemplateColumns:clean?'1fr':'1fr 1fr',gap:9,marginTop:14}}>{cards.map((name,i)=><div key={name} style={{padding:12,borderRadius:clean?18:8,border:`1px solid ${clean?c.line:colors[(i+2)%colors.length]}`,background:'rgba(255,255,255,.06)'}}><div style={{fontSize:19,fontWeight:1000}}>{name}</div><div style={{fontSize:13,color:clean?c.muted:'#fff9',marginTop:4}}>热度 {86-i*7}</div>{!clean?<div style={{display:'flex',gap:4,marginTop:7}}>{['打开','收藏','对比'].map((b,j)=><div key={b} style={{flex:1,padding:'5px 2px',textAlign:'center',borderRadius:4,background:colors[(i+j)%colors.length],fontSize:11,fontWeight:800}}>{b}</div>)}</div>:null}</div>)}</div>
    <div style={{position:'absolute',left:22,right:22,bottom:22,display:'grid',gridTemplateColumns:clean?'1fr':'1fr 1fr 1fr',gap:7}}>{(clean?['查看今日趋势']:['立即体验','快速开始','现在收藏']).map((b,i)=><div key={b} style={{padding:'11px 7px',borderRadius:clean?15:6,textAlign:'center',background:clean?c.blue:colors[(i+3)%colors.length],color:clean?'#071019':'white',fontSize:14,fontWeight:1000}}>{b}</div>)}</div>
  </div>;
};

const SoundBed = () => <>
  <Audio src={staticFile('assets/social-native-25d-v3/bgm.wav')} volume={0.11}/>
  {[0,118,250,388,511,629,752].map((from,i)=><Sequence key={`w${from}`} from={from} durationInFrames={18}><Audio src={staticFile(i===0?'assets/social-native-25d-v3/impact.wav':'assets/social-native-25d-v3/whoosh.wav')} volume={i===0?0.42:0.18}/></Sequence>)}
  {[318,462,570,690,811].map(from=><Sequence key={`c${from}`} from={from} durationInFrames={12}><Audio src={staticFile('assets/social-native-25d-v3/click.wav')} volume={0.28}/></Sequence>)}
  {[365,620,744].map(from=><Sequence key={`s${from}`} from={from} durationInFrames={25}><Audio src={staticFile('assets/social-native-25d-v3/sparkle.wav')} volume={0.16}/></Sequence>)}
</>;

const HookScene:React.FC=()=>{const frame=useCurrentFrame();const hit=p(frame,0,16);const cam=interpolate(frame,[0,40,117],[1.22,1.02,1.09],{...clamp,easing:ease});return <StudioStage cameraX={interpolate(frame,[0,20],[42,0],clamp)} cameraScale={cam} accent={c.red}>
  <Badge color={c.red}>页面急救现场</Badge><Panel x={380} y={270} width={620} height={875} rotateY={interpolate(frame,[0,22],[-19,-7],clamp)} rotateZ={-3} z={48} border={c.red}><MiniToolPage/></Panel><Host x={78} y={825} scale={1.1} pose="shock" accent={c.red}/>
  {[0,1,2,3].map(i=><div key={i} style={{position:'absolute',left:420+i*118+Math.sin(frame/9+i)*18,top:430+(i%2)*170,width:120,height:54,borderRadius:16,background:['#ff5d7d','#6b7cff','#ffb21d','#33d68f'][i],zIndex:88,transform:`rotate(${(i-1.5)*8+Math.sin(frame/10+i)*5}deg) translateZ(${90+i*18}px)`,boxShadow:'0 18px 30px #0006',opacity:.8}}/>)}
  <div style={{position:'absolute',left:327,top:540,zIndex:96,fontFamily,fontSize:112,fontWeight:1000,color:c.red,textShadow:'0 18px 45px rgba(0,0,0,.58)',transform:`rotate(-8deg) scale(${.58+hit*.42})`}}>太 挤 了</div><Caption>这页面丑到我都不想点。<span style={{color:c.yellow}}>三刀，救回来。</span></Caption>
</StudioStage>};

const ProblemScene:React.FC=()=>{const frame=useCurrentFrame();const orbit=p(frame,8,86);const labels=[['按钮太多',c.red,-220,-40],['颜色太多',c.yellow,130,-170],['信息太挤',c.purple,240,70]] as const;return <StudioStage cameraX={-30} cameraScale={1.04} accent={c.purple}>
  <Panel x={435} y={280} width={530} height={800} rotateY={-12} rotateZ={2}><MiniToolPage/></Panel><Host x={105} y={840} scale={1.07} pose="push" accent={c.purple}/><div style={{position:'absolute',left:58,top:270,fontFamily,fontSize:64,lineHeight:1.03,fontWeight:1000,zIndex:84}}>三个问题<br/><span style={{color:c.red}}>一起抢注意力</span></div>
  {labels.map(([text,color,dx,dy],i)=>{const q=p(frame,12+i*23,30+i*23);return <div key={text} style={{position:'absolute',left:560+dx*orbit,top:655+dy*orbit,zIndex:96,padding:'12px 18px',borderRadius:999,background:color,color:'#071019',fontFamily,fontSize:27,fontWeight:1000,transform:`scale(${.55+q*.45}) rotate(${(i-1)*8}deg) translateZ(${80+i*30}px)`,boxShadow:`0 18px 45px ${color}33`}}>{text}</div>})}
  <Caption>信息太挤，颜色太吵，<span style={{color:c.red}}>按钮太多。</span></Caption>
</StudioStage>};

const CutInfoScene:React.FC=()=>{const frame=useCurrentFrame();const sweep=p(frame,18,85);const cards=[0,1,2,3].map(i=>({x:510+(i%2)*220,y:420+Math.floor(i/2)*210,delay:18+i*10}));return <StudioStage cameraScale={1.06} accent={c.cyan}>
  <Badge>第一刀 · 砍信息</Badge><Host x={76} y={825} scale={1.1} pose="slice" accent={c.cyan}/><Panel x={455} y={315} width={500} height={780} rotateY={-10} opacity={1-sweep*.86} blur={sweep*2}><MiniToolPage/></Panel><Panel x={520} y={365} width={430} height={690} rotateY={-6} z={62} border={c.green} opacity={sweep} scale={.87+sweep*.13}><MiniToolPage clean/></Panel>
  {cards.map((card,i)=>{const q=p(frame,card.delay,card.delay+34);return <div key={i} style={{position:'absolute',left:card.x+q*(i%2?420:-470),top:card.y-q*(150+i*40),zIndex:98,width:180,height:120,borderRadius:22,background:'linear-gradient(145deg,#2d3850,#171e2c)',border:`2px solid ${c.red}`,boxShadow:'0 26px 48px rgba(0,0,0,.42)',transform:`translateZ(${120+q*260}px) rotate(${q*(i%2?34:-39)}deg) scale(${1+q*.18})`,filter:`blur(${q*2}px)`,opacity:1-q*.35}}/>})}
  <div style={{position:'absolute',left:365,top:575,width:455,height:20,borderRadius:20,background:`linear-gradient(90deg,transparent,${c.cyan},white,transparent)`,zIndex:104,transform:`translateX(${interpolate(frame,[10,72],[-280,380],clamp)}px) rotate(-18deg)`,boxShadow:`0 0 34px ${c.cyan}`}}/><Caption>没用的卡片，<span style={{color:c.green}}>直接扫出去。</span></Caption>
</StudioStage>};

const CutColorScene:React.FC=()=>{const frame=useCurrentFrame();const settle=p(frame,18,86);const palette=['#ff5d7d','#6b7cff','#00d5ff','#ffb21d','#9a65ff','#33d68f','#ff6e40'];return <StudioStage cameraX={-18} cameraScale={1.05} accent={c.yellow}>
  <Badge>第二刀 · 砍颜色</Badge><Host x={80} y={826} scale={1.1} pose="paint" accent={c.yellow}/><div style={{position:'absolute',left:490,top:350,width:490,height:560,zIndex:62,transform:'rotateY(-10deg)',transformStyle:'preserve-3d'}}>
    {palette.map((color,i)=>{const q=p(frame,12+i*5,54+i*5);const targetX=i<3?24+i*145:210;const targetY=i<3?315:510;return <div key={color} style={{position:'absolute',left:(i%4)*112+q*(targetX-(i%4)*112),top:Math.floor(i/4)*142+q*(targetY-Math.floor(i/4)*142),width:100,height:100,borderRadius:25,background:color,boxShadow:`0 24px 45px ${color}25, 0 18px 40px #0007`,transform:`translateZ(${40+i*12}px) rotate(${(i-3)*7*(1-q)}deg) scale(${1-q*.16})`,opacity:i<3?1:1-q}}/>})}
    <div style={{position:'absolute',left:38,top:292,width:414,height:245,borderRadius:40,border:`2px solid ${c.line}`,background:'linear-gradient(145deg,rgba(11,18,31,.96),rgba(8,12,21,.94))',opacity:settle,boxShadow:'0 34px 70px rgba(0,0,0,.42)'}}>{[['背景',c.ink],['强调',c.blue],['成功',c.green]].map(([label,color],i)=><div key={label} style={{position:'absolute',left:32+i*126,top:68,width:102,height:102,borderRadius:26,background:color as string,border:'1px solid rgba(255,255,255,.14)',boxShadow:`0 16px 36px ${(color as string)}25`}}><div style={{position:'absolute',top:114,left:-4,width:110,textAlign:'center',fontFamily,fontSize:19,fontWeight:900,color:c.text}}>{label}</div></div>)}</div>
  </div><Caption>七种颜色，<span style={{color:c.yellow}}>收成三套。</span></Caption>
</StudioStage>};

const OneCtaScene:React.FC=()=>{const frame=useCurrentFrame();const press=p(frame,24,70);const labels=['打开','收藏','对比','立即体验'];return <StudioStage cameraScale={1.08} accent={c.blue}>
  <Badge>第三刀 · 只留一个按钮</Badge><Host x={96} y={838} scale={1.09} pose="press" accent={c.blue}/><div style={{position:'absolute',left:438,right:64,top:405,zIndex:72}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,opacity:1-press}}>{labels.map((x,i)=><div key={x} style={{height:130,borderRadius:27,display:'flex',alignItems:'center',justifyContent:'center',background:['#7b61ff','#ff6f61','#24c8db','#ffb020'][i],fontFamily,fontSize:29,fontWeight:1000,transform:`translate3d(${press*(i%2?170:-170)}px,${press*(i<2?-160:160)}px,${press*200}px) rotate(${press*(i%2?18:-18)}deg)`,opacity:1-press,boxShadow:'0 22px 42px #0006'}}>{x}</div>)}</div><div style={{position:'absolute',left:0,right:0,top:92,height:174,borderRadius:40,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(135deg,${c.blue},${c.cyan})`,color:'#071019',fontFamily,fontSize:42,fontWeight:1000,transform:`scale(${.72+press*.28}) translateZ(90px)`,opacity:press,boxShadow:'0 36px 95px rgba(89,168,255,.4), inset 0 2px 0 #fff7'}}>查看今日趋势</div></div>
  <div style={{position:'absolute',left:694,top:468,zIndex:100,width:102,height:102,borderRadius:'50%',border:`8px solid ${c.yellow}`,opacity:press,transform:`scale(${1+Math.sin(frame/4)*.08})`,boxShadow:`0 0 35px ${c.yellow}66`}}/><Caption>一个主按钮。<span style={{color:c.blue}}>别让用户猜。</span></Caption>
</StudioStage>};

const RevealScene:React.FC=()=>{const frame=useCurrentFrame();const turn=p(frame,8,58);return <StudioStage cameraScale={interpolate(frame,[0,60,122],[1.13,1.0,1.055],clamp)} accent={c.green}>
  <div style={{position:'absolute',left:58,top:270,fontFamily,fontSize:68,fontWeight:1000,zIndex:84}}>看前后</div><Panel x={70} y={350} width={420} height={680} rotateY={interpolate(turn,[0,1],[-24,-8])} rotateZ={-2} border={c.red}><MiniToolPage/></Panel><Panel x={590} y={320} width={420} height={700} rotateY={interpolate(turn,[0,1],[26,8])} rotateZ={2} border={c.green} z={56}><MiniToolPage clean/></Panel><div style={{position:'absolute',left:136,top:278,fontFamily,fontSize:28,fontWeight:1000,color:c.red,zIndex:88}}>BEFORE</div><div style={{position:'absolute',right:154,top:248,fontFamily,fontSize:28,fontWeight:1000,color:c.green,zIndex:88}}>AFTER</div><Host x={405} y={834} scale={.92} pose="present" accent={c.green}/>
  <div style={{position:'absolute',left:515,top:495,width:44,height:380,zIndex:69,background:`linear-gradient(180deg,transparent,${c.green}88,transparent)`,filter:'blur(10px)',opacity:.62}}/><Caption>左边像仓库，<span style={{color:c.green}}>右边终于像产品。</span></Caption>
</StudioStage>};

const PayoffScene:React.FC=()=>{const frame=useCurrentFrame();const inP=p(frame,0,24);const pulse=1+Math.sin(frame/7)*.025;return <StudioStage cameraScale={1.085} accent={c.yellow}>
  <div style={{position:'absolute',left:55,right:55,top:265,fontFamily,fontSize:73,lineHeight:1.02,fontWeight:1000,textAlign:'center',transform:`translateY(${36-36*inP}px)`,opacity:inP,zIndex:85}}>AI 不替你审美</div><div style={{position:'absolute',left:70,right:70,top:420,fontFamily,fontSize:60,lineHeight:1.05,fontWeight:1000,textAlign:'center',color:c.yellow,transform:`scale(${pulse})`,zIndex:86}}>但能让你试错更快</div><Panel x={92} y={660} width={330} height={470} rotateY={-14} border={c.red}><MiniToolPage/></Panel><Panel x={658} y={640} width={330} height={490} rotateY={14} border={c.green}><MiniToolPage clean/></Panel><Host x={395} y={760} scale={1.04} pose="present" accent={c.yellow}/><div style={{position:'absolute',left:358,right:358,bottom:294,zIndex:102,padding:'15px 18px',borderRadius:999,background:c.yellow,color:'#071019',fontFamily,fontSize:31,fontWeight:1000,textAlign:'center',boxShadow:`0 20px 48px ${c.yellow}35`}}>你选哪边？</div><Caption>AI不替你审美，但能让你试错更快。<span style={{color:c.yellow}}>你选哪边？</span></Caption>
</StudioStage>};

const scenes=[HookScene,ProblemScene,CutInfoScene,CutColorScene,OneCtaScene,RevealScene,PayoffScene] as const;

export const ToolRadarSocialNative25DCharacterV3:React.FC=()=>(
  <AbsoluteFill style={{backgroundColor:c.ink}}>
    {slots.map((slot,i)=>{const Scene=scenes[i];return <Sequence key={slot.from} from={slot.from} durationInFrames={slot.duration} premountFor={20}><Scene/><Audio src={staticFile(slot.audio)} volume={1}/></Sequence>})}
    <SoundBed/>
  </AbsoluteFill>
);
