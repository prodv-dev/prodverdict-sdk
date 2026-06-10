export const AGENT_SCHEMA_VERSION = '1';
function dedupeFixes(findings) {
    const seen = new Set();
    const fixes = [];
    for (const f of findings) {
        if (f.fix && !seen.has(f.fix)) {
            seen.add(f.fix);
            fixes.push(f.fix);
        }
    }
    return fixes;
}
function buildSummary(verdict, findings, contract) {
    if (verdict === 'pass') {
        return `${contract} contract passed with no violations.`;
    }
    const high = findings.filter((f) => f.severity === 'high').length;
    if (high > 0) {
        return `${contract} contract failed: ${high} high-severity finding(s), ${findings.length} total.`;
    }
    return `${contract} contract warned: ${findings.length} finding(s).`;
}
function buildNextSteps(verdict, findings, contract, strict) {
    const steps = [];
    steps.push(...dedupeFixes(findings));
    if (verdict === 'fail' || (strict && verdict === 'warn')) {
        steps.push(`Re-run: npx prodverdict check ${contract} --format agent`);
    }
    else if (verdict === 'warn') {
        steps.push(`Review warnings, then re-run: npx prodverdict check ${contract} --format agent`);
    }
    return steps;
}
export function toAgentCheckOutput(result, exitCode, strict) {
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
export function toAgentAggregateOutput(verdict, findings, evaluatedAt, results, exitCode, strict) {
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
export function toAgentDoctorOutput(ok, checks, contracts) {
    const failed = checks.filter((c) => c.status === 'fail');
    const summary = ok
        ? `Doctor passed — ${checks.length} check(s), all required items OK.`
        : `Doctor failed — ${failed.length} check(s) need attention.`;
    const nextSteps = [];
    for (const f of failed) {
        nextSteps.push(f.message);
    }
    if (!ok) {
        nextSteps.push('Fix the issues above, then re-run: npx prodverdict doctor --format agent');
    }
    else {
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
//# sourceMappingURL=agent-format.js.map