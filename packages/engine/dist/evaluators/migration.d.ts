import type { Finding } from '../types.js';
import type { MigrationContractConfig } from '../config/schema.js';
export interface MigrationDataSources {
    repoRoot: string;
}
/**
 * Split a SQL string into individual statements on top-level semicolons,
 * respecting single/double quotes and dollar-quoted bodies ($tag$ ... $tag$).
 *
 * Rules with negative look-aheads (e.g. CREATE INDEX without CONCURRENTLY,
 * ADD COLUMN NOT NULL without DEFAULT) must be evaluated per statement —
 * otherwise a safe statement elsewhere in the same file would mask an unsafe one.
 */
export declare function splitSqlStatements(sql: string): string[];
export declare function evaluateMigration(cfg: MigrationContractConfig, sources: MigrationDataSources): Promise<Finding[]>;
//# sourceMappingURL=migration.d.ts.map