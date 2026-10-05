import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    addDays,
    distanceKm,
    isDate,
    nights,
    searchAirports,
} from '../../dist/src/domain/logic.js';
import { routePoint } from '../../dist/src/features/globe/globe.js';

const data = JSON.parse(await readFile('public/data/airports.json', 'utf8'));

test('calendar validation rejects impossible dates and leap year errors', () => {
    assert.equal(isDate('2026-02-29'), false);
    assert.equal(isDate('2028-02-29'), true);
    assert.equal(isDate('2026-11-31'), false);
    assert.equal(isDate('not-a-date'), false);
});

test('date arithmetic is stable through daylight saving and year boundaries', () => {
    assert.equal(nights('2026-10-31', '2026-11-03'), 3);
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('catalog contains real scheduled-service coordinates and permits local lookup', () => {
    assert.ok(data.airports.length > 4000);
    assert.ok(isDate(data.retrievedAt.slice(0, 10)));
    const lhr = searchAirports(data.airports, 'LHR')[0];
    assert.equal(lhr.code, 'LHR');
    assert.ok(Math.abs(lhr.lat - 51.47) < 0.1);
    assert.ok(searchAirports(data.airports, 'Lisbon').some((a) => a.code === 'LIS'));
    assert.deepEqual(searchAirports(data.airports, ''), []);
    assert.deepEqual(searchAirports(data.airports, 'xyz impossible city'), []);
});

test('great-circle distances match independent physical baselines', () => {
    assert.equal(distanceKm(0, 0, 0, 0), 0);
    assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.195) < 0.1);
    assert.ok(distanceKm(51.47, -0.4543, 38.7742, -9.1342) > 1500);
});

test('route interpolation respects real endpoints including dateline and antipodes', () => {
    const start = [51.47, -0.4543],
        end = [38.7742, -9.1342];
    const a = routePoint(start, end, 0),
        b = routePoint(start, end, 1);
    assert.ok(Math.abs(a[0] - start[0]) < 1e-9);
    assert.ok(Math.abs(b[1] - end[1]) < 1e-9);
    const middle = routePoint([0, 170], [0, -170], 0.5);
    assert.ok(Math.abs(middle[1]) > 179);
    assert.ok(routePoint([0, 0], [0, 180], 0.5).every(Number.isFinite));
});
