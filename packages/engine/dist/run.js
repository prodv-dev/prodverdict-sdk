import { dirname, resolve, basename } from 'node:path';
import { createLiveBillingReader, createLivePostgresReader, createFixtureStripeReader, createFixtureDatabaseReader, loadFixtureSubscriptions, loadFixtureUsers, defaultFixturePaths, } from './connectors/index.js';
import { evaluateAccess } from './evaluators/access.js';
import { evaluateConfig } from './evaluators/config.js';
import { evaluateMigration } from './evaluators/migration.js';
import { evaluateBoundary } from './evaluators/boundary.js';
import { evaluateWebhook } from './evaluators/webhook.js';
import { evaluateRestore } from './evaluators/restore.js';
import { aggregateVerdict } from './verdict.js';
const EXIT_PASS = 0;
const EXIT_FAIL = 1;
export function resolveCheckExitCode(verdict, strict) {
    if (verdict === 'fail')
        return EXIT_FAIL;
    if (strict && verdict === 'warn')
        return EXIT_FAIL;
    return EXIT_PASS;
}
function resolveFixturesDir(configPath, explicit) {
    if (explicit)
        return resolve(explicit);
    if (configPath) {
        const configDir = dirname(resolve(configPath));
        if (basename(configDir) === 'fixtures')
            return configDir;
    }
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
function buildHybridSources(accessCfg, configPath, fixturesStripeDir) {
    const dir = resolve(fixturesStripeDir ??
        (configPath ? resolve(dirname(resolve(configPath)), 'scenarios/pass') : 'scenarios/pass'));
    const billingKind = accessCfg.source_of_truth === 'paddle' ? 'paddle' : 'stripe';
    const paths = defaultFixturePaths(dir, billingKind);
    const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
    return {
        billing: createFixtureStripeReader(subscriptions),
        database: createLivePostgresReader(accessCfg),
    };
}
function buildAccessSources(accessCfg, opts) {
    const mode = opts.accessSource ?? 'live';
    if (mode === 'fixtures') {
        return buildFixtureSources(opts.configPath, accessCfg, opts.fixturesDir);
    }
    if (mode === 'fixtures-stripe') {
        return buildHybridSources(accessCfg, opts.configPath, opts.fixturesStripeDir);
    }
    return {
        billing: createLiveBillingReader(accessCfg),
        database: createLivePostgresReader(accessCfg),
    };
}
function contractTypesToRun(config, filter) {
    const declared = config.contracts.map((c) => c.type);
    const unique = [...new Set(declared)];
    if (!filter || filter.length === 0)
        return unique;
    return unique.filter((t) => filter.includes(t));
}
function makeUsageError(message) {
    const err = new Error(message);
    err.code = 'CONFIG_INVALID';
    return err;
}
async function runSingleContract(type, opts) {
    const repoRoot = opts.repoRoot ?? process.cwd();
    const env = opts.env ?? process.env;
    const evaluatedAt = new Date().toISOString();
    if (type === 'config') {
        const configCfg = opts.config.contracts.find((c) => c.type === 'config');
        if (!configCfg) {
            throw makeUsageError('No config contract defined in prodverdict.yml.');
        }
        const findings = await evaluateConfig(configCfg, { repoRoot, env });
        return { contract: 'config', verdict: aggregateVerdict(findings), findings, evaluatedAt };
    }
    if (type === 'migration') {
        const migrationCfg = opts.config.contracts.find((c) => c.type === 'migration');
        if (!migrationCfg) {
            throw makeUsageError('No migration contract defined in prodverdict.yml.');
        }
        const findings = await evaluateMigration(migrationCfg, { repoRoot });
        return { contract: 'migration', verdict: aggregateVerdict(findings), findings, evaluatedAt };
    }
    if (type === 'access') {
        const accessCfg = opts.config.contracts.find((c) => c.type === 'access');
        if (!accessCfg) {
            throw makeUsageError('No access contract defined in prodverdict.yml.');
        }
        const sources = buildAccessSources(accessCfg, opts);
        try {
            const findings = await evaluateAccess(accessCfg, sources);
            return { contract: 'access', verdict: aggregateVerdict(findings), findings, evaluatedAt };
        }
        finally {
            await sources.database.close?.();
        }
    }
    if (type === 'boundary') {
        const boundaryCfg = opts.config.contracts.find((c) => c.type === 'boundary');
        if (!boundaryCfg) {
            throw makeUsageError('No boundary contract defined in prodverdict.yml.');
        }
        const findings = await evaluateBoundary(boundaryCfg, { repoRoot });
        return { contract: 'boundary', verdict: aggregateVerdict(findings), findings, evaluatedAt };
    }
    if (type === 'webhook') {
        const webhookCfg = opts.config.contracts.find((c) => c.type === 'webhook');
        if (!webhookCfg) {
            throw makeUsageError('No webhook contract defined in prodverdict.yml.');
        }
        const findings = await evaluateWebhook(webhookCfg, { repoRoot });
        return { contract: 'webhook', verdict: aggregateVerdict(findings), findings, evaluatedAt };
    }
    if (type === 'restore') {
        const restoreCfg = opts.config.contracts.find((c) => c.type === 'restore');
        if (!restoreCfg) {
            throw makeUsageError('No restore contract defined in prodverdict.yml.');
        }
        const findings = await evaluateRestore(restoreCfg, { env });
        return { contract: 'restore', verdict: aggregateVerdict(findings), findings, evaluatedAt };
    }
    throw makeUsageError(`Contract type "${type}" is not supported. Supported: access, config, migration, boundary, webhook, restore.`);
}
export async function runContracts(opts) {
    const types = contractTypesToRun(opts.config, opts.contracts);
    if (types.length === 0) {
        throw makeUsageError('No contracts to run.');
    }
    const results = [];
    for (const type of types) {
        results.push(await runSingleContract(type, opts));
    }
    const findings = results.flatMap((r) => r.findings);
    const verdict = aggregateVerdict(findings);
    return {
        results,
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=run.js.map