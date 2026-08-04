const DATA_URL = "./data/replit-design-production-case.json";
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "UNKNOWN").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function validate(value) {
  if (value?.schemaVersion !== "toolradar.video-production-case.v1") {
    throw new Error("VIDEO_PRODUCTION_CASE_SCHEMA_INVALID");
  }
  if (value.policy?.automaticPublishingAllowed !== false) {
    throw new Error("AUTOMATIC_PUBLISHING_MUST_REMAIN_DISABLED");
  }
  if (!Array.isArray(value.script?.voiceoverSegments)) {
    throw new Error("SCRIPT_SEGMENTS_REQUIRED");
  }
  return value;
}

function renderDefinitionList(target, rows) {
  target.innerHTML = rows.map(([term, value]) => `<dt>${esc(term)}</dt><dd>${esc(value)}</dd>`).join("");
}

function renderPlatform(target, value) {
  target.innerHTML = `
    <h3>${esc(value.title)}</h3>
    <p>${esc(value.description)}</p>
    <div class="tags">${value.tags.map((tag) => `<span>#${esc(tag)}</span>`).join("")}</div>`;
}

function render(value) {
  const brief = value.topicBrief;
  const script = value.script;
  $("[data-title]").textContent = brief.workingTitle;
  $("[data-promise]").textContent = brief.contentPromise;
  $("[data-status]").textContent = value.status;
  $("[data-duration]").textContent = `${script.estimatedDurationSeconds}s估算 / ${script.targetDurationSeconds}s目标`;
  $("[data-next]").textContent = `下一步 ${value.nextMilestone}`;

  renderDefinitionList($("[data-topic]"), [
    ["目标受众", brief.audience.join("、")],
    ["受众问题", brief.audienceProblem],
    ["为什么现在做", brief.whyNow],
    ["内容角度", brief.angle],
    ["结论边界", brief.claimBoundary],
    ["禁止声称", brief.nonClaims.join("；")],
  ]);

  renderDefinitionList($("[data-gates]"), [
    ["实测证据", value.gates.testEvidenceState],
    ["版权状态", value.gates.rightsState],
    ["安全状态", value.gates.securityState],
    ["脚本人工审核", String(value.gates.humanScriptReviewRequired)],
    ["允许发布", String(value.gates.publicationAllowed)],
  ]);

  $("[data-script]").innerHTML = script.voiceoverSegments.map((segment) => `
    <article>
      <div><b>${String(segment.order).padStart(2, "0")}</b><span>${esc(segment.role)} · ${segment.estimatedSeconds}s</span></div>
      <p>${esc(segment.text)}</p>
      <small>evidence: ${esc(segment.claimRefs.join(", ") || "narrative_only")}</small>
    </article>`).join("");

  renderPlatform($("[data-douyin]"), script.platformCopy.douyin);
  renderPlatform($("[data-bilibili]"), script.platformCopy.bilibili);

  $("[data-evidence]").innerHTML = value.researchEvidence.map((item) => `
    <article>
      <span>${esc(item.type)}</span>
      <h3>${esc(item.claim)}</h3>
      <p>${esc(item.observation)}</p>
      <small>${esc(item.evidenceId)} · ${esc(item.sourceRef)}</small>
    </article>`).join("");

  $("[data-copy]").addEventListener("click", async () => {
    await navigator.clipboard.writeText(script.fullVoiceover);
    $("[data-copy]").textContent = "已复制";
  });
}

try {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  render(validate(await response.json()));
} catch (error) {
  $("[data-title]").textContent = `生产任务读取失败：${error.message}`;
}
