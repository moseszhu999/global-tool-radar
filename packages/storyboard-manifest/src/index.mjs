const freeze = (value) => Object.freeze(value);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty array`);
  }
  return value;
}

function shotTemplate(role) {
  const templates = {
    hook: {
      visualType: "generated_title_card",
      instruction: "使用自有品牌模板，显示工具名、核心问题和‘独立实测’标记；不得使用来源视频画面。",
      onScreenText: "Replit Design\n3分钟出设计，能直接上线吗？",
      assetIds: ["asset:title-card", "asset:voiceover", "asset:subtitles"],
    },
    why_now: {
      visualType: "generated_evidence_card",
      instruction: "从本仓库增长快照生成简洁数据卡，显示6.455小时和新增1500播放，并同时显示‘不等于产品采用’。",
      onScreenText: "6.455小时 +1500播放\n关注增长 ≠ 产品普及",
      assetIds: ["asset:momentum-card", "asset:voiceover", "asset:subtitles"],
    },
    test_method: {
      visualType: "owned_screen_recording",
      instruction: "录制自有测试浏览器：固定中文需求、隔离账号、无数据库/支付/生产文件；敏感区域必须打码。",
      onScreenText: "固定任务 · 隔离环境 · 无敏感数据",
      assetIds: ["asset:test-recording", "asset:voiceover", "asset:subtitles"],
    },
    verified_result: {
      visualType: "owned_screen_recording",
      instruction: "使用本次测试的自有录屏，展示桌面和390px移动设计稿，以及一次可视化修改；不使用官方演示素材。",
      onScreenText: "约3分钟\n桌面 + 390px设计稿",
      assetIds: ["asset:test-recording", "asset:result-callout", "asset:voiceover", "asset:subtitles"],
    },
    limitation: {
      visualType: "owned_screen_recording",
      instruction: "展示自有测试中Build阶段无可预览内容的画面，并加醒目的‘生产交付未证明’结论卡。",
      onScreenText: "Build：无可预览成品\n生产交付未证明",
      assetIds: ["asset:build-limit-recording", "asset:limit-callout", "asset:voiceover", "asset:subtitles"],
    },
    verdict: {
      visualType: "generated_comparison_card",
      instruction: "左右对比：适合‘快速出草图/对齐想法’，不适合‘直接当上线代码’。",
      onScreenText: "适合：设计探索\n不应：直接当上线代码",
      assetIds: ["asset:verdict-card", "asset:voiceover", "asset:subtitles"],
    },
    cta: {
      visualType: "generated_end_card",
      instruction: "自有品牌结束卡，提出下一次修改/导出/交付测试和对比问题。",
      onScreenText: "下一步测：修改 · 导出 · 交付\n你想看它和谁对比？",
      assetIds: ["asset:end-card", "asset:voiceover", "asset:subtitles"],
    },
  };
  return templates[role] ?? templates.verdict;
}

function buildAssets(productionCase) {
  const scriptId = requiredString(productionCase.script?.scriptId, "script.scriptId");
  return freeze([
    freeze({ assetId: "asset:title-card", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: scriptId, required: true }),
    freeze({ assetId: "asset:momentum-card", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: "momentum-1", required: true }),
    freeze({ assetId: "asset:test-recording", kind: "screen_recording", ownership: "owned_recording", state: "human_capture_required", sourceRef: "test-method", required: true }),
    freeze({ assetId: "asset:result-callout", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: "design-result", required: true }),
    freeze({ assetId: "asset:build-limit-recording", kind: "screen_recording", ownership: "owned_recording", state: "human_capture_required", sourceRef: "build-limit", required: true }),
    freeze({ assetId: "asset:limit-callout", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: "build-limit", required: true }),
    freeze({ assetId: "asset:verdict-card", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: scriptId, required: true }),
    freeze({ assetId: "asset:end-card", kind: "graphic", ownership: "owned_generated", state: "ready_to_generate", sourceRef: scriptId, required: true }),
    freeze({ assetId: "asset:voiceover", kind: "voiceover", ownership: "owned_generated", state: "ready_for_tts", sourceRef: scriptId, required: true }),
    freeze({ assetId: "asset:subtitles", kind: "subtitle", ownership: "owned_generated", state: "ready_to_generate", sourceRef: scriptId, required: true }),
    freeze({ assetId: "asset:music-bed", kind: "music", ownership: "licensed_or_original_only", state: "optional", sourceRef: null, required: false }),
  ]);
}

function buildCaptureTasks() {
  return freeze([
    freeze({
      taskId: "capture:design-flow",
      assetId: "asset:test-recording",
      humanBoundary: "Replit authentication must be completed by a human in a normal browser",
      steps: freeze([
        "Open the existing isolated Replit test project",
        "Confirm no personal or production data is visible",
        "Submit the canonical Chinese prompt once",
        "Record the first complete desktop result",
        "Switch to the 390px view and record the mobile result",
        "Perform one harmless visual edit and record the change",
      ]),
      redactionRequired: true,
    }),
    freeze({
      taskId: "capture:build-limit",
      assetId: "asset:build-limit-recording",
      humanBoundary: "Use only the existing test project and do not deploy or purchase anything",
      steps: freeze([
        "Switch from Design to Build",
        "Record the visible no-preview state",
        "Do not infer code generation or deployment success",
      ]),
      redactionRequired: true,
    }),
  ]);
}

export function buildStoryboardManifest(productionCase, { generatedAt = new Date().toISOString() } = {}) {
  if (productionCase?.schemaVersion !== "toolradar.video-production-case.v1") {
    throw new TypeError("video production case v1 is required");
  }
  if (productionCase.status !== "SCRIPT_READY_FOR_HUMAN_REVIEW") {
    throw new TypeError("script must be ready for human review");
  }
  if (Number.isNaN(new Date(generatedAt).getTime())) {
    throw new TypeError("generatedAt must be a valid timestamp");
  }

  const evidenceIds = new Set(requiredArray(productionCase.researchEvidence, "researchEvidence").map((item) => item.evidenceId));
  const assets = buildAssets(productionCase);
  const assetIds = new Set(assets.map((item) => item.assetId));
  let cursor = 0;
  const shots = requiredArray(productionCase.script?.voiceoverSegments, "script.voiceoverSegments").map((segment, index) => {
    const template = shotTemplate(segment.role);
    const startSecond = cursor;
    const endSecond = cursor + segment.estimatedSeconds;
    cursor = endSecond;
    for (const ref of segment.claimRefs ?? []) {
      if (!evidenceIds.has(ref)) throw new TypeError(`unknown evidence ref in script segment: ${ref}`);
    }
    for (const assetId of template.assetIds) {
      if (!assetIds.has(assetId)) throw new TypeError(`unknown storyboard asset: ${assetId}`);
    }
    return freeze({
      shotId: `shot:${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      startSecond,
      endSecond,
      durationSeconds: segment.estimatedSeconds,
      narrationRole: segment.role,
      narrationText: segment.text,
      visualType: template.visualType,
      visualInstruction: template.instruction,
      onScreenText: template.onScreenText,
      evidenceRefs: freeze([...(segment.claimRefs ?? [])]),
      requiredAssetIds: freeze([...template.assetIds]),
      transitionOut: index === productionCase.script.voiceoverSegments.length - 1 ? "none" : "cut",
    });
  });

  return freeze({
    schemaVersion: "toolradar.storyboard-package.v1",
    packageId: `${productionCase.caseId}:storyboard:v1`,
    generatedAt,
    sourceCaseId: productionCase.caseId,
    status: "STORYBOARD_AND_ASSET_MANIFEST_READY_FOR_REVIEW",
    format: productionCase.script.format,
    timelineDurationSeconds: cursor,
    storyboard: freeze({
      schemaVersion: "toolradar.storyboard.v1",
      shots: freeze(shots),
    }),
    assetManifest: freeze({
      schemaVersion: "toolradar.asset-manifest.v1",
      assets,
      captureTasks: buildCaptureTasks(),
    }),
    gates: freeze({
      humanStoryboardReviewRequired: true,
      humanCaptureRequired: true,
      renderAllowed: false,
      publicationAllowed: false,
    }),
    nextMilestone: "OWNED_ASSET_CAPTURE_AND_RENDER",
    policy: freeze({
      sourceVideoDownloadAllowed: false,
      sourceVideoReuseAllowed: false,
      thirdPartyFootageAllowed: false,
      licensedMusicOnly: true,
      automaticPublishingAllowed: false,
    }),
  });
}

export function validateStoryboardManifest(value) {
  if (value?.schemaVersion !== "toolradar.storyboard-package.v1") {
    throw new TypeError("unsupported storyboard package schema");
  }
  if (value.gates?.renderAllowed !== false || value.gates?.publicationAllowed !== false) {
    throw new TypeError("render and publication must remain blocked before asset capture review");
  }
  if (value.policy?.sourceVideoDownloadAllowed !== false || value.policy?.sourceVideoReuseAllowed !== false) {
    throw new TypeError("source video use must remain disabled");
  }
  const assets = requiredArray(value.assetManifest?.assets, "assetManifest.assets");
  const assetIds = new Set(assets.map((asset) => requiredString(asset.assetId, "assetId")));
  for (const asset of assets) {
    if (!["owned_generated", "owned_recording", "licensed_or_original_only"].includes(asset.ownership)) {
      throw new TypeError(`unsupported asset ownership: ${asset.ownership}`);
    }
  }
  let expectedStart = 0;
  for (const shot of requiredArray(value.storyboard?.shots, "storyboard.shots")) {
    if (shot.startSecond !== expectedStart) throw new TypeError("storyboard timeline must be contiguous");
    if (shot.endSecond <= shot.startSecond) throw new TypeError("shot duration must be positive");
    expectedStart = shot.endSecond;
    for (const assetId of shot.requiredAssetIds ?? []) {
      if (!assetIds.has(assetId)) throw new TypeError(`shot references unknown asset: ${assetId}`);
    }
  }
  if (expectedStart !== value.timelineDurationSeconds) {
    throw new TypeError("storyboard duration must equal the final shot end");
  }
  return true;
}
