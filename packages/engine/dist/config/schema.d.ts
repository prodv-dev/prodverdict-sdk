import { z } from 'zod';
declare const AccessContractSchema: z.ZodObject<{
    type: z.ZodLiteral<"access">;
    source_of_truth: z.ZodDefault<z.ZodLiteral<"stripe">>;
    database: z.ZodObject<{
        url_env: z.ZodString;
        users_table: z.ZodDefault<z.ZodString>;
        columns: z.ZodDefault<z.ZodObject<{
            id: z.ZodDefault<z.ZodString>;
            stripe_customer_id: z.ZodDefault<z.ZodString>;
            has_paid_access: z.ZodDefault<z.ZodString>;
            plan: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            stripe_customer_id: string;
            has_paid_access: string;
            plan: string;
        }, {
            id?: string | undefined;
            stripe_customer_id?: string | undefined;
            has_paid_access?: string | undefined;
            plan?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        url_env: string;
        users_table: string;
        columns: {
            id: string;
            stripe_customer_id: string;
            has_paid_access: string;
            plan: string;
        };
    }, {
        url_env: string;
        users_table?: string | undefined;
        columns?: {
            id?: string | undefined;
            stripe_customer_id?: string | undefined;
            has_paid_access?: string | undefined;
            plan?: string | undefined;
        } | undefined;
    }>;
    stripe: z.ZodObject<{
        secret_env: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        secret_env: string;
    }, {
        secret_env: string;
    }>;
    /** Map of Stripe price ID -> plan slug used in the app */
    plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** Default severity applied to findings if not overridden per-rule */
    severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    /** Default human/agent-readable fix hint */
    fix: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "access";
    stripe: {
        secret_env: string;
    };
    source_of_truth: "stripe";
    database: {
        url_env: string;
        users_table: string;
        columns: {
            id: string;
            stripe_customer_id: string;
            has_paid_access: string;
            plan: string;
        };
    };
    severity: "high" | "medium" | "low";
    plans?: Record<string, string> | undefined;
    fix?: string | undefined;
}, {
    type: "access";
    stripe: {
        secret_env: string;
    };
    database: {
        url_env: string;
        users_table?: string | undefined;
        columns?: {
            id?: string | undefined;
            stripe_customer_id?: string | undefined;
            has_paid_access?: string | undefined;
            plan?: string | undefined;
        } | undefined;
    };
    source_of_truth?: "stripe" | undefined;
    plans?: Record<string, string> | undefined;
    severity?: "high" | "medium" | "low" | undefined;
    fix?: string | undefined;
}>;
export type AccessContractConfig = z.infer<typeof AccessContractSchema>;
export declare const ProdVerdictConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    contracts: z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"access">;
        source_of_truth: z.ZodDefault<z.ZodLiteral<"stripe">>;
        database: z.ZodObject<{
            url_env: z.ZodString;
            users_table: z.ZodDefault<z.ZodString>;
            columns: z.ZodDefault<z.ZodObject<{
                id: z.ZodDefault<z.ZodString>;
                stripe_customer_id: z.ZodDefault<z.ZodString>;
                has_paid_access: z.ZodDefault<z.ZodString>;
                plan: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                stripe_customer_id: string;
                has_paid_access: string;
                plan: string;
            }, {
                id?: string | undefined;
                stripe_customer_id?: string | undefined;
                has_paid_access?: string | undefined;
                plan?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            url_env: string;
            users_table: string;
            columns: {
                id: string;
                stripe_customer_id: string;
                has_paid_access: string;
                plan: string;
            };
        }, {
            url_env: string;
            users_table?: string | undefined;
            columns?: {
                id?: string | undefined;
                stripe_customer_id?: string | undefined;
                has_paid_access?: string | undefined;
                plan?: string | undefined;
            } | undefined;
        }>;
        stripe: z.ZodObject<{
            secret_env: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            secret_env: string;
        }, {
            secret_env: string;
        }>;
        /** Map of Stripe price ID -> plan slug used in the app */
        plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        /** Default severity applied to findings if not overridden per-rule */
        severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        /** Default human/agent-readable fix hint */
        fix: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "access";
        stripe: {
            secret_env: string;
        };
        source_of_truth: "stripe";
        database: {
            url_env: string;
            users_table: string;
            columns: {
                id: string;
                stripe_customer_id: string;
                has_paid_access: string;
                plan: string;
            };
        };
        severity: "high" | "medium" | "low";
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    }, {
        type: "access";
        stripe: {
            secret_env: string;
        };
        database: {
            url_env: string;
            users_table?: string | undefined;
            columns?: {
                id?: string | undefined;
                stripe_customer_id?: string | undefined;
                has_paid_access?: string | undefined;
                plan?: string | undefined;
            } | undefined;
        };
        source_of_truth?: "stripe" | undefined;
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: 1;
    contracts: {
        type: "access";
        stripe: {
            secret_env: string;
        };
        source_of_truth: "stripe";
        database: {
            url_env: string;
            users_table: string;
            columns: {
                id: string;
                stripe_customer_id: string;
                has_paid_access: string;
                plan: string;
            };
        };
        severity: "high" | "medium" | "low";
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    }[];
}, {
    version: 1;
    contracts: {
        type: "access";
        stripe: {
            secret_env: string;
        };
        database: {
            url_env: string;
            users_table?: string | undefined;
            columns?: {
                id?: string | undefined;
                stripe_customer_id?: string | undefined;
                has_paid_access?: string | undefined;
                plan?: string | undefined;
            } | undefined;
        };
        source_of_truth?: "stripe" | undefined;
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
    }[];
}>;
export type ProdVerdictConfig = z.infer<typeof ProdVerdictConfigSchema>;
export {};
//# sourceMappingURL=schema.d.ts.map