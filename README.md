# ProdVerdict Core

TypeScript monorepo — contract engine, CLI, GitHub Action, and MCP server.

## Packages

| Package | Description |
|---------|-------------|
| `@prodverdict/engine` | Config parser, connectors, access evaluator |
| `prodverdict` | CLI (`npx prodverdict check`) |
| `@prodverdict/action` | GitHub composite action |
| `@prodverdict/mcp` | MCP server for AI agents |

## Development

```bash
npm install
npm test
npm run build
```

## CLI

```bash
# Live check (requires STRIPE_SECRET_KEY + DATABASE_URL)
npx prodverdict check access --config ./prodverdict.yml

# Fixture mode (uses fixtures/stripe/ and fixtures/db/)
npx prodverdict check access --config fixtures/prodverdict.yml --fixtures

# JSON output + strict (exit 1 on warn)
npx prodverdict check access --format json --strict

# Validate config only
npx prodverdict validate
```

## GitHub Action

From your repo root (after checkout):

```yaml
- uses: actions/checkout@v4
- uses: ./core/packages/action
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The action installs dependencies, builds, runs the check, and posts a PR comment.

## MCP

```json
{
  "mcpServers": {
    "prodverdict": {
      "command": "node",
      "args": ["core/packages/mcp/dist/server.js"],
      "env": {
        "STRIPE_SECRET_KEY": "rk_live_...",
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

## Fixtures

```
fixtures/
├── prodverdict.yml
├── stripe/subscriptions.json
└── db/users.json
```

Used by `--fixtures` and unit tests.

## Test environment

Local Postgres + Stripe fixtures — no real Stripe account required:

```bash
cd test-env
node run.mjs up
node run.mjs check pass
node run.mjs all
```

Or from `core/`: `npm run test:env`

See [test-env/README.md](test-env/README.md).

## Examples

See [examples/access-check/](examples/access-check/) for a real-credentials setup guide.
