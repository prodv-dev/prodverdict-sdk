import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpJson, buildRemoteMcpJson, writeMcpJsonFile, type RemoteMcpConfigInput } from './mcp-config.js';
import {
  buildProdverdictYaml,
  type StackTemplate,
} from './stacks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURSOR_RULE_SOURCE = join(__dirname, '../../../examples/cursor/prodverdict-agent.mdc');

export type InitStack = StackTemplate;

export function writeInitConfig(
  cwd: string,
  stack: InitStack,
  outFile = 'prodverdict.yml',
  options?: { includeConfig?: boolean },
): string {
  const includeConfig = options?.includeConfig !== false;
  const path = resolve(cwd, outFile);
  const content = buildProdverdictYaml(stack, { includeConfig });
  writeFileSync(path, content, 'utf8');
  return path;
}

export function writeMcpConfig(cwd: string, stack: InitStack): string {
  return writeMcpJsonFile(cwd, buildMcpJson(stack));
}

export function writeRemoteMcpConfig(cwd: string, input?: RemoteMcpConfigInput): string {
  return writeMcpJsonFile(cwd, buildRemoteMcpJson(input));
}

export function writeCursorRule(cwd: string): string {
  const dir = resolve(cwd, '.cursor/rules');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'prodverdict-agent.mdc');
  const content = readFileSync(CURSOR_RULE_SOURCE, 'utf8');
  writeFileSync(path, content, 'utf8');
  return path;
}
