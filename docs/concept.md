# ProdVerdict: Production Contracts for AI‑Assisted SaaS

The rise of AI coding tools has transformed how software is built.  Surveys
conducted by Stack Overflow, JetBrains, DORA and others show that roughly
**84–90 %** of developers were using or planning to use AI coding assistants by
mid‑2025【765584633700191†L165-L173】.  This broad adoption comes at a cost: trust
in AI‑generated code is low and security findings have exploded.  Security
studies by Veracode and the Cloud Security Alliance found that around **45 %**
of AI‑generated code samples contained OWASP Top 10 vulnerabilities and that
developers using AI assistants generated security issues at **10×** the rate of
their peers【50550606903651†L20-L27】.  Despite these risks, businesses and
individual developers continue to rely on agents like GitHub Copilot, Claude Code and Cursor because of the productivity gain.

## Problem

Current workflows leave a gap between the high velocity of AI‑generated code
and the business invariants that must always hold in production.  Large
agent‑generated pull requests routinely pass tests and static analysis while
silently breaking contracts such as “only paying customers have access” or
“database migrations must not lock hot tables.”  Human reviewers are
overwhelmed: an article on agent verification notes that as AI adoption scales,
teams see 98 % more pull requests and 154 % larger diffs, while review times
balloon by 91 %【748400728082384†L90-L99】.  Developers do not trust the
AI‑generated output — only **33 %** of developers trust AI accuracy and
46 % actively distrust it【748400728082384†L83-L88】 — but they have no
automatic way to enforce their production invariants.

## The ProdVerdict Concept

**ProdVerdict** introduces a simple, deterministic way to evaluate whether
AI‑generated code may safely merge.  Instead of manually hunting through
pull‑requests, ProdVerdict defines **production contracts** — rules about
application state that must always be true.  Examples include:

* **Access contract:** paying subscribers in Stripe must have access in the app; canceled or unpaid users must not.
* **Migration contract:** database migrations must not lock tables or rewrite large data sets without proper techniques.
* **Config contract:** any environment variable referenced in code must exist in CI, staging and production.
* **Boundary contract:** API endpoints must not accept or expose forbidden fields (e.g., `is_admin` or `role`).

ProdVerdict evaluates these contracts whenever code changes occur.  The tool
runs locally via a command‑line interface, in continuous integration as a
GitHub Action, and via the Model Context Protocol (MCP) so that AI agents can
request determinations.  When a contract fails, ProdVerdict blocks the merge
and produces a clear verdict (pass, warn or fail) along with concrete
instructions on how to fix the issue.

## How It Works

1. **Define contracts:** The project’s `prodverdict.yml` file lists the invariants for the application: how Stripe customers map to plans, which database tables are critical, which environment variables must exist, and which fields are forbidden.
2. **Run checks:** Developers run `npx prodverdict check` locally, or the
GitHub Action automatically runs on pull requests and scheduled intervals.
ProdVerdict connects to the relevant systems using read‑only credentials and
compares the live state against the contract rules.
3. **Return a verdict:** For each contract, ProdVerdict returns a pass/warn/fail
status plus machine‑readable findings.  In the CI context, these verdicts
become required status checks that block merges until the issue is resolved.
4. **Agents adapt:** The same checks are exposed via MCP tools so that AI
coding agents can call `check_access_contract` or `check_migration_contract` and
modify their own code before creating a pull request.

ProdVerdict does **not** generate code or rely on LLM output; it is a
deterministic evaluator.  The goal is not to replace human judgment but to
provide objective gates that complement test suites and static analysis.

## Why This Matters

* **Protect revenue:** Without access‑state verification, founders risk giving
premium features away for free or locking paying customers out.  ProdVerdict
ensures the app’s database and Stripe’s subscription state stay in sync.
* **Prevent downtime:** Unsafe migrations can lock a live table and take a
production application down.  ProdVerdict flags dangerous SQL before it
reaches production.
* **Eliminate configuration drift:** Env‑var mismatches cause hidden
failures only after deployment.  ProdVerdict surfaces missing variables in CI.
* **Secure APIs:** Mass‑assignment bugs and leaked admin fields are common in
AI‑generated code.  Boundary contracts catch these issues early.

ProdVerdict reframes the safety problem from ad‑hoc bug catching to
enforcement of declarative contracts.  By holding AI‑generated code to
explicit invariants, developers can accept the speed of agents without
sacrificing the stability of their SaaS.

---

### References

1. Adoption and daily usage of AI coding tools: Stack Overflow 2025 survey results showing 84 % use or plan to use AI tools (51 % daily)【765584633700191†L165-L173】.
2. Security risk: 45 % of AI‑generated code contains vulnerabilities; security findings increased 10× for AI‑assisted developers【50550606903651†L20-L27】.
3. Developer distrust: only 33 % of developers trust AI accuracy; 46 % actively distrust it【748400728082384†L83-L88】.
4. Review overload: AI adoption increases PR volume by 98 % and PR size by 154 %, overwhelming reviewers【748400728082384†L90-L99】.