import pg from 'pg';
import type { DatabaseReader, AppUser } from './types.js';
import type { AccessContractConfig } from '../config/schema.js';
import { assertSqlIdentifier, assertSqlIdentifiers } from './sql-identifiers.js';

function makeConnectorError(message: string): Error & { code: 'CONNECTOR_ERROR' } {
  const err = new Error(message) as Error & { code: 'CONNECTOR_ERROR' };
  err.code = 'CONNECTOR_ERROR';
  return err;
}

/** Shape required to construct a Postgres reader — just the database block. */
type DatabaseConfig = Pick<AccessContractConfig, 'database'>;

export function createLivePostgresReader(cfg: DatabaseConfig): DatabaseReader {
  const connectionString = process.env[cfg.database.url_env];
  if (!connectionString) {
    throw makeConnectorError(
      `Missing required env var "${cfg.database.url_env}" for database connector. ` +
        'Provide a read-only database connection string.',
    );
  }

  const cols = cfg.database.columns;
  const table = cfg.database.users_table;
  assertSqlIdentifier(table, 'database.users_table');
  assertSqlIdentifiers(cols, 'database.columns');

  const pool = new pg.Pool({ connectionString, max: 2 });
  let closed = false;

  return {
    async listUsers(): Promise<AppUser[]> {
      if (closed) {
        throw makeConnectorError('Database reader is closed.');
      }

      let client: pg.PoolClient | undefined;
      try {
        client = await pool.connect();
        const res = await client.query(
          `SELECT ${cols.id}, ${cols.stripe_customer_id}, ${cols.has_paid_access}, ${cols.plan} FROM ${table}`,
        );
        return res.rows.map((row): AppUser => ({
          id: String(row[cols.id]),
          stripeCustomerId: row[cols.stripe_customer_id] as string | null,
          hasPaidAccess: Boolean(row[cols.has_paid_access]),
          plan: row[cols.plan] as string | null,
        }));
      } catch (err) {
        throw makeConnectorError(`Database query failed: ${String(err)}`);
      } finally {
        client?.release();
      }
    },

    async close(): Promise<void> {
      if (!closed) {
        closed = true;
        await pool.end();
      }
    },
  };
}
