export type InitStack = 'nextjs-stripe' | 'supabase-stripe' | 'paddle-stripe' | 'rails-stripe';
export declare function writeInitConfig(cwd: string, stack: InitStack, outFile?: string, options?: {
    includeConfig?: boolean;
}): string;
export declare function writeMcpConfig(cwd: string, stack: InitStack): string;
export declare function writeCursorRule(cwd: string): string;
//# sourceMappingURL=init-config.d.ts.map