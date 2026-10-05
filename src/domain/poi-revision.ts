import { validatePlan } from './planner.js';
import type { Plan } from './planner.js';
export function poiRevision(
    current: Plan,
    expected: Plan,
    target: Plan,
): { plan: Plan; count: number; removed: string[]; updated: { before: string; after: string }[] } {
    const before = validatePlan(current),
        base = { ...validatePlan(expected), id: before.id },
        after = { ...validatePlan(target), id: before.id };
    if (JSON.stringify(before) !== JSON.stringify(base))
        throw new Error(
            'Attraction update blocked: this trip changed after its export. Export a fresh backup first.',
        );
    const scope = (p: Plan) =>
        JSON.stringify({ ...p, stops: p.stops.map((s) => ({ ...s, pois: [] })) });
    if (scope(base) !== scope(after))
        throw new Error(
            'Attraction update blocked: dates, stops, notes or other trip records changed.',
        );
    const removed: string[] = [],
        updated: { before: string; after: string }[] = [];
    for (let i = 0; i < base.stops.length; i++) {
        const original = base.stops[i]!.pois,
            next = after.stops[i]!.pois;
        let cursor = -1;
        for (const q of next) {
            const at = original.findIndex((p) => p.id === q.id);
            if (at < 0 || at <= cursor)
                throw new Error(
                    'Attraction update blocked: new or reordered places are unsupported.',
                );
            cursor = at;
            const prior = original[at]!;
            if (prior.day !== q.day)
                throw new Error('Attraction update blocked: day associations must stay unchanged.');
            if (JSON.stringify(prior) !== JSON.stringify(q))
                updated.push({ before: prior.name, after: q.name });
        }
        for (const q of original) if (!next.some((p) => p.id === q.id)) removed.push(q.name);
    }
    const count = removed.length + updated.length;
    if (!count || count > 10)
        throw new Error('Attraction update needs 1 to 10 explicitly reviewed place changes.');
    return { plan: after, count, removed, updated };
}
