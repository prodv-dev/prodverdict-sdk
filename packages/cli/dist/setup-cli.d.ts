import type { Command } from 'commander';
export type SetupFormat = 'text' | 'agent';
export interface SetupOptions {
    stack?: string | undefined;
    output?: string | undefined;
    skipBilling?: boolean | undefined;
    skipDatabase?: boolean | undefined;
    skipWorkflow?: boolean | undefined;
    skipMcp?: boolean | undefined;
    skipCursorRule?: boolean | undefined;
    skipSkills?: boolean | undefined;
    yes?: boolean | undefined;
    force?: boolean | undefined;
    fromEnv?: boolean | undefined;
    format?: SetupFormat | undefined;
    repoRoot?: string | undefined;
}
export declare function runSetup(opts: SetupOptions): Promise<number>;
export declare function registerSetupCommand(program: Command): void;
export { runSetupNonInteractive } from './setup/bootstrap.js';
//# sourceMappingURL=setup-cli.d.ts.map