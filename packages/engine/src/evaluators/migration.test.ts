import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateMigration, splitSqlStatements } from './migration.js';

function writeMigration(sql: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'pv-mig-'));
  const migDir = join(dir, 'prisma', 'migrations', '001');
  mkdirSync(migDir, { recursive: true });
  writeFileSync(join(migDir, 'migration.sql'), sql);
  return dir;
}

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

  it('flags an unsafe CREATE INDEX even when another statement uses CONCURRENTLY', async () => {
    // Regression: file-level negation previously masked the unsafe index because
    // CONCURRENTLY appeared elsewhere in the same file.
    const dir = writeMigration(
      [
        'CREATE INDEX CONCURRENTLY idx_a ON users (email);',
        'CREATE INDEX idx_b ON orders (user_id);',
      ].join('\n'),
    );

    const findings = await evaluateMigration(
      { type: 'migration', paths: ['prisma/migrations/**/*.sql'], severity: 'high' },
      { repoRoot: dir },
    );

    expect(findings.some((f) => f.severity === 'high' && f.message.includes('CONCURRENTLY'))).toBe(
      true,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it('flags ADD COLUMN NOT NULL without DEFAULT even when DEFAULT is used elsewhere', async () => {
    const dir = writeMigration(
      [
        'ALTER TABLE users ADD COLUMN status text DEFAULT \'active\';',
        'ALTER TABLE orders ADD COLUMN total integer NOT NULL;',
      ].join('\n'),
    );

    const findings = await evaluateMigration(
      { type: 'migration', paths: ['prisma/migrations/**/*.sql'], severity: 'high' },
      { repoRoot: dir },
    );

    expect(
      findings.some((f) => f.severity === 'high' && f.message.includes('full table rewrite')),
    ).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not flag when every statement is safe', async () => {
    const dir = writeMigration(
      [
        'CREATE INDEX CONCURRENTLY idx_a ON users (email);',
        'ALTER TABLE users ADD COLUMN status text DEFAULT \'active\';',
      ].join('\n'),
    );

    const findings = await evaluateMigration(
      { type: 'migration', paths: ['prisma/migrations/**/*.sql'], severity: 'high' },
      { repoRoot: dir },
    );

    expect(findings.filter((f) => f.severity === 'high')).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('splitSqlStatements', () => {
  it('splits on top-level semicolons', () => {
    expect(splitSqlStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', ' SELECT 2']);
  });

  it('ignores semicolons inside string literals', () => {
    expect(splitSqlStatements("INSERT INTO t VALUES ('a;b'); SELECT 1;")).toHaveLength(2);
  });

  it('ignores semicolons inside dollar-quoted bodies', () => {
    const sql = 'CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END; $$ LANGUAGE plpgsql; SELECT 1;';
    expect(splitSqlStatements(sql)).toHaveLength(2);
  });
});
