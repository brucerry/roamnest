import { validatePlan } from './planner.js';
import type { Plan } from './planner.js';
// Only missing POI coordinates/addresses may be filled on the same trip.
// IDs, order, other text, dates, legacy data and existing details must match.
export function coordinateUpdate(
    current: Plan,
    incoming: Plan,
): { plan: Plan; count: number; addressCount: number } {
    const before = validatePlan(current),
        after = validatePlan(incoming);
    const signature = (p: Plan): string =>
        JSON.stringify({
            ...p,
            stops: p.stops.map((s) => ({
                ...s,
                pois: s.pois.map((q) => ({ ...q, address: '', lat: null, lon: null })),
            })),
        });
    if (signature(before) !== signature(after))
        throw new Error(
            'Coordinate update blocked: trip content changed. Export a fresh backup first.',
        );
    let count = 0,
        addressCount = 0;
    for (let s = 0; s < before.stops.length; s++)
        for (let i = 0; i < before.stops[s]!.pois.length; i++) {
            const a = before.stops[s]!.pois[i]!,
                b = after.stops[s]!.pois[i]!;
            let changed = false;
            if (a.address !== b.address) {
                if (a.address.trim() || !b.address.trim())
                    throw new Error(
                        'Place update blocked: existing addresses must stay unchanged.',
                    );
                addressCount++;
                changed = true;
            }
            if (a.lat !== b.lat || a.lon !== b.lon) {
                if (a.lat !== null || a.lon !== null || b.lat === null || b.lon === null)
                    throw new Error(
                        'Coordinate update blocked: existing pins must stay unchanged.',
                    );
                changed = true;
            }
            if (changed) count++;
        }
    if (!count) throw new Error('No missing coordinates to update.');
    return { plan: after, count, addressCount };
}
