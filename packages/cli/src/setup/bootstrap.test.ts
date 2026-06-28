import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runSetupNonInteractive } from './bootstrap.js';
import { toAgentSetupOutput } from '@prodverdict/engine';

describe('runSetupNonInteractive', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pv-bootstrap-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { stripe: '^16', next: '^14' } }),
      'utf8',
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes config, workflow, mcp, and rule without prompts', async () => {
    const result = await runSetupNonInteractive({
      repoRoot: dir,
      stack: 'nextjs-stripe',
      fromEnv: false,
    });

    expect(existsSync(join(dir, 'prodverdict.yml'))).toBe(true);
    expect(existsSync(join(dir, '.github/workflows/prodverdict-hourly.yml'))).toBe(true);
    expect(existsSync(join(dir, '.cursor/mcp.json'))).toBe(true);
    expect(existsSync(join(dir, '.cursor/rules/prodverdict-agent.mdc'))).toBe(true);
    expect(existsSync(join(dir, '.cursor/skills/prodverdict-setup/SKILL.md'))).toBe(true);
    expect(existsSync(join(dir, '.cursor/skills/prodverdict-verify/SKILL.md'))).toBe(true);
    expect(result.agent.filesWritten.some((f) => f.includes('prodverdict-setup'))).toBe(true);
    expect(result.agent.schemaVersion).toBe('1');
    expect(result.agent.stack).toBe('nextjs-stripe');
    expect(result.agent.filesWritten.length).toBeGreaterThan(0);
    expect(result.agent.missing).toContain('STRIPE_SECRET_KEY');
    expect(result.agent.verdict).toBe('partial');
  });

  it('wires env from .env.local into MCP', async () => {
    writeFileSync(
      join(dir, '.env.local'),
      'STRIPE_SECRET_KEY=rk_live_testkey123456\nDATABASE_URL=postgresql://u:p@localhost/db\n',
      'utf8',
    );

    const result = await runSetupNonInteractive({
      repoRoot: dir,
      stack: 'nextjs-stripe',
      fromEnv: true,
    });

    expect(result.envWired).toContain('STRIPE_SECRET_KEY');
    expect(result.envWired).toContain('DATABASE_URL');
    expect(result.missing).toEqual([]);

    const mcp = JSON.parse(readFileSync(join(dir, '.cursor/mcp.json'), 'utf8')) as {
      mcpServers: { prodverdict: { env: Record<string, string> } };
    };
    expect(mcp.mcpServers.prodverdict.env.STRIPE_SECRET_KEY).toBe('rk_live_testkey123456');
  });

  it('skips overwrite without --force', async () => {
    writeFileSync(join(dir, 'prodverdict.yml'), 'version: 1\ncontracts: []\n', 'utf8');
    await runSetupNonInteractive({ repoRoot: dir, stack: 'nextjs-stripe', fromEnv: false });
    const content = readFileSync(join(dir, 'prodverdict.yml'), 'utf8');
    expect(content).toContain('contracts: []');
  });

  it('overwrites with --force', async () => {
    writeFileSync(join(dir, 'prodverdict.yml'), 'version: 1\ncontracts: []\n', 'utf8');
    await runSetupNonInteractive({
      repoRoot: dir,
      stack: 'nextjs-stripe',
      fromEnv: false,
      force: true,
    });
    const content = readFileSync(join(dir, 'prodverdict.yml'), 'utf8');
    expect(content).toContain('type: access');
  });

  it('skips skills with skipSkills', async () => {
    const result = await runSetupNonInteractive({
      repoRoot: dir,
      stack: 'nextjs-stripe',
      fromEnv: false,
      skipSkills: true,
    });
    expect(existsSync(join(dir, '.cursor/skills/prodverdict-setup/SKILL.md'))).toBe(false);
    expect(result.agent.filesWritten.some((f) => f.includes('prodverdict-setup'))).toBe(false);
  });
});

describe('toAgentSetupOutput re-export', () => {
  it('returns pass when fully configured', () => {
    const agent = toAgentSetupOutput({
      stack: 'nextjs-stripe',
      filesWritten: ['prodverdict.yml'],
      envWired: ['STRIPE_SECRET_KEY', 'DATABASE_URL'],
      missing: [],
      doctorOk: true,
    });
    expect(agent.verdict).toBe('pass');
    expect(agent.exitCode).toBe(0);
  });
});
