#!/usr/bin/env node
/**
 * Run all test-env scenarios without Docker (full fixture mode).
 * Use `node run.mjs all` when Docker is available for live Postgres testing.
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLI = join(ROOT, 'packages/cli/dist/index.js');

const SCENARIOS = {
  pass: { dir: 'scenarios/pass', expect: 'pass' },
  'fail-revenue-leak': { dir: 'scenarios/fail-revenue-leak', expect: 'fail' },
  'fail-wrongful-access': { dir: 'scenarios/fail-wrongful-access', expect: 'fail' },
  'fail-plan-drift': { dir: 'scenarios/fail-plan-drift', expect: 'fail' },
};

if (!existsSync(CLI)) {
  spawnSync('npm', ['run', 'build', '-w', 'prodverdict'], { stdio: 'inherit', cwd: ROOT, shell: true });
}

let failed = 0;
for (const [name, { dir, expect }] of Object.entries(SCENARIOS)) {
  const r = spawnSync(
    'node',
    [CLI, 'check', 'access', '--config', 'prodverdict.yml', '--fixtures', '--fixtures-dir', dir, '--format', 'json'],
    { cwd: __dirname, encoding: 'utf8', shell: false },
  );
  if (!r.stdout) {
    console.error(`[FAIL] ${name}: no output`, r.stderr);
    failed++;
    continue;
  }
  const result = JSON.parse(r.stdout);
  const ok = result.verdict === expect;
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}: expected=${expect} got=${result.verdict} findings=${result.findings.length}`);
  if (!ok) failed++;
  else if (result.findings.length) {
    for (const f of result.findings) {
      console.log(`  [${f.severity}] ${f.entity}`);
    }
  }
}

if (failed) {
  console.error(`\n${failed} scenario(s) failed.`);
  process.exit(1);
}
console.log('\nAll scenarios passed (fixture mode).');
