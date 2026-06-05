import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateMigration } from './migration.js';

describe('evaluateMigration', () => {
  it('flags CREATE INDEX without CONCURRENTLY', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-mig-'));
    const migDir = join(dir, 'prisma', 'migrations', '001_init');
    mkdirSync(migDir, { recursive: true });
    writeFileSync(join(migDir, 'migration.sql'), 'CREATE INDEX idx_users_email ON users (email);');

    const findings = await evaluateMigration(
      { type: 'migration', paths: ['prisma/migrations/**/*.sql'], severity: 'high' },
      { repoRoot: dir },
    );

    expect(findings.some((f) => f.severity === 'high' && f.message.includes('CONCURRENTLY'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('passes safe concurrent index', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-mig-'));
    const migDir = join(dir, 'prisma', 'migrations', '002_idx');
    mkdirSync(migDir, { recursive: true });
    writeFileSync(
      join(migDir, 'migration.sql'),
      'CREATE INDEX CONCURRENTLY idx_users_email ON users (email);',
    );

    const findings = await evaluateMigration(
      { type: 'migration', paths: ['prisma/migrations/**/*.sql'], severity: 'high' },
      { repoRoot: dir },
    );

    expect(findings.filter((f) => f.severity === 'high')).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});
