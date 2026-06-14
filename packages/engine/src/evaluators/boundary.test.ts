import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateBoundary } from './boundary.js';

describe('evaluateBoundary', () => {
  it('flags mass-assignment via req.body spread in shallow src paths', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-boundary-'));
    const srcDir = join(dir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(srcDir, 'api.ts'),
      `export async function PATCH(req: Request) {
  await db.user.update({ where: { id }, data: { ...req.body } });
}`,
    );

    const findings = await evaluateBoundary(
      {
        type: 'boundary',
        forbidden_write: ['is_admin'],
        forbidden_response: [],
        scan_paths: ['src/**/*.ts'],
        severity: 'high',
      },
      { repoRoot: dir },
    );

    expect(findings.some((f) => f.entity.includes('api.ts'))).toBe(true);
  });

  it('flags mass-assignment via req.body spread', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-boundary-'));
    const apiDir = join(dir, 'app', 'api', 'users');
    mkdirSync(apiDir, { recursive: true });
    writeFileSync(
      join(apiDir, 'route.ts'),
      `export async function PATCH(req: Request) {
  const body = await req.json();
  await db.user.update({ where: { id }, data: { ...req.body } });
}`,
    );

    const findings = await evaluateBoundary(
      {
        type: 'boundary',
        forbidden_write: ['is_admin'],
        forbidden_response: [],
        scan_paths: ['app/api/**'],
        severity: 'high',
      },
      { repoRoot: dir },
    );

    expect(findings.some((f) => f.entity.includes('route.ts'))).toBe(true);
  });

  it('passes when no forbidden fields detected', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-boundary-'));
    const apiDir = join(dir, 'src', 'api');
    mkdirSync(apiDir, { recursive: true });
    writeFileSync(
      join(apiDir, 'handler.ts'),
      `export function updateUser(name: string) { return db.user.update({ data: { name } }); }`,
    );

    const findings = await evaluateBoundary(
      {
        type: 'boundary',
        forbidden_write: ['is_admin'],
        forbidden_response: ['password_hash'],
        scan_paths: ['src/**/*.ts'],
        severity: 'high',
      },
      { repoRoot: dir },
    );

    expect(findings.filter((f) => f.severity === 'high')).toHaveLength(0);
  });
});
