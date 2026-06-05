import { dirname, resolve, basename } from 'path';
import { uploadCheckResult, readUploadEnv } from './upload.js';
import {
  parseConfigFile,
  evaluateAccess,
  evaluateConfig,
  evaluateMigration,
  aggregateVerdict,
  createLiveBillingReader,
  createLivePostgresReader,
  createFixtureStripeReader,
  createFixtureDatabaseReader,
  loadFixtureSubscriptions,
  loadFixtureUsers,
  defaultFixturePaths,
  type CheckResult,
  type AccessDataSources,
  type ConfigDataSources,
  type Finding,
  type Verdict,
} from '@prodverdict/engine';

export interface RunCheckOptions {
  config: string;
  contract?: string | undefined;
  format: 'json' | 'text';
  fixtures?: boolean | undefined;
  fixturesDir?: string | undefined;
  /** Live Postgres + Stripe data from fixture JSON (for local test environments) */
  fixturesStripe?: boolean | undefined;
  fixturesStripeDir?: string | undefined;
  strict?: boolean | undefined;
  /** Repo root for config contract source scanning (default: cwd) */
  repoRoot?: string | undefined;
  /** POST result to PRODVERDICT_API_URL when env vars set */
  upload?: boolean | undefined;
}

export interface AggregateCheckOutput {
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
  results: CheckResult[];
}

const EXIT_PASS = 0;
const EXIT_FAIL = 1;

export async function runCheck(
  opts: RunCheckOptions,
): Promise<{ result: CheckResult | AggregateCheckOutput; exitCode: number }> {
  const configPath = resolve(opts.config);
  const cfg = parseConfigFile(configPath);
  const contract = (opts.contract ?? 'access').toLowerCase();

  if (contract === 'all') {
    const results: CheckResult[] = [];
    const types = [...new Set(cfg.contracts.map((c) => c.type))];
    for (const type of types) {
      const { result } = await runCheck({ ...opts, contract: type });
      results.push(result as CheckResult);
    }
    const findings = results.flatMap((r) => r.findings);
    const verdict = aggregateVerdict(findings);
    const aggregate: AggregateCheckOutput = {
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

    const sources: ConfigDataSources = {
      repoRoot: opts.repoRoot ?? process.cwd(),
      env: process.env as Record<string, string | undefined>,
    };

    const findings = await evaluateConfig(configCfg, sources);
    const verdict = aggregateVerdict(findings);

    const result: CheckResult = {
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

    const result: CheckResult = {
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

      const result: CheckResult = {
        contract: 'access',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
      };

      await maybeUpload(result, opts.upload);
      return { result, exitCode: resolveExitCode(verdict, opts.strict ?? false) };
    } finally {
      await sources.database.close?.();
    }
  }

  throw makeUsageError(`Unknown contract type "${contract}". Supported: access, config, migration, all.`);
}

async function maybeUpload(result: CheckResult, uploadFlag?: boolean): Promise<void> {
  const env = readUploadEnv();
  if (!uploadFlag && !env) return;
  if (!env) {
    throw makeUsageError(
      'Upload requested but PRODVERDICT_API_URL, PRODVERDICT_API_KEY, and PRODVERDICT_PROJECT_ID are required.',
    );
  }
  await uploadCheckResult(result, { ...env, source: 'cli' });
}

function resolveExitCode(verdict: CheckResult['verdict'], strict: boolean): number {
  if (verdict === 'fail') return EXIT_FAIL;
  if (strict && verdict === 'warn') return EXIT_FAIL;
  return EXIT_PASS;
}

function makeUsageError(message: string): Error & { code: 'CONFIG_INVALID' } {
  const err = new Error(message) as Error & { code: 'CONFIG_INVALID' };
  err.code = 'CONFIG_INVALID';
  return err;
}

function resolveFixturesDir(configPath: string, explicit?: string): string {
  if (explicit) return resolve(explicit);
  const configDir = dirname(configPath);
  if (basename(configDir) === 'fixtures') return configDir;
  return resolve(process.cwd(), 'fixtures');
}

function buildHybridSources(
  accessCfg: Parameters<typeof createLivePostgresReader>[0],
  stripeFixturesDir: string,
): AccessDataSources {
  const dir = resolve(stripeFixturesDir);
  const billingKind = accessCfg.source_of_truth === 'paddle' ? 'paddle' : 'stripe';
  const paths = defaultFixturePaths(dir, billingKind);
  const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
  return {
    billing: createFixtureStripeReader(subscriptions),
    database: createLivePostgresReader(accessCfg),
  };
}

function buildFixtureSources(
  configPath: string,
  accessCfg: Parameters<typeof createLivePostgresReader>[0],
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
