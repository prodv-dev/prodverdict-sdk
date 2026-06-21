import { resolve } from 'node:path';
import chalk from 'chalk';
import {
  runDoctor,
  toAgentDoctorOutput,
  type DoctorResult,
  type AgentDoctorOutput,
} from '@prodverdict/engine';

export interface RunDoctorCliOptions {
  config: string;
  format: 'text' | 'json' | 'agent';
  repoRoot?: string | undefined;
  skipConnectivity?: boolean | undefined;
}

const STATUS_ICON: Record<string, (s: string) => string> = {
  pass: chalk.green,
  fail: chalk.red,
  skip: chalk.dim,
};

export async function runDoctorCli(
  opts: RunDoctorCliOptions,
): Promise<{ result: DoctorResult | AgentDoctorOutput; exitCode: number }> {
  const result = await runDoctor({
    configPath: resolve(opts.config),
    repoRoot: opts.repoRoot,
    skipConnectivity: opts.skipConnectivity,
  });

  if (opts.format === 'agent') {
    const agent = toAgentDoctorOutput(result.ok, result.checks, result.contracts);
    return { result: agent, exitCode: agent.exitCode };
  }

  if (opts.format === 'json') {
    return { result, exitCode: result.ok ? 0 : 2 };
  }

  return { result, exitCode: result.ok ? 0 : 2 };
}

export function formatDoctorText(result: DoctorResult): string {
  const lines: string[] = [];
  const header = result.ok ? chalk.green('✔ Doctor passed') : chalk.red('✖ Doctor failed');
  lines.push(header);
  lines.push('');

  for (const c of result.checks) {
    const color = STATUS_ICON[c.status] ?? chalk.white;
    const badge = color(`[${c.status.toUpperCase()}]`);
    lines.push(`  ${badge} ${chalk.bold(c.name)}`);
    lines.push(`    ${c.message}`);
  }

  const failed = result.checks.filter((c) => c.status === 'fail');
  if (failed.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Next steps:'));
    for (const c of failed) {
      lines.push(`  • ${c.name}: ${c.message}`);
    }
  }

  if (result.contracts.length > 0) {
    lines.push('');
    lines.push(
      chalk.dim(
        `Contracts: ${result.contracts.map((c) => c.type).join(', ')}`,
      ),
    );
  }

  return lines.join('\n') + '\n';
}
