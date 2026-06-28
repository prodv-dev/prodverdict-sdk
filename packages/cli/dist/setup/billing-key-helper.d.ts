export interface BillingHelperResult {
    /** The env var name the user must set (e.g., STRIPE_SECRET_KEY or PADDLE_API_KEY). */
    envVar: string;
    /** Set to true if the env var is already present in process.env. */
    alreadySet: boolean;
}
/**
 * Print the billing-key helper for the chosen provider and wait for the env var.
 * If the env var is already set in process.env, skip the wait and return immediately.
 */
export declare function runBillingKeyHelper(provider: 'stripe' | 'paddle'): Promise<BillingHelperResult>;
//# sourceMappingURL=billing-key-helper.d.ts.map