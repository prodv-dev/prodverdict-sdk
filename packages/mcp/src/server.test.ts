import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runSetupNonInteractive } from 'prodverdict/bootstrap';
import { runAccessCheck, runAllChecks } from './check-runner.js';
import { runDoctor, toAgentDoctorOutput } from '@prodverdict/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');
const fixturesDir = join(__dirname, '../../../fixtures');

describe('MCP bootstrap_prodverdict', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pv-mcp-bootstrap-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { stripe: '^16', next: '^14' } }),
      'utf8',
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns agent JSON from runSetupNonInteractive', async () => {
    const result = await runSetupNonInteractive({
      repoRoot: dir,
      stack: 'nextjs-stripe',
      fromEnv: false,
    });
    expect(result.agent.schemaVersion).toBe('1');
    expect(result.agent.stack).toBe('nextjs-stripe');
    expect(Array.isArray(result.agent.nextSteps)).toBe(true);
  });
});

describe('MCP check-runner', () => {
  it('runs access check with fixtures', async () => {
    const agent = await runAccessCheck({
      configPath: fixtureConfig,
      useFixtures: true,
      fixturesDir,
    });
    expect(agent.schemaVersion).toBe('1');
    expect(agent.contract).toBe('access');
    expect(agent.summary).toBeTruthy();
  });

  it('runs all checks when only access contract in config', async () => {
    const agent = await runAllChecks({
      configPath: fixtureConfig,
      useFixtures: true,
      fixturesDir,
    });
    expect(agent.contract).toBe('all');
    expect(agent.results.length).toBeGreaterThan(0);
  });
});

describe('MCP doctor', () => {
  it('returns agent doctor output', async () => {
    const result = await runDoctor({
      configPath: fixtureConfig,
      skipConnectivity: true,
    });
    const agent = toAgentDoctorOutput(result.ok, result.checks, result.contracts);
    expect(agent.schemaVersion).toBe('1');
    expect(agent.nextSteps.length).toBeGreaterThan(0);
  });
});
