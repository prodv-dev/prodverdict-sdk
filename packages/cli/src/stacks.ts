export type StackTemplate =
  | 'nextjs-stripe'
  | 'supabase-stripe'
  | 'paddle-stripe'
  | 'rails-stripe'
  | 'supabase-paddle'
  | 'neon-stripe'
  | 'clerk-stripe';

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

export const STACK_ORDER: StackTemplate[] = [
  'nextjs-stripe',
  'supabase-stripe',
  'neon-stripe',
  'clerk-stripe',
  'rails-stripe',
  'paddle-stripe',
  'supabase-paddle',
];

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

const CONFIG_BLOCK_STRIPE_SITE = `  - type: config
    severity: medium
    scan_references: true
    env_example_file: .env.example
    rules:
      - type: required
        name: DATABASE_URL
      - type: required
        name: STRIPE_SECRET_KEY
`;

const CONFIG_BLOCK_PADDLE_SITE = `  - type: config
    severity: medium
    scan_references: true
    env_example_file: .env.example
    rules:
      - type: required
        name: DATABASE_URL
      - type: required
        name: PADDLE_API_KEY
`;

function stripeAccessBlock(usersTable: 'users' | 'profiles', fix: string): string {
  return `  - type: access
    source_of_truth: stripe
    database:
      url_env: DATABASE_URL
      users_table: ${usersTable}
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
    fix: ${fix}
`;
}

function paddleAccessBlock(usersTable: 'users' | 'profiles', fix: string): string {
  return `  - type: access
    source_of_truth: paddle
    database:
      url_env: DATABASE_URL
      users_table: ${usersTable}
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
    fix: ${fix}
`;
}

export const STACK_META: Record<StackTemplate, StackMeta> = {
  'nextjs-stripe': {
    id: 'nextjs-stripe',
    label: 'Next.js + Stripe',
    selectLabel: 'Stripe · Next.js + Stripe',
    hint: 'users table + Stripe price mapping',
    billing: 'stripe',
    fixtureExampleDir: 'nextjs-stripe',
  },
  'supabase-stripe': {
    id: 'supabase-stripe',
    label: 'Supabase + Stripe',
    selectLabel: 'Stripe · Supabase + Stripe',
    hint: 'profiles table on Supabase Postgres',
    billing: 'stripe',
    fixtureExampleDir: 'supabase-stripe',
  },
  'paddle-stripe': {
    id: 'paddle-stripe',
    label: 'Paddle + Postgres',
    selectLabel: 'Paddle · Paddle + Postgres',
    hint: 'Paddle subscriptions vs Postgres users',
    billing: 'paddle',
    fixtureExampleDir: 'paddle-stripe',
  },
  'rails-stripe': {
    id: 'rails-stripe',
    label: 'Rails + Stripe',
    selectLabel: 'Stripe · Rails + Stripe',
    hint: 'Rails users table + Stripe',
    billing: 'stripe',
    fixtureExampleDir: 'rails-stripe',
  },
  'supabase-paddle': {
    id: 'supabase-paddle',
    label: 'Supabase + Paddle',
    selectLabel: 'Paddle · Supabase + Paddle',
    hint: 'profiles table + Paddle subscriptions on Supabase Postgres',
    billing: 'paddle',
    fixtureExampleDir: 'supabase-paddle',
  },
  'neon-stripe': {
    id: 'neon-stripe',
    label: 'Neon + Stripe',
    selectLabel: 'Stripe · Neon + Stripe',
    hint: 'Neon Postgres users table — use a read-only DATABASE_URL from Neon console',
    billing: 'stripe',
    fixtureExampleDir: 'nextjs-stripe',
  },
  'clerk-stripe': {
    id: 'clerk-stripe',
    label: 'Clerk + Stripe',
    selectLabel: 'Stripe · Clerk auth + Stripe billing',
    hint: 'Clerk for auth; Stripe is billing source of truth — sync stripe_customer_id via webhooks',
    billing: 'stripe',
    fixtureExampleDir: 'nextjs-stripe',
  },
};

export const STACK_LABELS = Object.fromEntries(
  STACK_ORDER.map((id) => [id, STACK_META[id].label]),
) as Record<StackTemplate, string>;

export const STACK_SELECT_LABELS = Object.fromEntries(
  STACK_ORDER.map((id) => [id, STACK_META[id].selectLabel]),
) as Record<StackTemplate, string>;

export const STACK_HINTS = Object.fromEntries(
  STACK_ORDER.map((id) => [id, STACK_META[id].hint]),
) as Record<StackTemplate, string>;

export function isStackTemplate(value: string): value is StackTemplate {
  return value in STACK_META;
}

export function isPaddleStack(stack: StackTemplate): boolean {
  return STACK_META[stack].billing === 'paddle';
}

export function fixtureExampleDir(stack: StackTemplate): string {
  return STACK_META[stack].fixtureExampleDir;
}

function accessBlock(stack: StackTemplate): string {
  switch (stack) {
    case 'supabase-stripe':
      return stripeAccessBlock('profiles', 'Sync has_paid_access from Stripe webhooks.');
    case 'supabase-paddle':
      return paddleAccessBlock('profiles', 'Sync has_paid_access from Paddle webhooks.');
    case 'paddle-stripe':
      return paddleAccessBlock('users', 'Sync has_paid_access from Paddle webhooks.');
    case 'neon-stripe':
      return stripeAccessBlock(
        'users',
        'Sync has_paid_access from Stripe webhooks. Use Neon read-only role for DATABASE_URL.',
      );
    case 'clerk-stripe':
      return stripeAccessBlock(
        'users',
        'Clerk handles auth; sync stripe_customer_id and has_paid_access from Stripe webhooks.',
      );
  }
  return stripeAccessBlock('users', 'Sync has_paid_access from Stripe webhooks.');
}

export function buildProdverdictYaml(
  stack: StackTemplate,
  options?: { includeConfig?: boolean; siteFormat?: boolean },
): string {
  const includeConfig = options?.includeConfig !== false;
  const configBlock = isPaddleStack(stack)
    ? options?.siteFormat
      ? CONFIG_BLOCK_PADDLE_SITE
      : CONFIG_BLOCK_PADDLE
    : options?.siteFormat
      ? CONFIG_BLOCK_STRIPE_SITE
      : CONFIG_BLOCK_STRIPE;

  return `version: 1
contracts:
${accessBlock(stack)}${includeConfig ? configBlock : ''}`;
}

export function initNextSteps(stack: StackTemplate, configPath = 'prodverdict.yml'): string[] {
  const example = fixtureExampleDir(stack);
  return [
    `npx prodverdict check access --fixtures --config ${configPath} --fixtures-dir examples/${example}/scenarios/fail-revenue-leak`,
    `npx prodverdict doctor --config ${configPath}`,
  ];
}

export function formatStackListTable(): string {
  const lines = ['Stack templates:', ''];
  const idWidth = Math.max(...STACK_ORDER.map((id) => id.length));
  for (const id of STACK_ORDER) {
    const meta = STACK_META[id];
    lines.push(`  ${id.padEnd(idWidth)}  ${meta.billing.padEnd(6)}  ${meta.label}`);
  }
  return lines.join('\n');
}
