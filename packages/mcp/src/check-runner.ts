import { resolve } from 'node:path';
import {
  parseConfigFile,
  runContracts,
  toAgentCheckOutput,
  toAgentAggregateOutput,
  type AgentCheckOutput,
  type AgentAggregateOutput,
} from '@prodverdict/engine';

export interface RunContractOptions {
  configPath: string;
  repoRoot?: string | undefined;
  useFixtures?: boolean | undefined;
  fixturesDir?: string | undefined;
}

function baseOpts(opts: RunContractOptions) {
  const configPath = resolve(opts.configPath);
  const config = parseConfigFile(configPath);
  return {
    config,
    configPath,
    repoRoot: opts.repoRoot ? resolve(opts.repoRoot) : process.cwd(),
    env: process.env as Record<string, string | undefined>,
    accessSource: opts.useFixtures ? ('fixtures' as const) : ('live' as const),
    fixturesDir: opts.fixturesDir,
  };
}

export async function runAccessCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['access'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runConfigCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['config'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runMigrationCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['migration'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runBoundaryCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['boundary'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runWebhookCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['webhook'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runRestoreCheck(opts: RunContractOptions): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['restore'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runEntitlementsMigrationCheck(
  opts: RunContractOptions,
): Promise<AgentCheckOutput> {
  const output = await runContracts({
    ...baseOpts(opts),
    contracts: ['entitlements-migration'],
  });
  const result = output.results[0]!;
  return toAgentCheckOutput(result, result.verdict === 'fail' ? 1 : 0);
}

export async function runAllChecks(opts: RunContractOptions): Promise<AgentAggregateOutput> {
  const output = await runContracts(baseOpts(opts));
  const exitCode = output.verdict === 'fail' ? 1 : 0;
  return toAgentAggregateOutput(
    output.verdict,
    output.findings,
    output.evaluatedAt,
    output.results,
    exitCode,
  );
}
