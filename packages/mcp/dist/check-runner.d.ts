import { type AgentCheckOutput, type AgentAggregateOutput } from '@prodverdict/engine';
export interface RunContractOptions {
    configPath: string;
    repoRoot?: string | undefined;
    useFixtures?: boolean | undefined;
    fixturesDir?: string | undefined;
}
export declare function runAccessCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runConfigCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runMigrationCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runBoundaryCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runWebhookCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runRestoreCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runEntitlementsMigrationCheck(opts: RunContractOptions): Promise<AgentCheckOutput>;
export declare function runAllChecks(opts: RunContractOptions): Promise<AgentAggregateOutput>;
//# sourceMappingURL=check-runner.d.ts.map