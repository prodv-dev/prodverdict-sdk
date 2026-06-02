import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import type { StripeReader, StripeSubscription } from './types.js';

function makeConnectorError(message: string): Error & { code: 'CONNECTOR_ERROR' } {
  const err = new Error(message) as Error & { code: 'CONNECTOR_ERROR' };
  err.code = 'CONNECTOR_ERROR';
  return err;
}

/** Map Paddle subscription status to the same buckets used for Stripe access rules. */
function normalizeStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === 'paused') return 'past_due';
  return s;
}

export function createLivePaddleReader(apiKeyEnvVar: string): StripeReader {
  const key = process.env[apiKeyEnvVar];
  if (!key) {
    throw makeConnectorError(
      `Missing required env var "${apiKeyEnvVar}" for Paddle connector. ` +
        'Provide a restricted API key with subscription.read.',
    );
  }

  const envName = (process.env.PADDLE_ENVIRONMENT ?? 'sandbox').toLowerCase();
  const environment = envName === 'production' ? Environment.production : Environment.sandbox;

  const client = new Paddle(key, { environment });

  return {
    async listSubscriptions(): Promise<StripeSubscription[]> {
      const results: StripeSubscription[] = [];
      const collection = client.subscriptions.list();

      for await (const sub of collection) {
        const customerId = sub.customerId;
        if (!customerId) continue;

        const priceIds: string[] = [];
        for (const item of sub.items ?? []) {
          const priceId = item.price?.id;
          if (priceId) priceIds.push(priceId);
        }

        results.push({
          id: sub.id,
          customerId,
          status: normalizeStatus(sub.status),
          priceIds,
        });
      }

      return results;
    },
  };
}
