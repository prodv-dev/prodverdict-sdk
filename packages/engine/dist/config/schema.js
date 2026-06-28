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
const AccessEntitlementsSchema = z.object({
    secret_env: z
        .string()
        .min(1)
        .describe('Name of the env var holding STRIPE_SECRET_KEY with entitlements.read'),
});
const AccessContractBaseSchema = z.object({
    type: z.literal('access'),
    database: AccessDatabaseSchema,
    /**
     * Map of billing identifier -> plan slug used in the app.
     * For `source_of_truth: stripe|paddle`, keys are price IDs.
     * For `source_of_truth: stripe_entitlements`, keys are product IDs.
     */
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
const AccessContractEntitlementsSchema = AccessContractBaseSchema.extend({
    source_of_truth: z.literal('stripe_entitlements'),
    entitlements: AccessEntitlementsSchema,
});
export const AccessContractSchema = z.union([
    AccessContractStripeSchema,
    AccessContractPaddleSchema,
    AccessContractEntitlementsSchema,
]);
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
// ── Migration Contract ─────────────────────────────────────────────────────────
const MigrationContractSchema = z.object({
    type: z.literal('migration'),
    paths: z.array(z.string().min(1)).min(1),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
// ── Boundary Contract ──────────────────────────────────────────────────────────
const BoundaryContractSchema = z.object({
    type: z.literal('boundary'),
    forbidden_write: z.array(z.string().min(1)).default(['is_admin', 'plan', 'stripe_customer_id']),
    forbidden_response: z.array(z.string().min(1)).default(['password_hash', 'reset_token']),
    scan_paths: z.array(z.string().min(1)).default(['src/**/*.ts', 'src/**/*.tsx', 'app/api/**']),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
// ── Webhook Contract ─────────────────────────────────────────────────────────
const WebhookContractSchema = z.object({
    type: z.literal('webhook'),
    handler_paths: z.array(z.string().min(1)).default(['app/api/**/webhook/**', 'src/**/webhook/**']),
    require_idempotency: z.boolean().default(true),
    require_raw_body: z.boolean().default(true),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
// ── Restore Contract ───────────────────────────────────────────────────────────
const RestoreContractSchema = z.object({
    type: z.literal('restore'),
    backup_command: z.string().min(1),
    restore_command: z.string().min(1),
    smoke_queries: z.array(z.string().min(1)).default([]),
    command_env: z.record(z.string(), z.string()).optional(),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
// ── Entitlements Migration Contract ───────────────────────────────────────────
// Verifies a migration from local DB has_paid_access flags to Stripe Entitlements.
// Catches: users paid in DB but not granted in Stripe, stale grants, duplicates,
// and users missing a stripe_customer_id (which blocks migration).
const EntitlementsMigrationContractSchema = z.object({
    type: z.literal('entitlements-migration'),
    database: AccessDatabaseSchema,
    entitlements: AccessEntitlementsSchema,
    /**
     * Map of Stripe product ID -> plan slug. Used to verify that users flagged as
     * having a given plan in the DB are granted the corresponding product in Stripe.
     */
    plans: z.record(z.string(), z.string()).optional(),
    /** When true, flag users with has_paid_access=true but no stripe_customer_id (high). */
    require_stripe_customer_id: z.boolean().default(true),
    severity: SeveritySchema.default('high'),
    fix: z.string().optional(),
});
// ── Union ──────────────────────────────────────────────────────────────────────
const ContractSchema = z.union([
    AccessContractStripeSchema,
    AccessContractPaddleSchema,
    AccessContractEntitlementsSchema,
    ConfigContractSchema,
    MigrationContractSchema,
    BoundaryContractSchema,
    WebhookContractSchema,
    RestoreContractSchema,
    EntitlementsMigrationContractSchema,
]);
export const ProdVerdictConfigSchema = z.object({
    version: z.literal(1),
    contracts: z.array(ContractSchema).min(1),
});
//# sourceMappingURL=schema.js.map