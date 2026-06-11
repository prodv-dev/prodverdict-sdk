import { type AgentCheckOutput } from '@prodverdict/engine';
export declare function runRemoteValidateConfig(configYaml: string): Promise<{
    valid: boolean;
    contracts: {
        type: "access" | "config" | "migration";
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
//# sourceMappingURL=remote-check-runner.d.ts.map