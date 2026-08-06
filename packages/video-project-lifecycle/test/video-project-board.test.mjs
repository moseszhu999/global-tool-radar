import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {validateVideoProject} from '../src/index.mjs';

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('Video Projects page is bound to the canonical ledger snapshot', async () => {
  const [html, script, css, ledgerText] = await Promise.all([
    read('apps/web/video-projects.html'),
    read('apps/web/video-projects.mjs'),
    read('apps/web/video-projects.css'),
    read('apps/web/data/replit-design-video-project-ledger.json'),
  ]);
  const ledger = JSON.parse(ledgerText);
  assert.equal(validateVideoProject(ledger.project), true);
  assert.match(html, /视频项目看板/);
  assert.match(html, /12 阶段生产链/);
  assert.match(html, /不确认真实录屏、正式配音、最终视频、发布或分析数据/);
  assert.match(script, /replit-design-video-project-ledger\.json/);
  assert.match(script, /DOWNSTREAM_CLAIM_CONFLICT/);
  assert.match(css, /\.stage\.current/);
});

test('checked-in project snapshot stays at the real owned-media blocker', async () => {
  const ledger = JSON.parse(await read('apps/web/data/replit-design-video-project-ledger.json'));
  assert.equal(ledger.project.stage, 'STORYBOARD_READY');
  assert.equal(ledger.project.status, 'BLOCKED');
  assert.equal(ledger.project.nextEvent, 'RESUME_PROJECT');
  assert.deepEqual(ledger.project.artifacts.map((item) => item.type), ['topic_brief','production_case','storyboard_package']);
  assert.equal(ledger.project.artifacts.some((item) => item.type === 'mac_remotion_render_run'), false);
  assert.equal(ledger.project.artifacts.some((item) => item.type === 'bound_publication_receipt'), false);
  assert.match(ledger.project.blockedReason, /asset:test-recording/);
  assert.match(ledger.project.blockedReason, /asset:build-limit-recording/);
  assert.match(ledger.project.blockedReason, /asset:voiceover/);
});

test('source content digests match the ledger artifact bindings', async () => {
  const ledger = JSON.parse(await read('apps/web/data/replit-design-video-project-ledger.json'));
  assert.equal(ledger.sourceDigests.topicBriefSha256, ledger.project.artifacts[0].digest);
  assert.equal(ledger.sourceDigests.productionCaseSha256, ledger.project.artifacts[1].digest);
  assert.equal(ledger.sourceDigests.storyboardPackageSha256, ledger.project.artifacts[2].digest);
});
