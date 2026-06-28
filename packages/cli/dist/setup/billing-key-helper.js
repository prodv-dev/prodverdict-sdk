import chalk from 'chalk';
import { pressEnterToContinue, divider } from './prompt.js';
/** Required Stripe restricted-key permissions for the Access contract. */
const STRIPE_PERMISSIONS = [
    'Customers → Read',
    'Subscriptions → Read',
    'Entitlements → Read (optional — only needed for entitlements-migration)',
];
/** Required Paddle API key scope. */
const PADDLE_SCOPE = 'subscription.read';
function printStripeHelper() {
    console.log();
    console.log(chalk.bold('Create a restricted Stripe key (read-only, free, ~30 seconds):'));
    console.log();
    console.log(`  1. Open ${chalk.cyan('https://dashboard.stripe.com/apikeys')}`);
    console.log('  2. Click "Create restricted key"');
    console.log('  3. Grant:');
    for (const p of STRIPE_PERMISSIONS) {
        console.log(`       ${p}`);
    }
    console.log('  4. Copy the key (starts with rk_live_... or rk_test_...)');
    console.log();
    console.log(chalk.dim('Export it in this terminal, then press Enter:'));
    console.log();
    console.log(`  ${chalk.cyan('export STRIPE_SECRET_KEY=rk_live_...')}`);
}
function printPaddleHelper() {
    console.log();
    console.log(chalk.bold('Create a Paddle API key (read-only, ~30 seconds):'));
    console.log();
    console.log(`  1. Open ${chalk.cyan('https://vendors.paddle.com/developer-tools/authentication')}`);
    console.log(`  2. Click "Generate API key"`);
    console.log(`  3. Scope: ${PADDLE_SCOPE} only`);
    console.log(`  4. Copy the key`);
    console.log();
    console.log(chalk.dim('Export it in this terminal, then press Enter:'));
    console.log();
    console.log(`  ${chalk.cyan('export PADDLE_API_KEY=...')}`);
    console.log(`  ${chalk.cyan('export PADDLE_ENVIRONMENT=production')}  ${chalk.dim('# or sandbox')}`);
}
/**
 * Print the billing-key helper for the chosen provider and wait for the env var.
 * If the env var is already set in process.env, skip the wait and return immediately.
 */
export async function runBillingKeyHelper(provider) {
    const envVar = provider === 'stripe' ? 'STRIPE_SECRET_KEY' : 'PADDLE_API_KEY';
    const alreadySet = Boolean(process.env[envVar]);
    if (provider === 'stripe') {
        printStripeHelper();
    }
    else {
        printPaddleHelper();
    }
    if (alreadySet) {
        console.log();
        console.log(chalk.green(`  ✓ ${envVar} is already set in this environment.`));
        return { envVar, alreadySet: true };
    }
    console.log();
    await pressEnterToContinue(`  ${chalk.dim('[Press Enter when you have exported the key]')}`);
    console.log();
    console.log(chalk.dim(divider(60)));
    const nowSet = Boolean(process.env[envVar]);
    if (!nowSet) {
        console.log(chalk.yellow(`  ⚠ ${envVar} is not yet set in this terminal. You can export it and re-run setup, or continue and set it later.`));
    }
    else {
        console.log(chalk.green(`  ✓ ${envVar} detected.`));
    }
    return { envVar, alreadySet: nowSet };
}
//# sourceMappingURL=billing-key-helper.js.map