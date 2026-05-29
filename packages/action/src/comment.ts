import type { CheckResult, Finding } from '@prodverdict/engine';

const SEVERITY_EMOJI: Record<Finding['severity'], string> = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
};

const VERDICT_EMOJI: Record<CheckResult['verdict'], string> = {
  fail: '❌',
  warn: '⚠️',
  pass: '✅',
};

const MARKER = '<!-- prodverdict-comment -->';

export function buildComment(result: CheckResult): string {
  const icon = VERDICT_EMOJI[result.verdict];
  const verdict = result.verdict.toUpperCase();
  const lines: string[] = [
    MARKER,
    `## ${icon} ProdVerdict — Access Contract [${verdict}]`,
    '',
    `**Evaluated at:** ${result.evaluatedAt}`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('All access state is in sync with Stripe. No violations found.');
    return lines.join('\n');
  }

  lines.push(`**${result.findings.length} finding(s):**`, '');
  lines.push('| Severity | Entity | Message |');
  lines.push('|----------|--------|---------|');

  for (const f of result.findings) {
    const sev = `${SEVERITY_EMOJI[f.severity]} ${f.severity}`;
    const msg = f.message.replace(/\|/g, '\\|');
    lines.push(`| ${sev} | \`${f.entity}\` | ${msg} |`);
  }

  const highCount = result.findings.filter((f) => f.severity === 'high').length;
  if (highCount > 0) {
    lines.push('');
    lines.push(
      `> **${highCount} high-severity finding(s)** must be resolved before merging. ` +
        'Review the fix suggestions above and re-run the check.',
    );
  }

  const fixes = result.findings.map((f) => f.fix).filter(Boolean);
  if (fixes.length > 0) {
    lines.push('', '### Suggested fixes', '');
    const seen = new Set<string>();
    for (const fix of fixes) {
      if (fix && !seen.has(fix)) {
        lines.push(`- ${fix}`);
        seen.add(fix);
      }
    }
  }

  return lines.join('\n');
}

export function extractCommentMarker(): string {
  return MARKER;
}
