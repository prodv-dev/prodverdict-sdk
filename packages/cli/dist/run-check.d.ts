import { type CheckResult } from '@prodverdict/engine';
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
export declare function runCheck(opts: RunCheckOptions): Promise<{
    result: CheckResult;
    exitCode: number;
}>;
//# sourceMappingURL=run-check.d.ts.map