import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {serveStdio} from '@modelcontextprotocol/server/stdio';

import {createSharedMediaMcpController} from './index.mjs';
import {createSharedMediaMcpServer} from './server.mjs';

const requiredEnv = (name) => {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
};

const workflowFile = resolve(requiredEnv('SHARED_MEDIA_MCP_WORKFLOWS_FILE'));
const backendModuleFile = resolve(requiredEnv('SHARED_MEDIA_MCP_BACKEND_MODULE'));

const workflows = JSON.parse(await readFile(workflowFile, 'utf8'));
if (!Array.isArray(workflows)) throw new TypeError('SHARED_MEDIA_MCP_WORKFLOWS_FILE must contain a JSON array');

const backendModule = await import(pathToFileURL(backendModuleFile).href);
let backend = backendModule.backend ?? backendModule.default;
if (!backend && typeof backendModule.createBackend === 'function') backend = await backendModule.createBackend();
if (!backend || typeof backend !== 'object') throw new TypeError('backend module must export backend/default object or createBackend()');

const controller = createSharedMediaMcpController({workflows, backend});

console.error(`Shared Media MCP stdio starting with ${workflows.length} approved workflow manifest(s)`);
await serveStdio(() => createSharedMediaMcpServer({controller}));
