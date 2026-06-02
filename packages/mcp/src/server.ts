import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve } from 'path';
import {
  parseConfigFile,
  evaluateAccess,
  aggregateVerdict,
  createLiveBillingReader,
  createLivePostgresReader,
  isProdVerdictError,
  type CheckResult,
  type Finding,
} from '@prodverdict/engine';

const DEFAULT_CONFIG = './prodverdict.yml';

const server = new McpServer({
  name: 'prodverdict',
  version: '0.0.1',
});

/**
 * Run the access contract check and return a CheckResult.
 * Reads live Stripe and database using credentials from env vars in prodverdict.yml.
 */
server.tool(
  'check_access_contract',
  'Run the ProdVerdict access contract check. Compares Stripe subscription state against the app database ' +
    'and returns deterministic findings. Use this before creating a pull request that touches billing, ' +
    'subscription handling, or access-control logic.',
  {
    configPath: z
      .string()
      .optional()
      .describe('Path to prodverdict.yml. Defaults to ./prodverdict.yml'),
  },
  async ({ configPath }) => {
    try {
      const path = resolve(configPath ?? DEFAULT_CONFIG);
      const cfg = parseConfigFile(path);
      const accessCfg = cfg.contracts.find((c) => c.type === 'access');
      if (!accessCfg) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'No access contract defined in prodverdict.yml.' }),
            },
          ],
          isError: true,
        };
      }

      const sources = {
        billing: createLiveBillingReader(accessCfg),
        database: createLivePostgresReader(accessCfg),
      };

      let findings;
      try {
        findings = await evaluateAccess(accessCfg, sources);
      } finally {
        await sources.database.close?.();
      }
      const verdict = aggregateVerdict(findings);

      const result: CheckResult = {
        contract: 'access',
        verdict,
        findings,
        evaluatedAt: new Date().toISOString(),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = isProdVerdictError(err)
        ? `[${err.code}] ${err.message}`
        : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
);

/**
 * Parse and validate prodverdict.yml without running checks.
 */
server.tool(
  'validate_config',
  'Parse and validate the prodverdict.yml file. Returns the parsed config on success or validation errors on failure. ' +
    'Use this to confirm the config is well-formed before running checks.',
  {
    configPath: z
      .string()
      .optional()
      .describe('Path to prodverdict.yml. Defaults to ./prodverdict.yml'),
  },
  async ({ configPath }) => {
    try {
      const path = resolve(configPath ?? DEFAULT_CONFIG);
      const cfg = parseConfigFile(path);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              valid: true,
              contracts: cfg.contracts.map((c) => ({ type: c.type })),
            }),
          },
        ],
      };
    } catch (err) {
      const message = isProdVerdictError(err)
        ? `[${err.code}] ${err.message}`
        : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ valid: false, error: message }) }],
        isError: true,
      };
    }
  },
);

/**
 * Return fix suggestions from a list of findings without running an LLM.
 * Extracts the deterministic fix strings embedded in each finding.
 */
server.tool(
  'suggest_fix',
  'Extract fix suggestions from a list of ProdVerdict findings. Returns unique, deduplicated fix instructions ' +
    'that an AI agent can apply to resolve access contract violations. No LLM is used — suggestions come ' +
    'directly from the contract definitions.',
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
      .describe('Array of findings from check_access_contract output'),
  },
  async ({ findings }) => {
    const fixes = (findings as Finding[])
      .map((f) => f.fix)
      .filter((fix): fix is string => Boolean(fix));

    const unique = [...new Set(fixes)];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            fixes: unique,
            count: unique.length,
            note: 'These are deterministic fix hints from the contract definition. Apply them and re-run check_access_contract.',
          }),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${String(err)}\n`);
  process.exit(1);
});
