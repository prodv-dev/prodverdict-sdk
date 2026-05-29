#!/usr/bin/env node
/**
 * Run pass + fail-revenue-leak scenarios for examples/nextjs-stripe/
 * Usage: node examples/nextjs-stripe/run-demo.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG = path.join(ROOT, 'examples/nextjs-stripe/prodverdict.yml');
const CLI = path.join(ROOT, 'packages/cli/dist/index.js');

const SCENARIOS = [
  { name: 'pass', dir: 'examples/nextjs-stripe/scenarios/pass', expectExit: 0 },
  { name: 'fail-revenue-leak', dir: 'examples/nextjs-stripe/scenarios/fail-revenue-leak', expectExit: 1 },
];

let failed = 0;

for (const s of SCENARIOS) {
  const fixturesDir = path.join(ROOT, s.dir);
  const result = spawnSync(
    process.execPath,
    [CLI, 'check', 'access', '--config', CONFIG, '--fixtures', '--fixtures-dir', fixturesDir],
    { cwd: ROOT, encoding: 'utf8' },
  );

  const ok = result.status === s.expectExit;
  const label = ok ? 'OK' : 'FAIL';
  console.log(`[${label}] ${s.name}: exit=${result.status ?? '?'} (expected ${s.expectExit})`);
  if (!ok) {
    failed++;
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

if (failed > 0) {
  console.error(`\n${failed} scenario(s) failed.`);
  process.exit(1);
}

console.log('\nAll nextjs-stripe demo scenarios passed.');
