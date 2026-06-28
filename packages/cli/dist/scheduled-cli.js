import { CLI_VERSION, ACTION_TAG } from './version.js';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import chalk from 'chalk';
const DB_ENV_LINE = '          DATABASE_URL: ${{ secrets.DATABASE_URL }}';
const STRIPE_ENV_LINE = '          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}';
const PADDLE_ENV_LINE = '          PADDLE_API_KEY: ${{ secrets.PADDLE_API_KEY }}';
const PADDLE_ENV_ENV_LINE = '          PADDLE_ENVIRONMENT: production';
const SLACK_INPUT_LINE = '          slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}';
const OPTIONAL_UPLOAD_LINES = [
    '          # Optional — upload runs to your Pro Cloud dashboard:',
    '          # PRODVERDICT_API_URL: https://prodverdict.com',
    '          # PRODVERDICT_API_KEY: ${{ secrets.PRODVERDICT_API_KEY }}',
    '          # PRODVERDICT_PROJECT_ID: ${{ secrets.PRODVERDICT_PROJECT_ID }}',
].join('\n');
export function buildScheduledWorkflow(opts) {
    const frequency = opts.frequency === 'daily' ? 'daily' : 'hourly';
    const contract = opts.contract === 'all' ? 'all' : 'access';
    const actionTag = opts.actionTag ?? ACTION_TAG;
    const usePaddle = opts.paddle === true;
    const includeSlack = opts.slack !== false;
    const cronLine = frequency === 'hourly' ? `cron: '0 * * * *'` : `cron: '0 6 * * *'`;
    const billingEnv = usePaddle
        ? [PADDLE_ENV_LINE, PADDLE_ENV_ENV_LINE].join('\n')
        : STRIPE_ENV_LINE;
    const withLines = [];
    if (includeSlack)
        withLines.push(SLACK_INPUT_LINE);
    withLines.push('          contract: ' + contract);
    const withBlock = withLines.join('\n');
    const headerComment = includeSlack
        ? '# ProdVerdict ' + frequency + ' ' + contract + ' check with Slack alert on fail'
        : '# ProdVerdict ' + frequency + ' ' + contract + ' check';
    return [
        '# .github/workflows/prodverdict-' + frequency + '.yml',
        headerComment,
        '# Billing drift is a scheduled check, not a PR gate — drift only exists after',
        '# the webhook fires in production. Run this on a schedule.',
        "name: ProdVerdict " + frequency,
        '',
        'on:',
        '  schedule:',
        '    - ' + cronLine,
        '  workflow_dispatch:',
        '',
        'jobs:',
        '  prodverdict-' + contract + ':',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '',
        '      - uses: prodv-dev/prodverdict-action@' + actionTag,
        '        with:',
        withBlock,
        '        env:',
        DB_ENV_LINE,
        billingEnv,
        OPTIONAL_UPLOAD_LINES,
        '',
    ].join('\n');
}
export function registerScheduledCommand(program) {
    program
        .command('scheduled')
        .description('Print a recommended GitHub Actions workflow for scheduled drift detection. Access is a scheduled check, not a PR gate.')
        .option('-f, --frequency <freq>', 'Schedule frequency: hourly (default) or daily', 'hourly')
        .option('--no-slack', 'Omit slack_webhook_url from the workflow')
        .option('-c, --contract <contract>', 'Contract to schedule: access (default) or all', 'access')
        .option('--paddle', 'Use Paddle billing env instead of Stripe')
        .option('--action-tag <tag>', 'Override the prodverdict-action tag')
        .option('--install', 'Write the workflow file to .github/workflows/ instead of printing to stdout')
        .option('-o, --output <path>', 'Output file path when --install is used (default: .github/workflows/prodverdict-<freq>.yml)')
        .action((options) => {
        const freq = options.frequency ?? 'hourly';
        if (freq !== 'hourly' && freq !== 'daily') {
            process.stderr.write('Error: --frequency must be "hourly" or "daily" (got "' + freq + '")\n');
            process.exit(2);
        }
        const yaml = buildScheduledWorkflow({
            frequency: freq,
            slack: options.slack,
            contract: options.contract,
            actionTag: options.actionTag,
            paddle: options.paddle,
        });
        if (options.install) {
            const outputPath = resolve(options.output ?? '.github/workflows/prodverdict-' + freq + '.yml');
            const dir = dirname(outputPath);
            if (existsSync(outputPath)) {
                process.stderr.write(chalk.yellow('File already exists: ' + outputPath + '\nUse a different --output path or delete the file first.\n'));
                process.exit(2);
            }
            mkdirSync(dir, { recursive: true });
            writeFileSync(outputPath, yaml, 'utf8');
            process.stdout.write(chalk.green('✔ Wrote ' + outputPath + '\n') +
                chalk.dim('Commit it and set these repo secrets:\n') +
                chalk.dim('  STRIPE_SECRET_KEY, DATABASE_URL, SLACK_WEBHOOK_URL\n'));
            process.exit(0);
        }
        process.stdout.write(yaml);
        process.exit(0);
    });
}
// Re-export for tests
export { CLI_VERSION };
//# sourceMappingURL=scheduled-cli.js.map