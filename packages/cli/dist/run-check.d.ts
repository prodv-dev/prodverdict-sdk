import { type CheckResult, type Finding, type Verdict } from '@prodverdict/engine';
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
export declare function runCheck(opts: RunCheckOptions): Promise<{
    result: CheckResult | AggregateCheckOutput;
    exitCode: number;
}>;
//# sourceMappingURL=run-check.d.ts.map