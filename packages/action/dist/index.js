import * as core from '@actions/core';
import * as github from '@actions/github';
import { resolve } from 'path';
import { parseConfigFile, evaluateAccess, aggregateVerdict, createLiveStripeReader, createLivePostgresReader, isProdVerdictError, } from '@prodverdict/engine';
import { buildComment, extractCommentMarker } from './comment.js';
async function run() {
    try {
        const configPath = resolve(core.getInput('config') || './prodverdict.yml');
        const contractInput = (core.getInput('contract') || 'access').toLowerCase();
        const strict = (core.getInput('strict') || 'false').toLowerCase() === 'true';
        if (contractInput !== 'access') {
            core.setFailed(`Unknown contract "${contractInput}". Only "access" is supported in Phase 1.`);
            return;
        }
        core.info(`Loading config from ${configPath}`);
        const cfg = parseConfigFile(configPath);
        const accessCfg = cfg.contracts.find((c) => c.type === 'access');
        if (!accessCfg) {
            core.setFailed('No access contract found in prodverdict.yml.');
            return;
        }
        core.info('Connecting to Stripe and database (read-only)…');
        const sources = {
            stripe: createLiveStripeReader(accessCfg.stripe.secret_env),
            database: createLivePostgresReader(accessCfg),
        };
        let findings;
        try {
            findings = await evaluateAccess(accessCfg, sources);
        }
        finally {
            await sources.database.close?.();
        }
        const verdict = aggregateVerdict(findings);
        const result = {
            contract: 'access',
            verdict,
            findings,
            evaluatedAt: new Date().toISOString(),
        };
        core.info(`Verdict: ${verdict.toUpperCase()} — ${findings.length} finding(s)`);
        // Set outputs
        core.setOutput('verdict', verdict);
        core.setOutput('findings_count', String(findings.length));
        core.setOutput('result_json', JSON.stringify(result));
        // Post PR comment if running in a pull_request context
        await maybePostComment(result);
        if (verdict === 'fail') {
            core.setFailed(`Access contract FAILED — ${findings.filter((f) => f.severity === 'high').length} high-severity finding(s). ` +
                'See comment for details.');
        }
        else if (verdict === 'warn') {
            const msg = `Access contract passed with warnings — ${findings.length} finding(s).`;
            if (strict) {
                core.setFailed(`${msg} (--strict enabled)`);
            }
            else {
                core.warning(msg);
            }
        }
        else {
            core.info('Access contract PASSED — no violations found.');
        }
    }
    catch (err) {
        if (isProdVerdictError(err)) {
            core.setFailed(`[${err.code}] ${err.message}`);
        }
        else if (err instanceof Error) {
            core.setFailed(`Unexpected error: ${err.message}`);
        }
        else {
            core.setFailed(`Unexpected error: ${String(err)}`);
        }
    }
}
async function maybePostComment(result) {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
        core.debug('GITHUB_TOKEN not set — skipping PR comment.');
        return;
    }
    const context = github.context;
    if (context.eventName !== 'pull_request') {
        core.debug('Not a pull_request event — skipping PR comment.');
        return;
    }
    const prNumber = context.payload.pull_request?.number;
    if (!prNumber)
        return;
    const octokit = github.getOctokit(token);
    const { owner, repo } = context.repo;
    const marker = extractCommentMarker();
    const body = buildComment(result);
    // Find and update existing comment, or create new one
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
    });
    const existing = comments.find((c) => c.body?.includes(marker));
    if (existing) {
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existing.id,
            body,
        });
        core.info(`Updated existing ProdVerdict PR comment (#${existing.id}).`);
    }
    else {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body,
        });
        core.info('Posted new ProdVerdict PR comment.');
    }
}
run();
//# sourceMappingURL=index.js.map