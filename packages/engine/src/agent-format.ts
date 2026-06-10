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
