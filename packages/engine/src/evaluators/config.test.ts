import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evaluateConfig, scanEnvReferences, parseEnvFile } from './config.js';
import type { ConfigContractConfig } from '../config/schema.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeConfig(overrides: Partial<ConfigContractConfig> = {}): ConfigContractConfig {
  return {
    type: 'config',
    severity: 'high',
    rules: [],
    scan_references: false,
    env_example_file: '.env.example',
    check_placeholders: true,
    ignore_vars: [],
    ...overrides,
  };
}

describe('evaluateConfig', () => {
  describe('required rule', () => {
    it('passes when required var is set', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'required', name: 'STRIPE_SECRET_KEY' }] }),
        { repoRoot: process.cwd(), env: { STRIPE_SECRET_KEY: 'sk_live_abc' } },
      );
      expect(findings).toHaveLength(0);
    });

    it('fails when required var is missing', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'required', name: 'STRIPE_SECRET_KEY' }] }),
        { repoRoot: process.cwd(), env: {} },
      );
      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
      expect(findings[0]!.entity).toBe('env:STRIPE_SECRET_KEY');
    });

    it('fails when required var is empty string', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'required', name: 'DATABASE_URL' }] }),
        { repoRoot: process.cwd(), env: { DATABASE_URL: '' } },
      );
      expect(findings).toHaveLength(1);
    });

    it('uses per-rule severity override', async () => {
      const findings = await evaluateConfig(
        makeConfig({
          rules: [{ type: 'required', name: 'OPTIONAL_THING', severity: 'low' }],
        }),
        { repoRoot: process.cwd(), env: {} },
      );
      expect(findings[0]!.severity).toBe('low');
    });

    it('warns about placeholder values', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'required', name: 'API_KEY' }], check_placeholders: true }),
        { repoRoot: process.cwd(), env: { API_KEY: 'your_key_here' } },
      );
      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('medium');
    });

    it('does not warn about placeholders when check_placeholders is false', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'required', name: 'API_KEY' }], check_placeholders: false }),
        { repoRoot: process.cwd(), env: { API_KEY: 'your_key_here' } },
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe('not_default rule', () => {
    it('passes when value is not in forbidden list', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'not_default', name: 'DEBUG', forbidden_values: ['true', '1'] }] }),
        { repoRoot: process.cwd(), env: { DEBUG: 'false' } },
      );
      expect(findings).toHaveLength(0);
    });

    it('fails when value matches a forbidden value', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'not_default', name: 'DEBUG', forbidden_values: ['true', '1'] }] }),
        { repoRoot: process.cwd(), env: { DEBUG: 'true' } },
      );
      expect(findings).toHaveLength(1);
      expect(findings[0]!.entity).toBe('env:DEBUG');
    });

    it('is case-insensitive', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'not_default', name: 'LOG_LEVEL', forbidden_values: ['debug'] }] }),
        { repoRoot: process.cwd(), env: { LOG_LEVEL: 'DEBUG' } },
      );
      expect(findings).toHaveLength(1);
    });

    it('skips check when var is unset', async () => {
      const findings = await evaluateConfig(
        makeConfig({ rules: [{ type: 'not_default', name: 'DEBUG', forbidden_values: ['true'] }] }),
        { repoRoot: process.cwd(), env: {} },
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe('scan_references', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('finds env vars referenced in source but not in .env.example', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'const key = process.env.MISSING_VAR;');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), '# no vars\n');

      const findings = await evaluateConfig(
        makeConfig({ scan_references: true }),
        { repoRoot: tmpDir, env: {} },
      );

      const envFinding = findings.find((f) => f.entity === 'env:MISSING_VAR');
      expect(envFinding).toBeDefined();
      expect(envFinding!.severity).toBe('low');
    });

    it('does not flag vars declared in .env.example', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'const key = process.env.DECLARED_VAR;');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), 'DECLARED_VAR=example_value\n');

      const findings = await evaluateConfig(
        makeConfig({ scan_references: true }),
        { repoRoot: tmpDir, env: {} },
      );

      expect(findings.filter((f) => f.entity === 'env:DECLARED_VAR')).toHaveLength(0);
    });

    it('does not flag always-available vars like NODE_ENV', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'if (process.env.NODE_ENV === "production") {}');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), '');

      const findings = await evaluateConfig(
        makeConfig({ scan_references: true }),
        { repoRoot: tmpDir, env: {} },
      );

      expect(findings.filter((f) => f.entity === 'env:NODE_ENV')).toHaveLength(0);
    });

    it('respects ignore_vars', async () => {
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'const x = process.env.INTERNAL_VAR;');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), '');

      const findings = await evaluateConfig(
        makeConfig({ scan_references: true, ignore_vars: ['INTERNAL_VAR'] }),
        { repoRoot: tmpDir, env: {} },
      );

      expect(findings.filter((f) => f.entity === 'env:INTERNAL_VAR')).toHaveLength(0);
    });
  });
});

describe('scanEnvReferences', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-scan-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds process.env.X references', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'const key = process.env.STRIPE_KEY;');
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('STRIPE_KEY')).toBe(true);
  });

  it('finds import.meta.env.X references', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'const base = import.meta.env.VITE_API_URL;');
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('VITE_API_URL')).toBe(true);
  });

  it('finds process.env["X"] references', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), "const x = process.env['DATABASE_URL'];");
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('DATABASE_URL')).toBe(true);
  });

  it('skips node_modules', () => {
    const nmDir = path.join(tmpDir, 'node_modules', 'pkg');
    fs.mkdirSync(nmDir, { recursive: true });
    fs.writeFileSync(path.join(nmDir, 'index.js'), 'process.env.SHOULD_SKIP;');
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('SHOULD_SKIP')).toBe(false);
  });

  it('skips dist/', () => {
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.js'), 'process.env.DIST_VAR;');
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('DIST_VAR')).toBe(false);
  });

  it('skips test/spec source files', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'const key = process.env.PROD_VAR;');
    fs.writeFileSync(path.join(tmpDir, 'app.test.ts'), 'const x = process.env.TEST_FIXTURE_VAR;');
    fs.writeFileSync(path.join(tmpDir, 'app.spec.tsx'), 'const y = process.env.SPEC_VAR;');
    const refs = scanEnvReferences(tmpDir);
    expect(refs.has('PROD_VAR')).toBe(true);
    expect(refs.has('TEST_FIXTURE_VAR')).toBe(false);
    expect(refs.has('SPEC_VAR')).toBe(false);
  });
});

describe('parseEnvFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-parse-env-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses KEY=VALUE pairs', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, 'FOO=bar\nBAZ=qux\n');
    const result = parseEnvFile(file);
    expect(result.get('FOO')).toBe('bar');
    expect(result.get('BAZ')).toBe('qux');
  });

  it('strips quotes', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, 'SECRET="my_secret"\n');
    expect(parseEnvFile(file).get('SECRET')).toBe('my_secret');
  });

  it('skips comment lines', () => {
    const file = path.join(tmpDir, '.env');
    fs.writeFileSync(file, '# comment\nKEY=val\n');
    const result = parseEnvFile(file);
    expect(result.size).toBe(1);
  });

  it('returns empty map for missing file', () => {
    expect(parseEnvFile('/nonexistent/.env').size).toBe(0);
  });
});
