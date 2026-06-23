import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import Stripe from 'stripe';
import { Paddle } from '@paddle/paddle-node-sdk';
import { parseConfigFile } from './config/index.js';
import { resolvePaddleEnvironment } from './connectors/paddle-live.js';
function check(name, status, message) {
    return { name, status, message };
}
function envSet(env, key) {
    const v = env[key];
    return v !== undefined && v !== '';
}
function collectAccessEnvVars(accessCfg) {
    const vars = [accessCfg.database.url_env];
    if (accessCfg.source_of_truth === 'paddle') {
        vars.push(accessCfg.paddle.api_key_env);
    }
    else {
        vars.push(accessCfg.stripe.secret_env);
    }
    return vars;
}
async function pingDatabase(url) {
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
        }
        finally {
            client.release();
        }
    }
    finally {
        await pool.end();
    }
}
async function pingStripe(secretKeyEnv, env) {
    const key = env[secretKeyEnv];
    if (!key)
        throw new Error(`Missing ${secretKeyEnv}`);
    const client = new Stripe(key, { apiVersion: '2024-06-20' });
    await client.subscriptions.list({ limit: 1 });
}
async function pingPaddle(apiKeyEnv, env) {
    const key = env[apiKeyEnv];
    if (!key)
        throw new Error(`Missing ${apiKeyEnv}`);
    const paddleEnv = resolvePaddleEnvironment(env.PADDLE_ENVIRONMENT);
    const paddle = new Paddle(key, { environment: paddleEnv });
    for await (const _ of paddle.subscriptions.list({ perPage: 1 })) {
        break;
    }
}
function validateConfigChecks(cfg) {
    return [
        check('config:valid', 'pass', `prodverdict.yml is valid — ${cfg.contracts.length} contract(s) defined.`),
    ];
}
function envVarChecks(env, vars, prefix) {
    return vars.map((name) => {
        if (envSet(env, name)) {
            return check(`${prefix}:env:${name}`, 'pass', `${name} is set.`);
        }
        return check(`${prefix}:env:${name}`, 'fail', `Missing or empty env var "${name}". Export it before running live checks.`);
    });
}
export async function runDoctor(opts) {
    const env = process.env;
    const repoRoot = opts.repoRoot ?? process.cwd();
    const checks = [];
    let cfg;
    try {
        cfg = parseConfigFile(resolve(opts.configPath));
        checks.push(...validateConfigChecks(cfg));
    }
    catch (err) {
        checks.push(check('config:valid', 'fail', `prodverdict.yml is invalid: ${String(err)}`));
        return { ok: false, checks, contracts: [] };
    }
    const contracts = cfg.contracts.map((c) => ({ type: c.type }));
    for (const contract of cfg.contracts) {
        if (contract.type === 'access') {
            const vars = collectAccessEnvVars(contract);
            checks.push(...envVarChecks(env, vars, 'access'));
            if (!opts.skipConnectivity) {
                const dbUrl = env[contract.database.url_env];
                if (dbUrl) {
                    try {
                        await pingDatabase(dbUrl);
                        checks.push(check('access:database_ping', 'pass', 'Database connection succeeded.'));
                    }
                    catch (err) {
                        checks.push(check('access:database_ping', 'fail', `Database connection failed: ${String(err)}`));
                    }
                }
                else {
                    checks.push(check('access:database_ping', 'skip', `Skipped — ${contract.database.url_env} not set.`));
                }
                if (contract.source_of_truth === 'paddle') {
                    if (envSet(env, contract.paddle.api_key_env)) {
                        try {
                            await pingPaddle(contract.paddle.api_key_env, env);
                            checks.push(check('access:paddle_ping', 'pass', 'Paddle API connection succeeded.'));
                        }
                        catch (err) {
                            checks.push(check('access:paddle_ping', 'fail', `Paddle API failed: ${String(err)}`));
                        }
                    }
                    else {
                        checks.push(check('access:paddle_ping', 'skip', `Skipped — ${contract.paddle.api_key_env} not set.`));
                    }
                }
                else if (envSet(env, contract.stripe.secret_env)) {
                    try {
                        await pingStripe(contract.stripe.secret_env, env);
                        checks.push(check('access:stripe_ping', 'pass', 'Stripe API connection succeeded.'));
                    }
                    catch (err) {
                        checks.push(check('access:stripe_ping', 'fail', `Stripe API failed: ${String(err)}`));
                    }
                }
                else {
                    checks.push(check('access:stripe_ping', 'skip', `Skipped — ${contract.stripe.secret_env} not set.`));
                }
            }
        }
        if (contract.type === 'config') {
            for (const rule of contract.rules) {
                if (rule.type === 'required') {
                    const name = rule.name;
                    checks.push(envSet(env, name)
                        ? check(`config:env:${name}`, 'pass', `${name} is set.`)
                        : check(`config:env:${name}`, 'fail', `Required env var "${name}" is missing or empty.`));
                }
            }
            if (contract.scan_references) {
                const examplePath = resolve(repoRoot, contract.env_example_file);
                if (existsSync(examplePath)) {
                    checks.push(check('config:env_example', 'pass', `${contract.env_example_file} exists.`));
                }
                else {
                    checks.push(check('config:env_example', 'fail', `${contract.env_example_file} not found at ${examplePath}.`));
                }
            }
        }
        if (contract.type === 'migration') {
            checks.push(check('migration:paths', 'pass', `Migration contract configured with ${contract.paths.length} path pattern(s).`));
        }
    }
    const ok = !checks.some((c) => c.status === 'fail');
    return { ok, checks, contracts };
}
//# sourceMappingURL=doctor.js.map