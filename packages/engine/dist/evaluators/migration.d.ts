import type { Finding } from '../types.js';
import type { MigrationContractConfig } from '../config/schema.js';
export interface MigrationDataSources {
    repoRoot: string;
}
export declare function evaluateMigration(cfg: MigrationContractConfig, sources: MigrationDataSources): Promise<Finding[]>;
//# sourceMappingURL=migration.d.ts.map