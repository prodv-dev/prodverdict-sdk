import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ACCESS_SCHEMA_DOC = `# Access contract (prodverdict.yml)

\`\`\`yaml
version: 1
contracts:
  - type: access
    source_of_truth: stripe  # or paddle
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
      price_xxx: pro
    severity: high
\`\`\`

Compares billing subscription state vs app database. Fails on revenue leak, wrongful access, plan drift.
`;

const NEXTJS_EXAMPLE = `# nextjs-stripe fixture demo (no credentials)

\`\`\`bash
git clone --depth=1 https://github.com/prodv-dev/prodverdict-sdk.git
cd prodverdict-sdk
npx prodverdict check access \\
  --config examples/nextjs-stripe/prodverdict.yml \\
  --fixtures \\
  --fixtures-dir examples/nextjs-stripe/scenarios/fail-revenue-leak
\`\`\`

Expected: FAIL — active subscription but has_paid_access=false.
`;

export function registerResources(server: McpServer): void {
  server.resource('access-schema', 'prodverdict://schema/access', async () => ({
    contents: [
      {
        uri: 'prodverdict://schema/access',
        mimeType: 'text/markdown',
        text: ACCESS_SCHEMA_DOC,
      },
    ],
  }));

  server.resource('nextjs-stripe-example', 'prodverdict://examples/nextjs-stripe', async () => ({
    contents: [
      {
        uri: 'prodverdict://examples/nextjs-stripe',
        mimeType: 'text/markdown',
        text: NEXTJS_EXAMPLE,
      },
    ],
  }));
}
