import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateWebhook } from './webhook.js';

describe('evaluateWebhook', () => {
  it('flags missing signature verification', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-webhook-'));
    const handlerDir = join(dir, 'app', 'api', 'webhook', 'stripe');
    mkdirSync(handlerDir, { recursive: true });
    writeFileSync(
      join(handlerDir, 'route.ts'),
      `export async function POST(req: Request) {
  const event = await req.json();
  await handleEvent(event);
}`,
    );

    const findings = await evaluateWebhook(
      {
        type: 'webhook',
        handler_paths: ['app/api/webhook/**'],
        require_idempotency: true,
        require_raw_body: false,
        severity: 'high',
      },
      { repoRoot: dir },
    );

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.message.includes('signature'))).toBe(true);
  });

  it('passes when constructEvent and idempotency present', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-webhook-'));
    const handlerDir = join(dir, 'src', 'webhook');
    mkdirSync(handlerDir, { recursive: true });
    writeFileSync(
      join(handlerDir, 'stripe.ts'),
      `import Stripe from 'stripe';
export function handle(rawBody: Buffer, sig: string) {
  const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  if (processed_events.has(event.id)) return;
  processed_events.add(event.id);
}`,
    );

    const findings = await evaluateWebhook(
      {
        type: 'webhook',
        handler_paths: ['src/**/webhook/**'],
        require_idempotency: true,
        require_raw_body: true,
        severity: 'high',
      },
      { repoRoot: dir },
    );

    expect(findings.filter((f) => f.severity === 'high')).toHaveLength(0);
  });
});
