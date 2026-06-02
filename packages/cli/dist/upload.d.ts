import type { CheckResult } from '@prodverdict/engine';
export declare function uploadCheckResult(result: CheckResult, opts: {
    apiUrl: string;
    apiKey: string;
    projectId: string;
    source: 'cli' | 'action';
}): Promise<void>;
export declare function readUploadEnv(): {
    apiUrl: string;
    apiKey: string;
    projectId: string;
} | null;
//# sourceMappingURL=upload.d.ts.map