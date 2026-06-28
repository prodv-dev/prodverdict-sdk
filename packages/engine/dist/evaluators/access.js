const LAPSED_STATUSES = new Set(['canceled', 'unpaid', 'past_due', 'incomplete_expired']);
const ACTIVE_STATUSES = new Set(['active', 'trialing']);
export async function evaluateAccess(cfg, sources) {
    if (cfg.source_of_truth === 'stripe_entitlements') {
        if (!sources.entitlements) {
            throw new Error('entitlements reader is required when source_of_truth is stripe_entitlements');
        }
        return evaluateAccessEntitlements(cfg, sources.entitlements, sources.database);
    }
    if (!sources.billing) {
        throw new Error('billing reader is required when source_of_truth is stripe or paddle');
    }
    return evaluateAccessSubscriptions(cfg, sources.billing, sources.database);
}
// ── Subscription-based evaluation (stripe, paddle) ────────────────────────────
async function evaluateAccessSubscriptions(cfg, billing, database) {
    const provider = cfg.source_of_truth === 'paddle' ? 'Paddle' : 'Stripe';
    const [subscriptions, users] = await Promise.all([
        billing.listSubscriptions(),
        database.listUsers(),
    ]);
    const findings = [];
    const defaultFix = cfg.fix;
    const severity = cfg.severity;
    const subsByCustomerId = groupByCustomerId(subscriptions);
    const usersByCustomerId = new Map();
    for (const user of users) {
        if (!user.stripeCustomerId)
            continue;
        const arr = usersByCustomerId.get(user.stripeCustomerId) ?? [];
        arr.push(user);
        usersByCustomerId.set(user.stripeCustomerId, arr);
    }
    // Check 1: duplicate stripe_customer_id across multiple app users
    for (const [customerId, mapped] of usersByCustomerId) {
        if (mapped.length > 1) {
            const ids = mapped.map((u) => u.id).join(', ');
            findings.push({
                contract: 'access',
                severity: 'medium',
                entity: `customer:${customerId}`,
                message: `Billing customer id "${customerId}" is linked to ${mapped.length} users (${ids}). Duplicate mapping.`,
                fix: `Ensure each ${provider} customer maps to exactly one app user.`,
            });
        }
    }
    // Check 2: per-user access state vs Stripe state
    for (const user of users) {
        if (!user.stripeCustomerId) {
            // No Stripe link at all — skip access checks (not necessarily an error)
            continue;
        }
        const subs = subsByCustomerId.get(user.stripeCustomerId);
        if (!subs || subs.length === 0) {
            // App has a customer ID but Stripe has no record
            findings.push({
                contract: 'access',
                severity: 'medium',
                entity: `user:${user.id}`,
                message: `User has billing customer id "${user.stripeCustomerId}" but no ${provider} subscriptions were found.`,
                fix: 'Verify the customer id column is correct or remove the stale reference.',
            });
            continue;
        }
        // Use the most relevant subscription (active/trialing preferred; otherwise latest)
        const activeSub = subs.find((s) => ACTIVE_STATUSES.has(s.status));
        const lapsedSub = subs.find((s) => LAPSED_STATUSES.has(s.status));
        const anySub = activeSub ?? lapsedSub ?? subs[0];
        if (activeSub) {
            // Should have access
            if (!user.hasPaidAccess) {
                findings.push({
                    contract: 'access',
                    severity,
                    entity: `user:${user.id}`,
                    message: `User has an active/trialing ${provider} subscription (${activeSub.id}, status: ${activeSub.status}) ` +
                        `but has_paid_access is false. Revenue leak — user cannot access paid features.`,
                    fix: defaultFix ?? 'Set has_paid_access=true and assign the correct plan on subscription activation.',
                });
            }
            // Check plan mapping drift
            if (cfg.plans) {
                for (const priceId of activeSub.priceIds) {
                    const expectedPlan = cfg.plans[priceId];
                    if (expectedPlan === undefined) {
                        findings.push({
                            contract: 'access',
                            severity,
                            entity: `price:${priceId}`,
                            message: `Subscription ${activeSub.id} uses price "${priceId}" which is not in the plans map.`,
                            fix: `Add "${priceId}" to the plans map in prodverdict.yml, or remove it from ${provider} if deprecated.`,
                        });
                    }
                    else if (user.plan !== null && user.plan !== expectedPlan) {
                        findings.push({
                            contract: 'access',
                            severity,
                            entity: `user:${user.id}`,
                            message: `User plan is "${user.plan}" but active ${provider} price "${priceId}" maps to plan "${expectedPlan}".`,
                            fix: defaultFix ?? `Update the user's plan to "${expectedPlan}" to match the billing price.`,
                        });
                    }
                }
            }
        }
        else if (lapsedSub) {
            // Should not have access
            if (user.hasPaidAccess) {
                findings.push({
                    contract: 'access',
                    severity,
                    entity: `user:${user.id}`,
                    message: `User has a ${anySub.status} ${provider} subscription (${anySub.id}) ` +
                        `but has_paid_access is still true. Wrongful access — user is accessing paid features without a valid subscription.`,
                    fix: defaultFix ?? 'Set has_paid_access=false and revoke plan access in the cancellation/webhook handler.',
                });
            }
        }
    }
    // Check 3: Stripe customers with subscriptions but no matching app user
    for (const [customerId, subs] of subsByCustomerId) {
        if (!usersByCustomerId.has(customerId)) {
            const activeSub = subs.find((s) => ACTIVE_STATUSES.has(s.status));
            if (activeSub) {
                findings.push({
                    contract: 'access',
                    severity: 'low',
                    entity: `customer:${customerId}`,
                    message: `${provider} customer "${customerId}" has an active subscription (${activeSub.id}) but no matching app user row.`,
                    fix: 'Verify the customer was not deleted from the app, or handle subscription cleanup in billing.',
                });
            }
        }
    }
    return findings;
}
// ── Entitlements-based evaluation (stripe_entitlements) ───────────────────────
async function evaluateAccessEntitlements(cfg, entitlements, database) {
    const [activeEntitlements, users] = await Promise.all([
        entitlements.listActiveEntitlements(),
        database.listUsers(),
    ]);
    const findings = [];
    const defaultFix = cfg.fix;
    const severity = cfg.severity;
    const entsByCustomerId = groupEntitlementsByCustomerId(activeEntitlements);
    const usersByCustomerId = new Map();
    for (const user of users) {
        if (!user.stripeCustomerId)
            continue;
        const arr = usersByCustomerId.get(user.stripeCustomerId) ?? [];
        arr.push(user);
        usersByCustomerId.set(user.stripeCustomerId, arr);
    }
    // Check 1: duplicate stripe_customer_id across multiple app users
    for (const [customerId, mapped] of usersByCustomerId) {
        if (mapped.length > 1) {
            const ids = mapped.map((u) => u.id).join(', ');
            findings.push({
                contract: 'access',
                severity: 'medium',
                entity: `customer:${customerId}`,
                message: `Stripe customer id "${customerId}" is linked to ${mapped.length} users (${ids}). Duplicate mapping.`,
                fix: 'Ensure each Stripe customer maps to exactly one app user.',
            });
        }
    }
    // Check 2: per-user access state vs Stripe Entitlements grant state
    for (const user of users) {
        if (!user.stripeCustomerId) {
            continue;
        }
        const grants = entsByCustomerId.get(user.stripeCustomerId);
        if (!grants || grants.length === 0) {
            // No active entitlement — user should not have paid access
            if (user.hasPaidAccess) {
                findings.push({
                    contract: 'access',
                    severity,
                    entity: `user:${user.id}`,
                    message: `User has has_paid_access=true but no active Stripe Entitlements grant for customer "${user.stripeCustomerId}". ` +
                        `Wrongful access — user is accessing paid features with no entitlement.`,
                    fix: defaultFix ??
                        'Revoke has_paid_access or grant the correct Entitlements feature in Stripe.',
                });
            }
            continue;
        }
        // Has at least one active entitlement — user should have paid access
        if (!user.hasPaidAccess) {
            const featureSummary = grants.map((g) => g.feature).join(', ');
            findings.push({
                contract: 'access',
                severity,
                entity: `user:${user.id}`,
                message: `User has an active Stripe Entitlements grant (features: ${featureSummary}) ` +
                    `for customer "${user.stripeCustomerId}" but has_paid_access is false. Revenue leak — user cannot access paid features.`,
                fix: defaultFix ?? 'Set has_paid_access=true or remove the Entitlements grant in Stripe.',
            });
        }
        // Plan drift: compare DB plan to the entitlement feature's lookup_key (if mapped)
        if (cfg.plans) {
            for (const grant of grants) {
                const planKey = grant.lookupKey ?? grant.feature;
                const expectedPlan = cfg.plans[planKey];
                if (expectedPlan === undefined) {
                    findings.push({
                        contract: 'access',
                        severity,
                        entity: `feature:${planKey}`,
                        message: `Active entitlement uses feature key "${planKey}" which is not in the plans map.`,
                        fix: `Add "${planKey}" to the plans map in prodverdict.yml (keyed by feature lookup_key or feature id), or remove the feature from Stripe if deprecated.`,
                    });
                }
                else if (user.plan !== null && user.plan !== expectedPlan) {
                    findings.push({
                        contract: 'access',
                        severity,
                        entity: `user:${user.id}`,
                        message: `User plan is "${user.plan}" but active Stripe Entitlements feature key "${planKey}" maps to plan "${expectedPlan}".`,
                        fix: defaultFix ?? `Update the user's plan to "${expectedPlan}" to match the Entitlements feature.`,
                    });
                }
            }
        }
    }
    // Check 3: Stripe customers with active entitlements but no matching app user
    for (const [customerId, grants] of entsByCustomerId) {
        if (!usersByCustomerId.has(customerId)) {
            const grant = grants[0];
            findings.push({
                contract: 'access',
                severity: 'low',
                entity: `customer:${customerId}`,
                message: `Stripe customer "${customerId}" has an active Entitlements grant (feature: ${grant.feature}) but no matching app user row.`,
                fix: 'Verify the customer was not deleted from the app, or handle the entitlement cleanup in Stripe.',
            });
        }
    }
    return findings;
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function groupByCustomerId(subscriptions) {
    const map = new Map();
    for (const sub of subscriptions) {
        const arr = map.get(sub.customerId) ?? [];
        arr.push(sub);
        map.set(sub.customerId, arr);
    }
    return map;
}
function groupEntitlementsByCustomerId(entitlements) {
    const map = new Map();
    for (const ent of entitlements) {
        const arr = map.get(ent.customerId) ?? [];
        arr.push(ent);
        map.set(ent.customerId, arr);
    }
    return map;
}
//# sourceMappingURL=access.js.map