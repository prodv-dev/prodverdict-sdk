import { Environment } from '@paddle/paddle-node-sdk';
import type { StripeReader } from './types.js';
/**
 * Resolve the Paddle SDK environment from the PADDLE_ENVIRONMENT value.
 * Case-insensitive, defaults to sandbox. Shared so the live connector and
 * `doctor` always target the same environment (e.g. "Production" must not
 * make doctor ping sandbox while live checks hit production).
 */
export declare function resolvePaddleEnvironment(value: string | undefined): Environment;
export declare function createLivePaddleReader(apiKeyEnvVar: string): StripeReader;
//# sourceMappingURL=paddle-live.d.ts.map