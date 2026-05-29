# Implementation Guide

Technical guide for building ProdVerdict. Read with `AGENTS.md` and `design.md`.

## Recommended repo layout

```
prodverdict/
├── core/
│   ├── packages/
│   │   ├── engine/
│   │   ├── cli/
│   │   ├── action/
│   │   └── mcp/
│   ├── fixtures/
│   ├── examples/
│   └── package.json
├── docs/
├── AGENTS.md
└── README.md
```

## Core types (engine)

```typescript
type Severity = 'high' | 'medium' | 'low';
type Verdict = 'pass' | 'warn' | 'fail';

interface Finding {
  contract: string;       // e.g. "access"
  severity: Severity;
  entity: string;         // e.g. "user:usr_abc" or "price:price_xyz"
  message: string;      // human-readable
  fix?: string;           // agent-readable remediation
}

interface CheckResult {
  contract: string;
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;    // ISO timestamp
}

interface ProdVerdictConfig {
  version: 1;
  contracts: ContractDefinition[];
}

interface ContractDefinition {
  type: 'access' | 'config' | 'migration' | 'boundary' | 'restore';
  source_of_truth?: string;
  rules: Record<string, unknown>[];
  severity?: Severity;
  fix?: string;
}
```

Verdict logic:

- Any `high` finding → `fail`
- Only `medium`/`low` → `warn` (configurable later; default warn)
- No findings → `pass`

## Example `prodverdict.yml` (Phase 1)

```yaml
version: 1
contracts:
  - type: access
    source_of_truth: stripe
    rules:
      - match: subscription_active
        app_field: has_paid_access
        expected: true
      - match: subscription_canceled_or_unpaid
        app_field: has_paid_access
        expected: false
    severity: high
    fix: "Sync has_paid_access from Stripe webhooks or run reconciliation job."
```

## Access Contract evaluator

**Inputs (read-only, in-process):**

1. Parsed `prodverdict.yml` access contract
2. Stripe subscriptions/customers (REST, restricted key)
3. App users table (SQL read-only): at minimum `id`, `stripe_customer_id`, `has_paid_access`, `plan`

**Checks:**

| Condition | Finding |
|-----------|---------|
| Stripe `active`/`trialing` + `has_paid_access=false` | High: revenue leak risk |
| Stripe `canceled`/`unpaid` + `has_paid_access=true` | High: wrongful access |
| Same `stripe_customer_id` on multiple users | Medium |
| Price ID not in configured plan map | High |

**Output:** `CheckResult` JSON + CLI table.

## CLI commands (Phase 1)

```bash
npx prodverdict check              # all configured contracts
npx prodverdict check access       # access only
npx prodverdict check --format json
npx prodverdict validate           # parse prodverdict.yml only
```

Exit codes: `0` pass, `1` fail, `2` config/usage error.

## GitHub Action (Phase 1)

- Trigger: `pull_request`, optional `schedule`
- Inputs: path to config (default `./prodverdict.yml`), contracts filter
- Secrets: `STRIPE_SECRET_KEY` (restricted), `DATABASE_URL` (read-only role)
- Posts PR comment with findings table; sets check conclusion failed on high severity
- Does not upload raw Stripe/DB data — only findings JSON as artifact optional

## MCP tools (after CLI stable)

| Tool | Behavior |
|------|----------|
| `check_access_contract` | Run access check, return JSON findings |
| `validate_config` | Parse prodverdict.yml |
| `suggest_fix` | Return `fix` strings from findings (no LLM) |

MCP must not write code or merge PRs.

## Testing strategy

1. **Unit:** rule evaluation against frozen Stripe + DB fixtures
2. **Integration:** CLI against `fixtures/` with mock HTTP/SQL adapters
3. **No live Stripe/DB in CI** — inject connector interfaces

```typescript
interface AccessDataSources {
  stripe: StripeReader;
  database: DatabaseReader;
}
```

## Phase 1 definition of done

- [ ] Parser validates `prodverdict.yml` with clear errors
- [ ] Access evaluator produces deterministic findings from fixtures
- [ ] CLI text + JSON output documented
- [ ] GitHub Action fails PR on high-severity mismatch
- [ ] Example repo runs end-to-end locally with test credentials documented
- [ ] No secrets or PII in logs

## Later phases (do not implement unless asked)

| Phase | Contract | Trigger |
|-------|----------|---------|
| 2 | Config | env var scan vs `.env.example` / provider |
| 3 | Migration | SQL/Prisma/Drizzle static analysis |
| 4 | Boundary | OpenAPI/code + forbidden field probes |
| 5 | Webhook, Restore | operational contracts |

## Default stack assumptions

Use these when the user has not specified otherwise:

- Postgres app database
- Stripe Billing subscriptions
- GitHub Actions for CI
- TypeScript + npm workspaces

Document any deviation in code comments or a short ADR in the PR description.
