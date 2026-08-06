import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {createMacRemotionRunnerClient} from '../../../packages/mac-remotion-runner-client/src/index.mjs';
import {runMacRemotionRender, validateMacRemotionRenderReceipt} from '../../../packages/mac-remotion-render-orchestration/src/index.mjs';

const parseArgs = (argv) => {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [key, inline] = token.slice(2).split('=', 2);
    values[key] = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
  }
  return values;
};

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error('Usage: node apps/worker/src/run-mac-remotion-render.mjs --input <job.json> --output <receipt.json>');
  process.exitCode = 1;
} else {
  try {
    const baseUrl = process.env.MAC_REMOTION_BASE_URL;
    const token = process.env.ACTION_TOKEN;
    if (!baseUrl) throw new Error('MAC_REMOTION_BASE_URL is required');
    if (!token) throw new Error('ACTION_TOKEN is required');
    const jobRequest = JSON.parse(await readFile(resolve(args.input), 'utf8'));
    const client = createMacRemotionRunnerClient({baseUrl, token});
    const receipt = await runMacRemotionRender({client, jobRequest});
    validateMacRemotionRenderReceipt(receipt);
    const outputPath = resolve(args.output);
    await mkdir(dirname(outputPath), {recursive: true});
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({status: receipt.status, jobId: receipt.jobId, receiptDigest: receipt.receiptDigest, outputPath}));
    process.exitCode = receipt.status === 'COMPLETED' ? 0 : 2;
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}
