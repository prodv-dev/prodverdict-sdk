import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve } from 'path';
import {
  parseConfigFile,
  runDoctor,
  toAgentDoctorOutput,
  isProdVerdictError,
} from '@prodverdict/engine';
import {
  runAccessCheck,
  runConfigCheck,
  runMigrationCheck,
  runBoundaryCheck,
  runWebhookCheck,
  runRestoreCheck,
  runEntitlementsMigrationCheck,
  runAllChecks,
} from './check-runner.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { buildSuggestFixOutput } from './suggest-fix.js';
import { runSetupNonInteractive } from 'prodverdict/bootstrap';

const DEFAULT_CONFIG = './prodverdict.yml';

const configPathSchema = z
  .string()
  .optional()
  .describe('Path to prodverdict.yml. Defaults to ./prodverdict.yml');

const repoRootSchema = z
  .string()
  .optional()
  .describe('Repository root to scan. Defaults to current working directory');

const fixturesSchema = z
  .boolean()
  .optional()
  .describe('Use fixture JSON instead of live Stripe/Paddle and database credentials');

const fixturesDirSchema = z
  .string()
  .optional()
  .describe('Directory containing stripe/ or paddle/ and db/ fixture JSON');

const server = new McpServer({
  name: 'prodverdict',
  version: '0.9.0',
});

function toolError(err: unknown) {
  const message = isProdVerdictError(err)
    ? `[${err.code}] ${err.message}`
    : String(err);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function toolJson(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

server.tool(
  'doctor',
  'Diagnose prodverdict.yml and required credentials without running full contract checks. ' +
    'Use this first before check tools to fail fast on missing env vars.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
    skipConnectivity: z.boolean().optional().describe('Skip live API/database pings'),
  },
  async ({ configPath, repoRoot, skipConnectivity }) => {
    try {
      const result = await runDoctor({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot: repoRoot ? resolve(repoRoot) : process.cwd(),
        skipConnectivity: skipConnectivity ?? false,
      });
      return toolJson(toAgentDoctorOutput(result.ok, result.checks, result.contracts));
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_all_contracts',
  'Run every contract defined in prodverdict.yml. Returns aggregate agent schema with summary and next steps.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
    useFixtures: fixturesSchema,
    fixturesDir: fixturesDirSchema,
  },
  async ({ configPath, repoRoot, useFixtures, fixturesDir }) => {
    try {
      const agent = await runAllChecks({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
        useFixtures: useFixtures ?? false,
        fixturesDir,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_access_contract',
  'Run the ProdVerdict access contract check. Compares billing subscription state (Stripe or Paddle) ' +
    '— or active Stripe Entitlements grants — against the app database and returns deterministic findings. ' +
    'Use before PRs that touch billing or access-control logic, or on a schedule for drift detection.',
  {
    configPath: configPathSchema,
    useFixtures: fixturesSchema,
    fixturesDir: fixturesDirSchema,
  },
  async ({ configPath, useFixtures, fixturesDir }) => {
    try {
      const agent = await runAccessCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        useFixtures: useFixtures ?? false,
        fixturesDir,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_config_contract',
  'Run the ProdVerdict config contract check. Scans the repo for process.env references, ' +
    'validates required variables, and compares against .env.example.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runConfigCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_migration_contract',
  'Run the ProdVerdict migration contract check. Scans SQL migration files for unsafe Postgres DDL.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runMigrationCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_boundary_contract',
  'Run the ProdVerdict boundary contract check. Scans API handlers for mass-assignment and sensitive response fields.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runBoundaryCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_webhook_contract',
  'Run the ProdVerdict webhook contract check. Validates signature verification and idempotency patterns in webhook handlers.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runWebhookCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_restore_contract',
  'Run the ProdVerdict restore contract check. Executes backup/restore commands and smoke SQL queries (requires pg tools in PATH).',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runRestoreCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'check_entitlements_migration_contract',
  'Run the ProdVerdict entitlements-migration contract check. Verifies a migration from local DB has_paid_access flags to Stripe Entitlements — catches users paid in DB but not granted in Stripe, stale grants, duplicates, and users missing a stripe_customer_id. Requires STRIPE_SECRET_KEY (with entitlements.read) and DATABASE_URL.',
  {
    configPath: configPathSchema,
    repoRoot: repoRootSchema,
  },
  async ({ configPath, repoRoot }) => {
    try {
      const agent = await runEntitlementsMigrationCheck({
        configPath: resolve(configPath ?? DEFAULT_CONFIG),
        repoRoot,
      });
      return toolJson(agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'validate_config',
  'Parse and validate prodverdict.yml without running checks.',
  {
    configPath: configPathSchema,
  },
  async ({ configPath }) => {
    try {
      const path = resolve(configPath ?? DEFAULT_CONFIG);
      const cfg = parseConfigFile(path);
      return toolJson({
        valid: true,
        contracts: cfg.contracts.map((c) => ({ type: c.type })),
      });
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'bootstrap_prodverdict',
  'Non-interactive first-run bootstrap for AI agents: detect stack, write prodverdict.yml, ' +
    'scheduled workflow, Cursor MCP, agent rule, and agent skills. Optionally wire env from .env.local/.env. ' +
    'Returns agent JSON with filesWritten, missing credentials, and nextSteps.',
  {
    stack: z
      .string()
      .optional()
      .describe('Stack template (e.g. nextjs-stripe). Auto-detected when omitted.'),
    repoRoot: repoRootSchema,
    fromEnv: z
      .boolean()
      .optional()
      .describe('Read STRIPE_SECRET_KEY / DATABASE_URL from .env.local and .env (default true)'),
    skipWorkflow: z.boolean().optional().describe('Skip writing GitHub Actions workflow'),
    force: z.boolean().optional().describe('Overwrite existing config, workflow, MCP, and rule files'),
  },
  async ({ stack, repoRoot, fromEnv, skipWorkflow, force }) => {
    try {
      const result = await runSetupNonInteractive({
        repoRoot: repoRoot ? resolve(repoRoot) : process.cwd(),
        stack,
        fromEnv: fromEnv !== false,
        skipWorkflow: skipWorkflow ?? false,
        force: force ?? false,
      });
      return toolJson(result.agent);
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  'suggest_fix',
  'Extract fix suggestions from ProdVerdict findings. Returns deduplicated fix instructions ' +
    'from access, config, or migration checks. No LLM is used.',
  {
    findings: z
      .array(
        z.object({
          contract: z.string(),
          severity: z.enum(['high', 'medium', 'low']),
          entity: z.string(),
          message: z.string(),
          fix: z.string().optional(),
        }),
      )
      .describe('Findings from any check_* tool output'),
  },
  async ({ findings }) => toolJson(buildSuggestFixOutput(findings)),
);

registerPrompts(server, 'local');
registerResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${String(err)}\n`);
  process.exit(1);
});
