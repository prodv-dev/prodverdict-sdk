const SEVERITY_EMOJI = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
};
const VERDICT_EMOJI = {
    fail: '❌',
    warn: '⚠️',
    pass: '✅',
};
const CONTRACT_LABEL = {
    access: 'Access Contract',
    config: 'Config Contract',
    migration: 'Migration Contract',
    boundary: 'Boundary Contract',
    webhook: 'Webhook Contract',
    restore: 'Restore Contract',
};
const MARKER = '<!-- prodverdict-comment -->';
export function buildComment(result) {
    const icon = VERDICT_EMOJI[result.verdict];
    const verdict = result.verdict.toUpperCase();
    const contractLabel = CONTRACT_LABEL[result.contract] ?? `${result.contract} contract`;
    const lines = [
        MARKER,
        `## ${icon} ProdVerdict — ${contractLabel} [${verdict}]`,
        '',
        `**Evaluated at:** ${result.evaluatedAt}`,
        '',
    ];
    if (result.findings.length === 0) {
        lines.push(`No violations found for the ${contractLabel.toLowerCase()}.`);
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
        lines.push(`> **${highCount} high-severity finding(s)** must be resolved before merging. ` +
            'Review the fix suggestions above and re-run the check.');
    }
    const fixes = result.findings.map((f) => f.fix).filter(Boolean);
    if (fixes.length > 0) {
        lines.push('', '### Suggested fixes', '');
        const seen = new Set();
        for (const fix of fixes) {
            if (fix && !seen.has(fix)) {
                lines.push(`- ${fix}`);
                seen.add(fix);
            }
        }
    }
    return lines.join('\n');
}
export function extractCommentMarker() {
    return MARKER;
}
//# sourceMappingURL=comment.js.map