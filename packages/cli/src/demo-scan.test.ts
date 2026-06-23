import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStack } from './detect-stack.js';
import { resolveDemoPaths } from './demo-cli.js';
import { scanRepo } from './scan-repo.js';

describe('detectStack', () => {
  it('detects nextjs-stripe from package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-detect-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { next: '14', stripe: '14' } }),
    );
    expect(detectStack(dir)).toBe('nextjs-stripe');
  });

  it('detects supabase-stripe', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-detect-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@supabase/supabase-js': '2', stripe: '14' },
      }),
    );
    expect(detectStack(dir)).toBe('supabase-stripe');
  });

  it('detects paddle-stripe', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-detect-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@paddle/paddle-node-sdk': '1' } }),
    );
    expect(detectStack(dir)).toBe('paddle-stripe');
  });
});

describe('resolveDemoPaths', () => {
  it('returns bundled demo fixture paths for nextjs-stripe', () => {
    const { configPath, fixturesDir } = resolveDemoPaths('nextjs-stripe');
    expect(configPath).toContain('demo');
    expect(configPath).toContain('prodverdict.yml');
    expect(fixturesDir).toContain('fail-revenue-leak');
  });
});

describe('scanRepo', () => {
  it('recommends access when stripe is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-scan-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { stripe: '14' } }),
    );
    const result = scanRepo(dir);
    expect(result.stripeFound).toBe(true);
    expect(result.recommendedContracts.some((c) => c.id === 'access')).toBe(true);
    expect(result.hasProdverdictYml).toBe(false);
  });
});
