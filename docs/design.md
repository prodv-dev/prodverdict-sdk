# Design

ProdVerdict is designed as a **deterministic production contract engine** rather than a generic AI safety platform.  It enforces invariants about billing state, database migrations, configuration, API boundaries and backups before any code reaches production.  This document explains how the system works, the architecture and the guiding design principles.

## Guiding Principles

1. **Determinism over heuristics.**  AI‑generated code can be unpredictable and context‑dependent.  ProdVerdict evaluates explicit rules and observations, not statistical guesses.  Each contract yields a clear status (pass, warn, fail) and explains why, with suggested fixes.  This approach is essential given that **only 33 % of developers trust AI accuracy and 46 % actively distrust it**【748400728082384†L83-L88】 and about **45 % of AI‑generated code contains vulnerabilities**【50550606903651†L20-L27】.
2. **Fail‑closed by default.**  When a contract cannot be evaluated (for example, missing credentials), ProdVerdict fails the check rather than allowing unknown changes to merge.  This fail‑closed posture aligns with the product’s mission of preventing production incidents.
3. **Local execution of sensitive logic.**  Contract evaluations that require secrets (e.g., database reads or Stripe API calls) run within the customer’s own CI runner or local environment.  ProdVerdict’s cloud only stores verdicts, metadata and minimal configuration; it never stores database rows or Stripe customer data.  This ensures that sensitive information remains under the customer’s control.
4. **Multiple interfaces, single engine.**  The same core evaluation engine powers the CLI, the GitHub Action, the scheduled runner and the Model Context Protocol (MCP) server.  Consistency of rules across interfaces prevents drift and reduces maintenance overhead.

## Architecture

ProdVerdict consists of five layers:

1. **Contract engine.**  At the core is a deterministic evaluator that takes a contract definition and the current state of the system (e.g., Stripe subscriptions and database rows) and produces findings.  A finding contains the contract violated, severity, affected entities and a human‑ and agent‑readable description.  For example, the Access Contract compares each user’s subscription status in Stripe with the `has_paid_access` flag in the app database; mismatches yield findings.
2. **CLI.**  Developers run `npx prodverdict check` locally to verify contracts before committing or to iterate on fixes.  The CLI outputs plain text for human inspection and JSON for integration with AI agents and other tools.
3. **GitHub Action.**  The action runs ProdVerdict on each pull request and scheduled intervals.  Findings are posted as PR comments, and the action fails if any contract is violated.  Because GitHub hosts over **150 million developers** and runs **millions of workflows daily**【376588004407349†L160-L198】, integrating with GitHub Actions ensures broad reach and leverages existing branch protection policies.
4. **MCP server.**  The Model Context Protocol allows AI coding agents to call deterministic tools.  ProdVerdict exposes safe read‑only tools such as `check_access_contract` and `suggest_fix`.  Agents like GitHub Copilot can call these tools to verify generated code before committing it.  However, the MCP server never merges or modifies code; it only returns findings.
5. **Cloud dashboard and API.**  A lightweight dashboard provides project configuration, policy management, contract history, billing and audit logs.  It stores only metadata—status of checks, contract definitions and user preferences.  All secrets remain in the CI environment.

## Contract Definition Language

Contracts are defined in `prodverdict.yml`, a declarative YAML format.  Each contract has:

* `type` – the kind of contract (e.g., `access`, `config`, `migration`, `boundary`, `restore`).
* `source_of_truth` – where to pull authoritative state (e.g., Stripe, entitlements API, manual mapping).
* `rules` – a list of assertions to evaluate.  Assertions can include conditions on Stripe subscription status, database columns, HTTP responses, environment variables, etc.
* `severity` – how strongly a violation should be treated (`high` fails PRs, `medium` warns, `low` logs).
* `fix` – optional instructions or templated patches to resolve violations.  For example, a migration contract might suggest using `CREATE INDEX CONCURRENTLY` instead of a plain `CREATE INDEX`.

This language makes the system extensible: new contracts can be added without modifying the engine.  It also allows teams to write custom rules for organisation‑specific policies.

## Data Flow Example (Access Contract)

1. A pull request modifies billing logic or user access flags.
2. The GitHub Action triggers `prodverdict check access`.
3. The engine fetches subscription data from Stripe using a restricted API key and reads user records from the database via a read‑only connection.  All data stays in memory within the CI runner.
4. The contract rules compare each user’s `stripe_subscription_status` with `has_paid_access` and `plan` values.  Mismatches are recorded as findings.
5. Findings are output as a JSON array, converted to a human‑readable table and posted as a PR comment.  The GitHub Action fails if any high‑severity findings exist.
6. The developer or AI agent reviews the comment, applies the suggested fixes and re‑runs the check until it passes.

## Future Extensions

- **Custom connectors:** Support additional sources such as other payment gateways, entitlements services or access control providers.  The contract language allows plugin connectors to map domain‑specific states.
- **Live metadata for migrations:** Use live database statistics (row counts, table sizes) to generate more accurate blast‑radius scores for migration operations.
- **PR simulation:** In the Migration Contract, run the migrations against a temporary database and evaluate whether indexes build concurrently or locks are escalated.  This can be integrated via containers in CI.
- **Contextual suggestions:** Provide step‑by‑step resolution instructions to AI agents through the MCP interface.  For example, when a contract fails due to a missing environment variable, suggest adding it to `.env.example`, Vercel environment and GitHub secrets.

ProdVerdict’s design intentionally avoids heavy inference or LLM integration.  Instead, it focuses on codifying best practices and production knowledge in a way that both humans and agents can reliably follow.  This deterministic approach increases trust and fills the gap left by AI code generation tools where **only 33 % of developers trust AI accuracy and 46 % actively distrust it**【748400728082384†L83-L88】.