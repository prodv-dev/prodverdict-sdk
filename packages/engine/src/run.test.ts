import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigFile } from './config/parse.js';
import { runContracts, resolveCheckExitCode } from './run.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');

describe('runContracts', () => {
  it('runs access contract with fixtures', async () => {
    const config = parseConfigFile(fixtureConfig);
    const output = await runContracts({
      config,
      configPath: fixtureConfig,
      accessSource: 'fixtures',
      contracts: ['access'],
    });
    expect(output.results).toHaveLength(1);
    expect(output.results[0]!.contract).toBe('access');
    expect(output.verdict).toBe('pass');
    expect(output.findings).toEqual([]);
  });

  it('runs all contracts declared in config', async () => {
    const fullConfig = join(__dirname, '../../../examples/nextjs-stripe/prodverdict.full.yml');
    const config = parseConfigFile(fullConfig);
    const output = await runContracts({
      config,
      configPath: fullConfig,
      repoRoot: join(__dirname, '../../../examples/nextjs-stripe'),
      accessSource: 'fixtures',
      fixturesDir: join(__dirname, '../../../fixtures'),
    });
    expect(output.results.length).toBeGreaterThanOrEqual(2);
    const types = output.results.map((r) => r.contract);
    expect(types).toContain('access');
    expect(types).toContain('config');
  });
});

describe('resolveCheckExitCode', () => {
  it('returns 1 on fail', () => {
    expect(resolveCheckExitCode('fail')).toBe(1);
  });

  it('returns 1 on warn when strict', () => {
    expect(resolveCheckExitCode('warn', true)).toBe(1);
  });

  it('returns 0 on warn when not strict', () => {
    expect(resolveCheckExitCode('warn', false)).toBe(0);
  });
});
