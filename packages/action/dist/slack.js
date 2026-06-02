import * as core from '@actions/core';
export async function maybeNotifySlack(result, webhookUrl) {
    const highCount = result.findings.filter((f) => f.severity === 'high').length;
    if (result.verdict === 'pass')
        return;
    if (result.verdict === 'warn' && highCount === 0) {
        // warn-only: optional notify; skip unless strict failures desired
    }
    const lines = result.findings
        .filter((f) => f.severity === 'high')
        .slice(0, 5)
        .map((f) => `• [${f.severity}] ${f.entity}: ${f.message}`);
    const text = `ProdVerdict ${result.contract} check: *${result.verdict.toUpperCase()}* (${result.findings.length} finding(s))\n` +
        (lines.length ? lines.join('\n') : 'See CI logs for details.');
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) {
            core.warning(`Slack webhook returned ${res.status}`);
        }
        else {
            core.info('Posted ProdVerdict summary to Slack.');
        }
    }
    catch (err) {
        core.warning(`Slack notification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
//# sourceMappingURL=slack.js.map