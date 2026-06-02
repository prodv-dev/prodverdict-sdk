import { z } from 'zod';
export declare const AccessContractSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"access">;
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
    /** Map of billing price ID -> plan slug used in the app */
    plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    fix: z.ZodOptional<z.ZodString>;
} & {
    source_of_truth: z.ZodDefault<z.ZodLiteral<"stripe">>;
    stripe: z.ZodObject<{
        secret_env: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        secret_env: string;
    }, {
        secret_env: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "access";
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
    stripe: {
        secret_env: string;
    };
    source_of_truth: "stripe";
    plans?: Record<string, string> | undefined;
    fix?: string | undefined;
}, {
    type: "access";
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
    stripe: {
        secret_env: string;
    };
    plans?: Record<string, string> | undefined;
    severity?: "high" | "medium" | "low" | undefined;
    fix?: string | undefined;
    source_of_truth?: "stripe" | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"access">;
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
    /** Map of billing price ID -> plan slug used in the app */
    plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    fix: z.ZodOptional<z.ZodString>;
} & {
    source_of_truth: z.ZodLiteral<"paddle">;
    paddle: z.ZodObject<{
        api_key_env: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        api_key_env: string;
    }, {
        api_key_env: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "access";
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
    source_of_truth: "paddle";
    paddle: {
        api_key_env: string;
    };
    plans?: Record<string, string> | undefined;
    fix?: string | undefined;
}, {
    type: "access";
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
    source_of_truth: "paddle";
    paddle: {
        api_key_env: string;
    };
    plans?: Record<string, string> | undefined;
    severity?: "high" | "medium" | "low" | undefined;
    fix?: string | undefined;
}>]>;
export type AccessContractConfig = z.infer<typeof AccessContractSchema>;
declare const ConfigRuleSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"required">;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
}, "strip", z.ZodTypeAny, {
    type: "required";
    name: string;
    severity?: "high" | "medium" | "low" | undefined;
    description?: string | undefined;
}, {
    type: "required";
    name: string;
    severity?: "high" | "medium" | "low" | undefined;
    description?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"not_default">;
    name: z.ZodString;
    forbidden_values: z.ZodArray<z.ZodString, "many">;
    severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
}, "strip", z.ZodTypeAny, {
    type: "not_default";
    name: string;
    forbidden_values: string[];
    severity?: "high" | "medium" | "low" | undefined;
}, {
    type: "not_default";
    name: string;
    forbidden_values: string[];
    severity?: "high" | "medium" | "low" | undefined;
}>]>;
export type ConfigRule = z.infer<typeof ConfigRuleSchema>;
declare const ConfigContractSchema: z.ZodObject<{
    type: z.ZodLiteral<"config">;
    severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    rules: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"required">;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "required";
        name: string;
        severity?: "high" | "medium" | "low" | undefined;
        description?: string | undefined;
    }, {
        type: "required";
        name: string;
        severity?: "high" | "medium" | "low" | undefined;
        description?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"not_default">;
        name: z.ZodString;
        forbidden_values: z.ZodArray<z.ZodString, "many">;
        severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "not_default";
        name: string;
        forbidden_values: string[];
        severity?: "high" | "medium" | "low" | undefined;
    }, {
        type: "not_default";
        name: string;
        forbidden_values: string[];
        severity?: "high" | "medium" | "low" | undefined;
    }>]>, "many">>;
    scan_references: z.ZodDefault<z.ZodBoolean>;
    env_example_file: z.ZodDefault<z.ZodString>;
    check_placeholders: z.ZodDefault<z.ZodBoolean>;
    ignore_vars: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "config";
    severity: "high" | "medium" | "low";
    rules: ({
        type: "required";
        name: string;
        severity?: "high" | "medium" | "low" | undefined;
        description?: string | undefined;
    } | {
        type: "not_default";
        name: string;
        forbidden_values: string[];
        severity?: "high" | "medium" | "low" | undefined;
    })[];
    scan_references: boolean;
    env_example_file: string;
    check_placeholders: boolean;
    ignore_vars: string[];
}, {
    type: "config";
    severity?: "high" | "medium" | "low" | undefined;
    rules?: ({
        type: "required";
        name: string;
        severity?: "high" | "medium" | "low" | undefined;
        description?: string | undefined;
    } | {
        type: "not_default";
        name: string;
        forbidden_values: string[];
        severity?: "high" | "medium" | "low" | undefined;
    })[] | undefined;
    scan_references?: boolean | undefined;
    env_example_file?: string | undefined;
    check_placeholders?: boolean | undefined;
    ignore_vars?: string[] | undefined;
}>;
export type ConfigContractConfig = z.infer<typeof ConfigContractSchema>;
export declare const ProdVerdictConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    contracts: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"access">;
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
        /** Map of billing price ID -> plan slug used in the app */
        plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        fix: z.ZodOptional<z.ZodString>;
    } & {
        source_of_truth: z.ZodDefault<z.ZodLiteral<"stripe">>;
        stripe: z.ZodObject<{
            secret_env: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            secret_env: string;
        }, {
            secret_env: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "access";
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
        stripe: {
            secret_env: string;
        };
        source_of_truth: "stripe";
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    }, {
        type: "access";
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
        stripe: {
            secret_env: string;
        };
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
        source_of_truth?: "stripe" | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"access">;
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
        /** Map of billing price ID -> plan slug used in the app */
        plans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        fix: z.ZodOptional<z.ZodString>;
    } & {
        source_of_truth: z.ZodLiteral<"paddle">;
        paddle: z.ZodObject<{
            api_key_env: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            api_key_env: string;
        }, {
            api_key_env: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "access";
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
        source_of_truth: "paddle";
        paddle: {
            api_key_env: string;
        };
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    }, {
        type: "access";
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
        source_of_truth: "paddle";
        paddle: {
            api_key_env: string;
        };
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"config">;
        severity: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        rules: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"required">;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        }, {
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"not_default">;
            name: z.ZodString;
            forbidden_values: z.ZodArray<z.ZodString, "many">;
            severity: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
        }, "strip", z.ZodTypeAny, {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        }, {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        }>]>, "many">>;
        scan_references: z.ZodDefault<z.ZodBoolean>;
        env_example_file: z.ZodDefault<z.ZodString>;
        check_placeholders: z.ZodDefault<z.ZodBoolean>;
        ignore_vars: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "config";
        severity: "high" | "medium" | "low";
        rules: ({
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        } | {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        })[];
        scan_references: boolean;
        env_example_file: string;
        check_placeholders: boolean;
        ignore_vars: string[];
    }, {
        type: "config";
        severity?: "high" | "medium" | "low" | undefined;
        rules?: ({
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        } | {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        })[] | undefined;
        scan_references?: boolean | undefined;
        env_example_file?: string | undefined;
        check_placeholders?: boolean | undefined;
        ignore_vars?: string[] | undefined;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    version: 1;
    contracts: ({
        type: "access";
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
        stripe: {
            secret_env: string;
        };
        source_of_truth: "stripe";
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    } | {
        type: "access";
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
        source_of_truth: "paddle";
        paddle: {
            api_key_env: string;
        };
        plans?: Record<string, string> | undefined;
        fix?: string | undefined;
    } | {
        type: "config";
        severity: "high" | "medium" | "low";
        rules: ({
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        } | {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        })[];
        scan_references: boolean;
        env_example_file: string;
        check_placeholders: boolean;
        ignore_vars: string[];
    })[];
}, {
    version: 1;
    contracts: ({
        type: "access";
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
        stripe: {
            secret_env: string;
        };
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
        source_of_truth?: "stripe" | undefined;
    } | {
        type: "access";
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
        source_of_truth: "paddle";
        paddle: {
            api_key_env: string;
        };
        plans?: Record<string, string> | undefined;
        severity?: "high" | "medium" | "low" | undefined;
        fix?: string | undefined;
    } | {
        type: "config";
        severity?: "high" | "medium" | "low" | undefined;
        rules?: ({
            type: "required";
            name: string;
            severity?: "high" | "medium" | "low" | undefined;
            description?: string | undefined;
        } | {
            type: "not_default";
            name: string;
            forbidden_values: string[];
            severity?: "high" | "medium" | "low" | undefined;
        })[] | undefined;
        scan_references?: boolean | undefined;
        env_example_file?: string | undefined;
        check_placeholders?: boolean | undefined;
        ignore_vars?: string[] | undefined;
    })[];
}>;
export type ProdVerdictConfig = z.infer<typeof ProdVerdictConfigSchema>;
export {};
//# sourceMappingURL=schema.d.ts.map