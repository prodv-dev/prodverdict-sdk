import type { Command } from 'commander';
export interface SetupOptions {
    stack?: string | undefined;
    output?: string | undefined;
    skipBilling?: boolean | undefined;
    skipDatabase?: boolean | undefined;
    skipWorkflow?: boolean | undefined;
    skipMcp?: boolean | undefined;
    skipCursorRule?: boolean | undefined;
}
export declare function runSetup(opts: SetupOptions): Promise<number>;
export declare function registerSetupCommand(program: Command): void;
//# sourceMappingURL=setup-cli.d.ts.map