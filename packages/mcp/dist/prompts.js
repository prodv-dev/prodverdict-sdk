import { z } from 'zod';
const STACKS = ['nextjs-stripe', 'supabase-stripe', 'paddle-stripe', 'rails-stripe'];
function localSetupPromptBody(stack) {
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
function remoteSetupPromptBody(stack) {
    return `# Set up ProdVerdict (remote MCP + local access checks)

Stack template: **${stack}**

## Remote MCP (config + migration via GitHub)

1. Create a project at https://prodverdict.com/dashboard
2. Connect GitHub App (Pro) for repo reads — no Stripe/DB secrets on cloud
3. Add remote MCP to Cursor (copy from dashboard setup or):
   \`\`\`bash
   npx prodverdict init --stack ${stack} --remote-mcp
   \`\`\`
4. Tools: \`validate_config\`, \`check_repo_contracts\`, \`get_recent_runs\` (Pro)

## Access contract (local only)

Billing vs database checks require secrets on your machine:

\`\`\`bash
npx prodverdict init --stack ${stack} --mcp --cursor-rule
npx prodverdict doctor --format agent
npx prodverdict check access --format agent
\`\`\`

## Rules

- Access checks never leave your machine
- Fail closed on missing credentials
- Merge blocking happens in CI
`;
}
function localVerifyPromptBody() {
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
function remoteVerifyPromptBody() {
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
export function registerPrompts(server, mode = 'local') {
    const setupBody = mode === 'remote' ? remoteSetupPromptBody : localSetupPromptBody;
    const verifyBody = mode === 'remote' ? remoteVerifyPromptBody : localVerifyPromptBody;
    server.prompt('setup_prodverdict', mode === 'remote'
        ? 'Guide for ProdVerdict remote MCP (GitHub repo checks) plus local access setup.'
        : 'Guide for setting up ProdVerdict in a repository (prodverdict.yml + CI + optional MCP).', {
        stack: z
            .enum(STACKS)
            .optional()
            .describe('Stack template. Defaults to nextjs-stripe.'),
    }, async ({ stack }) => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: setupBody(stack ?? 'nextjs-stripe'),
                },
            },
        ],
    }));
    server.prompt('verify_before_pr', mode === 'remote'
        ? 'Run remote repo contract checks and local access checks before opening a PR.'
        : 'Run ProdVerdict doctor and all contract checks before opening a pull request.', {}, async () => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: verifyBody(),
                },
            },
        ],
    }));
}
//# sourceMappingURL=prompts.js.map