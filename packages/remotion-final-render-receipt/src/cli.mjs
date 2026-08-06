#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildFinalRenderReceipt} from './index.mjs';
import {probeVideoWithFfprobe} from './ffprobe.mjs';

const parseArgs = (argv) => {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [rawKey, inline] = token.slice(2).split('=', 2);
    const value = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
    values[rawKey] = value;
  }
  return values;
};

const args = parseArgs(process.argv.slice(2));
if (!args.gate || !args.video || !args.output) {
  console.error('Usage: node src/cli.mjs --gate <gate.json> --video <final.mp4> --output <receipt.json>');
  process.exitCode = 1;
} else {
  try {
    const receipt = await buildFinalRenderReceipt({
      gateReceiptPath: args.gate,
      videoPath: args.video,
      probeVideo: probeVideoWithFfprobe,
    });
    const outputPath = resolve(args.output);
    await mkdir(dirname(outputPath), {recursive: true});
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      finalVideoVerified: receipt.finalVideoVerified,
      truthBoundary: receipt.truthBoundary,
      receiptDigest: receipt.receiptDigest,
      outputPath,
      errors: receipt.errors,
    }));
    process.exitCode = receipt.finalVideoVerified ? 0 : 2;
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}
