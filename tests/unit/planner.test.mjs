import test from 'node:test';
import assert from 'node:assert/strict';
import {
    blankPlan,
    id,
    parseMoney,
    amountText,
    itinerary,
    totals,
    reorder,
    removeStop,
    quoteTotal,
    planContext,
    safeURL,
    validatePlan,
    exportBackup,
    importBackup,
    PlanStore,
    STORE_KEY,
} from '../../dist/src/domain/planner.js';
const stop = (name, nights = 2) => ({
    id: id(),
    name,
    country: '',
    code: '',
    lat: null,
    lon: null,
    nights,
    days: Array(nights).fill(''),
    pois: [],
});
const sample = () => {
    const p = blankPlan();
    p.title = 'A trip';
    p.start = '2028-02-28';
    p.travelers = 3;
    p.stops = [stop('Tokyo', 2), stop('Kyoto', 3)];
    return p;
};
const expense = (label, amount, quantity = 1) => ({
    id: id(),
    label,
    amount,
    quantity,
    category: 'stay',
    stopId: null,
    quoteId: null,
});
const quote = () => ({
    id: id(),
    kind: 'hotel',
    provider: 'User supplier',
    label: 'Manual record',
    scope: '2 nights',
    amount: 10025,
    quantity: 2,
    extras: 500,
    inclusions: 'Taxes entered by user',
    url: 'https://example.com/search?q=hotel',
    recordedAt: '2026-10-04T10:00:00.000Z',
    enteredAt: '2026-10-04T11:00:00.000Z',
    context: '',
});
test('decimal money preserves cents and rejects malformed numeric input', () => {
    for (const [s, n] of [
        ['0', 0],
        ['1.2', 120],
        ['0.01', 1],
        ['10000000.00', 1e9],
        [' 12.34 ', 1234],
    ])
        assert.equal(parseMoney(s), n);
    for (const s of ['', '-1', '1e3', 'NaN', 'Infinity', '1.234', '.5', '1,000', '10000000.01'])
        assert.throws(() => parseMoney(s));
    assert.equal(amountText(10025), '100.25');
});
test('sequential dates include leap day; reordering retains notes and IDs', () => {
    const p = sample();
    p.stops[0].days[0] = 'Reservation';
    assert.deepEqual(
        itinerary(p).map((s) => [s.arrival, s.departure]),
        [
            ['2028-02-28', '2028-03-01'],
            ['2028-03-01', '2028-03-04'],
        ],
    );
    const first = p.stops[0];
    assert.equal(reorder(p, first.id, -1), false);
    assert.equal(reorder(p, first.id, 1), true);
    assert.equal(p.stops[1].days[0], 'Reservation');
    assert.equal(itinerary(p)[1].arrival, '2028-03-02');
});
test('removing stop removes only directly linked expense records', () => {
    const p = sample(),
        removed = p.stops[0],
        retained = structuredClone(p.stops[1]);
    const linked = expense('Hotel', 10000, 2);
    linked.stopId = removed.id;
    const unrelated = expense('Train', 2500),
        other = expense('Second hotel', 5000);
    other.stopId = retained.id;
    p.expenses = [linked, unrelated, other];
    removeStop(p, removed.id);
    assert.deepEqual(p.stops, [retained]);
    assert.deepEqual(p.expenses, [unrelated, other]);
    assert.equal(totals(p).total, 7500);
    validatePlan(p);
});
test('manual totals, quantities, equal traveler split and budget balance', () => {
    const p = sample();
    p.budget = 10000;
    p.expenses = [
        expense('Hotel', 3001, 3),
        { ...expense('Train', 2000, 2), category: 'transport' },
    ];
    assert.deepEqual(totals(p), {
        total: 13003,
        perPerson: 4334,
        nights: 5,
        categories: { stay: 9003, transport: 4000, other: 0 },
        remaining: -3003,
    });
    p.quotes = [quote()];
    assert.equal(totals(p).total, 13003);
    assert.equal(quoteTotal(p.quotes[0]), 20550);
});
test('quote plan context changes with dates, traveler count or route, not daily notes', () => {
    const p = sample(),
        context = planContext(p);
    p.stops[0].days[0] = 'Hello';
    assert.equal(planContext(p), context);
    p.travelers++;
    assert.notEqual(planContext(p), context);
});
test('source links require https and reject credentials and active protocols', () => {
    assert.equal(safeURL(''), '');
    assert.equal(safeURL('https://example.com/a?q=1'), 'https://example.com/a?q=1');
    for (const s of [
        'javascript:alert(1)',
        'data:text/html,x',
        'http://example.com',
        'https://user:pass@example.com',
        'https://example.com/\npath',
    ])
        assert.throws(() => safeURL(s));
});
test('backup round trip preserves Unicode, manual record provenance and notes', () => {
    const p = sample();
    p.title = '香港 → 日本';
    p.stops[0].days[0] = '<script>alert(1)</script>';
    p.quotes = [quote()];
    const text = exportBackup(p);
    assert.deepEqual(importBackup(text), { ...p, travelers: 1 });
    assert.equal(importBackup(text).stops[0].days[0], '<script>alert(1)</script>');
});
test('import rejects unsupported versions, invalid JSON, malformed and oversized records', () => {
    const p = sample();
    const root = JSON.parse(exportBackup(p));
    for (const mutate of [
        (r) => (r.version = 2),
        (r) => (r.app = 'other'),
        (r) => (r.plan.start = '2026-02-30'),
        (r) => (r.plan.stops[0].lat = 100),
        (r) => (r.plan.stops[0].days = []),
        (r) => r.plan.stops.push(r.plan.stops[0]),
        (r) => (r.plan.currency = 'XYZ'),
        (r) => (r.plan.expenses = [expense('bad', -1)]),
    ]) {
        const r = structuredClone(root);
        mutate(r);
        assert.throws(() => importBackup(JSON.stringify(r)));
    }
    assert.throws(() => importBackup('{'));
    assert.throws(() => importBackup(' '.repeat(4 * 1024 * 1024 + 1)));
});
test('malformed saved data is protected without any writes', () => {
    let raw = '{bad',
        writes = 0;
    const s = new PlanStore({
        getItem: () => raw,
        setItem: (_k, v) => {
            raw = v;
            writes++;
        },
    });
    assert.deepEqual(s.load().plans, []);
    assert.ok(s.error);
    const p = sample();
    assert.equal(s.save([p], p.id), false);
    assert.equal(raw, '{bad');
    assert.equal(writes, 0);
});
test('storage conflicts do not overwrite another tab', () => {
    let raw = null;
    const adapter = { getItem: () => raw, setItem: (_k, v) => (raw = v) };
    const a = new PlanStore(adapter),
        b = new PlanStore(adapter);
    a.load();
    b.load();
    const p = sample();
    assert.equal(a.save([p], p.id), true);
    const saved = raw;
    assert.equal(b.save([blankPlan()], blankPlan().id), false);
    assert.equal(raw, saved);
    assert.match(b.error, /Another tab/);
});
test('valid local save/reload retains all separate trips and active ID', () => {
    const storage = new Map();
    const adapter = {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
    };
    const a = new PlanStore(adapter);
    a.load();
    const p = sample(),
        q = blankPlan();
    assert.equal(a.save([p, q], q.id), true);
    assert.ok(storage.has(STORE_KEY));
    assert.deepEqual(new PlanStore(adapter).load(), {
        plans: [{ ...p, travelers: 1 }, q],
        activeId: q.id,
    });
});
test('unavailable and full device storage leave useful errors', () => {
    const s = new PlanStore({
        getItem: () => {
            throw Error('denied');
        },
        setItem: () => {},
    });
    s.load();
    assert.match(s.error, /unavailable/);
    const p = sample(),
        full = new PlanStore({
            getItem: () => null,
            setItem: () => {
                throw Error('quota');
            },
        });
    full.load();
    assert.equal(full.save([p], p.id), false);
    assert.match(full.error, /full or unavailable/);
});

test('new exports omit obsolete travelers; legacy imports ignore it without changing itinerary', () => {
    const p = blankPlan(),
        json = JSON.parse(exportBackup(p));
    assert.equal('travelers' in json.plan, false);
    assert.deepEqual(importBackup(JSON.stringify(json)), p);
    for (const obsolete of [1, 4, 999, 'legacy']) {
        json.plan.travelers = obsolete;
        assert.deepEqual(importBackup(JSON.stringify(json)), p);
    }
});
import { alternateTripOptions } from '../../dist/src/domain/saved-trips.js';

test('saved-trip menu excludes active and repeated IDs without changing stored records', () => {
    const active = { ...sample(), id: 'active' },
        other = { ...sample(), id: 'other', title: 'Another trip' },
        third = { ...sample(), id: 'third', title: 'Third trip' };
    const records = [
            active,
            structuredClone(active),
            other,
            { ...structuredClone(other), title: 'Duplicate ID record' },
            third,
        ],
        before = JSON.stringify(records);
    assert.deepEqual(
        alternateTripOptions(records, active, (p) => p.title),
        [
            { id: 'other', label: 'Another trip' },
            { id: 'third', label: 'Third trip' },
        ],
    );
    assert.equal(JSON.stringify(records), before);
});
test('distinct saved trip IDs with the active title remain available and show their dates', () => {
    const active = { ...sample(), id: 'current', title: 'Same trip name', start: '2026-10-28' },
        other = { ...sample(), id: 'older', title: 'Same trip name', start: '2026-10-02' },
        unique = { ...sample(), id: 'unique', title: 'Other title' };
    assert.deepEqual(
        alternateTripOptions([active, other, unique], active, (p) => p.title),
        [
            { id: 'older', label: 'Same trip name · 2026-10-02' },
            { id: 'unique', label: 'Other title' },
        ],
    );
});
test('same-title same-date distinct IDs get stable unique labels as active selection changes', () => {
    const records = ['a', 'b', 'c'].map((id) => ({
        ...sample(),
        id,
        title: 'Same title',
        start: '2026-10-28',
    }));
    assert.deepEqual(
        alternateTripOptions(records, records[0], (p) => p.title).map((o) => o.label),
        ['Same title · 2026-10-28 · #2', 'Same title · 2026-10-28 · #3'],
    );
    assert.deepEqual(
        alternateTripOptions(records, records[1], (p) => p.title).map((o) => o.label),
        ['Same title · 2026-10-28 · #1', 'Same title · 2026-10-28 · #3'],
    );
});
