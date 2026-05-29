import { z } from 'zod';
const SeveritySchema = z.enum(['high', 'medium', 'low']);
const AccessDatabaseSchema = z.object({
    url_env: z.string().min(1).describe('Name of the env var holding DATABASE_URL'),
    users_table: z.string().min(1).default('users'),
    columns: z
        .object({
        id: z.string().default('id'),
        stripe_customer_id: z.string().default('stripe_customer_id'),
        has_paid_access: z.string().default('has_paid_access'),
        plan: z.string().default('plan'),
    })
        .default({}),
});
const AccessStripeSchema = z.object({
    secret_env: z.string().min(1).describe('Name of the env var holding STRIPE_SECRET_KEY'),
});
const AccessContractSchema = z.object({
    type: z.literal('access'),
    source_of_truth: z.literal('stripe').default('stripe'),
    database: AccessDatabaseSchema,
    stripe: AccessStripeSchema,
    /** Map of Stripe price ID -> plan slug used in the app */
    plans: z.record(z.string(), z.string()).optional(),
    /** Default severity applied to findings if not overridden per-rule */
    severity: SeveritySchema.default('high'),
    /** Default human/agent-readable fix hint */
    fix: z.string().optional(),
});
const ContractSchema = AccessContractSchema;
export const ProdVerdictConfigSchema = z.object({
    version: z.literal(1),
    contracts: z.array(ContractSchema).min(1),
});
//# sourceMappingURL=schema.js.map