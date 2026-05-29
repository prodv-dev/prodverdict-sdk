-- Revenue leak: active Stripe sub but has_paid_access=false
TRUNCATE users;

INSERT INTO users (id, stripe_customer_id, has_paid_access, plan) VALUES
  ('user_alice', 'cus_active', false, NULL),
  ('user_bob',   'cus_canceled', false, NULL);
