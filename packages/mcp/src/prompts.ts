import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const STACKS = ['nextjs-stripe', 'supabase-stripe', 'paddle-stripe', 'rails-stripe'] as const;

export type PromptMode = 'local' | 'remote';

function localSetupPromptBody(stack: string): string {
  return `# Set up ProdVerdict in this repository (AI agent bootstrap)

Stack template: **${stack}**

## Steps (run in order)

1. Scan the repo:
   \`\`\`bash
   npx prodverdict scan --format agent
   \`\`\`

2. Bootstrap all files (non-interactive):
   \`\`\`bash
   npx prodverdict setup --yes --format agent --from-env --stack ${stack}
   \`\`\`
   Or call MCP tool \`bootstrap_prodverdict\` with \`stack: "${stack}"\`.

3. If \`missing\` is non-empty in the JSON output:
   - **STRIPE_SECRET_KEY**: https://dashboard.stripe.com/apikeys — restricted key, Customers + Subscriptions read
   - **DATABASE_URL**: read-only Postgres role — export in terminal or add to \`.env.local\`
   - Re-run bootstrap after exporting vars

4. Verify setup:
   \`\`\`bash
   npx prodverdict status --format agent
   npx prodverdict doctor --format agent
   \`\`\`

5. Customize \`prodverdict.yml\` — replace placeholder price IDs with real Stripe/Paddle price IDs from the repo

6. GitHub repo secrets for scheduled workflow:
   \`\`\`bash
   gh secret set STRIPE_SECRET_KEY
   gh secret set DATABASE_URL
   gh secret set SLACK_WEBHOOK_URL
   \`\`\`

## Rules

- Never commit secrets — \`.env.local\` and \`.cursor/mcp.json\` env stay local
- Fail closed on missing credentials
- Merge blocking happens in CI; MCP verifies locally before PR
`;
}

function remoteSetupPromptBody(stack: string): string {
  return `# Set up ProdVerdict (remote MCP + local access checks)

Stack template: **${stack}**

## Local bootstrap (AI agent)

\`\`\`bash
npx prodverdict setup --yes --format agent --from-env --stack ${stack}
npx prodverdict status --format agent
\`\`\`

## Remote MCP (config + migration via GitHub — no billing secrets on cloud)

1. Create a project at https://prodverdict.com/dashboard
2. Connect GitHub App (Pro) for repo reads
3. Add remote MCP:
   \`\`\`bash
   npx prodverdict init --stack ${stack} --remote-mcp
   \`\`\`
4. Tools: \`validate_config\`, \`check_repo_contracts\`, \`get_recent_runs\` (Pro)

## Access contract (local only)

\`\`\`bash
npx prodverdict doctor --format agent
npx prodverdict check access --format agent
\`\`\`

## Rules

- Access checks never leave your machine
- Fail closed on missing credentials
`;
}

function localVerifyPromptBody(): string {
  return `# Verify before PR

Use ProdVerdict MCP tools in this order:

1. \`doctor\` — confirm prodverdict.yml and env vars
2. \`check_all_contracts\` — run access, config, and migration checks
3. If findings exist, call \`suggest_fix\` with the findings array
4. Apply fixes and re-run until verdict is pass

Or via CLI:

\`\`\`bash
npx prodverdict doctor --format agent
npx prodverdict check all --format agent
\`\`\`
`;
}

function remoteVerifyPromptBody(): string {
  return `# Verify before PR (remote + local)

## Remote MCP (no billing secrets on cloud)

1. \`validate_config\` — parse prodverdict.yml from repo or pasted YAML
2. \`check_repo_contracts\` — config + migration contracts via GitHub App (Pro)
3. \`suggest_fix\` — extract fix hints from findings
4. \`get_recent_runs\` — optional dashboard history (Pro)

## Access contract (local MCP or CLI)

Run on your machine with read-only Stripe/Paddle + DATABASE_URL:

\`\`\`bash
npx prodverdict doctor --format agent
npx prodverdict check access --format agent
\`\`\`

Re-run remote repo checks after fixes until both local access and remote config/migration pass.
`;
}

export function registerPrompts(server: McpServer, mode: PromptMode = 'local'): void {
  const setupBody = mode === 'remote' ? remoteSetupPromptBody : localSetupPromptBody;
  const verifyBody = mode === 'remote' ? remoteVerifyPromptBody : localVerifyPromptBody;

  server.prompt(
    'setup_prodverdict',
    mode === 'remote'
      ? 'Guide for ProdVerdict remote MCP (GitHub repo checks) plus local AI bootstrap.'
      : 'Guide for AI agent bootstrap: setup --yes, env wiring, credentials, scheduled workflow.',
    {
      stack: z
        .enum(STACKS)
        .optional()
        .describe('Stack template. Defaults to nextjs-stripe.'),
    },
    async ({ stack }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: setupBody(stack ?? 'nextjs-stripe'),
          },
        },
      ],
    }),
  );

  server.prompt(
    'verify_before_pr',
    mode === 'remote'
      ? 'Run remote repo contract checks and local access checks before opening a PR.'
      : 'Run ProdVerdict doctor and all contract checks before opening a pull request.',
    {},
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: verifyBody(),
          },
        },
      ],
    }),
  );
}
