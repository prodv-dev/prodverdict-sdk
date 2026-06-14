import type { Finding } from '../types.js';
import type { WebhookContractConfig } from '../config/schema.js';
export interface WebhookDataSources {
    repoRoot: string;
}
export declare function evaluateWebhook(cfg: WebhookContractConfig, sources: WebhookDataSources): Promise<Finding[]>;
//# sourceMappingURL=webhook.d.ts.map