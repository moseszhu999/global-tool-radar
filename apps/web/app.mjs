const DATA_URL = './data/daily-candidates.json';
const state = { projection: null, selectedId: null, query: '' };

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

function shown(value, suffix = '') {
  if (value === null || value === undefined || value === '') return 'UNKNOWN';
  return `${value}${suffix}`;
}

function percent(value) {
  return value === null || value === undefined
    ? 'UNKNOWN'
    : `${Math.round(value * 100)}%`;
}

function validateProjection(projection) {
  if (projection?.schemaVersion !== 'toolradar.operator-workspace.v1') {
    throw new Error('WORKSPACE_SCHEMA_INVALID');
  }
  if (projection.policy?.missingNumericValueIsZero !== false) {
    throw new Error('MISSING_VALUE_POLICY_INVALID');
  }
  if (projection.policy?.opportunityScoreIsDecision !== false) {
    throw new Error('SCORE_DECISION_BOUNDARY_INVALID');
  }
  if (projection.policy?.automaticPublishingAllowed !== false) {
    throw new Error('AUTOMATIC_PUBLISHING_MUST_BE_DISABLED');
  }
  if (!Array.isArray(projection.candidates)) {
    throw new Error('CANDIDATE_COLLECTION_REQUIRED');
  }
  return projection;
}

function statusClass(status) {
  if (['approved', 'ready', 'passed'].includes(status)) return 'good';
  if (['rejected', 'blocked', 'failed'].includes(status)) return 'bad';
  return 'warn';
}

function visibleCandidates() {
  const normalized = state.query.trim().toLowerCase();
  if (!normalized) return state.projection?.candidates ?? [];
  return (state.projection?.candidates ?? []).filter((candidate) =>
    [candidate.title, candidate.channelId, candidate.externalId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
}

function selectedCandidate() {
  const candidates = state.projection?.candidates ?? [];
  return candidates.find((candidate) => candidate.candidateId === state.selectedId)
    ?? candidates[0]
    ?? null;
}

function renderSummary() {
  const candidates = state.projection?.candidates ?? [];
  const coverageValues = candidates
    .map((candidate) => candidate.metrics?.coverage)
    .filter(Number.isFinite);
  const averageCoverage = coverageValues.length
    ? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
    : null;
  const rightsPending = candidates.filter((candidate) => candidate.rightsState !== 'approved').length;
  const securityPending = candidates.filter((candidate) => candidate.securityState !== 'passed').length;

  $('[data-count]').textContent = candidates.length ? String(candidates.length) : '0';
  $('[data-coverage]').textContent = percent(averageCoverage);
  $('[data-rights]').textContent = candidates.length ? String(rightsPending) : '0';
  $('[data-security]').textContent = candidates.length ? String(securityPending) : '0';
}

function renderList() {
  const container = $('[data-candidate-list]');
  const candidates = visibleCandidates();
  if (!candidates.length) {
    container.innerHTML = '<div class="empty-state"><strong>暂无匹配候选</strong><span>这不代表信号为 0；当前快照可能为空或筛选无结果。</span></div>';
    return;
  }

  container.innerHTML = candidates.map((candidate) => `
    <button class="candidate-card ${candidate.candidateId === selectedCandidate()?.candidateId ? 'is-selected' : ''}" type="button" data-candidate-id="${esc(candidate.candidateId)}">
      <header><h3>${esc(candidate.title)}</h3><span class="badge">${esc(percent(candidate.metrics?.coverage))}</span></header>
      <p>${esc(shown(candidate.channelId))} · observed ${esc(shown(candidate.observedAt))}</p>
      <footer>
        <span class="badge">rank ${esc(shown(candidate.metrics?.rankingScore))}</span>
        <span class="badge ${statusClass(candidate.rightsState)}">rights ${esc(candidate.rightsState)}</span>
        <span class="badge ${statusClass(candidate.securityState)}">security ${esc(candidate.securityState)}</span>
      </footer>
    </button>`).join('');

  container.querySelectorAll('[data-candidate-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedId = button.dataset.candidateId;
      render();
    });
  });
}

function metric(label, value, note = '') {
  return `<article class="metric"><small>${esc(label)}</small><strong>${esc(shown(value))}</strong><span>${esc(note)}</span></article>`;
}

function renderDetail() {
  const candidate = selectedCandidate();
  const container = $('[data-detail]');
  if (!candidate) {
    container.innerHTML = '<div class="empty-state"><strong>暂无已验证候选</strong><span>运行导出命令或导入工作台 JSON。缺失不会显示为 0。</span></div>';
    return;
  }

  const metrics = candidate.metrics ?? {};
  container.innerHTML = `
    <header class="detail-head">
      <div><h1>${esc(candidate.title)}</h1><p>${esc(shown(candidate.channelId))} · ${esc(shown(candidate.publishedAt))}</p></div>
      ${candidate.sourceUrl ? `<a href="${esc(candidate.sourceUrl)}" target="_blank" rel="noreferrer">打开官方来源</a>` : '<span class="badge warn">source URL UNKNOWN</span>'}
    </header>
    <div class="detail-grid">
      <section class="panel">
        <h2>Momentum evidence</h2>
        <div class="metric-grid">
          ${metric('Views / hour', metrics.currentViewsPerHour, '当前观测区间')}
          ${metric('Channel baseline', metrics.channelBaselineViewsPerHour, '历史中位数；缺失不补 0')}
          ${metric('Relative ratio', metrics.relativeRatio, '当前 / baseline')}
          ${metric('Coverage', percent(metrics.coverage), '可观测权重')}
          ${metric('Opportunity score', metrics.opportunityScore, '不是发布决定')}
          ${metric('Ranking score', metrics.rankingScore, '仅候选排序信号')}
        </div>
        <div class="boundary">高 momentum 或高 score 不能覆盖版权、安全、工具实测和人工判断。coverage 较低的候选必须显式保留缺失项。</div>
      </section>
      <section class="panel">
        <h2>Independent gates</h2>
        <div class="gate-list">
          <article class="gate"><div><strong>Rights review</strong><p>是否允许引用、评论、录屏和发布。</p></div><span class="badge ${statusClass(candidate.rightsState)}">${esc(candidate.rightsState)}</span></article>
          <article class="gate"><div><strong>Security review</strong><p>官网、安装包、权限、数据和支付风险。</p></div><span class="badge ${statusClass(candidate.securityState)}">${esc(candidate.securityState)}</span></article>
          <article class="gate"><div><strong>Test evidence</strong><p>没有证据不得声称已经实测。</p></div><span class="badge ${statusClass(candidate.testEvidenceState)}">${esc(candidate.testEvidenceState)}</span></article>
          <article class="gate"><div><strong>Operator status</strong><p>人工运营判断，不由 ranking 自动决定。</p></div><span class="badge ${statusClass(candidate.operatorStatus)}">${esc(candidate.operatorStatus)}</span></article>
        </div>
      </section>
      <section class="panel">
        <h2>Source & provenance</h2>
        <dl class="source-facts">
          <dt>Candidate ID</dt><dd>${esc(candidate.candidateId)}</dd>
          <dt>Source identity</dt><dd>${esc(candidate.sourceIdentityId)}</dd>
          <dt>External ID</dt><dd>${esc(candidate.externalId)}</dd>
          <dt>Observed at</dt><dd>${esc(shown(candidate.observedAt))}</dd>
          <dt>Missing metrics</dt><dd>${esc((metrics.missing ?? []).join(', ') || 'none reported')}</dd>
          <dt>Formal priority</dt><dd>${esc(shown(candidate.formalPublicationPriority))}</dd>
        </dl>
      </section>
      <section class="panel">
        <h2>Original-content next step</h2>
        <div class="gate-list">
          <article class="gate"><div><strong>1. Verify official source</strong><p>确认工具官网、视频来源和版本。</p></div><span class="badge">manual</span></article>
          <article class="gate"><div><strong>2. Test independently</strong><p>生成自己的录屏、截图和测试证据。</p></div><span class="badge">required</span></article>
          <article class="gate"><div><strong>3. Draft and review</strong><p>Agent 可准备脚本；人工审核后才进入制作。</p></div><span class="badge warn">draft only</span></article>
        </div>
      </section>
    </div>`;
}

function render() {
  renderSummary();
  renderList();
  renderDetail();
}

function agentProposal(query) {
  const candidate = selectedCandidate();
  const normalized = query.toLowerCase();
  let intent = 'explain_candidate';
  let draftArtifact = 'read_only_explanation';
  if (/脚本|story|提纲/.test(normalized)) {
    intent = 'prepare_original_script_outline';
    draftArtifact = 'script_outline_draft';
  } else if (/实测|测试|录屏/.test(normalized)) {
    intent = 'prepare_independent_test_plan';
    draftArtifact = 'test_and_recording_plan_draft';
  } else if (/权利|版权|rights/.test(normalized)) {
    intent = 'prepare_rights_review';
    draftArtifact = 'rights_checklist_draft';
  } else if (/安全|security/.test(normalized)) {
    intent = 'prepare_security_review';
    draftArtifact = 'security_checklist_draft';
  } else if (/缺失|unknown|不能/.test(normalized)) {
    intent = 'explain_missing_data_and_claim_limits';
    draftArtifact = 'claim_limit_report';
  }
  return { candidate, intent, draftArtifact };
}

function renderAgentProposal(query) {
  const proposal = agentProposal(query);
  $('[data-agent-output]').innerHTML = `
    <section class="agent-proposal" aria-live="polite">
      <h3>Bounded proposal</h3>
      <dl>
        <dt>Candidate</dt><dd>${esc(proposal.candidate?.title ?? 'not_selected')}</dd>
        <dt>Intent</dt><dd>${esc(proposal.intent)}</dd>
        <dt>Draft artifact</dt><dd>${esc(proposal.draftArtifact)}</dd>
        <dt>Rights state</dt><dd>${esc(proposal.candidate?.rightsState ?? 'UNKNOWN')}</dd>
        <dt>Security state</dt><dd>${esc(proposal.candidate?.securityState ?? 'UNKNOWN')}</dd>
        <dt>Persistence</dt><dd>draft_only · formalPublicationPerformed=false</dd>
      </dl>
      <div class="agent-boundary">不会下载、复制或去水印源视频；不会声称已实测；不会注册账号、付款、自动发布或把 rankingScore 转成正式发布优先级。脚本、分镜和生产交接均需人工审核。</div>
    </section>`;
}

async function loadProjection() {
  $('[data-runtime]').textContent = '读取工作台快照…';
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    state.projection = validateProjection(await response.json());
    state.selectedId = state.projection.candidates[0]?.candidateId ?? null;
    $('[data-runtime]').textContent = state.projection.generatedAt
      ? `快照 ${state.projection.generatedAt}`
      : '快照为空 · 等待导出或导入';
    render();
  } catch (error) {
    $('[data-runtime]').textContent = `读取失败 · ${error.message}`;
    state.projection = validateProjection({
      schemaVersion: 'toolradar.operator-workspace.v1',
      generatedAt: null,
      policy: {
        missingValue: 'UNKNOWN',
        missingNumericValueIsZero: false,
        opportunityScoreIsDecision: false,
        automaticPublishingAllowed: false,
      },
      candidates: [],
    });
    render();
  }
}

$('[data-search]').addEventListener('input', (event) => {
  state.query = event.target.value;
  renderList();
});

$('[data-import]').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state.projection = validateProjection(JSON.parse(await file.text()));
    state.selectedId = state.projection.candidates[0]?.candidateId ?? null;
    $('[data-runtime]').textContent = `本地导入 · ${file.name}`;
    render();
  } catch (error) {
    $('[data-runtime]').textContent = `导入失败 · ${error.message}`;
  } finally {
    event.target.value = '';
  }
});

const drawer = $('[data-agent-drawer]');
const drawerMask = $('[data-drawer-mask]');
const sidebar = $('.sidebar');
const sidebarMask = $('[data-sidebar-mask]');
const agentQuery = $('[data-agent-query]');

function openDrawer() {
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  drawerMask.classList.add('is-open');
  window.setTimeout(() => agentQuery.focus(), 30);
}
function closeDrawer() {
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  drawerMask.classList.remove('is-open');
}
function openSidebar() { sidebar.classList.add('is-open'); sidebarMask.classList.add('is-open'); }
function closeSidebar() { sidebar.classList.remove('is-open'); sidebarMask.classList.remove('is-open'); }

$('[data-agent-open]').addEventListener('click', openDrawer);
$('[data-agent-close]').addEventListener('click', closeDrawer);
drawerMask.addEventListener('click', closeDrawer);
$('[data-menu]').addEventListener('click', openSidebar);
sidebarMask.addEventListener('click', closeSidebar);

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    agentQuery.value = button.dataset.prompt;
    renderAgentProposal(agentQuery.value);
  });
});

$('[data-agent-form]').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = agentQuery.value.trim();
  if (query) renderAgentProposal(query);
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openDrawer();
  }
  if (event.key === 'Escape') { closeDrawer(); closeSidebar(); }
});

loadProjection();
