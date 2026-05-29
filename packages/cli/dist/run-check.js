import { dirname, resolve, basename } from 'path';
import { parseConfigFile, evaluateAccess, aggregateVerdict, createLiveStripeReader, createLivePostgresReader, createFixtureStripeReader, createFixtureDatabaseReader, loadFixtureSubscriptions, loadFixtureUsers, defaultFixturePaths, } from '@prodverdict/engine';
const EXIT_PASS = 0;
const EXIT_FAIL = 1;
const EXIT_ERROR = 2;
export async function runCheck(opts) {
    const configPath = resolve(opts.config);
    const cfg = parseConfigFile(configPath);
    const contract = (opts.contract ?? 'access').toLowerCase();
    if (contract !== 'access') {
        throw makeUsageError(`Unknown contract type "${contract}". Currently only "access" is supported.`);
    }
    const accessCfg = cfg.contracts.find((c) => c.type === 'access');
    if (!accessCfg) {
        throw makeUsageError('No access contract defined in prodverdict.yml.');
    }
    const sources = opts.fixtures
        ? buildFixtureSources(configPath, opts.fixturesDir)
        : opts.fixturesStripe
            ? buildHybridSources(accessCfg, opts.fixturesStripeDir ?? resolve(dirname(configPath), 'scenarios/pass'))
            : {
                stripe: createLiveStripeReader(accessCfg.stripe.secret_env),
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
        const exitCode = resolveExitCode(verdict, opts.strict ?? false);
        return { result, exitCode };
    }
    finally {
        await sources.database.close?.();
    }
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
    const paths = defaultFixturePaths(dir);
    const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
    return {
        stripe: createFixtureStripeReader(subscriptions),
        database: createLivePostgresReader(accessCfg),
    };
}
function buildFixtureSources(configPath, fixturesDir) {
    const dir = resolveFixturesDir(configPath, fixturesDir);
    const paths = defaultFixturePaths(dir);
    const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
    const users = loadFixtureUsers(paths.dbUsers);
    return {
        stripe: createFixtureStripeReader(subscriptions),
        database: createFixtureDatabaseReader(users),
    };
}
//# sourceMappingURL=run-check.js.map