import chalk from 'chalk';
import type { CheckResult, Finding, Verdict } from '@prodverdict/engine';

const SEVERITY_COLOR: Record<Finding['severity'], (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.cyan,
};

const VERDICT_COLOR: Record<Verdict, (s: string) => string> = {
  fail: chalk.red,
  warn: chalk.yellow,
  pass: chalk.green,
};

export function formatTextResult(result: CheckResult): string {
  const lines: string[] = [];
  const verdictLabelFn = VERDICT_COLOR[result.verdict];
  const verdictLabel = verdictLabelFn(`[${result.verdict.toUpperCase()}]`);
  lines.push(`\nProdVerdict · Access Contract · ${verdictLabel}`);
  lines.push(`Evaluated at: ${result.evaluatedAt}\n`);

  if (result.findings.length === 0) {
    lines.push(chalk.green('✔ No violations found. All access state is in sync.'));
    return lines.join('\n');
  }

  lines.push(`${result.findings.length} finding(s):\n`);

  for (const f of result.findings) {
    const color = SEVERITY_COLOR[f.severity] ?? chalk.white;
    const badge = color(`[${f.severity.toUpperCase()}]`);
    lines.push(`  ${badge} ${chalk.bold(f.entity)}`);
    lines.push(`    ${f.message}`);
    if (f.fix) {
      lines.push(`    ${chalk.dim('Fix:')} ${f.fix}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
