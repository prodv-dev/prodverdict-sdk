import type { DatabaseReader } from './types.js';
import type { AccessContractConfig } from '../config/schema.js';
/** Shape required to construct a Postgres reader — just the database block. */
type DatabaseConfig = Pick<AccessContractConfig, 'database'>;
export declare function createLivePostgresReader(cfg: DatabaseConfig): DatabaseReader;
export {};
//# sourceMappingURL=postgres-live.d.ts.map