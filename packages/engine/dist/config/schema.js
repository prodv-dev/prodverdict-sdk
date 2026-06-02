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
const AccessPaddleSchema = z.object({
    api_key_env: z.string().min(1).describe('Name of the env var holding PADDLE_API_KEY'),
});
const AccessContractBaseSchema = z.object({
    type: z.literal('access'),
    database: AccessDatabaseSchema,
    /** Map of billing price ID -> plan slug used in the app */
    plans: z.record(z.string(), z.string()).optional(),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
const AccessContractStripeSchema = AccessContractBaseSchema.extend({
    source_of_truth: z.literal('stripe').default('stripe'),
    stripe: AccessStripeSchema,
});
const AccessContractPaddleSchema = AccessContractBaseSchema.extend({
    source_of_truth: z.literal('paddle'),
    paddle: AccessPaddleSchema,
});
export const AccessContractSchema = z.union([AccessContractStripeSchema, AccessContractPaddleSchema]);
// ── Config Contract ────────────────────────────────────────────────────────────
const ConfigRuleSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('required'),
        name: z.string().min(1),
        description: z.string().optional(),
        severity: SeveritySchema.optional(),
    }),
    z.object({
        type: z.literal('not_default'),
        name: z.string().min(1),
        forbidden_values: z.array(z.string()).min(1),
        severity: SeveritySchema.optional(),
    }),
]);
const ConfigContractSchema = z.object({
    type: z.literal('config'),
    severity: SeveritySchema.default('high'),
    rules: z.array(ConfigRuleSchema).default([]),
    scan_references: z.boolean().default(true),
    env_example_file: z.string().default('.env.example'),
    check_placeholders: z.boolean().default(true),
    ignore_vars: z.array(z.string()).default([]),
});
// ── Union ──────────────────────────────────────────────────────────────────────
const ContractSchema = z.union([AccessContractStripeSchema, AccessContractPaddleSchema, ConfigContractSchema]);
export const ProdVerdictConfigSchema = z.object({
    version: z.literal(1),
    contracts: z.array(ContractSchema).min(1),
});
//# sourceMappingURL=schema.js.map