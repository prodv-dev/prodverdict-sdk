import { join, resolve } from 'node:path';
import {
  parseConfigYaml,
  parseConfigFile,
  evaluateConfig,
  evaluateMigration,
  aggregateVerdict,
  toAgentCheckOutput,
  type AgentCheckOutput,
} from '@prodverdict/engine';
import { withRepoSnapshot } from './repo-snapshot.js';

const DEFAULT_CONFIG = 'prodverdict.yml';

export async function runRemoteValidateConfig(configYaml: string) {
  const cfg = parseConfigYaml(configYaml);
  return {
    valid: true,
    contracts: cfg.contracts.map((c) => ({ type: c.type })),
  };
}

export async function runRemoteConfigCheck(opts: {
  repoRoot: string;
  configPath?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
}): Promise<AgentCheckOutput> {
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
  return toAgentCheckOutput(
    {
      contract: 'config',
      verdict,
      findings,
      evaluatedAt: new Date().toISOString(),
    },
    verdict === 'fail' ? 1 : 0,
  );
}

export async function runRemoteMigrationCheck(opts: {
  repoRoot: string;
  configPath?: string | undefined;
}): Promise<AgentCheckOutput> {
  const configPath = resolve(opts.repoRoot, opts.configPath ?? DEFAULT_CONFIG);
  const cfg = parseConfigFile(configPath);
  const migrationCfg = cfg.contracts.find((c) => c.type === 'migration');
  if (!migrationCfg) {
    throw new Error('No migration contract defined in prodverdict.yml.');
  }

  const findings = await evaluateMigration(migrationCfg, { repoRoot: opts.repoRoot });
  const verdict = aggregateVerdict(findings);
  return toAgentCheckOutput(
    {
      contract: 'migration',
      verdict,
      findings,
      evaluatedAt: new Date().toISOString(),
    },
    verdict === 'fail' ? 1 : 0,
  );
}

export async function runRemoteConfigCheckFromFiles(opts: {
  files: Record<string, string>;
  configPath?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
}): Promise<AgentCheckOutput> {
  return withRepoSnapshot(opts.files, (repoRoot) =>
    runRemoteConfigCheck({
      repoRoot,
      configPath: opts.configPath,
      env: opts.env,
    }),
  );
}

export async function runRemoteMigrationCheckFromFiles(opts: {
  files: Record<string, string>;
  configPath?: string | undefined;
}): Promise<AgentCheckOutput> {
  return withRepoSnapshot(opts.files, (repoRoot) =>
    runRemoteMigrationCheck({
      repoRoot,
      configPath: opts.configPath,
    }),
  );
}

export function resolveConfigPath(repoRoot: string, configPath?: string): string {
  return join(repoRoot, configPath ?? DEFAULT_CONFIG);
}
