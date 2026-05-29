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
