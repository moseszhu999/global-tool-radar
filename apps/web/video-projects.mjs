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
const ART_CHECK_LABELS = {
  silhouetteReadable:'轮廓可读',visualHierarchyClear:'视觉层级',originalityMaterial:'原创识别度',
  materialFinishSufficient:'材质完成度',worldConsistency:'世界一致性',phoneScaleReadable:'手机尺寸可读',productTruthSafe:'产品事实安全',
};
const ANIMATIC_CHECK_LABELS = {
  shotIntentClear:'镜头意图',timingBounded:'时长边界',payoffTimingReviewed:'Payoff 节奏',
  audioTimingReviewed:'音频节奏',loopPlanReviewed:'Loop 方案',productTruthSafe:'产品事实安全',
};
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const dateTime = (value) => value ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '未知';
const shortDigest = (value) => value ? `${value.slice(0,12)}…${value.slice(-8)}` : '无';

function validateCreativePreflight(preflight, project){
  if(!preflight) return null;
  if(preflight.schemaVersion !== 'toolradar.video-creative-preflight.v1') throw new Error('CREATIVE_PREFLIGHT_SCHEMA_INVALID');
  if(!['CREATIVE_PREFLIGHT_PASSED','CREATIVE_PREFLIGHT_BLOCKED'].includes(preflight.status)) throw new Error('CREATIVE_PREFLIGHT_STATUS_INVALID');
  if(preflight.humanCreativeApprovalClaimed !== false || preflight.publicationAllowed !== false) throw new Error('CREATIVE_PREFLIGHT_TRUTH_BOUNDARY_INVALID');
  if(!preflight.receiptDigest || preflight.receiptDigest.length !== 64) throw new Error('CREATIVE_PREFLIGHT_DIGEST_INVALID');
  if(!preflight.artGate?.checks || !preflight.animaticGate?.checks) throw new Error('CREATIVE_PREFLIGHT_GATE_EVIDENCE_REQUIRED');
  if(project.stage === 'STORYBOARD_READY') throw new Error('CREATIVE_PREFLIGHT_STAGE_CONFLICT');
  return preflight;
}

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
  validateCreativePreflight(ledger.creativePreflight, project);
  if(ledger.renderAuthorization?.creativePreflightDigest && ledger.creativePreflight?.receiptDigest !== ledger.renderAuthorization.creativePreflightDigest){
    throw new Error('CREATIVE_PREFLIGHT_RENDER_BINDING_MISMATCH');
  }
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

function gateChecksHtml(checks, labels){
  return Object.entries(labels).map(([key,label]) => {
    const value = checks?.[key];
    const state = value === true ? 'pass' : value === false ? 'fail' : 'waiting';
    const verdict = value === true ? 'PASS' : value === false ? 'FAIL' : 'WAITING';
    return `<li class="${state}"><span>${esc(label)}</span><strong>${verdict}</strong></li>`;
  }).join('');
}

function renderCreativePreflight(ledger){
  const preflight = ledger.creativePreflight;
  const stageIndex = STAGES.findIndex(([stage]) => stage === ledger.project.stage);
  const assetVerifiedIndex = STAGES.findIndex(([stage]) => stage === 'ASSETS_VERIFIED');
  if(!preflight){
    const beforeGate = stageIndex < assetVerifiedIndex;
    $('[data-creative-status]').textContent = beforeGate ? '尚未到达' : '缺少证据';
    $('[data-creative-status]').className = `boundary ${beforeGate ? '' : 'warning'}`;
    $('[data-creative-message]').textContent = beforeGate
      ? '项目尚未到 ASSETS_VERIFIED。Art Gate / Animatic Gate 不会被提前显示成已通过。'
      : '项目已到创意预检位置，但当前账本没有有效 Creative Preflight receipt；Render Authorization 应保持阻塞。';
    $('[data-art-gate-checks]').innerHTML = gateChecksHtml(null,ART_CHECK_LABELS);
    $('[data-animatic-gate-checks]').innerHTML = gateChecksHtml(null,ANIMATIC_CHECK_LABELS);
    $('[data-render-input-status]').textContent = 'BLOCKED';
    return;
  }

  const passed = preflight.status === 'CREATIVE_PREFLIGHT_PASSED';
  $('[data-creative-status]').textContent = passed ? 'PREFLIGHT PASS' : 'PREFLIGHT BLOCKED';
  $('[data-creative-status]').className = `boundary ${passed ? 'success' : 'warning'}`;
  $('[data-creative-message]').textContent = `${preflight.reviewer} · ${dateTime(preflight.reviewedAt)} · 仅表示创意证据是否允许进入 Render Authorization。`;
  $('[data-art-gate-status]').textContent = preflight.artGate.passed ? 'PASS' : 'FAIL';
  $('[data-animatic-gate-status]').textContent = preflight.animaticGate.passed ? 'PASS' : 'FAIL';
  $('[data-art-gate-checks]').innerHTML = gateChecksHtml(preflight.artGate.checks,ART_CHECK_LABELS);
  $('[data-animatic-gate-checks]').innerHTML = gateChecksHtml(preflight.animaticGate.checks,ANIMATIC_CHECK_LABELS);
  $('[data-art-gate-digest]').textContent = `SHA-256 ${shortDigest(preflight.artGate.evidenceDigest)}`;
  $('[data-animatic-gate-digest]').textContent = `SHA-256 ${shortDigest(preflight.animaticGate.evidenceDigest)}`;
  $('[data-render-input-status]').textContent = passed ? 'ALLOWED' : 'BLOCKED';
  $('[data-creative-boundary]').textContent = passed
    ? `Creative receipt ${shortDigest(preflight.receiptDigest)} 已绑定；可进入 Render Authorization，但仍不代表最终人工创意批准。`
    : 'Art / Animatic 任一 gate 未通过；Final Render Gate 不应构建。';
  $('[data-human-creative-approval]').textContent = String(preflight.humanCreativeApprovalClaimed);
  $('[data-creative-publication]').textContent = String(preflight.publicationAllowed);
}

function claimSummary(artifact){
  if(artifact.type === 'topic_brief') return `${artifact.claims.evidenceCount} 条证据 · ${artifact.claims.claimBoundary}`;
  if(artifact.type === 'production_case') return `${artifact.claims.estimatedDurationSeconds} 秒中文脚本 · rights ${artifact.claims.rightsState} · 人工审核 ${artifact.claims.humanScriptReviewRequired ? '需要' : '不需要'}`;
  if(artifact.type === 'storyboard_package') return `${artifact.claims.shotCount} 镜头 · ${artifact.claims.assetCount} 素材 · ${artifact.claims.captureTaskCount} 个录制任务 · renderAllowed=${artifact.claims.renderAllowed}`;
  if(artifact.type === 'final_render_gate' && artifact.claims.creativePreflightDigest) return `Creative ${shortDigest(artifact.claims.creativePreflightDigest)} · Art ${shortDigest(artifact.claims.artGateEvidenceDigest)} · Animatic ${shortDigest(artifact.claims.animaticGateEvidenceDigest)}`;
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
    renderSummary(ledger);renderStages(ledger.project);renderCreativePreflight(ledger);renderArtifacts(ledger.project);renderEvents(ledger.project);renderDigests(ledger);
  }catch(error){
    $('[data-runtime]').textContent = `读取失败 · ${error.message}`;
    document.querySelector('main').insertAdjacentHTML('beforeend',`<section class="blocker"><div><small>账本不可用</small><strong>${esc(error.message)}</strong></div><p>页面不会把缺失或无效项目显示成已完成。</p></section>`);
  }
}
load();
