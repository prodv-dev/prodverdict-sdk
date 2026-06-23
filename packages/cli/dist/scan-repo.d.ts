import { type StackTemplate } from './stacks.js';
type ScanResult = {
    cwd: string;
    hasProdverdictYml: boolean;
    stripeFound: boolean;
    paddleFound: boolean;
    envVarCount: number;
    migrationFileCount: number;
    migrationPaths: string[];
    detectedStack: StackTemplate | null;
    recommendedContracts: Array<{
        id: string;
        reason: string;
    }>;
};
export declare function scanRepo(cwd: string): ScanResult;
export declare function formatScanResult(result: ScanResult): string;
export {};
//# sourceMappingURL=scan-repo.d.ts.map