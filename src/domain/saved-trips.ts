import { DEFAULT_PLAN_ID } from './planner.js';
import type { Plan } from './planner.js';

// Menu presentation only: never remove or rename stored records. The active
// option supplies the closed control caption and is not an alternate choice.
export function alternateTripOptions(
    plans: Plan[],
    active: Plan,
    name: (plan: Plan) => string,
): { id: string; label: string }[] {
    const seen = new Set([active.id, DEFAULT_PLAN_ID]);
    const others = plans.filter((plan) => {
        if (seen.has(plan.id)) return false;
        seen.add(plan.id);
        return true;
    });
    const choices = [active, ...others];
    return others.map((plan) => {
        const title = name(plan),
            matching = choices.filter((other) => name(other) === title);
        if (matching.length === 1) return { id: plan.id, label: title };
        const sameDate = matching
            .filter((other) => other.start === plan.start)
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const suffix =
            sameDate.length > 1
                ? ' · #' + (sameDate.findIndex((other) => other.id === plan.id) + 1)
                : '';
        return { id: plan.id, label: title + ' · ' + plan.start + suffix };
    });
}
