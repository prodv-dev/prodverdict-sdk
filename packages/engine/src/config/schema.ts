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

export type AccessContractConfig = z.infer<typeof AccessContractSchema>;

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

export type ConfigRule = z.infer<typeof ConfigRuleSchema>;

const ConfigContractSchema = z.object({
  type: z.literal('config'),
  severity: SeveritySchema.default('high'),
  rules: z.array(ConfigRuleSchema).default([]),
  scan_references: z.boolean().default(true),
  env_example_file: z.string().default('.env.example'),
  check_placeholders: z.boolean().default(true),
  ignore_vars: z.array(z.string()).default([]),
});

export type ConfigContractConfig = z.infer<typeof ConfigContractSchema>;

// ── Migration Contract ─────────────────────────────────────────────────────────

const MigrationContractSchema = z.object({
  type: z.literal('migration'),
  paths: z.array(z.string().min(1)).min(1),
  severity: SeveritySchema.default('high'),
  fix: z.string().optional(),
});

export type MigrationContractConfig = z.infer<typeof MigrationContractSchema>;

// ── Boundary Contract ──────────────────────────────────────────────────────────

const BoundaryContractSchema = z.object({
  type: z.literal('boundary'),
  forbidden_write: z.array(z.string().min(1)).default(['is_admin', 'plan', 'stripe_customer_id']),
  forbidden_response: z.array(z.string().min(1)).default(['password_hash', 'reset_token']),
  scan_paths: z.array(z.string().min(1)).default(['src/**/*.ts', 'src/**/*.tsx', 'app/api/**']),
  severity: SeveritySchema.default('high'),
  fix: z.string().optional(),
});

export type BoundaryContractConfig = z.infer<typeof BoundaryContractSchema>;

// ── Webhook Contract ─────────────────────────────────────────────────────────

const WebhookContractSchema = z.object({
  type: z.literal('webhook'),
  handler_paths: z.array(z.string().min(1)).default(['app/api/**/webhook/**', 'src/**/webhook/**']),
  require_idempotency: z.boolean().default(true),
  require_raw_body: z.boolean().default(true),
  severity: SeveritySchema.default('high'),
  fix: z.string().optional(),
});

export type WebhookContractConfig = z.infer<typeof WebhookContractSchema>;

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

export type RestoreContractConfig = z.infer<typeof RestoreContractSchema>;

// ── Union ──────────────────────────────────────────────────────────────────────

const ContractSchema = z.union([
  AccessContractStripeSchema,
  AccessContractPaddleSchema,
  ConfigContractSchema,
  MigrationContractSchema,
  BoundaryContractSchema,
  WebhookContractSchema,
  RestoreContractSchema,
]);

export const ProdVerdictConfigSchema = z.object({
  version: z.literal(1),
  contracts: z.array(ContractSchema).min(1),
});

export type ProdVerdictConfig = z.infer<typeof ProdVerdictConfigSchema>;
