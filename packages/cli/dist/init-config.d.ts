export type InitStack = 'nextjs-stripe' | 'supabase-stripe' | 'paddle-stripe' | 'rails-stripe';
export declare function writeInitConfig(cwd: string, stack: InitStack, outFile?: string, options?: {
    includeConfig?: boolean;
}): string;
//# sourceMappingURL=init-config.d.ts.map