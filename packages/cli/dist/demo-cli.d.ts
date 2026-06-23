import { type StackTemplate } from './stacks.js';
export declare function resolveDemoPaths(stack: StackTemplate): {
    configPath: string;
    fixturesDir: string;
};
export declare function isDemoStack(value: string): value is StackTemplate;
export declare function runDemo(stack: StackTemplate): Promise<number>;
//# sourceMappingURL=demo-cli.d.ts.map