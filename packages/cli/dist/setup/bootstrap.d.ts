import { type AgentSetupOutput, type SetupBootstrapInput } from '@prodverdict/engine';
export interface BootstrapOptions {
    repoRoot?: string | undefined;
    stack?: string | undefined;
    output?: string | undefined;
    force?: boolean | undefined;
    skipWorkflow?: boolean | undefined;
    skipMcp?: boolean | undefined;
    skipCursorRule?: boolean | undefined;
    skipSkills?: boolean | undefined;
    fromEnv?: boolean | undefined;
}
export interface BootstrapResult extends SetupBootstrapInput {
    agent: AgentSetupOutput;
}
export declare function runSetupNonInteractive(opts?: BootstrapOptions): Promise<BootstrapResult>;
//# sourceMappingURL=bootstrap.d.ts.map