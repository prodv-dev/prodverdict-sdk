import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type InitStack = 'nextjs-stripe' | 'supabase-stripe' | 'paddle-stripe' | 'rails-stripe';

const CONFIG_BLOCK_STRIPE = `  - type: config
    severity: medium
    scan_references: true
    env_example_file: .env.example
    rules:
      - type: required
        name: DATABASE_URL
        description: Postgres connection for access checks
      - type: required
        name: STRIPE_SECRET_KEY
        description: Restricted Stripe key for read-only subscription reads
`;

const CONFIG_BLOCK_PADDLE = `  - type: config
    severity: medium
    scan_references: true
    env_example_file: .env.example
    rules:
      - type: required
        name: DATABASE_URL
        description: Postgres connection for access checks
      - type: required
        name: PADDLE_API_KEY
        description: Paddle API key for read-only subscription reads
`;

function accessBlock(stack: InitStack): string {
  const blocks: Record<InitStack, string> = {
    'nextjs-stripe': `  - type: access
    source_of_truth: stripe
    database:
      url_env: DATABASE_URL
      users_table: users
      columns:
        id: id
        stripe_customer_id: stripe_customer_id
        has_paid_access: has_paid_access
        plan: plan
    stripe:
      secret_env: STRIPE_SECRET_KEY
    plans:
      price_your_starter: starter
      price_your_pro: pro
    severity: high
    fix: Sync has_paid_access from Stripe webhooks.
`,
    'supabase-stripe': `  - type: access
    source_of_truth: stripe
    database:
      url_env: DATABASE_URL
      users_table: profiles
      columns:
        id: id
        stripe_customer_id: stripe_customer_id
        has_paid_access: has_paid_access
        plan: plan
    stripe:
      secret_env: STRIPE_SECRET_KEY
    plans:
      price_your_starter: starter
      price_your_pro: pro
    severity: high
    fix: Sync has_paid_access from Stripe webhooks.
`,
    'paddle-stripe': `  - type: access
    source_of_truth: paddle
    database:
      url_env: DATABASE_URL
      users_table: users
      columns:
        id: id
        stripe_customer_id: paddle_customer_id
        has_paid_access: has_paid_access
        plan: plan
    paddle:
      api_key_env: PADDLE_API_KEY
    plans:
      pri_your_starter: starter
      pri_your_pro: pro
    severity: high
    fix: Sync has_paid_access from Paddle webhooks.
`,
    'rails-stripe': `  - type: access
    source_of_truth: stripe
    database:
      url_env: DATABASE_URL
      users_table: users
      columns:
        id: id
        stripe_customer_id: stripe_customer_id
        has_paid_access: has_paid_access
        plan: plan
    stripe:
      secret_env: STRIPE_SECRET_KEY
    plans:
      price_your_starter: starter
      price_your_pro: pro
    severity: high
    fix: Sync has_paid_access from Stripe webhooks.
`,
  };
  return blocks[stack];
}

function buildTemplate(stack: InitStack, includeConfig: boolean): string {
  const configBlock = stack === 'paddle-stripe' ? CONFIG_BLOCK_PADDLE : CONFIG_BLOCK_STRIPE;
  return `version: 1
contracts:
${accessBlock(stack)}${includeConfig ? configBlock : ''}`;
}

const TEMPLATES: Record<InitStack, string> = {
  'nextjs-stripe': buildTemplate('nextjs-stripe', true),
  'supabase-stripe': buildTemplate('supabase-stripe', true),
  'paddle-stripe': buildTemplate('paddle-stripe', true),
  'rails-stripe': buildTemplate('rails-stripe', true),
};

export function writeInitConfig(
  cwd: string,
  stack: InitStack,
  outFile = 'prodverdict.yml',
  options?: { includeConfig?: boolean },
): string {
  const includeConfig = options?.includeConfig !== false;
  const path = resolve(cwd, outFile);
  const content = includeConfig ? TEMPLATES[stack] : buildTemplate(stack, false);
  writeFileSync(path, content, 'utf8');
  return path;
}
