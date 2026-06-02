import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type InitStack = 'nextjs-stripe' | 'supabase-stripe' | 'paddle-stripe' | 'rails-stripe';

const TEMPLATES: Record<InitStack, string> = {
  'nextjs-stripe': `version: 1
contracts:
  - type: access
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
  'supabase-stripe': `version: 1
contracts:
  - type: access
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
  'paddle-stripe': `version: 1
contracts:
  - type: access
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
  'rails-stripe': `version: 1
contracts:
  - type: access
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

export function writeInitConfig(cwd: string, stack: InitStack, outFile = 'prodverdict.yml'): string {
  const path = resolve(cwd, outFile);
  writeFileSync(path, TEMPLATES[stack], 'utf8');
  return path;
}
