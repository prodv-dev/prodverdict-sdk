import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  cpSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpJson, buildRemoteMcpJson, writeMcpJsonFile, type RemoteMcpConfigInput } from './mcp-config.js';
import {
  buildProdverdictYaml,
  type StackTemplate,
} from './stacks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Skills copied into customer repos on bootstrap. */
export const CURSOR_SKILL_IDS = ['prodverdict-setup', 'prodverdict-verify'] as const;

function assetsRoot(): string {
  const bundled = join(__dirname, '../bundled');
  if (existsSync(bundled)) return bundled;
  return join(__dirname, '../../../examples');
}

function cursorRuleSource(): string {
  return join(assetsRoot(), 'cursor/prodverdict-agent.mdc');
}

function skillSource(skillId: string): string {
  return join(assetsRoot(), 'skills', skillId, 'SKILL.md');
}

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
  const content = readFileSync(cursorRuleSource(), 'utf8');
  writeFileSync(path, content, 'utf8');
  return path;
}

export function writeCursorSkills(
  cwd: string,
  options?: { force?: boolean },
): string[] {
  const force = options?.force === true;
  const written: string[] = [];
  const skillsRoot = resolve(cwd, '.cursor/skills');
  mkdirSync(skillsRoot, { recursive: true });

  for (const skillId of CURSOR_SKILL_IDS) {
    const destDir = resolve(skillsRoot, skillId);
    const destPath = resolve(destDir, 'SKILL.md');
    if (existsSync(destPath) && !force) continue;
    const src = skillSource(skillId);
    if (!existsSync(src)) {
      throw new Error(`Missing bundled skill source: ${src}`);
    }
    mkdirSync(destDir, { recursive: true });
    cpSync(src, destPath);
    written.push(destPath);
  }

  return written;
}
