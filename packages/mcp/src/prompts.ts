import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const STACKS = ['nextjs-stripe', 'supabase-stripe', 'paddle-stripe', 'rails-stripe'] as const;

function setupPromptBody(stack: string): string {
  return `# Set up ProdVerdict in this repository

Stack template: **${stack}**

## Steps

1. Run \`npx prodverdict init --stack ${stack} --mcp --cursor-rule\`
2. Customize \`prodverdict.yml\` — map real Stripe/Paddle price IDs to plan slugs
3. Add GitHub secrets: \`DATABASE_URL\`, billing API key (read-only)
4. Copy workflow from https://github.com/prodv-dev/prodverdict-sdk/tree/main/examples/workflows
5. Verify locally:
   \`\`\`bash
   npx prodverdict doctor --format agent
   npx prodverdict check all --format agent
   \`\`\`

## Rules

- Fail closed on missing credentials
- Never commit secrets
- Merge blocking happens in CI; MCP is for local agent verification
`;
}

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'setup_prodverdict',
    'Guide for setting up ProdVerdict in a repository (prodverdict.yml + CI + optional MCP).',
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
            text: setupPromptBody(stack ?? 'nextjs-stripe'),
          },
        },
      ],
    }),
  );

  server.prompt(
    'verify_before_pr',
    'Run ProdVerdict doctor and all contract checks before opening a pull request.',
    {},
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Verify before PR

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
`,
          },
        },
      ],
    }),
  );
}
