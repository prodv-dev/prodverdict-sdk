import { join, resolve } from 'node:path';
import { parseConfigYaml, parseConfigFile, runContracts, toAgentCheckOutput, } from '@prodverdict/engine';
import { withRepoSnapshot } from './repo-snapshot.js';
const DEFAULT_CONFIG = 'prodverdict.yml';
export async function runRemoteValidateConfig(configYaml) {
    const cfg = parseConfigYaml(configYaml);
    return {
        valid: true,
        contracts: cfg.contracts.map((c) => ({ type: c.type })),
    };
}
async function runRemoteContracts(opts) {
    const configPath = resolve(opts.repoRoot, opts.configPath ?? DEFAULT_CONFIG);
    const cfg = parseConfigFile(configPath);
    const output = await runContracts({
        config: cfg,
        configPath,
        repoRoot: opts.repoRoot,
        env: opts.env ?? {},
        contracts: opts.contracts.filter((t) => cfg.contracts.some((c) => c.type === t)),
    });
    return output;
}
export async function runRemoteConfigCheck(opts) {
    const output = await runRemoteContracts({
        ...opts,
        contracts: ['config'],
    });
    const result = output.results[0];
    if (!result) {
        throw new Error('No config contract defined in prodverdict.yml.');
    }
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runRemoteMigrationCheck(opts) {
    const output = await runRemoteContracts({
        repoRoot: opts.repoRoot,
        configPath: opts.configPath,
        contracts: ['migration'],
    });
    const result = output.results[0];
    if (!result) {
        throw new Error('No migration contract defined in prodverdict.yml.');
    }
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runRemoteConfigCheckFromFiles(opts) {
    return withRepoSnapshot(opts.files, (repoRoot) => runRemoteConfigCheck({
        repoRoot,
        configPath: opts.configPath,
        env: opts.env,
    }));
}
export async function runRemoteMigrationCheckFromFiles(opts) {
    return withRepoSnapshot(opts.files, (repoRoot) => runRemoteMigrationCheck({
        repoRoot,
        configPath: opts.configPath,
    }));
}
export function resolveConfigPath(repoRoot, configPath) {
    return join(repoRoot, configPath ?? DEFAULT_CONFIG);
}
export async function runRemoteRepoContractsFromFiles(opts) {
    return withRepoSnapshot(opts.files, async (repoRoot) => {
        const configPath = resolve(repoRoot, opts.configPath ?? DEFAULT_CONFIG);
        const cfg = parseConfigFile(configPath);
        const remoteTypes = ['config', 'migration', 'boundary', 'webhook'].filter((t) => cfg.contracts.some((c) => c.type === t));
        const output = await runContracts({
            config: cfg,
            configPath,
            repoRoot,
            env: opts.env ?? {},
            contracts: [...remoteTypes],
        });
        const toAgent = (type) => {
            const result = output.results.find((r) => r.contract === type);
            if (!result)
                return undefined;
            return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
        };
        const config = toAgent('config');
        const migration = toAgent('migration');
        const hasConfig = cfg.contracts.some((c) => c.type === 'config');
        const hasMigration = cfg.contracts.some((c) => c.type === 'migration');
        if (hasConfig && !config)
            throw new Error('No config contract defined in prodverdict.yml.');
        if (hasMigration && !migration)
            throw new Error('No migration contract defined in prodverdict.yml.');
        if (remoteTypes.length === 0) {
            throw new Error('No remote-compatible contracts (config, migration, boundary, webhook) in prodverdict.yml.');
        }
        return {
            schemaVersion: '1',
            config,
            migration,
            boundary: toAgent('boundary'),
            webhook: toAgent('webhook'),
            verdict: output.verdict,
            exitCode: output.verdict === 'fail' ? 1 : 0,
        };
    });
}
//# sourceMappingURL=remote-check-runner.js.map