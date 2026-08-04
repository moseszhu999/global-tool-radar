const freeze = (value) => Object.freeze(value);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value, field) {
  if (value === null || value === undefined || value === "") return null;
  return requiredString(value, field);
}

function requiredArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty array`);
  }
  return value;
}

function validTimestamp(value, field) {
  const normalized = requiredString(value, field);
  if (Number.isNaN(new Date(normalized).getTime())) {
    throw new TypeError(`${field} must be a valid timestamp`);
  }
  return normalized;
}

function slug(value) {
  return requiredString(value, "id")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values)];
}

function chineseCharacterCount(value) {
  return [...String(value)].filter((character) => /[\u3400-\u9fffA-Za-z0-9]/.test(character)).length;
}

function estimateDurationSeconds(text) {
  return Math.max(1, Math.ceil(chineseCharacterCount(text) / 4.1));
}

function mapEvidence(research) {
  const evidence = requiredArray(research.evidence, "research.evidence").map((item, index) => {
    const evidenceId = requiredString(item.evidenceId, `research.evidence[${index}].evidenceId`);
    return freeze({
      evidenceId,
      type: requiredString(item.type, `research.evidence[${index}].type`),
      claim: requiredString(item.claim, `research.evidence[${index}].claim`),
      observation: requiredString(item.observation, `research.evidence[${index}].observation`),
      sourceRef: requiredString(item.sourceRef, `research.evidence[${index}].sourceRef`),
      observedAt: optionalString(item.observedAt, `research.evidence[${index}].observedAt`),
    });
  });
  const ids = evidence.map((item) => item.evidenceId);
  if (new Set(ids).size !== ids.length) throw new TypeError("evidenceId values must be unique");
  return freeze(evidence);
}

function segment(role, text, claimRefs = []) {
  const normalizedText = requiredString(text, `script.${role}`);
  return freeze({
    order: 0,
    role,
    text: normalizedText,
    estimatedSeconds: estimateDurationSeconds(normalizedText),
    claimRefs: freeze(unique(claimRefs)),
  });
}

function buildScriptSegments({ research, evidence }) {
  const evidenceByType = new Map(evidence.map((item) => [item.type, item]));
  const growth = evidenceByType.get("momentum_signal") ?? evidence[0];
  const positiveTest = evidenceByType.get("product_test_positive") ?? evidence[1] ?? evidence[0];
  const limitationTest = evidenceByType.get("product_test_limitation") ?? evidence.at(-1);
  const limitation = requiredArray(research.limitations, "research.limitations")[0];

  const raw = [
    segment(
      "hook",
      `${research.productName}，真的能把一句中文需求变成可用界面吗？我们做了一次独立实测。`,
      [positiveTest.evidenceId],
    ),
    segment(
      "why_now",
      "它进入选题，不是因为“看起来很火”，而是官方视频在6.455小时新增1500次播放；这只代表关注增长，不能证明产品已经普及。",
      [growth.evidenceId],
    ),
    segment(
      "test_method",
      "我们用固定需求，在隔离环境测试，不接真实账号、数据库、支付或生产文件。",
      research.methodEvidenceRef ? [research.methodEvidenceRef] : [],
    ),
    segment(
      "verified_result",
      `${positiveTest.observation}。设计探索这一关，通过。`,
      [positiveTest.evidenceId],
    ),
    segment(
      "limitation",
      `${limitationTest.observation}。所以目前没有证据证明它能直接生成并交付生产页面；${limitation}。`,
      [limitationTest.evidenceId],
    ),
    segment(
      "verdict",
      `我的结论是：${research.verdict.summary}。它适合快速出草图、对齐想法，不应把设计稿直接当成上线代码。`,
      research.verdict.evidenceRefs,
    ),
    segment(
      "cta",
      "下一条，我们继续测修改、导出和交付。你想看它和谁对比？",
      [],
    ),
  ];

  return freeze(raw.map((item, index) => freeze({ ...item, order: index + 1 })));
}

function buildTopicBrief({ signal, research, evidence }) {
  const evidenceRefs = evidence.map((item) => item.evidenceId);
  return freeze({
    schemaVersion: "toolradar.topic-brief.v1",
    topicId: `topic:${slug(signal.id)}`,
    sourceSignalId: requiredString(signal.id, "signal.id"),
    productName: requiredString(research.productName, "research.productName"),
    workingTitle: `${research.productName} 实测：能快速出设计，但能否直接交付？`,
    category: requiredString(signal.category, "signal.category"),
    audience: freeze(requiredArray(research.audience, "research.audience").map((item) => requiredString(item, "research.audience[]"))),
    audienceProblem: requiredString(research.audienceProblem, "research.audienceProblem"),
    contentPromise: requiredString(research.contentPromise, "research.contentPromise"),
    whyNow: requiredString(signal.whyItMatters, "signal.whyItMatters"),
    angle: "独立实测：把设计探索能力与生产交付能力分开评价",
    claimBoundary: requiredString(signal.claimBoundary, "signal.claimBoundary"),
    nonClaims: freeze(requiredArray(research.nonClaims, "research.nonClaims").map((item) => requiredString(item, "research.nonClaims[]"))),
    evidenceRefs: freeze(evidenceRefs),
  });
}

function buildPlatformCopy({ topicBrief, research }) {
  const tags = unique([research.productName, topicBrief.category, "AI工具实测", "效率工具"]);
  return freeze({
    douyin: freeze({
      title: `${research.productName}实测：3分钟出设计，但别急着当成成品`,
      description: `我们用固定任务独立测试 ${research.productName}：设计探索有效，生产交付仍需验证。所有结论仅限本次测试证据。`,
      tags: freeze(tags),
    }),
    bilibili: freeze({
      title: `${research.productName}真实测试：设计稿很快，Build为什么没有成品？`,
      description: "从增长信号、测试方法、首个设计结果到Build限制，完整展示本次独立验证。不会把官方视频增长解释为产品采用，也不会把设计稿宣传成生产代码。",
      tags: freeze(tags),
    }),
  });
}

export function buildVideoProductionCase(
  { signal, research, target },
  { generatedAt = new Date().toISOString() } = {},
) {
  if (!signal || typeof signal !== "object") throw new TypeError("signal is required");
  if (!research || typeof research !== "object") throw new TypeError("research is required");
  if (!target || typeof target !== "object") throw new TypeError("target is required");

  const normalizedGeneratedAt = validTimestamp(generatedAt, "generatedAt");
  const evidence = mapEvidence(research);
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
  const verdictRefs = requiredArray(research.verdict?.evidenceRefs, "research.verdict.evidenceRefs")
    .map((item) => requiredString(item, "research.verdict.evidenceRefs[]"));
  for (const ref of verdictRefs) {
    if (!evidenceIds.has(ref)) throw new TypeError(`unknown verdict evidence ref: ${ref}`);
  }

  const topicBrief = buildTopicBrief({ signal, research, evidence });
  const voiceoverSegments = buildScriptSegments({ research: { ...research, verdict: { ...research.verdict, evidenceRefs: verdictRefs } }, evidence });
  const fullVoiceover = voiceoverSegments.map((item) => item.text).join("\n");
  const estimatedDurationSeconds = voiceoverSegments.reduce((sum, item) => sum + item.estimatedSeconds, 0);
  const targetDurationSeconds = Number(target.durationSeconds);
  if (!Number.isInteger(targetDurationSeconds) || targetDurationSeconds < 30 || targetDurationSeconds > 180) {
    throw new TypeError("target.durationSeconds must be an integer between 30 and 180");
  }

  const script = freeze({
    schemaVersion: "toolradar.original-script.v1",
    scriptId: `script:${slug(signal.id)}:v1`,
    version: 1,
    language: requiredString(target.language, "target.language"),
    format: requiredString(target.format, "target.format"),
    targetDurationSeconds,
    estimatedDurationSeconds,
    titleOptions: freeze([
      `${research.productName}实测：3分钟出设计，但能直接上线吗？`,
      `别被演示骗了：${research.productName}真正能交付到哪一步`,
      `${research.productName}首轮实测：设计通过，生产交付未证明`,
    ]),
    coverText: `${research.productName}\n设计快 ≠ 能上线`,
    voiceoverSegments,
    fullVoiceover,
    platformCopy: buildPlatformCopy({ topicBrief, research }),
    reviewChecklist: freeze([
      "每个事实性结论必须绑定 evidenceRef",
      "不得把 YouTube 视频增长解释为产品采用或地区热度",
      "不得声称生产交付已经通过",
      "不得使用或下载来源视频作为成片素材",
      "发布前必须完成人工版权、事实和平台规格审核",
    ]),
  });

  const claimRefs = unique(voiceoverSegments.flatMap((item) => item.claimRefs));
  for (const ref of claimRefs) {
    if (!evidenceIds.has(ref)) throw new TypeError(`unknown script claim ref: ${ref}`);
  }

  return freeze({
    schemaVersion: "toolradar.video-production-case.v1",
    caseId: `video-case:${slug(signal.id)}`,
    generatedAt: normalizedGeneratedAt,
    status: "SCRIPT_READY_FOR_HUMAN_REVIEW",
    sourceSignal: freeze({
      id: requiredString(signal.id, "signal.id"),
      title: requiredString(signal.title, "signal.title"),
      channel: requiredString(signal.channel, "signal.channel"),
      sourceUrl: requiredString(signal.sourceUrl, "signal.sourceUrl"),
      observedStatus: optionalString(signal.status, "signal.status"),
    }),
    gates: freeze({
      testEvidenceState: requiredString(research.testEvidenceState, "research.testEvidenceState"),
      rightsState: requiredString(research.rightsState, "research.rightsState"),
      securityState: requiredString(research.securityState, "research.securityState"),
      humanScriptReviewRequired: true,
      publicationAllowed: false,
    }),
    topicBrief,
    researchEvidence: evidence,
    script,
    nextMilestone: "STORYBOARD_AND_ASSET_MANIFEST",
    policy: freeze({
      sourceVideoDownloadAllowed: false,
      sourceVideoReuseAllowed: false,
      automaticPublishingAllowed: false,
      unsupportedClaimAllowed: false,
      formalPublicationPerformed: false,
    }),
  });
}

export function validateVideoProductionCase(value) {
  if (value?.schemaVersion !== "toolradar.video-production-case.v1") {
    throw new TypeError("unsupported video production case schema");
  }
  if (value.status !== "SCRIPT_READY_FOR_HUMAN_REVIEW") {
    throw new TypeError("case must remain at script review state");
  }
  if (value.gates?.publicationAllowed !== false) {
    throw new TypeError("publication must remain blocked before review");
  }
  if (value.policy?.automaticPublishingAllowed !== false || value.policy?.formalPublicationPerformed !== false) {
    throw new TypeError("automatic or performed publication is not allowed");
  }
  if (value.policy?.sourceVideoDownloadAllowed !== false || value.policy?.sourceVideoReuseAllowed !== false) {
    throw new TypeError("source video download and reuse must remain disabled");
  }
  if (!Array.isArray(value.researchEvidence) || value.researchEvidence.length < 2) {
    throw new TypeError("at least two evidence items are required");
  }
  const evidenceIds = new Set(value.researchEvidence.map((item) => requiredString(item.evidenceId, "evidenceId")));
  for (const segment of requiredArray(value.script?.voiceoverSegments, "script.voiceoverSegments")) {
    for (const ref of segment.claimRefs ?? []) {
      if (!evidenceIds.has(ref)) throw new TypeError(`script contains unknown evidence ref: ${ref}`);
    }
  }
  if (!String(value.script?.fullVoiceover ?? "").includes("不能证明产品已经普及")) {
    throw new TypeError("script must preserve the product-adoption claim boundary");
  }
  return true;
}
