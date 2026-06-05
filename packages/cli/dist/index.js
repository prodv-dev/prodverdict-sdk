import { Command } from 'commander';
import { parseConfigFile, isProdVerdictError } from '@prodverdict/engine';
import { resolve } from 'path';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';
import { writeInitConfig } from './init-config.js';
const program = new Command();
program
    .name('prodverdict')
    .description('Deterministic production contract verification for AI-assisted SaaS')
    .version('0.5.0');
program
    .command('check [contract]')
    .description('Run contract checks: access (default), config, migration, or all. Use --format json for machine-readable output.')
    .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
    .option('-f, --format <format>', 'Output format: text or json', 'text')
    .option('--fixtures', 'Use fixture JSON from fixtures/ instead of live credentials')
    .option('--fixtures-dir <path>', 'Directory containing stripe/ and db/ fixture JSON')
    .option('--fixtures-stripe [dir]', 'Use live Postgres + Stripe fixture JSON from dir (default: scenarios/pass next to config)')
    .option('--strict', 'Exit with code 1 on warn verdict (medium/low findings only)')
    .option('--repo-root <path>', 'Repo root for source scanning (config contract; default: cwd)')
    .option('--upload', 'Upload JSON result to PRODVERDICT_API_URL (requires API key env vars)')
    .action(async (contract, options) => {
    try {
        const format = options.format === 'json' ? 'json' : 'text';
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
        if (format === 'json') {
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        }
        else {
            process.stdout.write(formatTextResult(result) + '\n');
        }
        process.exit(exitCode);
    }
    catch (err) {
        handleError(err);
    }
});
program
    .command('init')
    .description('Create prodverdict.yml from a stack template.')
    .option('-s, --stack <stack>', 'Template: nextjs-stripe, supabase-stripe, paddle-stripe, rails-stripe', 'nextjs-stripe')
    .option('-o, --output <path>', 'Output file', 'prodverdict.yml')
    .option('--access-only', 'Omit config contract block (access contract only)')
    .action((options) => {
    const stacks = ['nextjs-stripe', 'supabase-stripe', 'paddle-stripe', 'rails-stripe'];
    const stack = options.stack;
    if (!stacks.includes(stack)) {
        handleError(Object.assign(new Error(`Unknown stack "${options.stack}". Use: ${stacks.join(', ')}`), {
            code: 'CONFIG_INVALID',
        }));
    }
    try {
        const path = writeInitConfig(process.cwd(), stack, options.output, {
            includeConfig: !options.accessOnly,
        });
        process.stdout.write(`✔ Wrote ${path}\n`);
        process.exit(0);
    }
    catch (err) {
        handleError(err);
    }
});
program
    .command('validate')
    .description('Parse and validate prodverdict.yml without running checks.')
    .option('-c, --config <path>', 'Path to prodverdict.yml', './prodverdict.yml')
    .action(async (options) => {
    try {
        const cfg = parseConfigFile(resolve(options.config));
        const count = cfg.contracts.length;
        process.stdout.write(`✔ prodverdict.yml is valid — ${count} contract(s) defined.\n`);
        process.exit(0);
    }
    catch (err) {
        handleError(err);
    }
});
function handleError(err) {
    if (isProdVerdictError(err)) {
        process.stderr.write(`Error [${err.code}]: ${err.message}\n`);
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