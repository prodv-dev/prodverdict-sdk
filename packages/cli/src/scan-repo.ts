import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import { detectStack } from './detect-stack.js';
import { STACK_META, isStackTemplate, type StackTemplate } from './stacks.js';

const SCAN_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

type ScanResult = {
  cwd: string;
  hasProdverdictYml: boolean;
  stripeFound: boolean;
  paddleFound: boolean;
  envVarCount: number;
  migrationFileCount: number;
  migrationPaths: string[];
  detectedStack: StackTemplate | null;
  recommendedContracts: Array<{ id: string; reason: string }>;
};

function readPackageJson(cwd: string): Record<string, string> {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}

function walkSourceFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (SCAN_IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkSourceFiles(full, files);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf('.'));
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(full);
    }
  }
  return files;
}

function countEnvReferences(cwd: string): number {
  const roots = ['src', 'app', 'pages', 'lib', 'server', 'api'].map((d) => join(cwd, d));
  const files: string[] = [];
  for (const root of roots) {
    walkSourceFiles(root, files);
  }
  if (files.length === 0) {
    walkSourceFiles(cwd, files);
  }

  const envPattern = /process\.env\.([A-Z0-9_]+)|import\.meta\.env\.([A-Z0-9_]+)/g;
  const names = new Set<string>();
  for (const file of files) {
    if (file.includes('node_modules')) continue;
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const match of content.matchAll(envPattern)) {
      const name = match[1] ?? match[2];
      if (name) names.add(name);
    }
  }
  return names.size;
}

function findMigrationFiles(cwd: string): string[] {
  const candidates = [
    join(cwd, 'prisma', 'migrations'),
    join(cwd, 'drizzle'),
    join(cwd, 'supabase', 'migrations'),
    join(cwd, 'db', 'migrate'),
    join(cwd, 'db', 'migrations'),
  ];
  const files: string[] = [];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    collectSqlFiles(dir, files);
  }
  return files;
}

function collectSqlFiles(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSqlFiles(full, files);
      continue;
    }
    if (entry.endsWith('.sql') || entry.endsWith('.ts')) {
      files.push(full);
    }
  }
}

export function scanRepo(cwd: string): ScanResult {
  const deps = readPackageJson(cwd);
  const stripeFound = 'stripe' in deps;
  const paddleFound = '@paddle/paddle-node-sdk' in deps || '@paddle/paddle-js' in deps;
  const envVarCount = countEnvReferences(cwd);
  const migrationPaths = findMigrationFiles(cwd);
  const detectedStack = detectStack(cwd);
  const hasProdverdictYml = existsSync(join(cwd, 'prodverdict.yml'));

  const recommendedContracts: Array<{ id: string; reason: string }> = [];
  if (stripeFound || paddleFound) {
    const billing = paddleFound ? 'Paddle' : 'Stripe';
    recommendedContracts.push({
      id: 'access',
      reason: `${billing} vs database paid-access sync`,
    });
  }
  if (envVarCount > 0) {
    recommendedContracts.push({
      id: 'config',
      reason: `${envVarCount} env var reference(s) to verify against CI`,
    });
  }
  if (migrationPaths.length > 0) {
    recommendedContracts.push({
      id: 'migration',
      reason: `${migrationPaths.length} migration file(s) to lint`,
    });
  }
  if (recommendedContracts.length === 0) {
    recommendedContracts.push({
      id: 'config',
      reason: 'baseline env drift check (no billing or migrations detected)',
    });
  }

  return {
    cwd,
    hasProdverdictYml,
    stripeFound,
    paddleFound,
    envVarCount,
    migrationFileCount: migrationPaths.length,
    migrationPaths,
    detectedStack,
    recommendedContracts,
  };
}

export function formatScanResult(result: ScanResult): string {
  const rel = (p: string) => relative(result.cwd, p) || p;
  const lines: string[] = [];
  lines.push(chalk.bold(`\nScanning ${result.cwd} ...\n`));

  if (result.stripeFound) {
    lines.push(chalk.green('  ✓ Stripe SDK found (package.json)'));
  }
  if (result.paddleFound) {
    lines.push(chalk.green('  ✓ Paddle SDK found (package.json)'));
  }
  if (!result.stripeFound && !result.paddleFound) {
    lines.push(chalk.dim('  · No Stripe or Paddle SDK in package.json'));
  }
  if (result.envVarCount > 0) {
    lines.push(chalk.green(`  ✓ ${result.envVarCount} process.env reference(s) found`));
  }
  if (result.migrationFileCount > 0) {
    const sample = rel(result.migrationPaths[0]!);
    lines.push(
      chalk.green(`  ✓ ${result.migrationFileCount} migration file(s) found (${sample})`),
    );
  }
  if (result.hasProdverdictYml) {
    lines.push(chalk.green('  ✓ prodverdict.yml found'));
  } else {
    lines.push(chalk.yellow('  ✗ No prodverdict.yml found'));
  }
  if (result.detectedStack) {
    lines.push(
      chalk.dim(`  · Detected stack: ${STACK_META[result.detectedStack].label} (${result.detectedStack})`),
    );
  }

  lines.push('\nRecommended contracts:');
  for (const c of result.recommendedContracts) {
    lines.push(`  ${chalk.cyan(c.id.padEnd(10))} — ${c.reason}`);
  }

  const stack =
    result.detectedStack && isStackTemplate(result.detectedStack)
      ? result.detectedStack
      : 'nextjs-stripe';
  lines.push('\nNext:');
  lines.push(chalk.cyan(`  npx prodverdict init --stack ${stack} --mcp --cursor-rule`));
  lines.push(chalk.dim('  npx prodverdict demo   # try the revenue-leak fixture first'));
  lines.push('');

  return lines.join('\n');
}
