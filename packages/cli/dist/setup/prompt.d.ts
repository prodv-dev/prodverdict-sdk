/** Prompt the user with a yes/no question. Defaults to `defaultYes` on empty input. */
export declare function promptYesNo(question: string, defaultYes?: boolean): Promise<boolean>;
/** Prompt the user to press Enter to continue. Returns when Enter is pressed. */
export declare function pressEnterToContinue(prompt: string): Promise<void>;
/** Print a dim section divider line. */
export declare function divider(width?: number): string;
//# sourceMappingURL=prompt.d.ts.map