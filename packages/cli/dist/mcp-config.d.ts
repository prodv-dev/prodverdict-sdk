import type { InitStack } from './init-config.js';
export type RemoteMcpConfigInput = {
    projectId?: string;
    apiKey?: string;
    url?: string;
};
export declare function buildMcpJson(stack: InitStack): Record<string, unknown>;
export declare function buildRemoteMcpJson(input?: RemoteMcpConfigInput): Record<string, unknown>;
export declare function mergeMcpConfigs(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown>;
export declare function writeMcpJsonFile(cwd: string, config: Record<string, unknown>): string;
//# sourceMappingURL=mcp-config.d.ts.map