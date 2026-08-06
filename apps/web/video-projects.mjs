const DATA_URL = './data/replit-design-video-project-ledger.json';
const STAGES = [
  ['DISCOVERED','发现'],['SELECTED','入选'],['RESEARCH_READY','研究'],['SCRIPT_READY','脚本'],
  ['STORYBOARD_READY','分镜'],['ASSETS_VERIFIED','素材'],['RENDER_AUTHORIZED','授权渲染'],
  ['RENDER_COMPLETED','渲染完成'],['QUALITY_APPROVED','质量通过'],['RELEASE_READY','发布准备'],
  ['PUBLISHED','已发布'],['FEEDBACK_READY','反馈完成'],
];
const EVENT_LABELS = {
  SELECT_CANDIDATE:'候选入选',ATTACH_RESEARCH:'研究与 Topic Brief',ATTACH_SCRIPT:'中文脚本',
  ATTACH_STORYBOARD:'分镜与素材计划',BLOCK_PROJECT:'项目阻塞',RESUME_PROJECT:'项目恢复',
  VERIFY_ASSETS:'素材核验',AUTHORIZE_RENDER:'授权渲染',COMPLETE_RENDER:'渲染完成',
  APPROVE_QUALITY:'质量审核',PREPARE_RELEASE:'发布准备',CONFIRM_PUBLICATION:'确认发布',ATTACH_FEEDBACK:'反馈回收',
};
const ARTIFACT_LABELS = {topic_brief:'Topic Brief',production_case:'中文脚本案例',storyboard_package:'分镜与素材清单'};
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const dateTime = (value) => value ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '未知';
const shortDigest = (value) => value ? `${value.slice(0,12)}…${value.slice(-8)}` : '无';

function validateLedger(ledger){
  const project = ledger?.project;
  if(project?.schemaVersion !== 'toolradar.video-project.v1') throw new Error('VIDEO_PROJECT_SCHEMA_INVALID');
  if(!STAGES.some(([stage]) => stage === project.stage)) throw new Error('VIDEO_PROJECT_STAGE_INVALID');
  if(!['ACTIVE','BLOCKED','COMPLETED','CANCELLED'].includes(project.status)) throw new Error('VIDEO_PROJECT_STATUS_INVALID');
  if(!Array.isArray(project.artifacts) || !Array.isArray(project.events)) throw new Error('VIDEO_PROJECT_LEDGER_REQUIRED');
  if(project.status === 'BLOCKED' && !project.blockedReason) throw new Error('BLOCK_REASON_REQUIRED');
  if(project.stage === 'STORYBOARD_READY' && project.artifacts.some((item) => ['mac_remotion_render_run','bound_publication_receipt'].includes(item.type))){
    throw new Error('DOWNSTREAM_CLAIM_CONFLICT');
  }
  if(ledger.summary?.projectId !== project.projectId) throw new Error('SUMMARY_PROJECT_MISMATCH');
  return ledger;
}

function renderSummary(ledger){
  const {project,summary} = ledger;
  $('[data-title]').textContent = summary.title;
  $('[data-project-id]').textContent = summary.projectId;
  $('[data-progress]').textContent = `${summary.progressPercent}%`;
  $('[data-stage]').textContent = summary.stage;
  $('[data-status]').textContent = summary.status;
  $('[data-next]').textContent = summary.nextEvent ?? '无';
  $('[data-runtime]').textContent = `账本更新 ${dateTime(summary.updatedAt)}`;
  if(project.status === 'BLOCKED'){
    $('[data-blocker]').hidden = false;
    $('[data-blocker-text]').textContent = project.blockedReason;
  }
}

function renderStages(project){
  const current = STAGES.findIndex(([stage]) => stage === project.stage);
  $('[data-stages]').innerHTML = STAGES.map(([stage,label],index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'future';
    return `<article class="stage ${state}"><b>${String(index+1).padStart(2,'0')} · ${state === 'done' ? '已完成' : state === 'current' ? project.status : '待开始'}</b><strong>${esc(label)}<br>${esc(stage)}</strong></article>`;
  }).join('');
}

function claimSummary(artifact){
  if(artifact.type === 'topic_brief') return `${artifact.claims.evidenceCount} 条证据 · ${artifact.claims.claimBoundary}`;
  if(artifact.type === 'production_case') return `${artifact.claims.estimatedDurationSeconds} 秒中文脚本 · rights ${artifact.claims.rightsState} · 人工审核 ${artifact.claims.humanScriptReviewRequired ? '需要' : '不需要'}`;
  if(artifact.type === 'storyboard_package') return `${artifact.claims.shotCount} 镜头 · ${artifact.claims.assetCount} 素材 · ${artifact.claims.captureTaskCount} 个录制任务 · renderAllowed=${artifact.claims.renderAllowed}`;
  return artifact.status ?? '已绑定';
}

function renderArtifacts(project){
  $('[data-artifact-count]').textContent = `${project.artifacts.length} 项`;
  $('[data-artifacts]').innerHTML = project.artifacts.map((artifact) => `
    <article class="artifact">
      <header><h3>${esc(ARTIFACT_LABELS[artifact.type] ?? artifact.type)}</h3><span>${esc(artifact.status ?? 'BOUND')}</span></header>
      <p>${esc(claimSummary(artifact))}</p>
      <code title="${esc(artifact.digest)}">SHA-256 ${esc(shortDigest(artifact.digest))}</code>
    </article>`).join('');
}

function renderEvents(project){
  $('[data-event-count]').textContent = `${project.events.length} 个事件`;
  $('[data-events]').innerHTML = project.events.map((event) => `
    <article class="event">
      <header><strong>${esc(EVENT_LABELS[event.type] ?? event.type)} · ${esc(event.toStage)}</strong><time>${esc(dateTime(event.occurredAt))}</time></header>
      <p>${esc(event.reason ?? `${event.fromStage} → ${event.toStage}`)}</p>
      <code>${esc(event.actor)} · ${esc(shortDigest(event.eventDigest))}</code>
    </article>`).join('');
}

function renderDigests(ledger){
  const names = {topicBriefSha256:'Topic Brief',productionCaseSha256:'Production Case',storyboardPackageSha256:'Storyboard Package'};
  $('[data-digests]').innerHTML = Object.entries(ledger.sourceDigests).map(([key,value]) => `<dt>${esc(names[key] ?? key)}</dt><dd><code>${esc(value)}</code></dd>`).join('');
}

async function load(){
  try{
    const response = await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const ledger = validateLedger(await response.json());
    renderSummary(ledger);renderStages(ledger.project);renderArtifacts(ledger.project);renderEvents(ledger.project);renderDigests(ledger);
  }catch(error){
    $('[data-runtime]').textContent = `读取失败 · ${error.message}`;
    document.querySelector('main').insertAdjacentHTML('beforeend',`<section class="blocker"><div><small>账本不可用</small><strong>${esc(error.message)}</strong></div><p>页面不会把缺失或无效项目显示成已完成。</p></section>`);
  }
}
load();
