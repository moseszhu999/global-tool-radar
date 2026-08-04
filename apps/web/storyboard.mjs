const DATA_URL = "./data/replit-design-storyboard-package.json";
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "UNKNOWN").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function validate(value) {
  if (value?.schemaVersion !== "toolradar.storyboard-package.v1") throw new Error("STORYBOARD_SCHEMA_INVALID");
  if (value.gates?.renderAllowed !== false || value.gates?.publicationAllowed !== false) {
    throw new Error("RENDER_OR_PUBLICATION_GATE_INVALID");
  }
  return value;
}

function render(value) {
  $("[data-duration]").textContent = `${value.timelineDurationSeconds}秒时间轴`;
  $("[data-shots]").textContent = `${value.storyboard.shots.length}个镜头`;
  $("[data-assets]").textContent = `${value.assetManifest.assets.length}个素材项`;
  $("[data-next]").textContent = `下一步 ${value.nextMilestone}`;
  $("[data-status]").textContent = value.status;

  $("[data-timeline]").innerHTML = value.storyboard.shots.map((shot) => `
    <article>
      <div class="time"><b>${shot.startSecond}s</b><span>→ ${shot.endSecond}s</span></div>
      <div class="shot-copy">
        <span>${esc(shot.visualType)}</span>
        <h3>${esc(shot.onScreenText)}</h3>
        <p>${esc(shot.visualInstruction)}</p>
        <small>旁白：${esc(shot.narrationText)}</small>
        <small>素材：${esc(shot.requiredAssetIds.join(", "))}</small>
      </div>
    </article>`).join("");

  $("[data-assets-list]").innerHTML = value.assetManifest.assets.map((asset) => `
    <article><div><strong>${esc(asset.assetId)}</strong><span>${esc(asset.kind)} · ${esc(asset.ownership)}</span></div><b>${esc(asset.state)}</b></article>`).join("");

  $("[data-tasks]").innerHTML = value.assetManifest.captureTasks.map((task) => `
    <article>
      <h3>${esc(task.taskId)}</h3>
      <p>${esc(task.humanBoundary)}</p>
      <ol>${task.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
      <small>redactionRequired=${esc(task.redactionRequired)}</small>
    </article>`).join("");
}

try {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  render(validate(await response.json()));
} catch (error) {
  document.querySelector("main").innerHTML = `<section class="card"><h1>读取失败</h1><p>${esc(error.message)}</p></section>`;
}
