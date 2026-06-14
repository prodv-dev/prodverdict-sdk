# Phase 5a — Webhook Contract (shipped v0.9)

Static lint for third-party webhook handlers (Stripe, Paddle, GitHub, etc.).

## Goal

Ensure webhook routes verify signatures and deduplicate events before side effects.

## MVP scope (v0.9)

Static patterns only — no replay server.

| Check | Pattern |
|-------|---------|
| Signature verification | `constructEvent`, `webhooks.verify`, `verifyWebhook`, signature headers |
| Idempotency | `event.id`, `processed_events`, `ON CONFLICT`, upsert tables |
| Raw body | `rawBody`, `request.text()`, buffer reads (when `require_raw_body: true`) |

## `prodverdict.yml`

```yaml
version: 1
contracts:
  - type: webhook
    handler_paths: [app/api/**/webhook/**, src/**/webhook/**]
    require_idempotency: true
    require_raw_body: true
    severity: high
```

## Surfaces

- CLI / Action / local MCP
- Remote MCP: static lint via GitHub App (no webhook secrets on cloud)

## Deferred

- Fixture-based replay from recorded JSON in `fixtures/webhooks/`

## Implementation

- `core/packages/engine/src/evaluators/webhook.ts`
