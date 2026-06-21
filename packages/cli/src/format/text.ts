import chalk from 'chalk';
import type { CheckResult, Finding, Verdict } from '@prodverdict/engine';
import type { AggregateCheckOutput } from '../run-check.js';

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

function formatFindings(findings: Finding[]): string[] {
  const lines: string[] = [];
  if (findings.length === 0) {
    lines.push(chalk.green('✔ No violations found.'));
    return lines;
  }

  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;
  const parts = [
    high > 0 ? chalk.red(`${high} high`) : null,
    medium > 0 ? chalk.yellow(`${medium} medium`) : null,
    low > 0 ? chalk.cyan(`${low} low`) : null,
  ].filter(Boolean);
  if (parts.length > 0) {
    lines.push(`Summary: ${parts.join(', ')}`);
    lines.push('');
  }

  lines.push(`${findings.length} finding(s):\n`);
  for (const f of findings) {
    const color = SEVERITY_COLOR[f.severity] ?? chalk.white;
    const badge = color(`[${f.severity.toUpperCase()}]`);
    lines.push(`  ${badge} ${chalk.bold(f.entity)}`);
    lines.push(`    ${f.message}`);
    if (f.fix) {
      lines.push(`    ${chalk.dim('Fix:')} ${f.fix}`);
    }
    lines.push('');
  }
  return lines;
}

export function formatTextResult(result: CheckResult | AggregateCheckOutput): string {
  const lines: string[] = [];

  if ('results' in result) {
    const verdictLabelFn = VERDICT_COLOR[result.verdict];
    lines.push(`\nProdVerdict · All contracts · ${verdictLabelFn(`[${result.verdict.toUpperCase()}]`)}`);
    lines.push(`Evaluated at: ${result.evaluatedAt}\n`);
    for (const r of result.results) {
      lines.push(chalk.bold(`${r.contract}: ${r.verdict.toUpperCase()} (${r.findings.length} findings)`));
    }
    lines.push('');
    lines.push(...formatFindings(result.findings));
    return lines.join('\n');
  }

  const verdictLabelFn = VERDICT_COLOR[result.verdict];
  const verdictLabel = verdictLabelFn(`[${result.verdict.toUpperCase()}]`);
  lines.push(`\nProdVerdict · ${result.contract} contract · ${verdictLabel}`);
  lines.push(`Evaluated at: ${result.evaluatedAt}\n`);
  lines.push(...formatFindings(result.findings));
  return lines.join('\n');
}
