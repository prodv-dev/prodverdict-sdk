import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { STACK_META } from './stacks.js';
function readDeps(cwd) {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath))
        return {};
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        return { ...pkg.dependencies, ...pkg.devDependencies };
    }
    catch {
        return {};
    }
}
function hasDep(deps, names) {
    return names.some((name) => name in deps);
}
export function detectStack(cwd) {
    if (existsSync(join(cwd, 'Gemfile'))) {
        return 'rails-stripe';
    }
    const deps = readDeps(cwd);
    if (Object.keys(deps).length === 0)
        return null;
    const hasStripe = hasDep(deps, ['stripe']);
    const hasPaddle = hasDep(deps, ['@paddle/paddle-node-sdk', '@paddle/paddle-js']);
    const hasSupabase = hasDep(deps, ['@supabase/supabase-js', '@supabase/ssr']);
    const hasClerk = hasDep(deps, ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/backend']);
    const hasNext = hasDep(deps, ['next']);
    const hasNeon = hasDep(deps, ['@neondatabase/serverless']);
    if (hasPaddle && hasSupabase)
        return 'supabase-paddle';
    if (hasPaddle)
        return 'paddle-stripe';
    if (hasClerk && hasStripe)
        return 'clerk-stripe';
    if (hasNeon && hasStripe)
        return 'neon-stripe';
    if (hasSupabase && hasStripe)
        return 'supabase-stripe';
    if (hasNext && hasStripe)
        return 'nextjs-stripe';
    if (hasStripe)
        return 'nextjs-stripe';
    return null;
}
export async function resolveInitStack(cwd, explicit) {
    if (explicit) {
        return { stack: explicit, detected: false };
    }
    const detected = detectStack(cwd);
    if (!detected) {
        return { stack: 'nextjs-stripe', detected: false };
    }
    if (!input.isTTY) {
        process.stdout.write(`Detected stack: ${STACK_META[detected].label} (${detected})\n`);
        return { stack: detected, detected: true };
    }
    const rl = createInterface({ input, output });
    try {
        const answer = await rl.question(`Detected stack: ${STACK_META[detected].label} (${detected}). Use it? [Y/n] `);
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'n' || normalized === 'no') {
            return { stack: 'nextjs-stripe', detected: false };
        }
        return { stack: detected, detected: true };
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=detect-stack.js.map