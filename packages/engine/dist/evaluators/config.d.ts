import type { Finding } from '../types.js';
import type { ConfigContractConfig } from '../config/schema.js';
export interface ConfigDataSources {
    /** Absolute path to the repository root to scan */
    repoRoot: string;
    /**
     * Resolved env vars available at check time.
     * Typically `process.env` but can be overridden for testing.
     */
    env: Record<string, string | undefined>;
}
/**
 * Scan JS/TS source files in the repo for environment variable references.
 * Returns all unique variable names referenced via process.env.X or import.meta.env.X.
 */
export declare function scanEnvReferences(repoRoot: string): Set<string>;
/**
 * Parse a .env or .env.example file into a map of key -> value (or empty string if no value).
 */
export declare function parseEnvFile(filePath: string): Map<string, string>;
export declare function evaluateConfig(cfg: ConfigContractConfig, sources: ConfigDataSources): Promise<Finding[]>;
//# sourceMappingURL=config.d.ts.map