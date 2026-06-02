import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const cli = join(root, '../../packages/cli/dist/index.js');

function run(label, fixturesDir) {
  console.log(`\n── ${label} ──\n`);
  const r = spawnSync(
    process.execPath,
    [
      cli,
      'check',
      'access',
      '--config',
      join(root, 'prodverdict.yml'),
      '--fixtures',
      '--fixtures-dir',
      fixturesDir,
    ],
    { stdio: 'inherit', cwd: join(root, '../..') },
  );
  if (r.status !== 0 && label.includes('FAIL')) return;
  if (r.status === 0 && label.includes('PASS')) return;
  process.exit(r.status ?? 1);
}

run('FAIL (revenue leak)', join(root, 'scenarios/fail-revenue-leak'));
run('PASS', join(root, 'scenarios/pass'));
console.log('\nDone.\n');
