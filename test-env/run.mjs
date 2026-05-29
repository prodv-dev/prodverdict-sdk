#!/usr/bin/env node
/**
 * ProdVerdict local test environment runner.
 *
 * Usage:
 *   node run.mjs up              Start Postgres (Docker)
 *   node run.mjs down            Stop and remove volumes
 *   node run.mjs seed <name>     Load SQL seed (pass, fail-revenue-leak, ...)
 *   node run.mjs check <name>    Run prodverdict against scenario
 *   node run.mjs all             Run all scenarios (pass + 3 fail cases)
 */
import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLI = join(ROOT, 'packages/cli/dist/index.js');
const DATABASE_URL = 'postgresql://prodverdict:prodverdict@localhost:5433/prodverdict_test';

const SCENARIOS = {
  pass: { seed: 'seed-pass.sql', stripeDir: 'scenarios/pass', expect: 'pass' },
  'fail-revenue-leak': { seed: 'seed-fail-revenue-leak.sql', stripeDir: 'scenarios/fail-revenue-leak', expect: 'fail' },
  'fail-wrongful-access': { seed: 'seed-fail-wrongful-access.sql', stripeDir: 'scenarios/fail-wrongful-access', expect: 'fail' },
  'fail-plan-drift': { seed: 'seed-fail-plan-drift.sql', stripeDir: 'scenarios/fail-plan-drift', expect: 'fail' },
};

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: __dirname, ...opts });
}

function dockerOk() {
  const r = spawnSync('docker', ['info'], { stdio: 'ignore' });
  return r.status === 0;
}

function ensureCliBuilt() {
  if (!existsSync(CLI)) {
    console.log('CLI not built — running npm run build…');
    execSync('npm run build -w prodverdict', { stdio: 'inherit', cwd: ROOT });
  }
}

function cmdUp() {
  if (!dockerOk()) {
    console.error('Docker is not running. Start Docker Desktop and retry.');
    process.exit(1);
  }
  run('docker compose up -d --wait');
  console.log('\nPostgres ready at localhost:5433');
  console.log('Next: node run.mjs seed pass && node run.mjs check pass');
}

function cmdDown() {
  run('docker compose down -v');
}

function seedSql(filename) {
  const sql = readFileSync(join(__dirname, 'sql', filename), 'utf8');
  execSync('docker compose exec -T postgres psql -U prodverdict -d prodverdict_test', {
    cwd: __dirname,
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

function cmdSeed(name) {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    console.error(`Unknown seed "${name}". Options: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }
  seedSql(scenario.seed);
  console.log(`Seeded database for scenario: ${name}`);
}

function runCheck(name) {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    throw new Error(`Unknown scenario "${name}"`);
  }

  ensureCliBuilt();
  seedSql(scenario.seed);

  const r = spawnSync(
    'node',
    [CLI, 'check', 'access', '--config', 'prodverdict.yml', '--fixtures-stripe', scenario.stripeDir, '--format', 'json'],
    {
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL, STRIPE_SECRET_KEY: 'unused' },
      encoding: 'utf8',
    },
  );

  if (!r.stdout) {
    console.error(`Scenario ${name} produced no output:`, r.stderr);
    return false;
  }

  const result = JSON.parse(r.stdout);
  const ok = result.verdict === scenario.expect;
  const icon = ok ? 'OK' : 'FAIL';
  console.log(`\n[${icon}] scenario=${name} expected=${scenario.expect} got=${result.verdict} findings=${result.findings.length}`);

  if (result.findings.length > 0) {
    for (const f of result.findings) {
      const msg = f.message.length > 100 ? `${f.message.slice(0, 100)}…` : f.message;
      console.log(`  [${f.severity}] ${f.entity}: ${msg}`);
    }
  }

  return ok;
}

function cmdCheck(name) {
  if (!SCENARIOS[name]) {
    console.error(`Unknown scenario "${name}". Options: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }
  if (!runCheck(name)) process.exit(1);
}

function cmdAll() {
  ensureCliBuilt();
  if (!dockerOk()) {
    console.error('Docker is not running. Start Docker Desktop and retry.');
    process.exit(1);
  }
  run('docker compose up -d --wait');
  let failed = 0;
  for (const name of Object.keys(SCENARIOS)) {
    if (!runCheck(name)) failed++;
  }
  if (failed > 0) {
    console.error(`\n${failed} scenario(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll scenarios passed validation.');
}

const [,, command, arg] = process.argv;

switch (command) {
  case 'up':
    cmdUp();
    break;
  case 'down':
    cmdDown();
    break;
  case 'seed':
    if (!arg) {
      console.error('Usage: node run.mjs seed <pass|fail-revenue-leak|...>');
      process.exit(1);
    }
    cmdSeed(arg);
    break;
  case 'check':
    if (!arg) {
      console.error('Usage: node run.mjs check <pass|fail-revenue-leak|...>');
      process.exit(1);
    }
    cmdCheck(arg);
    break;
  case 'all':
    cmdAll();
    break;
  default:
    console.log(`ProdVerdict test environment

Commands:
  node run.mjs up                 Start Postgres (requires Docker)
  node run.mjs down               Stop Postgres and wipe data
  node run.mjs seed <scenario>    Load SQL seed only
  node run.mjs check <scenario>    Seed + run prodverdict check
  node run.mjs all                Run every scenario

Scenarios:
  pass                  All access state in sync (expect pass)
  fail-revenue-leak     Active sub, no app access (expect fail)
  fail-wrongful-access  Canceled sub, still has access (expect fail)
  fail-plan-drift       Wrong plan for active price (expect fail)
`);
}
