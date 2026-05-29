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
    /** Default severity for findings */
    severity: SeveritySchema.default('high'),
    /** Explicit rules about individual env vars */
    rules: z.array(ConfigRuleSchema).default([]),
    /** Scan source code for process.env.* references and check against .env.example */
    scan_references: z.boolean().default(true),
    /** Path to the env example file (relative to repo root) */
    env_example_file: z.string().default('.env.example'),
    /** Warn if a required var's value looks like a placeholder */
    check_placeholders: z.boolean().default(true),
    /** Variable names to ignore during reference scan */
    ignore_vars: z.array(z.string()).default([]),
});
// ── Union ──────────────────────────────────────────────────────────────────────
const ContractSchema = z.discriminatedUnion('type', [AccessContractSchema, ConfigContractSchema]);
export const ProdVerdictConfigSchema = z.object({
    version: z.literal(1),
    contracts: z.array(ContractSchema).min(1),
});
//# sourceMappingURL=schema.js.map