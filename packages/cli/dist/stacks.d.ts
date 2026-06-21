export type StackTemplate = 'nextjs-stripe' | 'supabase-stripe' | 'paddle-stripe' | 'rails-stripe' | 'supabase-paddle' | 'neon-stripe' | 'clerk-stripe';
export type BillingProvider = 'stripe' | 'paddle';
export type StackMeta = {
    id: StackTemplate;
    label: string;
    selectLabel: string;
    hint: string;
    billing: BillingProvider;
    /** Directory under core/examples/ for fixture demos */
    fixtureExampleDir: string;
};
export declare const STACK_ORDER: StackTemplate[];
export declare const STACK_META: Record<StackTemplate, StackMeta>;
export declare const STACK_LABELS: Record<StackTemplate, string>;
export declare const STACK_SELECT_LABELS: Record<StackTemplate, string>;
export declare const STACK_HINTS: Record<StackTemplate, string>;
export declare function isStackTemplate(value: string): value is StackTemplate;
export declare function isPaddleStack(stack: StackTemplate): boolean;
export declare function fixtureExampleDir(stack: StackTemplate): string;
export declare function buildProdverdictYaml(stack: StackTemplate, options?: {
    includeConfig?: boolean;
    siteFormat?: boolean;
}): string;
export declare function initNextSteps(stack: StackTemplate, configPath?: string): string[];
export declare function formatStackListTable(): string;
//# sourceMappingURL=stacks.d.ts.map