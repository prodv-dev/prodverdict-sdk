import { type AgentCheckOutput } from '@prodverdict/engine';
export declare function runRemoteValidateConfig(configYaml: string): Promise<{
    valid: boolean;
    contracts: {
        type: "access" | "config" | "migration" | "boundary" | "webhook" | "restore" | "entitlements-migration";
    }[];
}>;
export declare function runRemoteConfigCheck(opts: {
    repoRoot: string;
    configPath?: string | undefined;
    env?: Record<string, string | undefined> | undefined;
}): Promise<AgentCheckOutput>;
export declare function runRemoteMigrationCheck(opts: {
    repoRoot: string;
    configPath?: string | undefined;
}): Promise<AgentCheckOutput>;
export declare function runRemoteConfigCheckFromFiles(opts: {
    files: Record<string, string>;
    configPath?: string | undefined;
    env?: Record<string, string | undefined> | undefined;
}): Promise<AgentCheckOutput>;
export declare function runRemoteMigrationCheckFromFiles(opts: {
    files: Record<string, string>;
    configPath?: string | undefined;
}): Promise<AgentCheckOutput>;
export declare function resolveConfigPath(repoRoot: string, configPath?: string): string;
export type RemoteRepoContractsOutput = {
    schemaVersion: '1';
    config?: AgentCheckOutput | undefined;
    migration?: AgentCheckOutput | undefined;
    boundary?: AgentCheckOutput | undefined;
    webhook?: AgentCheckOutput | undefined;
    verdict: 'pass' | 'fail' | 'warn';
    exitCode: number;
};
export declare function runRemoteRepoContractsFromFiles(opts: {
    files: Record<string, string>;
    configPath?: string | undefined;
    env?: Record<string, string | undefined> | undefined;
}): Promise<RemoteRepoContractsOutput>;
//# sourceMappingURL=remote-check-runner.d.ts.map