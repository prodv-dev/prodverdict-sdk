import { join, resolve } from 'node:path';
import { parseConfigYaml, parseConfigFile, evaluateConfig, evaluateMigration, aggregateVerdict, toAgentCheckOutput, } from '@prodverdict/engine';
import { withRepoSnapshot } from './repo-snapshot.js';
const DEFAULT_CONFIG = 'prodverdict.yml';
export async function runRemoteValidateConfig(configYaml) {
    const cfg = parseConfigYaml(configYaml);
    return {
        valid: true,
        contracts: cfg.contracts.map((c) => ({ type: c.type })),
    };
}
export async function runRemoteConfigCheck(opts) {
    const configPath = resolve(opts.repoRoot, opts.configPath ?? DEFAULT_CONFIG);
    const cfg = parseConfigFile(configPath);
    const configCfg = cfg.contracts.find((c) => c.type === 'config');
    if (!configCfg) {
        throw new Error('No config contract defined in prodverdict.yml.');
    }
    const findings = await evaluateConfig(configCfg, {
        repoRoot: opts.repoRoot,
        env: opts.env ?? {},
    });
    const verdict = aggregateVerdict(findings);
    return toAgentCheckOutput({
        contract: 'config',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
    }, verdict === 'fail' ? 1 : 0);
}
export async function runRemoteMigrationCheck(opts) {
    const configPath = resolve(opts.repoRoot, opts.configPath ?? DEFAULT_CONFIG);
    const cfg = parseConfigFile(configPath);
    const migrationCfg = cfg.contracts.find((c) => c.type === 'migration');
    if (!migrationCfg) {
        throw new Error('No migration contract defined in prodverdict.yml.');
    }
    const findings = await evaluateMigration(migrationCfg, { repoRoot: opts.repoRoot });
    const verdict = aggregateVerdict(findings);
    return toAgentCheckOutput({
        contract: 'migration',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
    }, verdict === 'fail' ? 1 : 0);
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
//# sourceMappingURL=remote-check-runner.js.map