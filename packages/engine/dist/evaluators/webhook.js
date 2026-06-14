import fs from 'node:fs';
import path from 'node:path';
import { collectFilesByGlob } from './repo-walk.js';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts']);
const SIGNATURE_PATTERNS = [
    /constructEvent\s*\(/,
    /webhooks\.constructEvent/,
    /webhooks\.verify/,
    /verifyWebhook/,
    /Stripe-Signature/i,
    /stripe-signature/i,
    /paddle-signature/i,
    /whsec_/,
];
const IDEMPOTENCY_PATTERNS = [
    /event\.id/,
    /eventId/,
    /idempotency/,
    /processed_events/,
    /webhook_events/,
    /ON CONFLICT/i,
    /upsert.*event/i,
];
const RAW_BODY_PATTERNS = [/rawBody/, /request\.text\s*\(/, /buffer\s*\(/, /encoding:\s*['"]utf-?8['"]/i];
export async function evaluateWebhook(cfg, sources) {
    const findings = [];
    const files = collectFilesByGlob(sources.repoRoot, cfg.handler_paths, SOURCE_EXTENSIONS);
    if (files.length === 0) {
        findings.push({
            contract: 'webhook',
            severity: 'medium',
            entity: 'webhook:handlers',
            message: `No webhook handler files matched handler_paths: ${cfg.handler_paths.join(', ')}`,
            fix: 'Add handler_paths in prodverdict.yml pointing at webhook route files.',
        });
        return findings;
    }
    for (const filePath of files) {
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        }
        catch {
            continue;
        }
        const rel = path.relative(sources.repoRoot, filePath).replace(/\\/g, '/');
        if (!SIGNATURE_PATTERNS.some((re) => re.test(content))) {
            findings.push({
                contract: 'webhook',
                severity: cfg.severity,
                entity: `webhook:${rel}`,
                message: `${rel}: no webhook signature verification detected.`,
                fix: cfg.fix ??
                    'Verify signatures with Stripe constructEvent, Paddle verify, or equivalent before processing payload.',
            });
        }
        if (cfg.require_idempotency && !IDEMPOTENCY_PATTERNS.some((re) => re.test(content))) {
            findings.push({
                contract: 'webhook',
                severity: cfg.severity,
                entity: `webhook:${rel}`,
                message: `${rel}: no idempotency / event deduplication pattern detected.`,
                fix: 'Persist processed event IDs and skip duplicates (ON CONFLICT or lookup table).',
            });
        }
        if (cfg.require_raw_body && !RAW_BODY_PATTERNS.some((re) => re.test(content))) {
            findings.push({
                contract: 'webhook',
                severity: 'medium',
                entity: `webhook:${rel}`,
                message: `${rel}: raw request body handling not detected (required for signature verification).`,
                fix: 'Read raw body before JSON parsing; disable default body parser on webhook routes.',
            });
        }
    }
    return findings;
}
//# sourceMappingURL=webhook.js.map