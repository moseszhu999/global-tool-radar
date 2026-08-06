#!/usr/bin/env node
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {
  buildDeepSeekAdvisoryPrompt,
  createDeepSeekAdvisoryReceipt,
  probeSharedMacRunner,
  validateDeepSeekAdvisoryReceipt,
  validateSharedMacRunnerReceipt,
} from './index.mjs';

const args = process.argv.slice(2);
const command = args.shift();
const value = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const writeJson = async (output, payload) => {
  const path = resolve(output);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return path;
};

if (command === 'probe') {
  const receipt = await probeSharedMacRunner({
    baseUrl: value('--base-url', 'http://127.0.0.1:8765'),
    timeoutMs: Number(value('--timeout-ms', '5000')),
    observedAt: value('--observed-at', new Date().toISOString()),
  });
  validateSharedMacRunnerReceipt(receipt);
  const output = await writeJson(value('--output', 'artifacts/shared-macrunner-contract-receipt.json'), receipt);
  console.log(JSON.stringify({service: receipt.service, operations: receipt.operations.length, output, receiptDigest: receipt.receiptDigest}, null, 2));
} else if (command === 'prompt') {
  const prompt = buildDeepSeekAdvisoryPrompt({
    exactHead: value('--exact-head'),
    profile: value('--profile'),
  });
  const output = resolve(value('--output', 'artifacts/local-deepseek-advisory-prompt.txt'));
  await mkdir(dirname(output), {recursive: true});
  await writeFile(output, `${prompt}\n`, 'utf8');
  console.log(JSON.stringify({output, bytes: Buffer.byteLength(prompt)}, null, 2));
} else if (command === 'deepseek-receipt') {
  const outputText = await readFile(resolve(value('--model-output')), 'utf8');
  const receipt = createDeepSeekAdvisoryReceipt({
    exactHead: value('--exact-head'),
    profile: value('--profile'),
    model: value('--model'),
    output: outputText,
    startedAt: value('--started-at'),
    completedAt: value('--completed-at'),
  });
  validateDeepSeekAdvisoryReceipt(receipt);
  const output = await writeJson(value('--output', 'artifacts/local-deepseek-advisory-receipt.json'), receipt);
  console.log(JSON.stringify({model: receipt.model, output, outputSha256: receipt.outputSha256, receiptDigest: receipt.receiptDigest}, null, 2));
} else {
  throw new Error('command must be one of: probe, prompt, deepseek-receipt');
}
