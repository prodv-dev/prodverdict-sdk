-- ProdVerdict local test database schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  has_paid_access BOOLEAN NOT NULL DEFAULT false,
  plan TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);
