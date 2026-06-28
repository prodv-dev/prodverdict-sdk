import chalk from 'chalk';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Command } from 'commander';
import { parseConfigFile, isProdVerdictError, toAgentStatusOutput } from '@prodverdict/engine';
import { CLI_VERSION } from './version.js';

interface StatusRow {
  label: string;
  ok: boolean;
  detail: string;
  hint?: string | undefined;
}

function findWorkflowFile(repoRoot: string): string | null {
  const wfDir = resolve(repoRoot, '.github/workflows');
  if (!existsSync(wfDir)) return null;
  let entries: string[] = [];
  try {
    entries = readdirSync(wfDir);
  } catch {
    return null;
  }
  const match = entries.find((f) => /prodverdict/i.test(f));
  return match ? join(wfDir, match) : null;
}

function findMcpConfig(repoRoot: string): string | null {
  const candidates = [
    resolve(repoRoot, '.cursor/mcp.json'),
    resolve(repoRoot, '.cursor/mcp.jsonc'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function findCursorRule(repoRoot: string): string | null {
  const candidates = [
    resolve(repoRoot, '.cursor/rules/prodverdict-agent.mdc'),
    resolve(repoRoot, '.cursorrules'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function envSet(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== '';
}

function readContracts(configPath: string): string[] | null {
  try {
    const cfg = parseConfigFile(resolve(configPath));
    return cfg.contracts.map((c) => c.type);
  } catch {
    return null;
  }
}

export function buildStatus(repoRoot: string = process.cwd()): {
  rows: StatusRow[];
  configPath: string | null;
  contracts: string[] | null;
} {
  const rows: StatusRow[] = [];
  const configPath = resolve(repoRoot, 'prodverdict.yml');
  const configExists = existsSync(configPath);

  rows.push({
    label: 'prodverdict.yml',
    ok: configExists,
    detail: configExists ? configPath : 'not found in repo root',
    hint: configExists ? undefined : 'run: npx prodverdict setup',
  });

  let contracts: string[] | null = null;
  if (configExists) {
    contracts = readContracts(configPath);
    if (contracts === null) {
      rows.push({
        label: 'config valid',
        ok: false,
        detail: 'prodverdict.yml failed to parse',
        hint: 'run: npx prodverdict validate',
      });
    } else {
      rows.push({
        label: 'contracts',
        ok: contracts.length > 0,
        detail: contracts.length > 0 ? contracts.join(', ') : 'none defined',
      });
    }
  }

  const hasStripe = contracts?.includes('access') ?? configExists;
  const hasPaddle = false; // detected from contract config if needed; keep simple here

  if (hasStripe) {
    const stripeSet = envSet('STRIPE_SECRET_KEY');
    rows.push({
      label: 'STRIPE_SECRET_KEY',
      ok: stripeSet,
      detail: stripeSet ? 'set in env' : 'not set in env',
      hint: stripeSet ? undefined : 'export STRIPE_SECRET_KEY=rk_live_... (restricted, read-only)',
    });
  }

  const dbSet = envSet('DATABASE_URL');
  rows.push({
    label: 'DATABASE_URL',
    ok: dbSet,
    detail: dbSet ? 'set in env' : 'not set in env',
    hint: dbSet ? undefined : 'export DATABASE_URL=postgresql://prodverdict_readonly:...@host/db',
  });

  if (hasPaddle) {
    const paddleSet = envSet('PADDLE_API_KEY');
    rows.push({
      label: 'PADDLE_API_KEY',
      ok: paddleSet,
      detail: paddleSet ? 'set in env' : 'not set in env',
      hint: paddleSet ? undefined : 'export PADDLE_API_KEY=...',
    });
  }

  const wf = findWorkflowFile(repoRoot);
  rows.push({
    label: 'scheduled workflow',
    ok: wf !== null,
    detail: wf ?? 'no .github/workflows/prodverdict-*.yml found',
    hint: wf ? undefined : 'run: npx prodverdict scheduled --frequency hourly --install',
  });

  const mcp = findMcpConfig(repoRoot);
  rows.push({
    label: 'Cursor MCP',
    ok: mcp !== null,
    detail: mcp ?? 'no .cursor/mcp.json found',
    hint: mcp ? undefined : 'run: npx prodverdict setup  (or: npx prodverdict init --mcp)',
  });

  const rule = findCursorRule(repoRoot);
  rows.push({
    label: 'Cursor agent rule',
    ok: rule !== null,
    detail: rule ?? 'no .cursor/rules/prodverdict-agent.mdc found',
    hint: rule ? undefined : 'run: npx prodverdict init --cursor-rule',
  });

  return { rows, configPath: configExists ? configPath : null, contracts };
}

function labelWidth(rows: StatusRow[]): number {
  return Math.max(...rows.map((r) => r.label.length), 18);
}

function formatStatus(repoRoot: string = process.cwd()): string {
  const { rows, configPath, contracts } = buildStatus(repoRoot);
  const lines: string[] = [];
  const width = labelWidth(rows);

  lines.push('');
  lines.push(chalk.bold('ProdVerdict status') + chalk.dim(` · v${CLI_VERSION}`));
  lines.push('');

  for (const row of rows) {
    const icon = row.ok ? chalk.green('✓') : chalk.yellow('✗');
    const label = row.label.padEnd(width);
    const detail = chalk.dim(row.detail);
    lines.push(`  ${icon}  ${label}  ${detail}`);
    if (row.hint) {
      lines.push(`     ${' '.repeat(width)}  ${chalk.cyan(row.hint)}`);
    }
  }

  lines.push('');
  lines.push(chalk.dim('Next:'));
  const allOk = rows.every((r) => r.ok);
  if (allOk) {
    if (contracts && contracts.includes('access')) {
      lines.push(`  ${chalk.cyan('npx prodverdict check access')}`);
    }
    lines.push(`  ${chalk.dim('Everything looks configured. The scheduled workflow will run hourly.')}`);
  } else if (!configPath) {
    lines.push(`  ${chalk.cyan('npx prodverdict setup')}  ${chalk.dim('# interactive first-run wizard')}`);
  } else {
    lines.push(`  ${chalk.cyan('npx prodverdict doctor')}  ${chalk.dim('# diagnose what is missing')}`);
  }
  lines.push('');

  return lines.join('\n');
}

export function formatStatusAgent(repoRoot: string = process.cwd()): string {
  const { rows } = buildStatus(repoRoot);
  const agent = toAgentStatusOutput(
    rows.map((r) => ({
      label: r.label,
      ok: r.ok,
      detail: r.detail,
      ...(r.hint !== undefined ? { hint: r.hint } : {}),
    })),
  );
  return JSON.stringify(agent, null, 2) + '\n';
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description(
      'One-glance health check — shows what is configured (config, env vars, workflow, MCP) and what to do next.',
    )
    .option('--repo-root <path>', 'Repo root (default: cwd)')
    .option('-f, --format <format>', 'Output format: text or agent', 'text')
    .action((options: { repoRoot?: string; format?: string }) => {
      try {
        const root = options.repoRoot ?? process.cwd();
        if (options.format === 'agent') {
          process.stdout.write(formatStatusAgent(root));
        } else {
          process.stdout.write(formatStatus(root));
        }
        const { rows } = buildStatus(root);
        const allOk = rows.every((r) => r.ok);
        process.exit(allOk ? 0 : 1);
      } catch (err) {
        if (isProdVerdictError(err)) {
          process.stderr.write(`[${err.code}] ${err.message}\n`);
        } else {
          process.stderr.write(
            'status error: ' + (err instanceof Error ? err.message : String(err)) + '\n',
          );
        }
        process.exit(2);
      }
    });
}

// Suppress unused-import warning for readFileSync (kept for future last-check support)
void readFileSync;
