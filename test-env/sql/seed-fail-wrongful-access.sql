-- Wrongful access: canceled Stripe sub but has_paid_access=true
TRUNCATE users;

INSERT INTO users (id, stripe_customer_id, has_paid_access, plan) VALUES
  ('user_alice', 'cus_active', true, 'pro'),
  ('user_bob',   'cus_canceled', true, 'starter');
