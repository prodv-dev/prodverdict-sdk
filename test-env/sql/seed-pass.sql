-- Aligned with scenarios/pass/stripe/subscriptions.json
TRUNCATE users;

INSERT INTO users (id, stripe_customer_id, has_paid_access, plan) VALUES
  ('user_alice', 'cus_active', true, 'pro'),
  ('user_bob',   'cus_canceled', false, NULL);
