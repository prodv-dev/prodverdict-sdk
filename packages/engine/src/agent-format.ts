import type { CheckResult, Finding, Verdict } from './types.js';

export const AGENT_SCHEMA_VERSION = '1' as const;

export interface AgentCheckOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  contract: string;
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
  summary: string;
  nextSteps: string[];
  exitCode: 0 | 1;
}

export interface AgentAggregateOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  contract: 'all';
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
  results: CheckResult[];
  summary: string;
  nextSteps: string[];
  exitCode: 0 | 1;
}

export interface AgentDoctorOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  ok: boolean;
  checks: Array<{ name: string; status: string; message: string }>;
  contracts: Array<{ type: string }>;
  summary: string;
  nextSteps: string[];
  exitCode: 0 | 1 | 2;
}

function dedupeFixes(findings: Finding[]): string[] {
  const seen = new Set<string>();
  const fixes: string[] = [];
  for (const f of findings) {
    if (f.fix && !seen.has(f.fix)) {
      seen.add(f.fix);
      fixes.push(f.fix);
    }
  }
  return fixes;
}

function buildSummary(verdict: Verdict, findings: Finding[], contract: string): string {
  if (verdict === 'pass') {
    return `${contract} contract passed with no violations.`;
  }
  const high = findings.filter((f) => f.severity === 'high').length;
  if (high > 0) {
    return `${contract} contract failed: ${high} high-severity finding(s), ${findings.length} total.`;
  }
  return `${contract} contract warned: ${findings.length} finding(s).`;
}

function buildNextSteps(
  verdict: Verdict,
  findings: Finding[],
  contract: string,
  strict?: boolean,
): string[] {
  const steps: string[] = [];
  steps.push(...dedupeFixes(findings));
  if (verdict === 'fail' || (strict && verdict === 'warn')) {
    steps.push(`Re-run: npx prodverdict check ${contract} --format agent`);
  } else if (verdict === 'warn') {
    steps.push(`Review warnings, then re-run: npx prodverdict check ${contract} --format agent`);
  }
  return steps;
}

export function toAgentCheckOutput(
  result: CheckResult,
  exitCode: 0 | 1,
  strict?: boolean,
): AgentCheckOutput {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    contract: result.contract,
    verdict: result.verdict,
    findings: result.findings,
    evaluatedAt: result.evaluatedAt,
    summary: buildSummary(result.verdict, result.findings, result.contract),
    nextSteps: buildNextSteps(result.verdict, result.findings, result.contract, strict),
    exitCode,
  };
}

export function toAgentAggregateOutput(
  verdict: Verdict,
  findings: Finding[],
  evaluatedAt: string,
  results: CheckResult[],
  exitCode: 0 | 1,
  strict?: boolean,
): AgentAggregateOutput {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    contract: 'all',
    verdict,
    findings,
    evaluatedAt,
    results,
    summary: buildSummary(verdict, findings, 'all'),
    nextSteps: buildNextSteps(verdict, findings, 'all', strict),
    exitCode,
  };
}

export interface AgentSetupOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  stack: string;
  verdict: 'pass' | 'partial' | 'fail';
  filesWritten: string[];
  envWired: string[];
  missing: string[];
  doctorOk: boolean;
  summary: string;
  nextSteps: string[];
  exitCode: 0 | 1 | 2;
}

export interface AgentScanOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  repoRoot: string;
  detectedStack: string | null;
  hasProdverdictYml: boolean;
  stripeFound: boolean;
  paddleFound: boolean;
  recommendedContracts: Array<{ id: string; reason: string }>;
  summary: string;
  nextSteps: string[];
}

export interface AgentStatusOutput {
  schemaVersion: typeof AGENT_SCHEMA_VERSION;
  ok: boolean;
  checks: Array<{ label: string; ok: boolean; detail: string; hint?: string }>;
  summary: string;
  nextSteps: string[];
  exitCode: 0 | 1 | 2;
}

export interface SetupBootstrapInput {
  stack: string;
  filesWritten: string[];
  envWired: string[];
  missing: string[];
  doctorOk: boolean;
}

export function toAgentSetupOutput(input: SetupBootstrapInput): AgentSetupOutput {
  const { stack, filesWritten, envWired, missing, doctorOk } = input;
  const configWritten = filesWritten.some((f) => /prodverdict\.ya?ml$/i.test(f));
  const hasMissing = missing.length > 0;

  let verdict: AgentSetupOutput['verdict'];
  if (!configWritten) {
    verdict = 'fail';
  } else if (hasMissing || !doctorOk) {
    verdict = 'partial';
  } else {
    verdict = 'pass';
  }

  const nextSteps: string[] = [];
  if (missing.includes('STRIPE_SECRET_KEY')) {
    nextSteps.push(
      'Create a restricted Stripe key at https://dashboard.stripe.com/apikeys (Customers + Subscriptions read). Export STRIPE_SECRET_KEY=rk_live_...',
    );
  }
  if (missing.includes('PADDLE_API_KEY')) {
    nextSteps.push(
      'Create a Paddle API key at https://vendors.paddle.com/developer-tools/authentication (subscription.read). Export PADDLE_API_KEY=...',
    );
  }
  if (missing.includes('DATABASE_URL')) {
    nextSteps.push(
      'Create a read-only Postgres role and export DATABASE_URL=postgresql://prodverdict_readonly:...@host/db',
    );
  }
  if (configWritten) {
    nextSteps.push('Replace placeholder price IDs in prodverdict.yml with real Stripe/Paddle price IDs.');
  }
  if (filesWritten.some((f) => f.includes('.github/workflows'))) {
    nextSteps.push(
      'Set GitHub repo secrets: STRIPE_SECRET_KEY, DATABASE_URL, SLACK_WEBHOOK_URL (gh secret set STRIPE_SECRET_KEY)',
    );
  }
  if (verdict === 'pass') {
    nextSteps.push('Run: npx prodverdict check access --format agent');
  } else {
    nextSteps.push('Re-run: npx prodverdict setup --yes --format agent --from-env');
  }
  nextSteps.push('Run: npx prodverdict status --format agent');

  const summary =
    verdict === 'pass'
      ? `Bootstrap complete for ${stack} — config, workflow, MCP, and credentials ready.`
      : verdict === 'partial'
        ? `Bootstrap partial for ${stack} — files written; ${missing.length} credential(s) still missing.`
        : `Bootstrap failed for ${stack} — prodverdict.yml was not written.`;

  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    stack,
    verdict,
    filesWritten,
    envWired,
    missing,
    doctorOk,
    summary,
    nextSteps,
    exitCode: verdict === 'fail' ? 2 : verdict === 'partial' ? 1 : 0,
  };
}

export function toAgentScanOutput(
  repoRoot: string,
  detectedStack: string | null,
  hasProdverdictYml: boolean,
  stripeFound: boolean,
  paddleFound: boolean,
  recommendedContracts: Array<{ id: string; reason: string }>,
): AgentScanOutput {
  const stack = detectedStack ?? 'nextjs-stripe';
  const nextSteps = hasProdverdictYml
    ? ['Run: npx prodverdict status --format agent', 'Run: npx prodverdict doctor --format agent']
    : [
        'Run: npx prodverdict setup --yes --format agent --from-env',
        `Or: npx prodverdict init --stack ${stack} --mcp --cursor-rule`,
      ];

  const billing = stripeFound ? 'Stripe' : paddleFound ? 'Paddle' : 'no billing SDK';
  const summary = hasProdverdictYml
    ? `Repo scan: prodverdict.yml present; ${billing} detected.`
    : `Repo scan: no prodverdict.yml; detected stack ${stack}; ${billing}.`;

  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    repoRoot,
    detectedStack,
    hasProdverdictYml,
    stripeFound,
    paddleFound,
    recommendedContracts,
    summary,
    nextSteps,
  };
}

export function toAgentStatusOutput(
  checks: AgentStatusOutput['checks'],
): AgentStatusOutput {
  const ok = checks.every((c) => c.ok);
  const failed = checks.filter((c) => !c.ok);
  const nextSteps: string[] = [];
  for (const f of failed) {
    if (f.hint) nextSteps.push(f.hint);
  }
  if (ok) {
    nextSteps.push('Run: npx prodverdict check access --format agent');
  } else if (!checks.find((c) => c.label === 'prodverdict.yml')?.ok) {
    nextSteps.push('Run: npx prodverdict setup --yes --format agent --from-env');
  } else {
    nextSteps.push('Run: npx prodverdict doctor --format agent');
  }

  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    ok,
    checks,
    summary: ok
      ? 'All ProdVerdict setup checks passed.'
      : `Setup incomplete — ${failed.length} item(s) need attention.`,
    nextSteps,
    exitCode: ok ? 0 : 1,
  };
}

export function toAgentDoctorOutput(
  ok: boolean,
  checks: AgentDoctorOutput['checks'],
  contracts: AgentDoctorOutput['contracts'],
): AgentDoctorOutput {
  const failed = checks.filter((c) => c.status === 'fail');
  const summary = ok
    ? `Doctor passed — ${checks.length} check(s), all required items OK.`
    : `Doctor failed — ${failed.length} check(s) need attention.`;

  const nextSteps: string[] = [];
  for (const f of failed) {
    nextSteps.push(f.message);
  }
  if (!ok) {
    nextSteps.push('Fix the issues above, then re-run: npx prodverdict doctor --format agent');
  } else {
    nextSteps.push('Run: npx prodverdict check all --format agent');
  }

  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    ok,
    checks,
    contracts,
    summary,
    nextSteps,
    exitCode: ok ? 0 : 2,
  };
}
