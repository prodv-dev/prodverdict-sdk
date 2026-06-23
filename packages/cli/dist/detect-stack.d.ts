import { type StackTemplate } from './stacks.js';
export declare function detectStack(cwd: string): StackTemplate | null;
export declare function resolveInitStack(cwd: string, explicit?: string): Promise<{
    stack: StackTemplate;
    detected: boolean;
}>;
//# sourceMappingURL=detect-stack.d.ts.map