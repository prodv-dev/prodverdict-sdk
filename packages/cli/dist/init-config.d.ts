import { type RemoteMcpConfigInput } from './mcp-config.js';
import { type StackTemplate } from './stacks.js';
export type InitStack = StackTemplate;
export declare function writeInitConfig(cwd: string, stack: InitStack, outFile?: string, options?: {
    includeConfig?: boolean;
}): string;
export declare function writeMcpConfig(cwd: string, stack: InitStack): string;
export declare function writeRemoteMcpConfig(cwd: string, input?: RemoteMcpConfigInput): string;
export declare function writeCursorRule(cwd: string): string;
//# sourceMappingURL=init-config.d.ts.map