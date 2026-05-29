import * as core from '@actions/core';
import * as github from '@actions/github';
import { resolve } from 'path';
import { parseConfigFile, evaluateAccess, evaluateConfig, aggregateVerdict, createLiveStripeReader, createLivePostgresReader, isProdVerdictError, } from '@prodverdict/engine';
import { buildComment, extractCommentMarker } from './comment.js';
/** Caller repo root — never the action/SDK checkout directory. */
function workspaceRoot() {
    return process.env['GITHUB_WORKSPACE'] ?? process.cwd();
}
async function run() {
    try {
        const configInput = core.getInput('config') || './prodverdict.yml';
        const configPath = resolve(workspaceRoot(), configInput);
        const contractInput = (core.getInput('contract') || 'access').toLowerCase();
        const strict = (core.getInput('strict') || 'false').toLowerCase() === 'true';
        if (contractInput !== 'access' && contractInput !== 'config') {
            core.setFailed(`Unknown contract "${contractInput}". Supported: access, config.`);
            return;
        }
        core.info(`Loading config from ${configPath}`);
        const cfg = parseConfigFile(configPath);
        let result;
        if (contractInput === 'config') {
            const configCfg = cfg.contracts.find((c) => c.type === 'config');
            if (!configCfg) {
                core.setFailed('No config contract found in prodverdict.yml.');
                return;
            }
            core.info('Running config contract check…');
            const findings = await evaluateConfig(configCfg, {
                repoRoot: workspaceRoot(),
                env: process.env,
            });
            const verdict = aggregateVerdict(findings);
            result = {
                contract: 'config',
                verdict,
                findings,
                evaluatedAt: new Date().toISOString(),
            };
        }
        else {
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
            result = {
                contract: 'access',
                verdict,
                findings,
                evaluatedAt: new Date().toISOString(),
            };
        }
        core.info(`Verdict: ${result.verdict.toUpperCase()} — ${result.findings.length} finding(s)`);
        core.setOutput('verdict', result.verdict);
        core.setOutput('findings_count', String(result.findings.length));
        core.setOutput('result_json', JSON.stringify(result));
        await maybePostComment(result);
        const label = result.contract === 'config' ? 'Config' : 'Access';
        if (result.verdict === 'fail') {
            core.setFailed(`${label} contract FAILED — ${result.findings.filter((f) => f.severity === 'high').length} high-severity finding(s). ` +
                'See comment for details.');
        }
        else if (result.verdict === 'warn') {
            const msg = `${label} contract passed with warnings — ${result.findings.length} finding(s).`;
            if (strict) {
                core.setFailed(`${msg} (--strict enabled)`);
            }
            else {
                core.warning(msg);
            }
        }
        else {
            core.info(`${label} contract PASSED — no violations found.`);
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