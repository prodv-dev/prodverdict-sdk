import Stripe from 'stripe';
export function handle(rawBody: Buffer, sig: string, secret: string) {
  const event = Stripe.webhooks.constructEvent(rawBody, sig, secret);
  if (seen.has(event.id)) return;
  seen.add(event.id);
}
const seen = new Set<string>();
