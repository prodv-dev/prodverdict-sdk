import { resolve } from 'node:path';
import { parseConfigFile, runContracts, toAgentCheckOutput, toAgentAggregateOutput, } from '@prodverdict/engine';
function baseOpts(opts) {
    const configPath = resolve(opts.configPath);
    const config = parseConfigFile(configPath);
    return {
        config,
        configPath,
        repoRoot: opts.repoRoot ? resolve(opts.repoRoot) : process.cwd(),
        env: process.env,
        accessSource: opts.useFixtures ? 'fixtures' : 'live',
        fixturesDir: opts.fixturesDir,
    };
}
export async function runAccessCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['access'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runConfigCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['config'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runMigrationCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['migration'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runBoundaryCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['boundary'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runWebhookCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['webhook'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runRestoreCheck(opts) {
    const output = await runContracts({
        ...baseOpts(opts),
        contracts: ['restore'],
    });
    const result = output.results[0];
    return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}
export async function runAllChecks(opts) {
    const output = await runContracts(baseOpts(opts));
    const exitCode = output.verdict === 'fail' ? 1 : 0;
    return toAgentAggregateOutput(output.verdict, output.findings, output.evaluatedAt, output.results, exitCode);
}
//# sourceMappingURL=check-runner.js.map