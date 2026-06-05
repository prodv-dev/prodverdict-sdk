-- Safe: concurrent index build
CREATE INDEX CONCURRENTLY idx_users_plan ON users (plan);
