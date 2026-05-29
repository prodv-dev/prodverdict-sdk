import Stripe from 'stripe';
import type { StripeReader, StripeSubscription } from './types.js';

function makeConnectorError(message: string): Error & { code: 'CONNECTOR_ERROR' } {
  const err = new Error(message) as Error & { code: 'CONNECTOR_ERROR' };
  err.code = 'CONNECTOR_ERROR';
  return err;
}

export function createLiveStripeReader(secretKeyEnvVar: string): StripeReader {
  const key = process.env[secretKeyEnvVar];
  if (!key) {
    throw makeConnectorError(
      `Missing required env var "${secretKeyEnvVar}" for Stripe connector. ` +
        'Provide a restricted read-only Stripe secret key.',
    );
  }

  const client = new Stripe(key, { apiVersion: '2024-06-20' });

  return {
    async listSubscriptions(): Promise<StripeSubscription[]> {
      const results: StripeSubscription[] = [];
      for await (const sub of client.subscriptions.list({ limit: 100 })) {
        const priceIds = (sub.items?.data ?? [])
          .map((item) => item.price?.id)
          .filter((id): id is string => Boolean(id));
        results.push({
          id: sub.id,
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          status: sub.status,
          priceIds,
        });
      }
      return results;
    },
  };
}
