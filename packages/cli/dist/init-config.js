import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpJson, buildRemoteMcpJson, writeMcpJsonFile } from './mcp-config.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const CURSOR_RULE_SOURCE = join(__dirname, '../../../examples/cursor/prodverdict-agent.mdc');
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
function accessBlock(stack) {
    const blocks = {
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
function buildTemplate(stack, includeConfig) {
    const configBlock = stack === 'paddle-stripe' ? CONFIG_BLOCK_PADDLE : CONFIG_BLOCK_STRIPE;
    return `version: 1
contracts:
${accessBlock(stack)}${includeConfig ? configBlock : ''}`;
}
const TEMPLATES = {
    'nextjs-stripe': buildTemplate('nextjs-stripe', true),
    'supabase-stripe': buildTemplate('supabase-stripe', true),
    'paddle-stripe': buildTemplate('paddle-stripe', true),
    'rails-stripe': buildTemplate('rails-stripe', true),
};
export function writeInitConfig(cwd, stack, outFile = 'prodverdict.yml', options) {
    const includeConfig = options?.includeConfig !== false;
    const path = resolve(cwd, outFile);
    const content = includeConfig ? TEMPLATES[stack] : buildTemplate(stack, false);
    writeFileSync(path, content, 'utf8');
    return path;
}
export function writeMcpConfig(cwd, stack) {
    return writeMcpJsonFile(cwd, buildMcpJson(stack));
}
export function writeRemoteMcpConfig(cwd, input) {
    return writeMcpJsonFile(cwd, buildRemoteMcpJson(input));
}
export function writeCursorRule(cwd) {
    const dir = resolve(cwd, '.cursor/rules');
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, 'prodverdict-agent.mdc');
    const content = readFileSync(CURSOR_RULE_SOURCE, 'utf8');
    writeFileSync(path, content, 'utf8');
    return path;
}
//# sourceMappingURL=init-config.js.map