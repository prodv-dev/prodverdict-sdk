/** Minimal Stripe subscription data needed for access evaluation */
export interface StripeSubscription {
  id: string;
  customerId: string;
  status: string;
  /** Active price IDs on the subscription (usually one) */
  priceIds: string[];
}

export interface StripeReader {
  listSubscriptions(): Promise<StripeSubscription[]>;
}

/** Active entitlement grant from Stripe Entitlements API.
 *
 * Stripe's active entitlements are per-customer-per-feature: each record grants
 * one feature to one customer. To enumerate all active entitlements we iterate
 * customers and list entitlements for each. The `customerId` here is populated
 * from the query parameter, not the response body.
 */
export interface ActiveEntitlement {
  /** Stripe's active entitlement id (e.g., ent_...) */
  id: string;
  /** Stripe customer id (cus_...) — populated from the list query parameter */
  customerId: string;
  /** Feature id or expandable Feature object id that the customer is entitled to */
  feature: string;
  /** User-defined lookup_key on the feature, if set. Useful as a plan slug. */
  lookupKey: string | null;
}

export interface EntitlementsReader {
  listActiveEntitlements(): Promise<ActiveEntitlement[]>;
}

/** Minimal app user row needed for access evaluation */
export interface AppUser {
  id: string;
  stripeCustomerId: string | null;
  hasPaidAccess: boolean;
  plan: string | null;
}

export interface DatabaseReader {
  listUsers(): Promise<AppUser[]>;
  close?(): Promise<void>;
}
