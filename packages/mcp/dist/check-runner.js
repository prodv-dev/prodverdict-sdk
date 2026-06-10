import { dirname, resolve, basename } from 'node:path';
import { parseConfigFile, evaluateAccess, evaluateConfig, evaluateMigration, aggregateVerdict, createLiveBillingReader, createLivePostgresReader, createFixtureStripeReader, createFixtureDatabaseReader, loadFixtureSubscriptions, loadFixtureUsers, defaultFixturePaths, toAgentCheckOutput, toAgentAggregateOutput, } from '@prodverdict/engine';
function resolveFixturesDir(configPath, explicit) {
    if (explicit)
        return resolve(explicit);
    const configDir = dirname(configPath);
    if (basename(configDir) === 'fixtures')
        return configDir;
    return resolve(process.cwd(), 'fixtures');
}
function buildFixtureSources(configPath, accessCfg, fixturesDir) {
    const dir = resolveFixturesDir(configPath, fixturesDir);
    const billingKind = accessCfg.source_of_truth === 'paddle' ? 'paddle' : 'stripe';
    const paths = defaultFixturePaths(dir, billingKind);
    const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
    const users = loadFixtureUsers(paths.dbUsers);
    return {
        billing: createFixtureStripeReader(subscriptions),
        database: createFixtureDatabaseReader(users),
    };
}
export async function runAccessCheck(opts) {
    const path = resolve(opts.configPath);
    const cfg = parseConfigFile(path);
    const accessCfg = cfg.contracts.find((c) => c.type === 'access');
    if (!accessCfg) {
        throw new Error('No access contract defined in prodverdict.yml.');
    }
    const sources = opts.useFixtures
        ? buildFixtureSources(path, accessCfg, opts.fixturesDir)
        : {
            billing: createLiveBillingReader(accessCfg),
            database: createLivePostgresReader(accessCfg),
        };
    try {
        const findings = await evaluateAccess(accessCfg, sources);
        const verdict = aggregateVerdict(findings);
        const result = {
            contract: 'access',
            verdict,
            findings,
            evaluatedAt: new Date().toISOString(),
        };
        const exitCode = verdict === 'fail' ? 1 : 0;
        return toAgentCheckOutput(result, exitCode);
    }
    finally {
        await sources.database.close?.();
    }
}
export async function runConfigCheck(opts) {
    const path = resolve(opts.configPath);
    const cfg = parseConfigFile(path);
    const configCfg = cfg.contracts.find((c) => c.type === 'config');
    if (!configCfg) {
        throw new Error('No config contract defined in prodverdict.yml.');
    }
    const findings = await evaluateConfig(configCfg, {
        repoRoot: opts.repoRoot ? resolve(opts.repoRoot) : process.cwd(),
        env: process.env,
    });
    const verdict = aggregateVerdict(findings);
    const result = {
        contract: 'config',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
    };
    const exitCode = verdict === 'fail' ? 1 : 0;
    return toAgentCheckOutput(result, exitCode);
}
export async function runMigrationCheck(opts) {
    const path = resolve(opts.configPath);
    const cfg = parseConfigFile(path);
    const migrationCfg = cfg.contracts.find((c) => c.type === 'migration');
    if (!migrationCfg) {
        throw new Error('No migration contract defined in prodverdict.yml.');
    }
    const findings = await evaluateMigration(migrationCfg, {
        repoRoot: opts.repoRoot ? resolve(opts.repoRoot) : process.cwd(),
    });
    const verdict = aggregateVerdict(findings);
    const result = {
        contract: 'migration',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
    };
    const exitCode = verdict === 'fail' ? 1 : 0;
    return toAgentCheckOutput(result, exitCode);
}
export async function runAllChecks(opts) {
    const path = resolve(opts.configPath);
    const cfg = parseConfigFile(path);
    const types = [...new Set(cfg.contracts.map((c) => c.type))];
    const results = [];
    for (const type of types) {
        if (type === 'access') {
            const agent = await runAccessCheck(opts);
            results.push({
                contract: 'access',
                verdict: agent.verdict,
                findings: agent.findings,
                evaluatedAt: agent.evaluatedAt,
            });
        }
        else if (type === 'config') {
            const agent = await runConfigCheck(opts);
            results.push({
                contract: 'config',
                verdict: agent.verdict,
                findings: agent.findings,
                evaluatedAt: agent.evaluatedAt,
            });
        }
        else if (type === 'migration') {
            const agent = await runMigrationCheck(opts);
            results.push({
                contract: 'migration',
                verdict: agent.verdict,
                findings: agent.findings,
                evaluatedAt: agent.evaluatedAt,
            });
        }
    }
    const findings = results.flatMap((r) => r.findings);
    const verdict = aggregateVerdict(findings);
    const exitCode = verdict === 'fail' ? 1 : 0;
    return toAgentAggregateOutput(verdict, findings, new Date().toISOString(), results, exitCode);
}
//# sourceMappingURL=check-runner.js.map