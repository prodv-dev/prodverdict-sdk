# MCP Design — Local and Remote

ProdVerdict exposes production contract checks to AI coding agents via the [Model Context Protocol](https://modelcontextprotocol.io). This document defines what runs locally vs on prodverdict.com.

## Principles

1. **Determinism** — MCP tools return the same findings as CLI and GitHub Action; no LLM in evaluation.
2. **Secrets stay local** — Stripe, Paddle, and database credentials never leave the customer's machine for access checks.
3. **Fail-closed** — missing credentials produce errors, not silent passes.
4. **Agent schema** — check tools return `schemaVersion: "1"` JSON with `summary` and `nextSteps`.

## Local MCP (v0.6 — shipped)

Stdio server: `npx @prodverdict/mcp`

### Tools

| Tool | Live creds | Fixtures |
|------|------------|----------|
| `doctor` | Optional pings | N/A |
| `check_all_contracts` | Yes | `useFixtures` |
| `check_access_contract` | Yes | `useFixtures` |
| `check_config_contract` | `process.env` | N/A |
| `check_migration_contract` | N/A | N/A |
| `validate_config` | N/A | N/A |
| `suggest_fix` | N/A | N/A |

### Prompts

- `setup_prodverdict` — scaffold prodverdict.yml + CI
- `verify_before_pr` — doctor → check_all → suggest_fix loop

### Resources

- `prodverdict://schema/access` — access contract YAML reference
- `prodverdict://examples/nextjs-stripe` — fixture demo commands

### Install (Cursor)

```bash
npx prodverdict init --stack nextjs-stripe --mcp --cursor-rule
```

Or add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "prodverdict": {
      "command": "npx",
      "args": ["-y", "@prodverdict/mcp"],
      "env": {
        "DATABASE_URL": "postgresql://readonly:...@host/db",
        "STRIPE_SECRET_KEY": "rk_live_..."
      }
    }
  }
}
```

## Remote MCP (v0.7 — shipped)

Hosted at `https://prodverdict.com/api/mcp` for agents that cannot run local billing connectors.

### What remote MCP will NOT do

- **Access contract with live Stripe/Paddle + DB** — requires customer secrets; stays local only.

### What remote MCP can do

| Tool | Requirement | Tier |
|------|-------------|------|
| `validate_config` | YAML upload or GitHub file read | Free |
| `check_migration_contract` | GitHub App reads migration SQL from repo | Pro |
| `check_config_contract` | GitHub App reads source + `.env.example` | Pro |
| `get_recent_runs` | Dashboard API key | Pro |

### Architecture

```
Cursor → HTTPS MCP (prodverdict.com)
       → GitHub API (installation token, repo files only)
       → evaluateMigration / evaluateConfig (engine)
       → agent schema JSON
```

No subscription rows or Stripe customer data stored on ProdVerdict cloud.

### Cursor config (remote)

```json
{
  "mcpServers": {
    "prodverdict-remote": {
      "url": "https://prodverdict.com/api/mcp",
      "headers": {
        "Authorization": "Bearer pv_...",
        "X-Prodverdict-Project-Id": "project-uuid"
      }
    }
  }
}
```

Access checks with live Stripe/Paddle + DB remain on **local MCP** only.

## CLI agent workflow

```bash
npx prodverdict doctor --format agent
npx prodverdict check all --format agent
```

`--format agent` returns stable JSON documented in the public README.
