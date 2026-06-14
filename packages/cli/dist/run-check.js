import { resolve } from 'path';
import { uploadCheckResult, readUploadEnv } from './upload.js';
import { parseConfigFile, runContracts, resolveCheckExitCode, } from '@prodverdict/engine';
const SUPPORTED_CONTRACTS = [
    'access',
    'config',
    'migration',
    'boundary',
    'webhook',
    'restore',
    'all',
];
export async function runCheck(opts) {
    const configPath = resolve(opts.config);
    const cfg = parseConfigFile(configPath);
    const contract = (opts.contract ?? 'access').toLowerCase();
    if (!SUPPORTED_CONTRACTS.includes(contract)) {
        throw makeUsageError(`Unknown contract type "${contract}". Supported: access, config, migration, boundary, webhook, restore, all.`);
    }
    const accessSource = opts.fixtures
        ? 'fixtures'
        : opts.fixturesStripe
            ? 'fixtures-stripe'
            : 'live';
    const output = await runContracts({
        config: cfg,
        configPath,
        repoRoot: opts.repoRoot ?? process.cwd(),
        env: process.env,
        contracts: contract === 'all'
            ? undefined
            : [contract],
        accessSource,
        fixturesDir: opts.fixturesDir,
        fixturesStripeDir: opts.fixturesStripeDir,
    });
    if (contract === 'all') {
        const aggregate = {
            verdict: output.verdict,
            findings: output.findings,
            evaluatedAt: output.evaluatedAt,
            results: output.results,
        };
        if (opts.upload) {
            for (const r of output.results) {
                await maybeUpload(r, true);
            }
        }
        return {
            result: aggregate,
            exitCode: resolveCheckExitCode(output.verdict, opts.strict ?? false),
        };
    }
    const result = output.results[0];
    await maybeUpload(result, opts.upload);
    return {
        result,
        exitCode: resolveCheckExitCode(result.verdict, opts.strict ?? false),
    };
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
function makeUsageError(message) {
    const err = new Error(message);
    err.code = 'CONFIG_INVALID';
    return err;
}
//# sourceMappingURL=run-check.js.map