const LAPSED_STATUSES = new Set(['canceled', 'unpaid', 'past_due', 'incomplete_expired']);
const ACTIVE_STATUSES = new Set(['active', 'trialing']);
export async function evaluateAccess(cfg, sources) {
    const [subscriptions, users] = await Promise.all([
        sources.stripe.listSubscriptions(),
        sources.database.listUsers(),
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
                message: `stripe_customer_id "${customerId}" is linked to ${mapped.length} users (${ids}). Duplicate mapping.`,
                fix: 'Ensure each Stripe customer maps to exactly one app user.',
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
                message: `User has stripe_customer_id "${user.stripeCustomerId}" but no Stripe subscriptions were found.`,
                fix: 'Verify the stripe_customer_id is correct or remove the stale reference.',
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
                    message: `User has an active/trialing Stripe subscription (${activeSub.id}, status: ${activeSub.status}) ` +
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
                            fix: `Add "${priceId}" to the plans map in prodverdict.yml, or remove it from Stripe if deprecated.`,
                        });
                    }
                    else if (user.plan !== null && user.plan !== expectedPlan) {
                        findings.push({
                            contract: 'access',
                            severity,
                            entity: `user:${user.id}`,
                            message: `User plan is "${user.plan}" but active Stripe price "${priceId}" maps to plan "${expectedPlan}".`,
                            fix: defaultFix ?? `Update the user's plan to "${expectedPlan}" to match the Stripe price.`,
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
                    message: `User has a ${anySub.status} Stripe subscription (${anySub.id}) ` +
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
                    message: `Stripe customer "${customerId}" has an active subscription (${activeSub.id}) but no matching app user row.`,
                    fix: 'Verify the customer was not deleted from the app, or handle the Stripe subscription cleanup.',
                });
            }
        }
    }
    return findings;
}
function groupByCustomerId(subscriptions) {
    const map = new Map();
    for (const sub of subscriptions) {
        const arr = map.get(sub.customerId) ?? [];
        arr.push(sub);
        map.set(sub.customerId, arr);
    }
    return map;
}
//# sourceMappingURL=access.js.map