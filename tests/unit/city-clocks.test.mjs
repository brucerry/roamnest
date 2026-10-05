import test from 'node:test';
import assert from 'node:assert/strict';
import { cityLocalTime } from '../../dist/src/features/globe/city-clocks.js';
import { cityTimezones } from '../../dist/src/features/globe/data/city-timezones.js';
test('each city clock uses its own IANA zone and daylight-saving rules, including fractional offsets', () => {
    assert.equal(cityLocalTime('JFK', 'en', Date.parse('2026-01-15T12:00:00Z')), '07:00');
    assert.equal(cityLocalTime('JFK', 'en', Date.parse('2026-07-15T12:00:00Z')), '08:00');
    assert.equal(cityLocalTime('HKG', 'en', Date.parse('2026-01-15T12:00:00Z')), '20:00');
    assert.equal(cityLocalTime('KTM', 'en', Date.parse('2026-01-15T12:00:00Z')), '17:45');
    assert.equal(cityLocalTime('JFK', 'en', Date.parse('2026-07-15T12:01:00Z')), '08:01');
});
test('unknown and unsupported zones omit the clock instead of guessing from a country', () => {
    assert.equal(cityLocalTime('UNKNOWN', 'en'), '');
    cityTimezones.TEST = 'Unsupported/Zone';
    assert.equal(cityLocalTime('TEST', 'en'), '');
    delete cityTimezones.TEST;
    assert.equal(cityLocalTime('JFK', 'en', NaN), '');
});
