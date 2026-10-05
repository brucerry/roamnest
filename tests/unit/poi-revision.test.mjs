import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPlan, id } from '../../dist/src/domain/planner.js';
import { poiRevision } from '../../dist/src/domain/poi-revision.js';
const sample = () => ({
    ...blankPlan(),
    title: 'Keep this trip',
    start: '2026-10-28',
    stops: [
        {
            id: id(),
            name: 'City',
            country: 'TW',
            code: '',
            lat: 22,
            lon: 120,
            nights: 2,
            days: ['Original notes', 'Original reservation'],
            pois: [
                { id: id(), day: 0, name: 'Meal', address: '', notes: 'Dinner', lat: 22, lon: 120 },
                {
                    id: id(),
                    day: 1,
                    name: 'Unselected venue',
                    address: '',
                    notes: 'Keep sightseeing',
                    lat: null,
                    lon: null,
                },
            ],
        },
    ],
});
const target = (p) => {
    const q = structuredClone(p);
    q.id = id();
    q.stops[0].pois.shift();
    Object.assign(q.stops[0].pois[0], {
        name: 'Selected venue',
        address: 'Verified entrance',
        lat: 22.1,
        lon: 120.1,
    });
    return q;
};
test('reviewed removal and selection preserve current identity, day notes, dates and legacy values', () => {
    const p = sample(),
        q = target(p),
        r = poiRevision(p, p, q);
    assert.equal(r.plan.id, p.id);
    assert.equal(r.count, 2);
    assert.deepEqual(r.removed, ['Meal']);
    assert.deepEqual(r.updated, [{ before: 'Unselected venue', after: 'Selected venue' }]);
    assert.deepEqual(r.plan, { ...q, id: p.id });
    assert.equal(p.stops[0].pois.length, 2);
});
test('newer current edits reject the stale revision', () => {
    const p = sample(),
        q = target(p);
    for (const change of [
        (r) => (r.title += ' edit'),
        (r) => (r.stops[0].days[0] += ' edit'),
        (r) => (r.stops[0].pois[0].notes += ' edit'),
    ]) {
        const edited = structuredClone(p);
        change(edited);
        assert.throws(() => poiRevision(edited, p, q), /changed after its export/);
    }
});
test('revision cannot alter other trip metadata or legacy records', () => {
    const p = sample();
    for (const change of [
        (r) => (r.start = '2026-10-29'),
        (r) => (r.budget = 100),
        (r) => (r.stops[0].days[1] = 'Changed'),
        (r) => (r.stops[0].name = 'Other city'),
    ]) {
        const q = target(p);
        change(q);
        assert.throws(() => poiRevision(p, p, q), /dates, stops/);
    }
});
test('new attractions, reorder and changed day association are rejected', () => {
    const p = sample();
    for (const change of [
        (q) => q.stops[0].pois.push({ ...q.stops[0].pois[1], id: id() }),
        (q) => q.stops[0].pois.reverse(),
        (q) => (q.stops[0].pois[1].day = 0),
    ]) {
        const q = structuredClone(p);
        change(q);
        assert.throws(() => poiRevision(p, p, q), /new or reordered|day associations/);
    }
    assert.throws(() => poiRevision(p, p, p), /1 to 10/);
});
