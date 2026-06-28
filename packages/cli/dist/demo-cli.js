import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { isPaddleStack, STACK_META, fixtureExampleDir, } from './stacks.js';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_STACKS = ['nextjs-stripe', 'paddle-stripe'];
export function resolveDemoPaths(stack) {
    const exampleDir = fixtureExampleDir(stack);
    const base = join(__dirname, '..', 'demo', exampleDir);
    return {
        configPath: join(base, 'prodverdict.yml'),
        fixturesDir: join(base, 'scenarios', 'fail-revenue-leak'),
    };
}
export function isDemoStack(value) {
    return DEMO_STACKS.includes(value);
}
export async function runDemo(stack) {
    const meta = STACK_META[stack];
    const billing = isPaddleStack(stack) ? 'Paddle' : 'Stripe';
    const { configPath, fixturesDir } = resolveDemoPaths(stack);
    process.stdout.write(chalk.dim(`\nDemo: ${meta.label} revenue-leak scenario (fixture data, no credentials)\n\n`));
    const { result, exitCode } = await runCheck({
        config: configPath,
        contract: 'access',
        format: 'text',
        fixtures: true,
        fixturesDir,
    });
    process.stdout.write(formatTextResult(result, { showInitCallout: false }));
    process.stdout.write(formatDemoFooter(stack, billing));
    return exitCode;
}
function formatDemoFooter(stack, billing) {
    const lines = [
        '',
        chalk.dim('─'.repeat(42)),
        chalk.bold('This is a demo — your repo may have the same bug.'),
        `  ${billing} says paid; your app DB might disagree.`,
        '',
        'Try it on your real Stripe + Postgres in ~5 minutes:',
        chalk.cyan('  npx prodverdict setup'),
        chalk.dim('  (interactive wizard — billing key, DB role, scheduled workflow)'),
        '',
        chalk.dim('─'.repeat(42)),
        '',
    ];
    return lines.join('\n');
}
//# sourceMappingURL=demo-cli.js.map