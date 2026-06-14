import { dirname, resolve, basename } from 'node:path';
import type { ProdVerdictConfig, AccessContractConfig } from './config/schema.js';
import {
  createLiveBillingReader,
  createLivePostgresReader,
  createFixtureStripeReader,
  createFixtureDatabaseReader,
  loadFixtureSubscriptions,
  loadFixtureUsers,
  defaultFixturePaths,
} from './connectors/index.js';
import { evaluateAccess } from './evaluators/access.js';
import type { AccessDataSources } from './evaluators/access.js';
import { evaluateConfig } from './evaluators/config.js';
import { evaluateMigration } from './evaluators/migration.js';
import { evaluateBoundary } from './evaluators/boundary.js';
import { evaluateWebhook } from './evaluators/webhook.js';
import { evaluateRestore } from './evaluators/restore.js';
import { aggregateVerdict } from './verdict.js';
import type { CheckResult, ContractType, Finding, Verdict } from './types.js';

export type AccessSourceMode = 'live' | 'fixtures' | 'fixtures-stripe';

export interface RunContractsOptions {
  config: ProdVerdictConfig;
  /** Path to prodverdict.yml — used to resolve fixture directories */
  configPath?: string | undefined;
  repoRoot?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
  /** Run only these contract types. Default: unique types in config (declaration order). */
  contracts?: ContractType[] | undefined;
  accessSource?: AccessSourceMode | undefined;
  fixturesDir?: string | undefined;
  fixturesStripeDir?: string | undefined;
}

export interface RunContractsOutput {
  results: CheckResult[];
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
}

const EXIT_PASS = 0;
const EXIT_FAIL = 1;

export function resolveCheckExitCode(verdict: Verdict, strict?: boolean): number {
  if (verdict === 'fail') return EXIT_FAIL;
  if (strict && verdict === 'warn') return EXIT_FAIL;
  return EXIT_PASS;
}

function resolveFixturesDir(configPath: string | undefined, explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (configPath) {
    const configDir = dirname(resolve(configPath));
    if (basename(configDir) === 'fixtures') return configDir;
  }
  return resolve(process.cwd(), 'fixtures');
}

function buildFixtureSources(
  configPath: string | undefined,
  accessCfg: AccessContractConfig,
  fixturesDir?: string,
): AccessDataSources {
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

function buildHybridSources(
  accessCfg: AccessContractConfig,
  configPath: string | undefined,
  fixturesStripeDir?: string,
): AccessDataSources {
  const dir = resolve(
    fixturesStripeDir ??
      (configPath ? resolve(dirname(resolve(configPath)), 'scenarios/pass') : 'scenarios/pass'),
  );
  const billingKind = accessCfg.source_of_truth === 'paddle' ? 'paddle' : 'stripe';
  const paths = defaultFixturePaths(dir, billingKind);
  const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
  return {
    billing: createFixtureStripeReader(subscriptions),
    database: createLivePostgresReader(accessCfg),
  };
}

function buildAccessSources(
  accessCfg: AccessContractConfig,
  opts: RunContractsOptions,
): AccessDataSources {
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

function contractTypesToRun(config: ProdVerdictConfig, filter?: ContractType[]): ContractType[] {
  const declared = config.contracts.map((c) => c.type);
  const unique = [...new Set(declared)];
  if (!filter || filter.length === 0) return unique;
  return unique.filter((t) => filter.includes(t));
}

function makeUsageError(message: string): Error & { code: 'CONFIG_INVALID' } {
  const err = new Error(message) as Error & { code: 'CONFIG_INVALID' };
  err.code = 'CONFIG_INVALID';
  return err;
}

async function runSingleContract(
  type: ContractType,
  opts: RunContractsOptions,
): Promise<CheckResult> {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const env = opts.env ?? (process.env as Record<string, string | undefined>);
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
    } finally {
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

  throw makeUsageError(
    `Contract type "${type}" is not supported. Supported: access, config, migration, boundary, webhook, restore.`,
  );
}

export async function runContracts(opts: RunContractsOptions): Promise<RunContractsOutput> {
  const types = contractTypesToRun(opts.config, opts.contracts);
  if (types.length === 0) {
    throw makeUsageError('No contracts to run.');
  }

  const results: CheckResult[] = [];
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
