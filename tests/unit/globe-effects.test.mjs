import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    joinVerifiedRoutes,
    simulatedArcWindow,
    routeDrawDuration,
    simulationGlow,
} from '../../dist/src/features/globe/simulated-routes.js';
import { notificationKind } from '../../dist/src/ui/notifications.js';
import { geoArea } from 'd3-geo';
const catalog = JSON.parse(await readFile('public/data/simulated-routes.json', 'utf8')),
    airports = JSON.parse(await readFile('public/data/airports.json', 'utf8')).airports;
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
test('verified directional whitelist joins all 18 exact airport coordinates', () => {
    const routes = joinVerifiedRoutes(catalog, airports);
    assert.equal(routes.length, 18);
    assert.equal(new Set(routes.map((r) => r.id)).size, 18);
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
        10,
    );
    const altered = structuredClone(catalog);
    altered.routes[0].enabled = false;
    altered.routes[1].origin.countryCode = 'ZZ';
    altered.routes[2].verificationStatus = 'indexed_only';
    assert.equal(joinVerifiedRoutes(altered, airports).length, 15);
    assert.equal(
        joinVerifiedRoutes(
            { ...catalog, simulation: { ...catalog.simulation, liveFlightTracking: true } },
            airports,
        ).length,
        0,
    );
    assert.equal(
        joinVerifiedRoutes(catalog, airports).some(
            (r) => r.id === 'LHR-ORD' || r.id === 'HKG-YYZ' || r.id === 'AKL-ORD',
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
        7,
    );
    assert.equal(catalog.simulation.realFlightNumbersForAnimatedObjects, false);
    assert.equal(catalog.simulation.runtimeFlightAPIRequired, false);
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
