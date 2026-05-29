import { dirname, resolve, basename } from 'path';
import {
  parseConfigFile,
  evaluateAccess,
  aggregateVerdict,
  createLiveStripeReader,
  createLivePostgresReader,
  createFixtureStripeReader,
  createFixtureDatabaseReader,
  loadFixtureSubscriptions,
  loadFixtureUsers,
  defaultFixturePaths,
  type CheckResult,
  type AccessDataSources,
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
}

const EXIT_PASS = 0;
const EXIT_FAIL = 1;
const EXIT_ERROR = 2;

export async function runCheck(opts: RunCheckOptions): Promise<{ result: CheckResult; exitCode: number }> {
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

    const result: CheckResult = {
      contract: 'access',
      verdict,
      findings,
      evaluatedAt: new Date().toISOString(),
    };

    const exitCode = resolveExitCode(verdict, opts.strict ?? false);
    return { result, exitCode };
  } finally {
    await sources.database.close?.();
  }
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
  const paths = defaultFixturePaths(dir);
  const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
  return {
    stripe: createFixtureStripeReader(subscriptions),
    database: createLivePostgresReader(accessCfg),
  };
}

function buildFixtureSources(configPath: string, fixturesDir?: string): AccessDataSources {
  const dir = resolveFixturesDir(configPath, fixturesDir);
  const paths = defaultFixturePaths(dir);
  const subscriptions = loadFixtureSubscriptions(paths.stripeSubscriptions);
  const users = loadFixtureUsers(paths.dbUsers);
  return {
    stripe: createFixtureStripeReader(subscriptions),
    database: createFixtureDatabaseReader(users),
  };
}
