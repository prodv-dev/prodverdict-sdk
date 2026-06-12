import { Command } from 'commander';
import {
  parseConfigFile,
  isProdVerdictError,
  toAgentCheckOutput,
  toAgentAggregateOutput,
  type CheckResult,
} from '@prodverdict/engine';
import { resolve } from 'path';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';
import {
  writeInitConfig,
  writeMcpConfig,
  writeRemoteMcpConfig,
  writeCursorRule,
  type InitStack,
} from './init-config.js';
import { buildRemoteMcpJson } from './mcp-config.js';
import { runDoctorCli, formatDoctorText } from './doctor-cli.js';

const program = new Command();

program
  .name('prodverdict')
  .description('Deterministic production contract verification for AI-assisted SaaS')
  .version('0.8.0');

program
  .command('check [contract]')
  .description('Run contract checks: access (default), config, migration, or all. Use --format json|agent for machine-readable output.')
  .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
  .option('-f, --format <format>', 'Output format: text, json, or agent', 'text')
  .option('--fixtures', 'Use fixture JSON from fixtures/ instead of live credentials')
  .option('--fixtures-dir <path>', 'Directory containing stripe/ and db/ fixture JSON')
  .option('--fixtures-stripe [dir]', 'Use live Postgres + Stripe fixture JSON from dir (default: scenarios/pass next to config)')
  .option('--strict', 'Exit with code 1 on warn verdict (medium/low findings only)')
  .option('--repo-root <path>', 'Repo root for source scanning (config contract; default: cwd)')
  .option('--upload', 'Upload JSON result to PRODVERDICT_API_URL (requires API key env vars)')
  .action(async (contract: string | undefined, options: { config: string; format: string; fixtures?: boolean; fixturesDir?: string; fixturesStripe?: boolean | string; strict?: boolean; repoRoot?: string; upload?: boolean }) => {
    try {
      const format = parseOutputFormat(options.format);
      const fixturesStripeDir =
        typeof options.fixturesStripe === 'string'
          ? options.fixturesStripe
          : options.fixturesStripe
            ? undefined
            : undefined;
      const { result, exitCode } = await runCheck({
        config: options.config,
        contract,
        format,
        fixtures: options.fixtures,
        fixturesDir: options.fixturesDir,
        fixturesStripe: Boolean(options.fixturesStripe),
        fixturesStripeDir,
        strict: options.strict,
        repoRoot: options.repoRoot,
        upload: options.upload,
      });

      writeCheckOutput(result, format, exitCode, options.strict ?? false);
      process.exit(exitCode);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('doctor')
  .description('Diagnose prodverdict.yml and required credentials without running full contract checks.')
  .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
  .option('-f, --format <format>', 'Output format: text, json, or agent', 'text')
  .option('--repo-root <path>', 'Repo root for config contract checks (default: cwd)')
  .option('--skip-connectivity', 'Skip live Stripe/Paddle/Postgres connectivity pings')
  .action(async (options: { config: string; format: string; repoRoot?: string; skipConnectivity?: boolean }) => {
    try {
      const format = parseOutputFormat(options.format);
      const { result, exitCode } = await runDoctorCli({
        config: options.config,
        format,
        repoRoot: options.repoRoot,
        skipConnectivity: options.skipConnectivity,
      });

      if (format === 'json' || format === 'agent') {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        process.stdout.write(formatDoctorText(result as import('@prodverdict/engine').DoctorResult));
      }

      process.exit(exitCode);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('init')
  .description('Create prodverdict.yml from a stack template.')
  .option('-s, --stack <stack>', 'Template: nextjs-stripe, supabase-stripe, paddle-stripe, rails-stripe', 'nextjs-stripe')
  .option('-o, --output <path>', 'Output file', 'prodverdict.yml')
  .option('--access-only', 'Omit config contract block (access contract only)')
  .option('--mcp', 'Also write .cursor/mcp.json for local MCP checks')
  .option('--remote-mcp', 'Also merge prodverdict-remote into .cursor/mcp.json (hosted MCP)')
  .option('--project-id <id>', 'Project UUID for remote MCP headers')
  .option('--api-key <key>', 'API key (pv_...) for remote MCP headers')
  .option('--cursor-rule', 'Also write .cursor/rules/prodverdict-agent.mdc')
  .action((options: {
    stack: string;
    output: string;
    accessOnly?: boolean;
    mcp?: boolean;
    remoteMcp?: boolean;
    projectId?: string;
    apiKey?: string;
    cursorRule?: boolean;
  }) => {
    const stacks: InitStack[] = ['nextjs-stripe', 'supabase-stripe', 'paddle-stripe', 'rails-stripe'];
    const stack = options.stack as InitStack;
    if (!stacks.includes(stack)) {
      handleError(
        Object.assign(new Error(`Unknown stack "${options.stack}". Use: ${stacks.join(', ')}`), {
          code: 'CONFIG_INVALID' as const,
        }),
      );
    }
    try {
      const path = writeInitConfig(process.cwd(), stack, options.output, {
        includeConfig: !options.accessOnly,
      });
      process.stdout.write(`✔ Wrote ${path}\n`);
      if (options.mcp) {
        const mcpPath = writeMcpConfig(process.cwd(), stack);
        process.stdout.write(`✔ Wrote ${mcpPath}\n`);
      }
      if (options.remoteMcp) {
        const remoteInput: { projectId?: string; apiKey?: string } = {};
        if (options.projectId) remoteInput.projectId = options.projectId;
        if (options.apiKey) remoteInput.apiKey = options.apiKey;
        const remotePath = writeRemoteMcpConfig(process.cwd(), remoteInput);
        process.stdout.write(`✔ Wrote remote MCP config to ${remotePath}\n`);
      }
      if (options.cursorRule) {
        const rulePath = writeCursorRule(process.cwd());
        process.stdout.write(`✔ Wrote ${rulePath}\n`);
      }
      process.exit(0);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('remote-mcp')
  .description('Print Cursor remote MCP JSON (prodverdict.com/api/mcp).')
  .option('--print', 'Print JSON to stdout')
  .option('--project-id <id>', 'Project UUID', 'your-project-uuid')
  .option('--api-key <key>', 'API key (pv_...)', 'pv_...')
  .action((options: { print?: boolean; projectId: string; apiKey: string }) => {
    const json = buildRemoteMcpJson({
      projectId: options.projectId,
      apiKey: options.apiKey,
    });
    if (options.print !== false) {
      process.stdout.write(JSON.stringify(json, null, 2) + '\n');
    }
    process.exit(0);
  });

program
  .command('validate')
  .description('Parse and validate prodverdict.yml without running checks.')
  .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
  .option('-f, --format <format>', 'Output format: text or json', 'text')
  .action(async (options: { config: string; format: string }) => {
    try {
      const cfg = parseConfigFile(resolve(options.config));
      const count = cfg.contracts.length;
      if (options.format === 'json') {
        process.stdout.write(
          JSON.stringify(
            {
              valid: true,
              contracts: cfg.contracts.map((c) => ({ type: c.type })),
            },
            null,
            2,
          ) + '\n',
        );
      } else {
        process.stdout.write(`✔ prodverdict.yml is valid — ${count} contract(s) defined.\n`);
      }
      process.exit(0);
    } catch (err) {
      if (options.format === 'json' && isProdVerdictError(err)) {
        process.stdout.write(
          JSON.stringify({ valid: false, error: err.message, code: err.code }, null, 2) + '\n',
        );
        process.exit(2);
      }
      handleError(err);
    }
  });

function parseOutputFormat(format: string): 'text' | 'json' | 'agent' {
  if (format === 'json' || format === 'agent') return format;
  return 'text';
}

function writeCheckOutput(
  result: CheckResult | import('./run-check.js').AggregateCheckOutput,
  format: 'text' | 'json' | 'agent',
  exitCode: number,
  strict: boolean,
): void {
  if (format === 'agent') {
    if ('results' in result) {
      const agent = toAgentAggregateOutput(
        result.verdict,
        result.findings,
        result.evaluatedAt,
        result.results,
        exitCode as 0 | 1,
        strict,
      );
      process.stdout.write(JSON.stringify(agent, null, 2) + '\n');
    } else {
      const agent = toAgentCheckOutput(result, exitCode as 0 | 1, strict);
      process.stdout.write(JSON.stringify(agent, null, 2) + '\n');
    }
    return;
  }

  if (format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  process.stdout.write(formatTextResult(result) + '\n');
}

function handleError(err: unknown): never {
  if (isProdVerdictError(err)) {
    process.stderr.write(`Error [${err.code}]: ${err.message}\n`);
    process.exit(2);
  }
  if (err instanceof Error) {
    process.stderr.write(`Unexpected error: ${err.message}\n`);
  } else {
    process.stderr.write(`Unexpected error: ${String(err)}\n`);
  }
  process.exit(2);
}

program.parse(process.argv);
