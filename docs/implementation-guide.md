# Implementation Guide

Technical guide for building ProdVerdict. Read with `AGENTS.md` and `design.md`.

## Recommended repo layout

```
prodverdict/
├── core/
│   ├── packages/
│   │   ├── engine/      # runContracts(), evaluators, connectors
│   │   ├── cli/
│   │   ├── action/
│   │   └── mcp/
│   ├── fixtures/
│   ├── examples/
│   └── package.json
├── site/                # dashboard + remote MCP API
├── docs-site/           # user docs (Docusaurus)
├── docs/                # phase specs
├── AGENTS.md
└── README.md
```

## Core types (engine)

```typescript
type Severity = 'high' | 'medium' | 'low';
type Verdict = 'pass' | 'warn' | 'fail';
type ContractType = 'access' | 'config' | 'migration' | 'boundary' | 'webhook' | 'restore';

interface Finding {
  contract: ContractType;
  severity: Severity;
  entity: string;
  message: string;
  fix?: string;
}

interface CheckResult {
  contract: ContractType;
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
}
```

Verdict logic (`aggregateVerdict`):

- Any `high` finding → `fail`
- Only `medium`/`low` → `warn`
- No findings → `pass`

## Contract schemas

Each contract type has a **contract-specific** Zod schema in `core/packages/engine/src/config/schema.ts`. There is no generic `rules:` DSL in the engine — see phase design docs:

| Contract | Spec |
|----------|------|
| access | [phase-1-design.md](phase-1-design.md) |
| config | [phase-2-design.md](phase-2-design.md) |
| migration | [phase-3-design.md](phase-3-design.md) |
| boundary | [phase-4-design.md](phase-4-design.md) |
| webhook | [phase-5a-webhook-design.md](phase-5a-webhook-design.md) |
| restore | [phase-5b-restore-design.md](phase-5b-restore-design.md) |

## Unified dispatcher

All surfaces call `runContracts()`:

```typescript
import { runContracts, resolveCheckExitCode } from '@prodverdict/engine';

const output = await runContracts({
  config: parsed,
  configPath,
  repoRoot,
  env: process.env,
  contracts: ['access'], // omit for all declared contracts
  accessSource: 'live', // | 'fixtures' | 'fixtures-stripe'
});
```

## CLI commands

```bash
npx prodverdict demo                   # bundled revenue-leak fixture (no credentials)
npx prodverdict scan                   # static repo analysis, contract recommendations
npx prodverdict check                  # access (default)
npx prodverdict check all
npx prodverdict check config|migration|boundary|webhook|restore
npx prodverdict check --format json|agent
npx prodverdict init                   # auto-detects stack from package.json
npx prodverdict doctor
npx prodverdict validate
```

Exit codes: `0` pass, `1` fail (or warn with `--strict`), `2` config/usage error.

## GitHub Action

- Inputs: `config`, `contract` (access|config|migration|boundary|webhook|restore|all), `strict`
- Secrets: `STRIPE_SECRET_KEY` / `PADDLE_API_KEY`, `DATABASE_URL` (read-only)
- Posts PR comment; fails on high severity

## MCP tools

Local: `doctor`, `check_all_contracts`, `check_*_contract`, `validate_config`, `suggest_fix`

Remote (config/migration/boundary/webhook via GitHub App): see [mcp-design.md](mcp-design.md)

## Testing strategy

1. **Unit:** evaluators with fixtures and temp dirs
2. **Integration:** CLI `--fixtures`, Docker test-env
3. **No live Stripe/DB in CI** — inject connector interfaces

## Definition of done (new contract)

- [ ] Zod schema in `schema.ts`
- [ ] Evaluator + tests
- [ ] `runContracts()` dispatch case
- [ ] CLI, Action, local MCP wired
- [ ] Phase design doc in `docs/`
- [ ] Remote MCP if repo-only (no secrets)

## Default stack assumptions

- Postgres app database
- Stripe or Paddle billing
- GitHub Actions for CI
- TypeScript + npm workspaces
