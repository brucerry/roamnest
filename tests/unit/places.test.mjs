import test from 'node:test';
import assert from 'node:assert/strict';
import {
    blankPlan,
    id,
    validatePlan,
    exportBackup,
    importBackup,
} from '../../dist/src/domain/planner.js';
import {
    coordinates,
    reorderPOI,
    dayPlaces,
    routeKey,
    routingURL,
    parseRoadRoute,
    directionsURL,
} from '../../dist/src/domain/places.js';
const poi = (name, day = 0, lat = 52.52, lon = 13.41) => ({
    id: id(),
    name,
    day,
    address: 'User entered address',
    lat,
    lon,
    notes: '',
});
const sample = () => {
    const p = blankPlan();
    p.stops = [
        {
            id: id(),
            name: 'Berlin',
            country: 'DE',
            code: 'BER',
            lat: 52.3667,
            lon: 13.5033,
            nights: 2,
            days: ['', ''],
            pois: [poi('First'), poi('Tomorrow', 1), poi('Second', 0, 52.5, 13.42)],
        },
    ];
    return p;
};
test('coordinates accept zero, negatives and valid boundaries without treating blanks as zero', () => {
    assert.deepEqual(coordinates('', ''), { lat: null, lon: null });
    assert.deepEqual(coordinates('0', '0'), { lat: 0, lon: 0 });
    assert.deepEqual(coordinates('-90', '180'), { lat: -90, lon: 180 });
    for (const [a, b] of [
        ['', '1'],
        ['1', ''],
        ['91', '0'],
        ['0', '-181'],
        ['NaN', '0'],
        ['1e2', '0'],
        ['Infinity', '0'],
    ])
        assert.throws(() => coordinates(a, b));
});
test('place reorder stays within its day and retains address and genuine coordinates', () => {
    const p = sample(),
        s = p.stops[0],
        original = s.pois[0],
        tomorrow = s.pois[1];
    assert.equal(reorderPOI(s, original.id, 1), true);
    assert.deepEqual(
        dayPlaces(s, 0).map((p) => p.name),
        ['Second', 'First'],
    );
    assert.deepEqual(s.pois[1], tomorrow);
    assert.deepEqual(s.pois[2], original);
    assert.equal(reorderPOI(s, original.id, 1), false);
});
test('place backups preserve day association, addresses, notes and order', () => {
    const p = sample();
    p.stops[0].pois[0].notes = '予約済み';
    assert.deepEqual(importBackup(exportBackup(p)), p);
});
test('invalid place days, mixed or out-of-range coordinates, duplicate IDs and excess text are rejected', () => {
    for (const mutate of [
        (p) => (p.stops[0].pois[0].day = 2),
        (p) => (p.stops[0].pois[0].lat = null),
        (p) => (p.stops[0].pois[0].lon = 181),
        (p) => p.stops[0].pois.push(p.stops[0].pois[0]),
        (p) => (p.stops[0].pois[0].address = 'x'.repeat(301)),
    ]) {
        const p = sample();
        mutate(p);
        assert.throws(() => validatePlan(p));
    }
});
test('backups created before places existed remain supported', () => {
    const p = sample();
    delete p.stops[0].pois;
    assert.deepEqual(validatePlan(p).stops[0].pois, []);
});
test('route endpoints select the actual supported server profile and longitude-first coordinates', () => {
    const list = dayPlaces(sample().stops[0], 0);
    for (const mode of ['foot', 'car', 'bike']) {
        const url = new URL(routingURL(list, mode));
        assert.match(url.pathname, new RegExp('/routed-' + mode + '/'));
        assert.match(url.pathname, /13\.41,52\.52;13\.42,52\.5/);
        assert.equal(url.searchParams.get('geometries'), 'geojson');
    }
    assert.throws(() => routingURL(list, 'transit'));
    assert.throws(() => routingURL([list[0]], 'foot'));
    assert.throws(() => routingURL([list[0], { ...list[1], lat: null, lon: null }], 'foot'));
    assert.throws(() => routingURL([list[0], { ...list[1], lat: 1, lon: 1 }], 'foot'));
});
test('route cache key changes with visit order, coordinates and mode', () => {
    const list = dayPlaces(sample().stops[0], 0),
        key = routeKey(list, 'foot');
    assert.notEqual(routeKey([...list].reverse(), 'foot'), key);
    assert.notEqual(routeKey(list, 'car'), key);
    list[0].lat += 0.001;
    assert.notEqual(routeKey(list, 'foot'), key);
});
test('road geometry is accepted only for real usable successful responses', () => {
    const data = {
        code: 'Ok',
        routes: [
            {
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [13.41, 52.52],
                        [13.415, 52.515],
                        [13.42, 52.5],
                    ],
                },
                distance: 1800,
                duration: 1200,
            },
        ],
    };
    const r = parseRoadRoute(data, 'foot');
    assert.equal(r.coordinates.length, 3);
    assert.equal(r.distance, 1800);
    assert.equal(r.mode, 'foot');
    assert.ok(Date.parse(r.fetchedAt));
    for (const invalid of [
        null,
        {},
        { ...data, code: 'NoRoute' },
        {
            ...data,
            routes: [
                {
                    ...data.routes[0],
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [Infinity, 52.52],
                            [13.42, 52.5],
                        ],
                    },
                },
            ],
        },
        { ...data, routes: [{ ...data.routes[0], duration: -1 }] },
    ])
        assert.throws(() => parseRoadRoute(invalid, 'foot'));
});
test('external destination directions preserve addresses, coordinates, mode and safe encoding', () => {
    const list = dayPlaces(sample().stops[0], 0);
    const url = new URL(directionsURL(list[0], list[1], 'Berlin', 'bike'));
    assert.equal(url.hostname, 'www.google.com');
    assert.equal(url.searchParams.get('api'), '1');
    assert.equal(url.searchParams.get('travelmode'), 'bicycling');
    assert.equal(url.searchParams.get('origin'), '52.52,13.41');
    list[1].lat = null;
    list[1].lon = null;
    list[1].address = 'A&B <district>';
    const manual = new URL(directionsURL(list[0], list[1], 'Berlin', 'foot'));
    assert.match(manual.searchParams.get('destination'), /A&B <district>/);
    assert.equal(manual.searchParams.get('travelmode'), 'walking');
});

test('directions modes distinguish explicit attraction origins and unresolved current origin', () => {
    const a = poi('A'),
        b = poi('B', 0, 52.5, 13.42);
    for (const [mode, expected] of [
        ['foot', 'walking'],
        ['bike', 'bicycling'],
        ['car', 'driving'],
    ]) {
        const adjacent = new URL(directionsURL(a, b, 'Berlin', mode));
        assert.equal(adjacent.searchParams.get('origin'), '52.52,13.41');
        assert.equal(adjacent.searchParams.get('destination'), '52.5,13.42');
        assert.equal(adjacent.searchParams.get('travelmode'), expected);
        const current = new URL(directionsURL(null, a, 'Berlin', mode));
        assert.equal(current.searchParams.has('origin'), false);
        assert.equal(current.searchParams.get('destination'), '52.52,13.41');
    }
    const unknown = { ...a, lat: null, lon: null, address: '' };
    assert.equal(directionsURL(unknown, b, 'Berlin', 'foot'), '');
    assert.equal(directionsURL(a, unknown, 'Berlin', 'foot'), '');
    assert.equal(directionsURL(a, b, 'Berlin', 'transit'), '');
});
