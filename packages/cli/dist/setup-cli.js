import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolveInitStack } from './detect-stack.js';
import { writeInitConfig, writeMcpConfig, writeCursorRule, } from './init-config.js';
import { isStackTemplate, STACK_META } from './stacks.js';
import { runBillingKeyHelper } from './setup/billing-key-helper.js';
import { runPostgresRoleHelper } from './setup/postgres-role-helper.js';
import { promptYesNo, divider } from './setup/prompt.js';
import { runDoctorCli, formatDoctorText } from './doctor-cli.js';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';
import { buildScheduledWorkflow } from './scheduled-cli.js';
import { CLI_VERSION } from './version.js';
export async function runSetup(opts) {
    printHeader();
    // Step 1: detect or confirm stack
    const stack = await resolveStack(opts.stack);
    if (!isStackTemplate(stack)) {
        process.stderr.write(chalk.red('Could not resolve a stack template. Pass --stack explicitly.\n'));
        return 2;
    }
    const meta = STACK_META[stack];
    console.log();
    console.log(chalk.dim(divider(60)));
    console.log(chalk.bold('Stack: ') + meta.label);
    console.log(chalk.dim(meta.hint));
    console.log(chalk.dim(divider(60)));
    const state = {
        stack,
        configPath: resolve(opts.output ?? 'prodverdict.yml'),
        workflowInstalled: false,
        mcpInstalled: false,
        cursorRuleInstalled: false,
        doctorOk: false,
        firstCheckRan: false,
    };
    // Step 2: billing key helper
    if (!opts.skipBilling) {
        const provider = meta.billing;
        console.log();
        console.log(chalk.bold.underline('Step 1 of 5: Billing credentials'));
        await runBillingKeyHelper(provider);
    }
    // Step 3: database role helper
    if (!opts.skipDatabase) {
        console.log();
        console.log(chalk.bold.underline('Step 2 of 5: Database read-only role'));
        await runPostgresRoleHelper(stack);
    }
    // Step 4: write prodverdict.yml
    console.log();
    console.log(chalk.bold.underline('Step 3 of 5: Write prodverdict.yml'));
    const configAlreadyExists = existsSync(state.configPath);
    let writeConfig = true;
    if (configAlreadyExists) {
        writeConfig = await promptYesNo(`  prodverdict.yml already exists at ${state.configPath}. Overwrite?`, false);
    }
    if (writeConfig) {
        const path = writeInitConfig(process.cwd(), stack, state.configPath);
        console.log(chalk.green(`  ✔ Wrote ${path}`));
    }
    else {
        console.log(chalk.dim('  Skipped — keeping existing prodverdict.yml'));
    }
    // Step 5: run doctor + first check
    console.log();
    console.log(chalk.bold.underline('Step 4 of 5: Verify credentials (doctor)'));
    try {
        const { result, exitCode } = await runDoctorCli({
            config: state.configPath,
            format: 'text',
            skipConnectivity: false,
        });
        process.stdout.write(formatDoctorText(result));
        state.doctorOk = exitCode === 0;
        if (state.doctorOk) {
            console.log();
            console.log(chalk.bold.underline('Running first access check...'));
            try {
                const { result: checkResult, exitCode: checkExit } = await runCheck({
                    config: state.configPath,
                    contract: 'access',
                    format: 'text',
                });
                process.stdout.write(formatTextResult(checkResult) + '\n');
                state.firstCheckRan = true;
                if (checkExit !== 0 && checkExit !== 1) {
                    // exit 2 = config/credential error — let user proceed but warn
                    console.log(chalk.yellow('  ⚠ First check could not run — fix the issues above and re-run setup.'));
                }
            }
            catch (err) {
                console.log(chalk.yellow('  ⚠ First check failed to run: ' +
                    (err instanceof Error ? err.message : String(err))));
            }
        }
        else {
            console.log(chalk.yellow('\n  ⚠ Doctor found issues. Fix the env vars above and re-run setup, or continue to install the workflow anyway.'));
        }
    }
    catch (err) {
        console.log(chalk.yellow('  ⚠ Doctor could not run: ' + (err instanceof Error ? err.message : String(err))));
    }
    // Step 6: GitHub Actions workflow
    if (!opts.skipWorkflow) {
        console.log();
        console.log(chalk.bold.underline('Step 5 of 5: Schedule drift detection (GitHub Actions)'));
        const installWf = await promptYesNo('  Write a scheduled GitHub Actions workflow for hourly drift detection?', true);
        if (installWf) {
            const wfPath = resolve('.github/workflows/prodverdict-hourly.yml');
            const dir = resolve('.github/workflows');
            try {
                mkdirSync(dir, { recursive: true });
                if (existsSync(wfPath)) {
                    const overwrite = await promptYesNo(`  ${wfPath} already exists. Overwrite?`, false);
                    if (!overwrite) {
                        console.log(chalk.dim('  Skipped — keeping existing workflow file'));
                    }
                    else {
                        writeFileSync(wfPath, buildScheduledWorkflow({ frequency: 'hourly' }), 'utf8');
                        state.workflowInstalled = true;
                        console.log(chalk.green(`  ✔ Wrote ${wfPath}`));
                    }
                }
                else {
                    writeFileSync(wfPath, buildScheduledWorkflow({ frequency: 'hourly' }), 'utf8');
                    state.workflowInstalled = true;
                    console.log(chalk.green(`  ✔ Wrote ${wfPath}`));
                }
                if (state.workflowInstalled) {
                    console.log(chalk.dim('  Commit it, then set these repo secrets: STRIPE_SECRET_KEY, DATABASE_URL, SLACK_WEBHOOK_URL'));
                }
            }
            catch (err) {
                console.log(chalk.yellow('  ⚠ Could not write workflow file: ' +
                    (err instanceof Error ? err.message : String(err))));
            }
        }
        else {
            console.log(chalk.dim('  Skipped — print it later with: npx prodverdict scheduled --frequency hourly'));
        }
    }
    // Cursor MCP + agent rule (optional bonus)
    if (!opts.skipMcp) {
        console.log();
        const installMcp = await promptYesNo('  Also write a Cursor MCP config so your AI agent can run checks locally?', true);
        if (installMcp) {
            try {
                const mcpPath = writeMcpConfig(process.cwd(), stack);
                state.mcpInstalled = true;
                console.log(chalk.green(`  ✔ Wrote ${mcpPath}`));
            }
            catch (err) {
                console.log(chalk.yellow('  ⚠ Could not write MCP config: ' +
                    (err instanceof Error ? err.message : String(err))));
            }
        }
    }
    if (!opts.skipCursorRule) {
        const installRule = await promptYesNo('  Also write a Cursor agent rule so your AI agent knows the contracts?', true);
        if (installRule) {
            try {
                const rulePath = writeCursorRule(process.cwd());
                state.cursorRuleInstalled = true;
                console.log(chalk.green(`  ✔ Wrote ${rulePath}`));
            }
            catch (err) {
                console.log(chalk.yellow('  ⚠ Could not write Cursor rule: ' +
                    (err instanceof Error ? err.message : String(err))));
            }
        }
    }
    printSummary(state);
    return 0;
}
async function resolveStack(explicit) {
    if (explicit) {
        if (!isStackTemplate(explicit)) {
            throw new Error(`Unknown stack "${explicit}". Run: prodverdict init --list-stacks`);
        }
        return explicit;
    }
    const { stack, detected } = await resolveInitStack(process.cwd(), undefined);
    if (detected) {
        const confirm = await promptYesNo(`  Detected stack: ${STACK_META[stack]?.label ?? stack}. Continue with this?`, true);
        if (confirm)
            return stack;
    }
    // Fallback: ask user to choose
    console.log(chalk.dim('  Pass --stack <template> to specify. Run: prodverdict init --list-stacks'));
    return stack;
}
function printHeader() {
    console.log();
    console.log(chalk.bold('ProdVerdict setup') + chalk.dim(` · v${CLI_VERSION}`));
    console.log(chalk.dim('Interactive first-run wizard. ~5 minutes. Press Ctrl+C at any time to bail.'));
    console.log(chalk.dim(divider(60)));
}
function printSummary(state) {
    console.log();
    console.log(chalk.dim(divider(60)));
    console.log(chalk.bold('Setup summary'));
    console.log();
    console.log(`  ${chalk.dim('Stack:')}              ${STACK_META[state.stack]?.label ?? state.stack}`);
    console.log(`  ${chalk.dim('prodverdict.yml:')}    ${existsSync(state.configPath) ? chalk.green('✓ ' + state.configPath) : chalk.red('✗ not written')}`);
    console.log(`  ${chalk.dim('Doctor:')}             ${state.doctorOk ? chalk.green('✓ passed') : chalk.yellow('⚠ had issues')}`);
    console.log(`  ${chalk.dim('First check:')}        ${state.firstCheckRan ? chalk.green('✓ ran') : chalk.dim('skipped')}`);
    console.log(`  ${chalk.dim('GitHub Actions:')}     ${state.workflowInstalled ? chalk.green('✓ .github/workflows/prodverdict-hourly.yml') : chalk.dim('not installed')}`);
    console.log(`  ${chalk.dim('Cursor MCP:')}         ${state.mcpInstalled ? chalk.green('✓ .cursor/mcp.json') : chalk.dim('not written')}`);
    console.log(`  ${chalk.dim('Cursor rule:')}        ${state.cursorRuleInstalled ? chalk.green('✓ .cursor/rules/prodverdict-agent.mdc') : chalk.dim('not written')}`);
    console.log();
    console.log(chalk.dim('Next:'));
    if (state.workflowInstalled) {
        console.log(`  ${chalk.cyan('git add .github/workflows/prodverdict-hourly.yml && git commit -m "Add ProdVerdict scheduled drift check"')}`);
        console.log(`  ${chalk.dim('Then set repo secrets: STRIPE_SECRET_KEY, DATABASE_URL, SLACK_WEBHOOK_URL')}`);
    }
    else {
        console.log(`  ${chalk.cyan('npx prodverdict scheduled --frequency hourly --install')}`);
    }
    console.log(`  ${chalk.cyan('npx prodverdict status')}  ${chalk.dim('# one-glance health check')}`);
    console.log();
}
export function registerSetupCommand(program) {
    program
        .command('setup')
        .description('Interactive first-run wizard: detect stack, set up billing + DB credentials, write config, install scheduled workflow, wire Cursor MCP. ~5 minutes, no docs required.')
        .option('-s, --stack <stack>', 'Stack template (skip auto-detect)')
        .option('-o, --output <path>', 'Output config path (default: ./prodverdict.yml)')
        .option('--skip-billing', 'Skip the billing key helper')
        .option('--skip-database', 'Skip the Postgres role helper')
        .option('--skip-workflow', 'Skip the GitHub Actions workflow install')
        .option('--skip-mcp', 'Skip the Cursor MCP config')
        .option('--skip-cursor-rule', 'Skip the Cursor agent rule')
        .action(async (options) => {
        try {
            const exitCode = await runSetup(options);
            process.exit(exitCode);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            process.stderr.write(chalk.red('Setup error: ' + msg + '\n'));
            process.exit(2);
        }
    });
}
//# sourceMappingURL=setup-cli.js.map