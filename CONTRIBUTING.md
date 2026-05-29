# Contributing to ProdVerdict

Thank you for your interest in contributing to ProdVerdict!

## Getting started

```bash
git clone https://github.com/prodv-dev/prodverdict-sdk.git
cd prodverdict-sdk
npm install
npm test
```

## Development workflow

- All source lives under `packages/`
- Tests use [Vitest](https://vitest.dev/) — run `npm test` from repo root
- TypeScript is strict — `npm run build` must pass before opening a PR
- The engine (`packages/engine`) has no runtime dependencies other than `zod`

## What we welcome

- Bug fixes with a failing test that demonstrates the bug
- New contract evaluator checks (discuss in an issue first)
- Improved fixture coverage
- Documentation improvements

## What we don't accept

- Non-deterministic evaluation logic (no LLM calls in the evaluation path)
- Breaking changes to `prodverdict.yml` schema without a migration path
- Dependencies that require network access during `npm test`

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Added or updated tests for changed behavior
- [ ] No secrets or API credentials in fixtures

## Reporting issues

Open a GitHub Issue. For security issues, email security@prodverdict.dev directly.
