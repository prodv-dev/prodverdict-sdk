import type { ProdVerdictConfig } from './config/schema.js';
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
export declare function resolveCheckExitCode(verdict: Verdict, strict?: boolean): number;
export declare function runContracts(opts: RunContractsOptions): Promise<RunContractsOutput>;
//# sourceMappingURL=run.d.ts.map