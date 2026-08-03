const DATA_URL = './data/today-brief.json';
const state = { brief: null, filter: 'all' };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value) => Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '未知';
const decimal = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '未知';
const dateTime = (value) => value ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '未知';
const dateOnly = (value) => value ? new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '未知';

function validate(brief){
  if(brief?.schemaVersion !== 'toolradar.today-brief.v1') throw new Error('TODAY_BRIEF_SCHEMA_INVALID');
  if(!Array.isArray(brief.signals)) throw new Error('TODAY_BRIEF_SIGNALS_REQUIRED');
  if(brief.policy?.momentumIsFinalDecision !== false) throw new Error('MOMENTUM_DECISION_BOUNDARY_INVALID');
  if(brief.policy?.missingNumericValueIsZero !== false) throw new Error('MISSING_VALUE_POLICY_INVALID');
  return brief;
}

function renderStats(){
  const capture = state.brief.capture;
  $('[data-stat="channels"]').textContent = number(capture.channels);
  $('[data-stat="videos"]').textContent = number(capture.videos);
  $('[data-stat="measurements"]').textContent = number(capture.measurementPoints);
  $('[data-stat="confirmed"]').textContent = number(capture.videosWithConfirmedPositiveGrowth);
  $('[data-generated]').textContent = `更新于 ${dateTime(state.brief.generatedAt)}`;
  $('[data-report-date]').textContent = dateOnly(capture.latestCapturedAt);
  $('[data-capture-window]').textContent = `${dateTime(capture.firstCapturedAt)} → ${dateTime(capture.latestCapturedAt)} · ${decimal(capture.intervalHours,3)}小时`;
  const confirmed = capture.promotionGate === 'MOMENTUM_CONFIRMED';
  $('[data-gate-title]').textContent = confirmed ? 'YouTube增长已确认' : '仍在等待确认';
  $('[data-gate-copy]').textContent = confirmed
    ? `${number(capture.videosWithConfirmedPositiveGrowth)}条视频通过至少${capture.minimumConfirmationHours}小时的增长确认门。`
    : `当前间隔${decimal(capture.intervalHours,3)}小时，系统要求至少${capture.minimumConfirmationHours}小时。`;
}

function visibleSignals(){
  if(state.filter === 'all') return state.brief.signals;
  return state.brief.signals.filter((signal) => signal.status === state.filter);
}

function renderSignals(){
  const signals = visibleSignals();
  const container = $('[data-signals]');
  if(!signals.length){container.innerHTML = '<div class="empty">当前筛选下没有信号；缺失不等于0。</div>';return;}
  container.innerHTML = signals.map((signal) => `
    <article class="signal-card">
      <header>
        <div><h3>${esc(signal.title)}</h3><p class="source">${esc(signal.channel)} · 发布于 ${esc(dateTime(signal.publishedAt))}</p></div>
        <span class="signal-status ${signal.status === 'watch' ? 'watch' : ''}">${esc(signal.statusLabel)}</span>
      </header>
      <p class="where"><strong>发生在哪里：</strong>YouTube · ${esc(signal.channel)} 官方频道</p>
      <div class="growth-row">
        <div><small>当前播放量</small><strong>${esc(number(signal.latestViews))}</strong></div>
        <div><small>${decimal(state.brief.capture.intervalHours,3)}小时新增</small><strong class="positive">+${esc(number(signal.deltaViews))}</strong></div>
        <div><small>约每小时</small><strong>+${esc(number(Math.round(signal.viewsPerHour)))}</strong></div>
        <div><small>相对频道基线</small><strong>${Number.isFinite(signal.relativeRatio) ? `${decimal(signal.relativeRatio,2)}倍` : '未知'}</strong></div>
      </div>
      <p class="why">${esc(signal.whyItMatters)}</p>
      <footer><span class="category">${esc(signal.category)} · ${esc(signal.claimBoundary)}</span><a class="source-link" href="${esc(signal.sourceUrl)}" target="_blank" rel="noreferrer">核对原视频</a></footer>
    </article>`).join('');
}

$$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  $$('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  renderSignals();
}));

async function load(){
  try{
    const response = await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    state.brief = validate(await response.json());
    renderStats();
    renderSignals();
  }catch(error){
    $('[data-signals]').innerHTML = `<div class="empty">今日数据读取失败：${esc(error.message)}。页面不会把缺失数据显示成0。</div>`;
    $('[data-generated]').textContent = '数据暂不可用';
  }
}
load();
