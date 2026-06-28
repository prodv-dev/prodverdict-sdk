import { resolve } from 'path';
import { uploadCheckResult, readUploadEnv } from './upload.js';
import {
  parseConfigFile,
  runContracts,
  resolveCheckExitCode,
  type CheckResult,
  type Verdict,
  type Finding,
} from '@prodverdict/engine';

export interface RunCheckOptions {
  config: string;
  contract?: string | undefined;
  format: 'json' | 'text' | 'agent';
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

const SUPPORTED_CONTRACTS = [
  'access',
  'config',
  'migration',
  'boundary',
  'webhook',
  'restore',
  'entitlements-migration',
  'all',
] as const;

export async function runCheck(
  opts: RunCheckOptions,
): Promise<{ result: CheckResult | AggregateCheckOutput; exitCode: number }> {
  const configPath = resolve(opts.config);
  const cfg = parseConfigFile(configPath);
  const contract = (opts.contract ?? 'access').toLowerCase();

  if (!SUPPORTED_CONTRACTS.includes(contract as (typeof SUPPORTED_CONTRACTS)[number])) {
    throw makeUsageError(
      `Unknown contract type "${contract}". Supported: access, config, migration, boundary, webhook, restore, entitlements-migration, all.`,
    );
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
    env: process.env as Record<string, string | undefined>,
    contracts:
      contract === 'all'
        ? undefined
        : [
            contract as
              | 'access'
              | 'config'
              | 'migration'
              | 'boundary'
              | 'webhook'
              | 'restore'
              | 'entitlements-migration',
          ],
    accessSource,
    fixturesDir: opts.fixturesDir,
    fixturesStripeDir: opts.fixturesStripeDir,
  });

  if (contract === 'all') {
    const aggregate: AggregateCheckOutput = {
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

  const result = output.results[0]!;
  await maybeUpload(result, opts.upload);
  return {
    result,
    exitCode: resolveCheckExitCode(result.verdict, opts.strict ?? false),
  };
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

function makeUsageError(message: string): Error & { code: 'CONFIG_INVALID' } {
  const err = new Error(message) as Error & { code: 'CONFIG_INVALID' };
  err.code = 'CONFIG_INVALID';
  return err;
}
