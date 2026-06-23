import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import {
  isPaddleStack,
  type StackTemplate,
  STACK_META,
  fixtureExampleDir,
} from './stacks.js';
import { runCheck } from './run-check.js';
import { formatTextResult } from './format/text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_STACKS: StackTemplate[] = ['nextjs-stripe', 'paddle-stripe'];

export function resolveDemoPaths(stack: StackTemplate): {
  configPath: string;
  fixturesDir: string;
} {
  const exampleDir = fixtureExampleDir(stack);
  const base = join(__dirname, '..', 'demo', exampleDir);
  return {
    configPath: join(base, 'prodverdict.yml'),
    fixturesDir: join(base, 'scenarios', 'fail-revenue-leak'),
  };
}

export function isDemoStack(value: string): value is StackTemplate {
  return DEMO_STACKS.includes(value as StackTemplate);
}

export async function runDemo(stack: StackTemplate): Promise<number> {
  const meta = STACK_META[stack];
  const billing = isPaddleStack(stack) ? 'Paddle' : 'Stripe';
  const { configPath, fixturesDir } = resolveDemoPaths(stack);

  process.stdout.write(
    chalk.dim(`\nDemo: ${meta.label} revenue-leak scenario (fixture data, no credentials)\n\n`),
  );

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

function formatDemoFooter(stack: StackTemplate, billing: string): string {
  const lines = [
    '',
    chalk.dim('─'.repeat(42)),
    chalk.bold('This is a demo — your repo may have the same bug.'),
    `  ${billing} says paid; your app DB might disagree.`,
    '',
    'Run in your repo:',
    chalk.cyan(`  npx prodverdict init --stack ${stack} --mcp --cursor-rule`),
    '',
    'Or scan first (no credentials):',
    chalk.cyan('  npx prodverdict scan'),
    chalk.dim('─'.repeat(42)),
    '',
  ];
  return lines.join('\n');
}
