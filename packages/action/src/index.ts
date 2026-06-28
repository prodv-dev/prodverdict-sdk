import * as core from '@actions/core';
import * as github from '@actions/github';
import { resolve } from 'path';
import {
  parseConfigFile,
  runContracts,
  resolveCheckExitCode,
  isProdVerdictError,
  type CheckResult,
  type ContractType,
} from '@prodverdict/engine';
import { buildComment, extractCommentMarker } from './comment.js';
import { maybeNotifySlack } from './slack.js';
import { uploadCheckResult } from './upload.js';

/** Caller repo root — never the action/SDK checkout directory. */
function workspaceRoot(): string {
  return process.env['GITHUB_WORKSPACE'] ?? process.cwd();
}

const SUPPORTED_CONTRACTS = [
  'access',
  'config',
  'migration',
  'boundary',
  'webhook',
  'restore',
  'entitlements-migration',
  'all',
] as const;

function contractLabel(contract: ContractType): string {
  switch (contract) {
    case 'config':
      return 'Config';
    case 'migration':
      return 'Migration';
    case 'boundary':
      return 'Boundary';
    case 'webhook':
      return 'Webhook';
    case 'restore':
      return 'Restore';
    case 'entitlements-migration':
      return 'Entitlements Migration';
    default:
      return 'Access';
  }
}

async function run(): Promise<void> {
  try {
    const configInput = core.getInput('config') || './prodverdict.yml';
    const configPath = resolve(workspaceRoot(), configInput);
    const contractInput = (core.getInput('contract') || 'access').toLowerCase();
    const strict = (core.getInput('strict') || 'false').toLowerCase() === 'true';

    if (!SUPPORTED_CONTRACTS.includes(contractInput as (typeof SUPPORTED_CONTRACTS)[number])) {
      core.setFailed(
        `Unknown contract "${contractInput}". Supported: access, config, migration, boundary, webhook, restore, entitlements-migration, all.`,
      );
      return;
    }

    core.info(`Loading config from ${configPath}`);
    const cfg = parseConfigFile(configPath);

    const contractsFilter =
      contractInput === 'all'
        ? undefined
        : [
            contractInput as
              | 'access'
              | 'config'
              | 'migration'
              | 'boundary'
              | 'webhook'
              | 'restore'
              | 'entitlements-migration',
          ];

    if (contractInput === 'access') {
      const accessCfg = cfg.contracts.find((c) => c.type === 'access');
      if (accessCfg) {
        const provider =
          accessCfg.source_of_truth === 'paddle'
            ? 'Paddle'
            : accessCfg.source_of_truth === 'stripe_entitlements'
              ? 'Stripe Entitlements'
              : 'Stripe';
        core.info(`Connecting to ${provider} and database (read-only)…`);
      }
    } else if (contractInput === 'entitlements-migration') {
      core.info('Running entitlements-migration contract check…');
    } else if (contractInput === 'config') {
      core.info('Running config contract check…');
    } else if (contractInput === 'migration') {
      core.info('Running migration contract check…');
    } else {
      core.info('Running all configured contracts…');
    }

    const output = await runContracts({
      config: cfg,
      configPath,
      repoRoot: workspaceRoot(),
      env: process.env as Record<string, string | undefined>,
      contracts: contractsFilter,
      accessSource: 'live',
    });

    if (contractInput === 'all') {
      for (const result of output.results) {
        await handleSingleResult(result, strict, true);
      }
      core.info(
        `Aggregate verdict: ${output.verdict.toUpperCase()} — ${output.findings.length} finding(s)`,
      );
      core.setOutput('verdict', output.verdict);
      core.setOutput('findings_count', String(output.findings.length));
      core.setOutput('result_json', JSON.stringify(output));
      if (output.verdict === 'fail') {
        core.setFailed(
          `ProdVerdict FAILED — ${output.findings.filter((f) => f.severity === 'high').length} high-severity finding(s).`,
        );
      } else if (output.verdict === 'warn' && strict) {
        core.setFailed('ProdVerdict passed with warnings (--strict enabled).');
      } else if (output.verdict === 'warn') {
        core.warning(`ProdVerdict passed with warnings — ${output.findings.length} finding(s).`);
      } else {
        core.info('ProdVerdict PASSED — no violations found.');
      }
      return;
    }

    const result = output.results[0];
    if (!result) {
      core.setFailed(`No ${contractInput} contract found in prodverdict.yml.`);
      return;
    }

    await handleSingleResult(result, strict, false);
  } catch (err) {
    if (isProdVerdictError(err)) {
      core.setFailed(`[${err.code}] ${err.message}`);
    } else if (err instanceof Error) {
      core.setFailed(`Unexpected error: ${err.message}`);
    } else {
      core.setFailed(`Unexpected error: ${String(err)}`);
    }
  }
}

async function handleSingleResult(
  result: CheckResult,
  strict: boolean,
  aggregateMode: boolean,
): Promise<void> {
  core.info(`Verdict: ${result.verdict.toUpperCase()} — ${result.findings.length} finding(s)`);

  if (!aggregateMode) {
    core.setOutput('verdict', result.verdict);
    core.setOutput('findings_count', String(result.findings.length));
    core.setOutput('result_json', JSON.stringify(result));
  }

  await maybePostComment(result);

  try {
    await uploadCheckResult(result, 'action');
    core.info('Uploaded check result to ProdVerdict dashboard.');
  } catch (uploadErr) {
    if (process.env.PRODVERDICT_API_URL) {
      core.warning(
        uploadErr instanceof Error ? uploadErr.message : `Upload failed: ${String(uploadErr)}`,
      );
    }
  }

  const slackWebhook = core.getInput('slack_webhook_url') || process.env['SLACK_WEBHOOK_URL'];
  if (slackWebhook && (result.verdict === 'fail' || result.verdict === 'warn')) {
    await maybeNotifySlack(result, slackWebhook);
  }

  if (aggregateMode) return;

  const label = contractLabel(result.contract);
  if (result.verdict === 'fail') {
    core.setFailed(
      `${label} contract FAILED — ${result.findings.filter((f) => f.severity === 'high').length} high-severity finding(s). ` +
        'See comment for details.',
    );
  } else if (result.verdict === 'warn') {
    const msg = `${label} contract passed with warnings — ${result.findings.length} finding(s).`;
    if (strict) {
      core.setFailed(`${msg} (--strict enabled)`);
    } else {
      core.warning(msg);
    }
  } else {
    core.info(`${label} contract PASSED — no violations found.`);
  }
}

async function maybePostComment(result: CheckResult): Promise<void> {
  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    core.debug('GITHUB_TOKEN not set — skipping PR comment.');
    return;
  }

  const context = github.context;
  if (context.eventName !== 'pull_request') {
    core.debug('Not a pull_request event — skipping PR comment.');
    return;
  }

  const prNumber = context.payload.pull_request?.number;
  if (!prNumber) return;

  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;
  const marker = extractCommentMarker();
  const body = buildComment(result);

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const existing = comments.find((c) => c.body?.includes(marker));
  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated existing ProdVerdict PR comment (#${existing.id}).`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
    core.info('Posted new ProdVerdict PR comment.');
  }
}

run();
