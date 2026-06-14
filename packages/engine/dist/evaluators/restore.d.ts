import type { Finding } from '../types.js';
import type { RestoreContractConfig } from '../config/schema.js';
export interface RestoreCommandResult {
    exitCode: number;
    stderr: string;
}
export interface RestoreDataSources {
    env: Record<string, string | undefined>;
    /** Injectable for tests */
    runCommand?: (command: string, env: Record<string, string | undefined>) => Promise<RestoreCommandResult>;
    runQuery?: (query: string, env: Record<string, string | undefined>) => Promise<boolean>;
}
export declare function evaluateRestore(cfg: RestoreContractConfig, sources: RestoreDataSources): Promise<Finding[]>;
//# sourceMappingURL=restore.d.ts.map