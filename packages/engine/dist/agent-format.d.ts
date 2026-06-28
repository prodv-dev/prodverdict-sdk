import type { CheckResult, Finding, Verdict } from './types.js';
export declare const AGENT_SCHEMA_VERSION: "1";
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
    checks: Array<{
        name: string;
        status: string;
        message: string;
    }>;
    contracts: Array<{
        type: string;
    }>;
    summary: string;
    nextSteps: string[];
    exitCode: 0 | 1 | 2;
}
export declare function toAgentCheckOutput(result: CheckResult, exitCode: 0 | 1, strict?: boolean): AgentCheckOutput;
export declare function toAgentAggregateOutput(verdict: Verdict, findings: Finding[], evaluatedAt: string, results: CheckResult[], exitCode: 0 | 1, strict?: boolean): AgentAggregateOutput;
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
    recommendedContracts: Array<{
        id: string;
        reason: string;
    }>;
    summary: string;
    nextSteps: string[];
}
export interface AgentStatusOutput {
    schemaVersion: typeof AGENT_SCHEMA_VERSION;
    ok: boolean;
    checks: Array<{
        label: string;
        ok: boolean;
        detail: string;
        hint?: string;
    }>;
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
export declare function toAgentSetupOutput(input: SetupBootstrapInput): AgentSetupOutput;
export declare function toAgentScanOutput(repoRoot: string, detectedStack: string | null, hasProdverdictYml: boolean, stripeFound: boolean, paddleFound: boolean, recommendedContracts: Array<{
    id: string;
    reason: string;
}>): AgentScanOutput;
export declare function toAgentStatusOutput(checks: AgentStatusOutput['checks']): AgentStatusOutput;
export declare function toAgentDoctorOutput(ok: boolean, checks: AgentDoctorOutput['checks'], contracts: AgentDoctorOutput['contracts']): AgentDoctorOutput;
//# sourceMappingURL=agent-format.d.ts.map