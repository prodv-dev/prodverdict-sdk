import chalk from 'chalk';
import { pressEnterToContinue, divider } from './prompt.js';

export interface PostgresHelperResult {
  envVar: string;
  alreadySet: boolean;
}

/** Default table name per stack — mirrors what buildProdverdictYaml writes. */
export function usersTableForStack(stack: string): string {
  if (stack === 'supabase-stripe' || stack === 'supabase-paddle') return 'profiles';
  return 'users';
}

/**
 * Print the read-only Postgres role SQL and wait for DATABASE_URL to be set.
 * If DATABASE_URL is already set in process.env, skip the wait.
 */
export async function runPostgresRoleHelper(
  stack: string,
): Promise<PostgresHelperResult> {
  const envVar = 'DATABASE_URL';
  const alreadySet = Boolean(process.env[envVar]);
  const table = usersTableForStack(stack);

  console.log();
  console.log(
    chalk.bold('Create a read-only Postgres role (run this in psql or your DB console):'),
  );
  console.log();
  console.log(`  ${chalk.cyan('CREATE ROLE prodverdict_readonly LOGIN PASSWORD \'strong_password\';')}`);
  console.log(`  ${chalk.cyan('GRANT CONNECT ON DATABASE yourdb TO prodverdict_readonly;')}`);
  console.log(`  ${chalk.cyan('GRANT USAGE ON SCHEMA public TO prodverdict_readonly;')}`);
  console.log(`  ${chalk.cyan(`GRANT SELECT ON ${table} TO prodverdict_readonly;`)}`);
  console.log();
  console.log(chalk.dim('Notes:'));
  console.log(chalk.dim('  • Replace "yourdb" with your database name.'));
  console.log(chalk.dim(`  • The role only needs SELECT on the "${table}" table — nothing else.`));
  console.log(chalk.dim('  • For Supabase: run this in the SQL editor (Database → SQL).'));
  console.log(chalk.dim('  • For Neon: run in the Neon SQL editor or psql.'));
  console.log();
  console.log(chalk.dim('Then set the connection string and press Enter:'));
  console.log();
  console.log(
    `  ${chalk.cyan('export DATABASE_URL=postgresql://prodverdict_readonly:strong_password@host:5432/yourdb')}`,
  );

  if (alreadySet) {
    console.log();
    console.log(chalk.green(`  ✓ ${envVar} is already set in this environment.`));
    return { envVar, alreadySet: true };
  }

  console.log();
  await pressEnterToContinue(`  ${chalk.dim('[Press Enter when you have exported DATABASE_URL]')}`);
  console.log();
  console.log(chalk.dim(divider(60)));

  const nowSet = Boolean(process.env[envVar]);
  if (!nowSet) {
    console.log(
      chalk.yellow(
        `  ⚠ ${envVar} is not yet set in this terminal. You can export it and re-run setup, or continue and set it later.`,
      ),
    );
  } else {
    console.log(chalk.green(`  ✓ ${envVar} detected.`));
  }
  return { envVar, alreadySet: nowSet };
}
