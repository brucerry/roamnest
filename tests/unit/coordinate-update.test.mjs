import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPlan, id, importBackup, exportBackup } from '../../dist/src/domain/planner.js';
import { coordinateUpdate } from '../../dist/src/domain/coordinate-update.js';
const sample = () => ({
    ...blankPlan(),
    title: 'Preserve my draft',
    stops: [
        {
            id: id(),
            name: 'Town',
            country: '',
            code: '',
            lat: null,
            lon: null,
            nights: 2,
            days: ['A note', 'Tentative reservation'],
            pois: [
                {
                    id: id(),
                    day: 0,
                    name: 'Specific branch',
                    address: 'Existing address',
                    notes: 'Candidate, not booked',
                    lat: null,
                    lon: null,
                },
                { id: id(), day: 1, name: 'Pinned', address: '', notes: '', lat: 22, lon: 120 },
            ],
        },
    ],
});
const enriched = (p) => {
    const n = structuredClone(p);
    n.stops[0].pois[0].lat = 22.1;
    n.stops[0].pois[0].lon = 120.1;
    return n;
};
test('coordinate-only update retains trip identity, all text, days, order, and existing pin', () => {
    const p = sample(),
        q = enriched(p),
        u = coordinateUpdate(p, q);
    assert.equal(u.count, 1);
    assert.deepEqual(u.plan, q);
    assert.deepEqual(importBackup(exportBackup(u.plan)), q);
    assert.equal(p.stops[0].pois[0].lat, null);
});
test('modified trip name, notes, order, branch, legacy values or ID block update', () => {
    for (const modify of [
        (p) => (p.title += 'edit'),
        (p) => (p.stops[0].days[0] += 'edit'),
        (p) => p.stops[0].pois.reverse(),
        (p) => (p.stops[0].pois[0].name = 'Other branch'),
        (p) => (p.budget = 100),
        (p) => (p.id = id()),
    ]) {
        const p = sample(),
            q = enriched(p);
        modify(q);
        assert.throws(() => coordinateUpdate(p, q), /content changed/);
    }
});
test('replacing or removing existing pin, invalid paired coordinates, and no-op are rejected', () => {
    const p = sample();
    for (const modify of [
        (q) => (q.stops[0].pois[1].lat = 23),
        (q) => {
            q.stops[0].pois[1].lat = null;
            q.stops[0].pois[1].lon = null;
        },
        (q) => (q.stops[0].pois[0].lon = null),
        (q) => (q.stops[0].pois[0].lat = 91),
    ]) {
        const q = enriched(p);
        modify(q);
        assert.throws(() => coordinateUpdate(p, q));
    }
    assert.throws(() => coordinateUpdate(p, p), /No missing/);
});

test('missing address can be filled without altering notes or existing address; existing address replacement is blocked', () => {
    const p = sample();
    p.stops[0].pois[0].address = '';
    const q = structuredClone(p);
    q.stops[0].pois[0].address = 'Verified branch address';
    const result = coordinateUpdate(p, q);
    assert.equal(result.count, 1);
    assert.equal(result.addressCount, 1);
    assert.deepEqual(result.plan, q);
    assert.equal(result.plan.stops[0].pois[0].notes, p.stops[0].pois[0].notes);
    const altered = structuredClone(q);
    altered.stops[0].pois[0].address = 'Another branch';
    assert.throws(() => coordinateUpdate(q, altered), /existing addresses/);
});
