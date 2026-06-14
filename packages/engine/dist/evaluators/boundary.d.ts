import type { Finding } from '../types.js';
import type { BoundaryContractConfig } from '../config/schema.js';
export interface BoundaryDataSources {
    repoRoot: string;
}
export declare function evaluateBoundary(cfg: BoundaryContractConfig, sources: BoundaryDataSources): Promise<Finding[]>;
//# sourceMappingURL=boundary.d.ts.map