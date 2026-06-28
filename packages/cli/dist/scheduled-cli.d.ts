import { CLI_VERSION } from './version.js';
import type { Command } from 'commander';
export interface ScheduledOptions {
    frequency?: 'hourly' | 'daily' | string | undefined;
    slack?: boolean | undefined;
    contract?: 'access' | 'all' | string | undefined;
    actionTag?: string | undefined;
    paddle?: boolean | undefined;
    install?: boolean | undefined;
    output?: string | undefined;
}
export declare function buildScheduledWorkflow(opts: ScheduledOptions): string;
export declare function registerScheduledCommand(program: Command): void;
export { CLI_VERSION };
//# sourceMappingURL=scheduled-cli.d.ts.map