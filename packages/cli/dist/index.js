import { Command } from 'commander';
import chalk from 'chalk';
import { parseConfigFile, isProdVerdictError, toAgentCheckOutput, toAgentAggregateOutput, } from '@prodverdict/engine';
import { resolve } from 'path';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';
import { writeInitConfig, writeMcpConfig, writeRemoteMcpConfig, writeCursorRule, } from './init-config.js';
import { buildRemoteMcpJson } from './mcp-config.js';
import { runDoctorCli, formatDoctorText } from './doctor-cli.js';
import { STACK_ORDER, formatStackListTable, initNextSteps, isStackTemplate, } from './stacks.js';
import { runDemo, isDemoStack } from './demo-cli.js';
import { resolveInitStack } from './detect-stack.js';
import { formatScanResult, scanRepo } from './scan-repo.js';
import { registerScheduledCommand } from './scheduled-cli.js';
import { registerSetupCommand } from './setup-cli.js';
import { registerStatusCommand } from './status-cli.js';
import { CLI_VERSION } from './version.js';
if (process.env.NO_COLOR !== undefined) {
    chalk.level = 0;
}
const program = new Command();
program
    .name('prodverdict')
    .description('Deterministic production contract verification for AI-assisted SaaS')
    .version(CLI_VERSION);
program
    .command('demo')
    .description('Run the revenue-leak access fixture demo — no credentials, no git clone.')
    .option('-s, --stack <stack>', 'Demo stack: nextjs-stripe (default) or paddle-stripe')
    .action(async (options) => {
    const stack = options.stack ?? 'nextjs-stripe';
    if (!isDemoStack(stack)) {
        handleError(Object.assign(new Error(`Unknown demo stack "${stack}". Supported: nextjs-stripe, paddle-stripe.`), { code: 'CONFIG_INVALID' }));
    }
    try {
        const exitCode = await runDemo(stack);
        process.exit(exitCode);
    }
    catch (err) {
        handleError(err);
    }
});
program
    .command('scan')
    .description('Scan the repo for applicable contracts — no credentials required.')
    .option('--repo-root <path>', 'Repo root to scan (default: cwd)')
    .action((options) => {
    const cwd = resolve(options.repoRoot ?? process.cwd());
    process.stdout.write(formatScanResult(scanRepo(cwd)));
    process.exit(0);
});
program
    .command('check [contract]')
    .description('Run contract checks: access (default), config, migration, boundary, webhook, restore, entitlements-migration, or all. Use --format json|agent for machine-readable output.')
    .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
    .option('-f, --format <format>', 'Output format: text, json, or agent', 'text')
    .option('--fixtures', 'Use fixture JSON from fixtures/ instead of live credentials')
    .option('--fixtures-dir <path>', 'Directory containing stripe/ and db/ fixture JSON')
    .option('--fixtures-stripe [dir]', 'Use live Postgres + Stripe fixture JSON from dir (default: scenarios/pass next to config)')
    .option('--strict', 'Exit with code 1 on warn verdict (medium/low findings only)')
    .option('--repo-root <path>', 'Repo root for source scanning (config contract; default: cwd)')
    .option('--upload', 'Upload JSON result to PRODVERDICT_API_URL (requires API key env vars)')
    .action(async (contract, options) => {
    try {
        const format = parseOutputFormat(options.format);
        const fixturesStripeDir = typeof options.fixturesStripe === 'string'
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
    }
    catch (err) {
        handleError(err, options.config);
    }
});
program
    .command('doctor')
    .description('Diagnose prodverdict.yml and required credentials without running full contract checks.')
    .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
    .option('-f, --format <format>', 'Output format: text, json, or agent', 'text')
    .option('--repo-root <path>', 'Repo root for config contract checks (default: cwd)')
    .option('--skip-connectivity', 'Skip live Stripe/Paddle/Postgres connectivity pings')
    .action(async (options) => {
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
        }
        else {
            process.stdout.write(formatDoctorText(result));
        }
        process.exit(exitCode);
    }
    catch (err) {
        handleError(err, options.config);
    }
});
program
    .command('init')
    .description('Create prodverdict.yml from a stack template.')
    .option('-s, --stack <stack>', `Template (${STACK_ORDER.join(', ')}); auto-detected when omitted`)
    .option('-o, --output <path>', 'Output file', 'prodverdict.yml')
    .option('--list-stacks', 'Print available stack templates and exit')
    .option('--access-only', 'Omit config contract block (access contract only)')
    .option('--mcp', 'Also write .cursor/mcp.json for local MCP checks')
    .option('--remote-mcp', 'Also merge prodverdict-remote into .cursor/mcp.json (hosted MCP)')
    .option('--project-id <id>', 'Project UUID for remote MCP headers')
    .option('--api-key <key>', 'API key (pv_...) for remote MCP headers')
    .option('--cursor-rule', 'Also write .cursor/rules/prodverdict-agent.mdc')
    .action(async (options) => {
    if (options.listStacks) {
        process.stdout.write(`${formatStackListTable()}\n`);
        process.exit(0);
    }
    const { stack: resolvedStack, detected } = await resolveInitStack(process.cwd(), options.stack);
    if (!isStackTemplate(resolvedStack)) {
        handleError(Object.assign(new Error(`Unknown stack "${resolvedStack}". Run: prodverdict init --list-stacks`), { code: 'CONFIG_INVALID' }), options.output);
    }
    const stack = resolvedStack;
    if (!options.stack && !detected) {
        process.stdout.write('No stack detected — using nextjs-stripe. Pass --stack to override.\n');
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
            const remoteInput = {};
            if (options.projectId)
                remoteInput.projectId = options.projectId;
            if (options.apiKey)
                remoteInput.apiKey = options.apiKey;
            const remotePath = writeRemoteMcpConfig(process.cwd(), remoteInput);
            process.stdout.write(`✔ Wrote remote MCP config to ${remotePath}\n`);
        }
        if (options.cursorRule) {
            const rulePath = writeCursorRule(process.cwd());
            process.stdout.write(`✔ Wrote ${rulePath}\n`);
        }
        process.stdout.write('\nNext:\n');
        for (const line of initNextSteps(stack, options.output)) {
            process.stdout.write(`  ${line}\n`);
        }
        process.stdout.write('\n');
        process.exit(0);
    }
    catch (err) {
        handleError(err, options.output);
    }
});
program
    .command('remote-mcp')
    .description('Print Cursor remote MCP JSON (prodverdict.com/api/mcp).')
    .option('--print', 'Print JSON to stdout')
    .option('--project-id <id>', 'Project UUID', 'your-project-uuid')
    .option('--api-key <key>', 'API key (pv_...)', 'pv_...')
    .action((options) => {
    const json = buildRemoteMcpJson({
        projectId: options.projectId,
        apiKey: options.apiKey,
    });
    if (options.print !== false) {
        process.stdout.write(JSON.stringify(json, null, 2) + '\n');
    }
    process.exit(0);
});
registerScheduledCommand(program);
registerSetupCommand(program);
registerStatusCommand(program);
program
    .command('validate')
    .description('Parse and validate prodverdict.yml without running checks.')
    .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
    .option('-f, --format <format>', 'Output format: text or json', 'text')
    .action(async (options) => {
    try {
        const cfg = parseConfigFile(resolve(options.config));
        const count = cfg.contracts.length;
        if (options.format === 'json') {
            process.stdout.write(JSON.stringify({
                valid: true,
                contracts: cfg.contracts.map((c) => ({ type: c.type })),
            }, null, 2) + '\n');
        }
        else {
            process.stdout.write(`✔ prodverdict.yml is valid — ${count} contract(s) defined.\n`);
        }
        process.exit(0);
    }
    catch (err) {
        if (options.format === 'json' && isProdVerdictError(err)) {
            process.stdout.write(JSON.stringify({ valid: false, error: err.message, code: err.code }, null, 2) + '\n');
            process.exit(2);
        }
        handleError(err, options.config);
    }
});
function parseOutputFormat(format) {
    if (format === 'json' || format === 'agent')
        return format;
    return 'text';
}
function writeCheckOutput(result, format, exitCode, strict) {
    if (format === 'agent') {
        if ('results' in result) {
            const agent = toAgentAggregateOutput(result.verdict, result.findings, result.evaluatedAt, result.results, exitCode, strict);
            process.stdout.write(JSON.stringify(agent, null, 2) + '\n');
        }
        else {
            const agent = toAgentCheckOutput(result, exitCode, strict);
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
function handleError(err, configPath = './prodverdict.yml') {
    if (isProdVerdictError(err)) {
        process.stderr.write(`Error [${err.code}]: ${err.message}\n`);
        if (err.code === 'CONFIG_INVALID' || err.code === 'CONNECTOR_ERROR') {
            process.stderr.write(`Run: npx prodverdict doctor --config ${configPath}\n`);
        }
        process.exit(2);
    }
    if (err instanceof Error) {
        process.stderr.write(`Unexpected error: ${err.message}\n`);
    }
    else {
        process.stderr.write(`Unexpected error: ${String(err)}\n`);
    }
    process.exit(2);
}
program.parse(process.argv);
//# sourceMappingURL=index.js.map