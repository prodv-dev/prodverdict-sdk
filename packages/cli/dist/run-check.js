import { dirname, resolve, basename } from 'path';
import { uploadCheckResult, readUploadEnv } from './upload.js';
import { parseConfigFile, evaluateAccess, evaluateConfig, evaluateMigration, aggregateVerdict, createLiveBillingReader, createLivePostgresReader, createFixtureStripeReader, createFixtureDatabaseReader, loadFixtureSubscriptions, loadFixtureUsers, defaultFixturePaths, } from '@prodverdict/engine';
const EXIT_PASS = 0;
const EXIT_FAIL = 1;
export async function runCheck(opts) {
    const configPath = resolve(opts.config);
    const cfg = parseConfigFile(configPath);
    const contract = (opts.contract ?? 'access').toLowerCase();
    if (contract === 'all') {
        const results = [];
        const types = [...new Set(cfg.contracts.map((c) => c.type))];
        for (const type of types) {
            const { result } = await runCheck({ ...opts, contract: type });
            results.push(result);
        }
        const findings = results.flatMap((r) => r.findings);
        const verdict = aggregateVerdict(findings);
        const aggregate = {
            verdict,
            findings,
            evaluatedAt: new Date().toISOString(),
            results,
        };
        if (opts.upload) {
            for (const r of results) {
                await maybeUpload(r, true);
            }
        }
        return { result: aggregate, exitCode: resolveExitCode(verdict, opts.strict ?? false) };
    }
    if (contract === 'config') {
        const configCfg = cfg.contracts.find((c) => c.type === 'config');
        if (!configCfg) {
            throw makeUsageError('No config contract defined in prodverdict.yml.');
        }
        const sources = {
            repoRoot: opts.repoRoot ?? process.cwd(),
            env: process.env,
        };
        const findings = await evaluateConfig(configCfg, sources);
        const verdict = aggregateVerdict(findings);
        const result = {
            contract: 'config',
            verdict,
            findings,
            evaluatedAt: new Date().toISOString(),
        };
        await maybeUpload(result, opts.upload);
        return { result, exitCode: resolveExitCode(verdict, opts.strict ?? false) };
    }
    if (contract === 'migration') {
        const migrationCfg = cfg.contracts.find((c) => c.type === 'migration');
        if (!migrationCfg) {
            throw makeUsageError('No migration contract defined in prodverdict.yml.');
        }
        const findings = await evaluateMigration(migrationCfg, {
            repoRoot: opts.repoRoot ?? process.cwd(),
        });
        const verdict = aggregateVerdict(findings);
        const result = {
            contract: 'migration',
            verdict,
            findings,
            evaluatedAt: new Date().toISOString(),
        };
        await maybeUpload(result, opts.upload);
        return { result, exitCode: resolveExitCode(verdict, opts.strict ?? false) };
    }
    if (contract === 'access') {
        const accessCfg = cfg.contracts.find((c) => c.type === 'access');
        if (!accessCfg) {
            throw makeUsageError('No access contract defined in prodverdict.yml.');
        }
        const sources = opts.fixtures
            ? buildFixtureSources(configPath, accessCfg, opts.fixturesDir)
            : opts.fixturesStripe
                ? buildHybridSources(accessCfg, opts.fixturesStripeDir ?? resolve(dirname(configPath), 'scenarios/pass'))
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
            await maybeUpload(result, opts.upload);
            return { result, exitCode: resolveExitCode(verdict, opts.strict ?? false) };
        }
        finally {
            await sources.database.close?.();
        }
    }
    throw makeUsageError(`Unknown contract type "${contract}". Supported: access, config, migration, all.`);
}
async function maybeUpload(result, uploadFlag) {
    const env = readUploadEnv();
    if (!uploadFlag && !env)
        return;
    if (!env) {
        throw makeUsageError('Upload requested but PRODVERDICT_API_URL, PRODVERDICT_API_KEY, and PRODVERDICT_PROJECT_ID are required.');
    }
    await uploadCheckResult(result, { ...env, source: 'cli' });
}
function resolveExitCode(verdict, strict) {
    if (verdict === 'fail')
        return EXIT_FAIL;
    if (strict && verdict === 'warn')
        return EXIT_FAIL;
    return EXIT_PASS;
}
function makeUsageError(message) {
    const err = new Error(message);
    err.code = 'CONFIG_INVALID';
    return err;
}
function resolveFixturesDir(configPath, explicit) {
    if (explicit)
        return resolve(explicit);
    const configDir = dirname(configPath);
    if (basename(configDir) === 'fixtures')
        return configDir;
    return resolve(process.cwd(), 'fixtures');
}
function buildHybridSources(accessCfg, stripeFixturesDir) {
    const dir = resolve(stripeFixturesDir);
    const billingKind = accessCfg.source_of_truth === 'paddle' ? 'paddle' : 'stripe';
    const paths = defaultFixturePaths(dir, billingKind);
    const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
    return {
        billing: createFixtureStripeReader(subscriptions),
        database: createLivePostgresReader(accessCfg),
    };
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
//# sourceMappingURL=run-check.js.map