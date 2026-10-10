import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    joinVerifiedRoutes,
    reverseRoute,
    simulatedArcWindow,
    routeDrawDuration,
    simulationGlow,
} from '../../dist/src/features/globe/simulated-routes.js';
import { notificationKind } from '../../dist/src/ui/notifications.js';
import { geoArea } from 'd3-geo';
import { dictionary } from '../../dist/src/i18n/locales/zh-Hant.js';
import { cantoneseMessages } from '../../dist/src/i18n/locales/yue-Hant.js';
const fullCatalog = JSON.parse(await readFile('public/data/simulated-routes.json', 'utf8')),
    catalog = {
        ...fullCatalog,
        routes: fullCatalog.routes.slice(0, 144),
        routeCount: 144,
        verifiedEnabledCount: 144,
    },
    airports = JSON.parse(await readFile('public/data/airports.json', 'utf8')).airports;
const addedRouteIds = [
    'CHC-AKL',
    'CHC-WLG',
    'CHC-ZQN',
    'WLG-AKL',
    'WLG-CHC',
    'WLG-ZQN',
    'ZQN-AKL',
    'ZQN-CHC',
    'ZQN-WLG',
    'FRA-HKG',
    'FRA-LHR',
    'FRA-JFK',
    'FRA-SIN',
    'LHR-ORD',
    'TPE-HKG',
    'SIN-HKG',
    'SIN-TPE',
    'SIN-NRT',
    'SIN-SYD',
    'AMS-SIN',
    'TPE-NRT',
    'TPE-KIX',
    'TPE-SIN',
    'TPE-BKK',
    'TPE-SEA',
    'TPE-LAX',
    'TPE-SFO',
    'RMQ-MFM',
    'RMQ-OKA',
    'MFM-TPE',
    'MFM-RMQ',
    'SEA-TPE',
    'NRT-TPE',
    'BKK-TPE',
    'KHH-HKG',
    'KHH-NRT',
    'KHH-KIX',
    'KHH-ICN',
    'KHH-SIN',
    'KHH-BKK',
    'MFM-KHH',
    'YVR-TPE',
    'YVR-NRT',
    'YVR-LHR',
    'YVR-ICN',
    'AMS-HKG',
    'CDG-HKG',
    'LHR-HKG',
    'NRT-HKG',
    'RMQ-HKG',
    'RMQ-SGN',
    'RMQ-TAK',
    'AMS-LHR',
    'AMS-FRA',
    'CDG-FRA',
    'LHR-FRA',
    'CDG-SIN',
    'BKK-SIN',
    'NRT-SIN',
    'BKK-NRT',
    'BKK-ICN',
    'SEA-NRT',
    'SEA-CDG',
    'SEA-LHR',
    'NRT-SEA',
    'MFM-NRT',
    'MFM-ICN',
    'HKG-KHH',
    'HKG-RMQ',
];
const expandedDestinations = {
    AMS: ['DXB', 'FRA', 'HKG', 'LHR', 'SIN'],
    BKK: ['HKG', 'ICN', 'NRT', 'SIN', 'TPE'],
    CDG: ['DXB', 'FRA', 'HKG', 'SIN'],
    FRA: ['DXB', 'HKG', 'JFK', 'LHR', 'SIN'],
    LHR: ['DXB', 'FRA', 'HKG', 'ORD'],
    NRT: ['DXB', 'HKG', 'SEA', 'SIN', 'TPE'],
    SEA: ['CDG', 'HKG', 'LHR', 'NRT', 'TPE'],
    SIN: ['DXB', 'HKG', 'NRT', 'SYD', 'TPE'],
    YVR: ['HKG', 'ICN', 'LHR', 'NRT', 'TPE'],
    CHC: ['AKL', 'MEL', 'SYD', 'WLG', 'ZQN'],
    WLG: ['AKL', 'CHC', 'MEL', 'SYD', 'ZQN'],
    ZQN: ['AKL', 'CHC', 'MEL', 'SYD', 'WLG'],
    TPE: ['BKK', 'HKG', 'KIX', 'LAX', 'NRT', 'SEA', 'SFO', 'SIN'],
    KHH: ['BKK', 'HKG', 'ICN', 'KIX', 'NRT', 'SIN'],
    RMQ: ['HKG', 'MFM', 'OKA', 'SGN', 'TAK'],
    MFM: ['ICN', 'KHH', 'NRT', 'RMQ', 'TPE'],
};
test('notifications classify successful actions separately from missing inputs and unknown warnings', () => {
    for (const key of ['Stop added.', 'Place saved.', 'Backup exported.'])
        assert.equal(notificationKind(key), 'info');
    for (const key of [
        'Enter a place name.',
        'Choose a city name and 1–90 nights.',
        'Street map unavailable. Places and external directions still work.',
        'Unexpected validation failure',
    ])
        assert.equal(notificationKind(key), 'warning');
});
test('long routes run about three times faster, short routes slower, glow bounded and reduced motion static', () => {
    const joined = joinVerifiedRoutes(catalog, airports),
        route = (id) => {
            const r = joined.find((r) => r.id === id);
            return { id, origin: r.from, destination: r.to };
        },
        long = routeDrawDuration(route('HKG-YVR')),
        short = routeDrawDuration(route('HKG-BKK'));
    assert.ok(Math.abs(4800 / long - 3) < 0.03);
    assert.ok(short > long * 1.8 && short < 4800);
    assert.equal(routeDrawDuration(route('YVR-HKG')), long);
    const draw = simulatedArcWindow(long / 2, false, long),
        erase = simulatedArcWindow(long * 1.625, false, long);
    assert.equal(draw.phase, 'drawing');
    assert.ok(Math.abs(draw.end - 0.5) < 1e-12);
    assert.equal(erase.phase, 'erasing');
    assert.ok(Math.abs(erase.start - 0.5) < 1e-12);
    for (let time = 0; time < 6000; time += 50) {
        assert.ok(simulationGlow(time) >= 0.28 && simulationGlow(time) <= 1);
        assert.equal(simulationGlow(time, true), 1);
    }
    assert.deepEqual(simulatedArcWindow(9999, true, long), { start: 0, end: 1, phase: 'static' });
});
test('expanded directional whitelist joins all 144 exact airport coordinates', () => {
    const routes = joinVerifiedRoutes(catalog, airports);
    assert.equal(routes.length, 144);
    assert.equal(catalog.routeCount, routes.length);
    assert.equal(catalog.verifiedEnabledCount, routes.length);
    assert.equal(new Set(routes.map((r) => r.id)).size, 144);
    assert.deepEqual(
        routes.map((r) => r.id),
        [
            'HKG-YVR',
            'YVR-HKG',
            'HKG-SEA',
            'SEA-HKG',
            'HKG-BKK',
            'BKK-HKG',
            'HKG-DXB',
            'DXB-HKG',
            'ORD-LHR',
            'ORD-FRA',
            'ORD-AMS',
            'ORD-BOG',
            'ORD-GRU',
            'ORD-MEX',
            'ORD-CAI',
            'AKL-SYD',
            'AKL-MEL',
            'AKL-LAX',
            'AKL-BNE',
            'AKL-OOL',
            'AKL-ADL',
            'AKL-PER',
            'AKL-HBA',
            'AKL-CNS',
            'AKL-MCY',
            'CHC-SYD',
            'CHC-MEL',
            'WLG-SYD',
            'WLG-MEL',
            'ZQN-SYD',
            'ZQN-MEL',
            'AKL-HNL',
            'AKL-IAH',
            'AKL-JFK',
            'AKL-SFO',
            'AKL-YVR',
            'AKL-RAR',
            'AKL-NAN',
            'AKL-IUE',
            'AKL-APW',
            'AKL-TBU',
            'AKL-PPT',
            'DXB-SIN',
            'SIN-DXB',
            'DXB-NRT',
            'NRT-DXB',
            'DXB-LHR',
            'LHR-DXB',
            'HKG-TPE',
            'HKG-NRT',
            'HKG-HND',
            'HKG-KIX',
            'HKG-ICN',
            'HKG-SIN',
            'HKG-SYD',
            'HKG-MEL',
            'HKG-AKL',
            'HKG-LHR',
            'HKG-CDG',
            'HKG-YYZ',
            'AKL-HKG',
            'AKL-NRT',
            'AKL-SIN',
            'AKL-TPE',
            'AKL-PVG',
            'AKL-DPS',
            'DXB-CDG',
            'CDG-DXB',
            'DXB-FRA',
            'FRA-DXB',
            'DXB-AMS',
            'AMS-DXB',
            'ORD-CDG',
            'ORD-MAD',
            'ORD-FCO',
            ...addedRouteIds,
        ],
    );
    for (const r of routes) {
        assert.equal(r.from.code, r.origin.iata);
        assert.equal(r.to.code, r.destination.iata);
        assert.equal(r.from.country, r.origin.countryCode);
    }
});
test('missing coordinates, wrong country and disabled evidence never create routes or reversals', () => {
    assert.equal(
        joinVerifiedRoutes(
            catalog,
            airports.filter((a) => a.code !== 'HKG'),
        ).length,
        catalog.routes.filter((r) => r.origin.iata !== 'HKG' && r.destination.iata !== 'HKG')
            .length,
    );
    const altered = structuredClone(catalog);
    altered.routes[0].enabled = false;
    altered.routes[1].origin.countryCode = 'ZZ';
    altered.routes[2].verificationStatus = 'indexed_only';
    assert.equal(joinVerifiedRoutes(altered, airports).length, 141);
    assert.equal(
        joinVerifiedRoutes({ ...catalog, routes: [...catalog.routes, catalog.routes[0]] }, airports)
            .length,
        144,
    );
    const invalidCoordinates = airports.map((a) =>
        a.code === 'HKG' ? { ...a, lat: Infinity } : a,
    );
    assert.equal(
        joinVerifiedRoutes(catalog, invalidCoordinates).length,
        catalog.routes.filter((r) => r.origin.iata !== 'HKG' && r.destination.iata !== 'HKG')
            .length,
    );
    assert.equal(
        joinVerifiedRoutes(
            { ...catalog, simulation: { ...catalog.simulation, liveFlightTracking: true } },
            airports,
        ).length,
        0,
    );
    assert.equal(
        joinVerifiedRoutes(catalog, airports).some(
            (r) =>
                r.id === 'YYZ-HKG' ||
                r.id === 'HKG-TSA' ||
                r.id === 'HKG-ITM' ||
                r.id === 'NRT-AKL' ||
                r.id === 'CHC-NRT' ||
                r.id === 'CHC-SIN' ||
                r.id === 'AKL-ORD' ||
                r.id === 'AKL-WSI' ||
                r.id === 'CHC-PER' ||
                r.id === 'NAN-AKL',
        ),
        false,
    );
});
test('source limits and real flight references stay evidence rather than animated identifiers', () => {
    const sea = catalog.routes.find((r) => r.id === 'HKG-SEA');
    assert.equal(sea.evidence.validThrough, '2026-10-24');
    assert.deepEqual(sea.evidence.referenceFlightNumbers, ['CX852']);
    assert.equal(
        catalog.routes.filter((r) => r.evidence.sourcePublishedDate === '2026-09-01').length,
        10,
    );
    assert.equal(catalog.simulation.realFlightNumbersForAnimatedObjects, false);
    assert.equal(catalog.simulation.runtimeFlightAPIRequired, false);
    assert.ok(catalog.routes.slice(0, 18).every((r) => r.checkedDate === '2026-10-05'));
    assert.ok(catalog.routes.slice(18, 48).every((r) => r.checkedDate === '2026-10-10'));
    assert.ok(catalog.routes.slice(48).every((r) => r.checkedDate === '2026-10-10'));
    assert.match(catalog.routes.find((r) => r.id === 'AKL-CNS').seasonality, /April–October/);
    assert.match(catalog.routes.find((r) => r.id === 'AKL-HBA').seasonality, /October–March/);
    assert.match(catalog.routes.find((r) => r.id === 'AKL-DPS').seasonality, /Seasonal/);
});
test('destination coverage expands each existing source with exact airport identities and limits', () => {
    const destinations = (origin) =>
        new Set(
            catalog.routes.filter((r) => r.origin.iata === origin).map((r) => r.destination.iata),
        );
    assert.deepEqual([...destinations('HKG')].sort(), [
        'AKL',
        'BKK',
        'CDG',
        'DXB',
        'HND',
        'ICN',
        'KHH',
        'KIX',
        'LHR',
        'MEL',
        'NRT',
        'RMQ',
        'SEA',
        'SIN',
        'SYD',
        'TPE',
        'YVR',
        'YYZ',
    ]);
    for (const [origin, additions, total] of [
        ['AKL', ['HKG', 'NRT', 'SIN', 'TPE', 'PVG', 'DPS'], 27],
        ['DXB', ['CDG', 'FRA', 'AMS'], 7],
        ['ORD', ['CDG', 'MAD', 'FCO'], 10],
    ]) {
        assert.equal(destinations(origin).size, total);
        for (const to of additions) assert.ok(destinations(origin).has(to));
    }
    assert.equal(catalog.routes.find((r) => r.id === 'ORD-MAD').carrier.iata, 'AA');
    for (const to of [
        'TPE',
        'NRT',
        'HND',
        'KIX',
        'ICN',
        'SIN',
        'SYD',
        'MEL',
        'AKL',
        'LHR',
        'CDG',
        'YYZ',
    ]) {
        const route = catalog.routes.find((r) => r.id === `HKG-${to}`);
        assert.equal(
            route.evidence.sourceURL,
            'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
        );
        assert.equal(route.evidence.validFrom, '2026-10-10');
        assert.equal(route.evidence.validThrough, '2026-10-16');
        assert.match(route.seasonality, /beyond that period is not asserted/);
        assert.equal(route.evidence.referenceFlightNumbers.length, 1);
        assert.equal(route.carrier.iata, 'CX');
    }
    assert.equal(catalog.historicalCandidateResearch.indexedCount, 8);
    assert.deepEqual(catalog.historicalCandidateResearch.promotedRouteIds, ['HKG-YYZ']);
});
test('expanded sources preserve all 75 baseline objects and exact approved coverage', () => {
    assert.equal(
        createHash('sha256')
            .update(JSON.stringify(catalog.routes.slice(0, 75)))
            .digest('hex'),
        '8a967d4b1b40fca7872cc7b9fc1cf437f7e2a750dfef2f7da8d68c1e72f8cb41',
    );
    assert.deepEqual(
        catalog.routes.slice(75).map((r) => r.id),
        addedRouteIds,
    );
    const joined = joinVerifiedRoutes(catalog, airports);
    for (const [origin, expected] of Object.entries(expandedDestinations)) {
        assert.deepEqual(
            joined
                .filter((r) => r.origin.iata === origin)
                .map((r) => r.destination.iata)
                .sort(),
            expected,
        );
    }
    assert.deepEqual(
        [
            ...new Set(
                joined.filter((r) => r.origin.countryCode === 'TW').map((r) => r.origin.iata),
            ),
        ].sort(),
        ['KHH', 'RMQ', 'TPE'],
    );
    assert.deepEqual(
        [...new Set(joined.filter((r) => r.origin.countryCode === 'MO').map((r) => r.origin.iata))],
        ['MFM'],
    );
    assert.equal(catalog.routes.find((r) => r.id === 'RMQ-HKG').carrier.iata, 'UO');
    assert.equal(catalog.routes.find((r) => r.id === 'LHR-ORD').carrier.iata, 'UA');
    assert.equal(catalog.routes.find((r) => r.id === 'MFM-NRT').carrier.iata, 'NX');
    assert.equal(
        catalog.routes.find((r) => r.id === 'RMQ-SGN').evidence.validThrough,
        '2026-10-24',
    );
    assert.ok(catalog.routes.slice(75).every((r) => r.checkedDate === '2026-10-10'));
});
test('Hong Kong offers three exact Taiwan destinations with independently verified operators', () => {
    const routes = joinVerifiedRoutes(catalog, airports).filter(
        (route) => route.origin.iata === 'HKG' && route.destination.countryCode === 'TW',
    );
    assert.deepEqual(routes.map((route) => route.destination.iata).sort(), ['KHH', 'RMQ', 'TPE']);
    assert.equal(
        createHash('sha256')
            .update(JSON.stringify(catalog.routes.slice(0, 142)))
            .digest('hex'),
        '32a60d20a368f50187054f0fc29ede0fc1424aafc45b75899c6a4919d783d1d6',
    );
    for (const [id, operator, reference] of [
        ['HKG-KHH', 'CX', 'CX432'],
        ['HKG-RMQ', 'UO', 'CX5192'],
    ]) {
        const route = routes.find((item) => item.id === id);
        assert.equal(route.carrier.iata, operator);
        assert.equal(route.checkedDate, '2026-10-10');
        assert.equal(route.evidence.validFrom, '2026-10-10');
        assert.equal(route.evidence.validThrough, '2026-10-16');
        assert.deepEqual(route.evidence.referenceFlightNumbers, [reference]);
        assert.equal(
            route.evidence.sourceURL,
            'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
        );
        assert.match(route.evidence.summary, /explicit zero stops/);
        assert.match(
            route.evidence.supportingSourceURLs[0],
            new RegExp('origin=HKG&destination=' + route.destination.iata + '&'),
        );
        assert.match(route.seasonality, /beyond that period is not asserted/);
    }
});
test('nearby airports, wrong countries and nonfinite coordinates cannot substitute for new origins', () => {
    const only = (id) => ({ ...catalog, routes: [catalog.routes.find((r) => r.id === id)] });
    for (const [origin, substitutes] of [
        ['TPE', ['TSA']],
        ['RMQ', ['TPE', 'KHH']],
        ['BKK', ['DMK']],
        ['MFM', ['HKG']],
    ]) {
        const single = only(origin + '-' + expandedDestinations[origin][0]);
        for (const substitute of substitutes) {
            const missing = airports.filter((a) => a.code !== origin);
            assert.equal(
                joinVerifiedRoutes(single, missing).length,
                0,
                substitute + ' cannot replace ' + origin,
            );
        }
        for (const lat of [NaN, Infinity, 91]) {
            assert.equal(
                joinVerifiedRoutes(
                    single,
                    airports.map((a) => (a.code === origin ? { ...a, lat } : a)),
                ).length,
                0,
            );
        }
        for (const lon of [NaN, Infinity, 181]) {
            assert.equal(
                joinVerifiedRoutes(
                    single,
                    airports.map((a) => (a.code === origin ? { ...a, lon } : a)),
                ).length,
                0,
            );
        }
        const wrong = structuredClone(single);
        wrong.routes[0].origin.countryCode = 'ZZ';
        assert.equal(joinVerifiedRoutes(wrong, airports).length, 0);
    }
});
test('draw and erase both progress from origin to destination and loop continuously', () => {
    assert.deepEqual(simulatedArcWindow(0), { start: 0, end: 0, phase: 'drawing' });
    assert.deepEqual(simulatedArcWindow(2400), { start: 0, end: 0.5, phase: 'drawing' });
    assert.deepEqual(simulatedArcWindow(5000), { start: 0, end: 1, phase: 'holding' });
    assert.deepEqual(simulatedArcWindow(7800), { start: 0.5, end: 1, phase: 'erasing' });
    assert.deepEqual(simulatedArcWindow(10800), { start: 1, end: 1, phase: 'waiting' });
    assert.deepEqual(simulatedArcWindow(11000), simulatedArcWindow(0));
    assert.deepEqual(simulatedArcWindow(999999, true), { start: 0, end: 1, phase: 'static' });
});
test('geographic assets retain grounded rings, holes, licenses and real river coordinates', async () => {
    const vegetation = JSON.parse(await readFile('public/data/vegetation.geojson', 'utf8')),
        rivers = JSON.parse(await readFile('public/data/rivers.geojson', 'utf8')),
        source = JSON.parse(await readFile('public/data/geography-provenance.json', 'utf8'));
    assert.equal(source.vegetation.license, 'CC-BY-4.0');
    assert.equal(source.rivers.license, 'Public domain');
    assert.equal(vegetation.features.length, source.vegetation.features);
    assert.ok(vegetation.features.length > 500);
    assert.ok(vegetation.features.some((f) => f.geometry.coordinates.length > 1));
    for (const f of vegetation.features) {
        assert.ok([1, 2, 3, 4, 5, 6, 12, 14].includes(f.properties.biome));
        assert.ok(geoArea(f.geometry) < Math.PI * 2);
        for (const ring of f.geometry.coordinates) {
            assert.deepEqual(ring[0], ring.at(-1));
            for (const [lon, lat] of ring) {
                assert.ok(Math.abs(lon) <= 180 && Math.abs(lat) <= 90);
            }
        }
    }
    assert.equal(rivers.features.length, 13);
    assert.ok(rivers.features.some((f) => f.properties.name === 'Amazonas'));
    assert.ok(rivers.features.some((f) => f.properties.name === 'Nile'));
});

test('breathing period scales with the same route duration as draw/erase, independently of wall-clock speed', () => {
    for (const u of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2.5])
        assert.ok(
            Math.abs(
                simulationGlow(u * 1600, false, 1600) - simulationGlow(u * 3600, false, 3600),
            ) < 1e-12,
        );
    assert.ok(Math.abs(simulationGlow(600, false, 1600) - 1) < 1e-12);
    assert.ok(Math.abs(simulationGlow(1800, false, 1600) - 0.28) < 1e-12);
    assert.equal(simulationGlow(600, true, 1600), 1);
});

const verifiedReverseIds = [
    'FRA-ORD',
    'AMS-ORD',
    'SYD-AKL',
    'MEL-AKL',
    'LAX-AKL',
    'BNE-AKL',
    'OOL-AKL',
    'ADL-AKL',
    'PER-AKL',
    'HBA-AKL',
    'CNS-AKL',
    'MCY-AKL',
    'SYD-CHC',
    'MEL-CHC',
    'SYD-WLG',
    'MEL-WLG',
    'SYD-ZQN',
    'MEL-ZQN',
    'HNL-AKL',
    'IAH-AKL',
    'SFO-AKL',
    'YVR-AKL',
    'RAR-AKL',
    'NAN-AKL',
    'IUE-AKL',
    'APW-AKL',
    'TBU-AKL',
    'PPT-AKL',
    'HND-HKG',
    'KIX-HKG',
    'ICN-HKG',
    'SYD-HKG',
    'MEL-HKG',
    'YYZ-HKG',
    'NRT-AKL',
    'SIN-AKL',
    'PVG-AKL',
    'DPS-AKL',
    'CDG-ORD',
    'FCO-ORD',
    'AKL-CHC',
    'AKL-WLG',
    'AKL-ZQN',
    'HKG-FRA',
    'JFK-FRA',
    'SIN-FRA',
    'SYD-SIN',
    'SIN-AMS',
    'KIX-TPE',
    'LAX-TPE',
    'SFO-TPE',
    'OKA-RMQ',
    'TPE-MFM',
    'NRT-KHH',
    'KIX-KHH',
    'ICN-KHH',
    'SIN-KHH',
    'BKK-KHH',
    'KHH-MFM',
    'NRT-YVR',
    'LHR-YVR',
    'HKG-AMS',
    'SGN-RMQ',
    'TAK-RMQ',
    'FRA-AMS',
    'FRA-CDG',
    'SIN-CDG',
    'SIN-BKK',
    'CDG-SEA',
    'LHR-SEA',
    'NRT-MFM',
    'ICN-MFM',
    'JFK-AKL',
    'TPE-AKL',
];
const unresolvedReverseIds = [
    'BOG-ORD',
    'GRU-ORD',
    'MEX-ORD',
    'CAI-ORD',
    'MAD-ORD',
    'TPE-YVR',
    'ICN-YVR',
    'LHR-AMS',
    'NRT-BKK',
    'ICN-BKK',
];
test('independently verified reverse inventory preserves all 144 baseline records', () => {
    assert.equal(
        createHash('sha256')
            .update(JSON.stringify(fullCatalog.routes.slice(0, 144)))
            .digest('hex'),
        'f8a951422f3197d8262b86f4e1fef6d1890155e801d85df04d7cd2317950c035',
    );
    assert.deepEqual(
        fullCatalog.routes.slice(144).map((r) => r.id),
        verifiedReverseIds,
    );
    assert.equal(fullCatalog.routeCount, 144 + verifiedReverseIds.length);
    assert.equal(fullCatalog.verifiedEnabledCount, fullCatalog.routeCount);
    const joined = joinVerifiedRoutes(fullCatalog, airports);
    assert.equal(joined.length, fullCatalog.routeCount);
    assert.equal(new Set(joined.map((r) => r.id)).size, joined.length);
    for (const id of unresolvedReverseIds) assert.ok(!joined.some((r) => r.id === id), id);
    for (const id of verifiedReverseIds) {
        const route = joined.find((r) => r.id === id);
        assert.equal(route.checkedDate, '2026-10-10');
        assert.ok(route.evidence.sourceURL.startsWith('https://'));
        assert.ok(route.seasonality);
        assert.match(dictionary[route.seasonality], /[\u3400-\u9fff]/);
        assert.match(
            cantoneseMessages[route.seasonality] ?? dictionary[route.seasonality],
            /[\u3400-\u9fff]/,
        );
        const inverse = reverseRoute(joined, route);
        assert.ok(inverse);
        assert.equal(reverseRoute(joined, inverse).id, id);
    }
    assert.equal(joined.find((r) => r.id === 'HKG-FRA').carrier.iata, 'LH');
    assert.equal(joined.find((r) => r.id === 'AMS-ORD').carrier.iata, 'UA');
    assert.equal(joined.find((r) => r.id === 'LHR-YVR').carrier.iata, 'AC');
});
test('reverse lookup uses the validated inverse record and fails closed', () => {
    const joined = joinVerifiedRoutes(fullCatalog, airports);
    const route = joined.find((r) => r.id === 'AKL-SYD');
    const inverse = reverseRoute(joined, route);
    assert.equal(inverse.id, 'SYD-AKL');
    assert.notDeepEqual(inverse.evidence, route.evidence);
    assert.equal(reverseRoute(joined, undefined), undefined);
    assert.equal(
        reverseRoute(
            joined.filter((r) => r.id !== inverse.id),
            route,
        ),
        undefined,
    );
    const invalid = structuredClone(fullCatalog);
    invalid.routes.find((r) => r.id === inverse.id).enabled = false;
    assert.equal(reverseRoute(joinVerifiedRoutes(invalid, airports), route), undefined);
    invalid.schemaVersion = 0;
    assert.equal(reverseRoute(joinVerifiedRoutes(invalid, airports), route), undefined);
});
