-- Unsafe: blocks writes on large tables
CREATE INDEX idx_users_plan ON users (plan);
