import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVideoProductionCase,
  validateVideoProductionCase,
} from "../src/index.mjs";

const input = {
  signal: {
    id: "aw_NlbKzVyY",
    title: "Introducing Replit Design",
    channel: "Replit",
    sourceUrl: "https://www.youtube.com/watch?v=aw_NlbKzVyY",
    category: "AI网页与设计",
    status: "research_now",
    whyItMatters: "官方视频在6.455小时内新增1500次公开播放，但视频增长不代表产品采用。",
    claimBoundary: "设计草图通过；生产代码交付未证明",
  },
  research: {
    productName: "Replit Design",
    audience: ["独立开发者", "产品经理", "需要快速探索界面的创作者"],
    audienceProblem: "需要快速把文字需求转成可讨论的桌面和移动界面，但不想把设计稿误当成生产代码",
    contentPromise: "展示一次可复现的独立测试，并明确设计探索和生产交付的边界",
    nonClaims: ["不声称全球或中国市场火爆", "不声称能直接交付生产代码", "不声称免费额度或成本具有普遍性"],
    testEvidenceState: "available",
    rightsState: "needs_review",
    securityState: "passed_for_sandbox",
    methodEvidenceRef: "test-method",
    limitations: ["本次测试没有证明导出、部署、长期维护和复杂交互能力"],
    evidence: [
      {
        evidenceId: "momentum-1",
        type: "momentum_signal",
        claim: "官方视频出现确认增长",
        observation: "官方视频在6.455小时内新增1500次公开播放",
        sourceRef: "today-brief:aw_NlbKzVyY",
      },
      {
        evidenceId: "test-method",
        type: "test_method",
        claim: "测试使用固定中文需求和隔离环境",
        observation: "未连接外部账号、数据库、支付信息或生产文件",
        sourceRef: "toolradar-replit-design-real-test-v1",
      },
      {
        evidenceId: "design-result",
        type: "product_test_positive",
        claim: "Design Canvas生成了完整设计",
        observation: "约3分钟内生成了桌面和390px移动设计稿，并可继续进行可视化修改",
        sourceRef: "native-owner-dashboard:replit-result",
      },
      {
        evidenceId: "build-limit",
        type: "product_test_limitation",
        claim: "Build阶段没有可预览成品",
        observation: "切换到Build后仍显示Nothing to preview yet，没有证据证明已生成可运行页面",
        sourceRef: "native-owner-dashboard:replit-result",
      },
    ],
    verdict: {
      summary: "Replit Design适合快速设计探索，但当前证据不足以证明它能直接交付生产页面",
      evidenceRefs: ["design-result", "build-limit"],
    },
  },
  target: {
    language: "zh-CN",
    format: "9:16 portrait",
    durationSeconds: 90,
  },
};

test("builds a source-bound topic brief and full original script", () => {
  const productionCase = buildVideoProductionCase(input, {
    generatedAt: "2026-08-04T08:30:00.000Z",
  });

  assert.equal(validateVideoProductionCase(productionCase), true);
  assert.equal(productionCase.caseId, "video-case:aw_nlbkzvyy");
  assert.equal(productionCase.status, "SCRIPT_READY_FOR_HUMAN_REVIEW");
  assert.equal(productionCase.topicBrief.evidenceRefs.length, 4);
  assert.equal(productionCase.script.voiceoverSegments.length, 7);
  assert.match(productionCase.script.fullVoiceover, /约3分钟内生成了桌面和390px移动设计稿/);
  assert.match(productionCase.script.fullVoiceover, /不能证明产品已经普及/);
  assert.equal(productionCase.nextMilestone, "STORYBOARD_AND_ASSET_MANIFEST");
});

test("keeps publication and source-video reuse blocked", () => {
  const productionCase = buildVideoProductionCase(input);
  assert.equal(productionCase.gates.publicationAllowed, false);
  assert.equal(productionCase.policy.automaticPublishingAllowed, false);
  assert.equal(productionCase.policy.sourceVideoDownloadAllowed, false);
  assert.equal(productionCase.policy.sourceVideoReuseAllowed, false);
});

test("rejects verdict evidence references that do not exist", () => {
  const invalid = structuredClone(input);
  invalid.research.verdict.evidenceRefs = ["missing-evidence"];
  assert.throws(
    () => buildVideoProductionCase(invalid),
    /unknown verdict evidence ref/,
  );
});

test("rejects a case that removes the claim boundary", () => {
  const productionCase = buildVideoProductionCase(input);
  const invalid = {
    ...productionCase,
    script: { ...productionCase.script, fullVoiceover: "这是一个没有边界的宣传稿。" },
  };
  assert.throws(
    () => validateVideoProductionCase(invalid),
    /product-adoption claim boundary/,
  );
});
