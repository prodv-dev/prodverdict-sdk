import type { Finding } from '../types.js';
import type { AccessContractConfig } from '../config/schema.js';
import type { StripeReader, DatabaseReader } from '../connectors/types.js';
export interface AccessDataSources {
    billing: StripeReader;
    database: DatabaseReader;
}
export declare function evaluateAccess(cfg: AccessContractConfig, sources: AccessDataSources): Promise<Finding[]>;
//# sourceMappingURL=access.d.ts.map