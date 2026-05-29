-- Plan drift: active sub on price_pro but app plan is starter
TRUNCATE users;

INSERT INTO users (id, stripe_customer_id, has_paid_access, plan) VALUES
  ('user_alice', 'cus_active', true, 'starter'),
  ('user_bob',   'cus_canceled', false, NULL);
