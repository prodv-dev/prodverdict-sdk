# Agent Checklist

Use before, during, and after every ProdVerdict implementation task.

## Before coding

- [ ] Read `AGENTS.md` and the relevant section of `phases.md`
- [ ] Confirm task is **Phase 1 (Access)** unless user explicitly asked otherwise
- [ ] Confirm approach is **deterministic** (no LLM in evaluation path)
- [ ] Confirm secrets stay in local/CI runtime (no cloud persistence of customer data)
- [ ] Identify which files/packages will change; keep scope minimal

## While coding

- [ ] Use `prodverdict.yml` (not legacy names)
- [ ] Use `prodverdict check` for CLI commands
- [ ] Implement fail-closed: missing config/credentials → fail with clear message
- [ ] Return structured `Finding` objects (contract, severity, entity, message, fix?)
- [ ] Redact secrets in logs and CLI output
- [ ] Add fixture-based tests; no live Stripe/DB in unit tests
- [ ] Inject data sources (StripeReader, DatabaseReader) for testability

## After coding

- [ ] Run tests and CLI against fixtures
- [ ] Verify JSON output shape is stable for future MCP
- [ ] Verify high-severity findings produce exit code `1`
- [ ] Document new env vars in example README or implementation-guide
- [ ] Do not commit `.env`, API keys, or real customer dumps

## Red flags — stop and reconsider

- Adding OpenAI/LLM calls to “improve” verdicts
- Building Config/Migration/Boundary before Access is done
- Storing Stripe customers or DB rows in a hosted dashboard
- Generic “scan all code for bugs” features
- Passing checks when credentials are missing

## Quick reference

| Item | Value |
|------|-------|
| Config file | `prodverdict.yml` |
| CLI | `npx prodverdict check [access]` |
| Phase 1 contract | Access (Stripe vs app DB) |
| Verdicts | pass / warn / fail |
| Severities | high / medium / low |
