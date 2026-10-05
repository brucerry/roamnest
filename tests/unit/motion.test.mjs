import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizedDirection,
    longitudeDelta,
    advanceOrientation,
} from '../../dist/src/features/globe/motion.js';
import { parseApproximateArea } from '../../dist/src/services/location.js';
test('coarse location accepts documented string coordinates and discards IP/network identifiers', () => {
    const area = parseApproximateArea({
        latitude: '22.3',
        longitude: '114.2',
        city: 'Example',
        country: 'Example country',
        accuracy: 20,
        ip: '192.0.2.1',
        asn: 123,
    });
    assert.deepEqual(area, {
        lat: 22.3,
        lon: 114.2,
        label: 'Example, Example country',
        accuracy: 20,
    });
    assert.equal('ip' in area, false);
});
test('missing, blank, partial, nonfinite and out-of-range location coordinates are rejected', () => {
    for (const data of [
        null,
        [],
        {},
        { latitude: '', longitude: '1' },
        { latitude: null, longitude: '1' },
        { latitude: 'north', longitude: '1' },
        { latitude: '91', longitude: '1' },
        { latitude: 1, longitude: 181 },
        { latitude: Infinity, longitude: 1 },
    ])
        assert.throws(() => parseApproximateArea(data));
    assert.deepEqual(parseApproximateArea({ latitude: '0', longitude: '0' }), {
        lat: 0,
        lon: 0,
        label: '',
        accuracy: null,
    });
});
test('normalized directions preserve horizontal, vertical and diagonal signs and the 2.5 multiplier', () => {
    for (const [lon, lat] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [3, 4],
        [-3, -4],
        [-3, 4],
        [3, -4],
    ]) {
        const vector = normalizedDirection(lon, lat);
        assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-9);
        const slow = advanceOrientation(0, 0, vector[0] * 0.85, vector[1] * 0.85, 1),
            fast = advanceOrientation(0, 0, vector[0] * 0.85 * 2.5, vector[1] * 0.85 * 2.5, 1);
        assert.ok(Math.abs(fast[0] - slow[0] * 2.5) < 1e-9);
        assert.ok(Math.abs(fast[1] - slow[1] * 2.5) < 1e-9);
        assert.equal(Math.sign(slow[0]), Math.sign(lon));
        assert.equal(Math.sign(slow[1]), Math.sign(lat));
    }
});
test('home tween uses the shortest antimeridian direction', () => {
    assert.equal(longitudeDelta(179, -179), 2);
    assert.equal(longitudeDelta(-179, 179), -2);
    assert.equal(longitudeDelta(0, 0), 0);
});
test('outward pitch eases without flips and inward movement remains usable', () => {
    let north = 80,
        south = -80;
    for (let i = 0; i < 10000; i++) {
        north = advanceOrientation(0, north, 0, 24, 0.08)[1];
        south = advanceOrientation(0, south, 0, -24, 0.08)[1];
        assert.ok(north <= 85 && north >= 80);
        assert.ok(south >= -85 && south <= -80);
    }
    assert.ok(advanceOrientation(0, 84, 0, -1, 1)[1] < 84);
    assert.ok(advanceOrientation(0, -84, 0, 1, 1)[1] > -84);
    assert.ok(Math.abs(advanceOrientation(179, 0, 3, 0, 1)[0] + 178) < 1e-9);
});

test('free camera orientation crosses both poles continuously with canonical region center', async () => {
    const { advanceFreeOrientation, cameraCenter } =
        await import('../../dist/src/features/globe/motion.js');
    let yaw = 12,
        pitch = 80;
    for (let i = 0; i < 80; i++) {
        [yaw, pitch] = advanceFreeOrientation(yaw, pitch, 0, 10, 0.5);
        assert.ok(Number.isFinite(pitch));
        const center = cameraCenter(pitch, yaw);
        assert.ok(Math.abs(center.lat) <= 90 && Math.abs(center.lon) <= 180);
    }
    assert.ok(Math.abs(pitch - 120) < 1e-8);
    assert.deepEqual(advanceFreeOrientation(0, 89, 0, 5, 1), [0, 94]);
    assert.ok(cameraCenter(94, 0).lat < 90);
    assert.equal(cameraCenter(94, 0).lon, -180);
});

test('screen axes follow the pointer in upright, inverted and pole-facing cameras; full turns retain orthonormal projection', async () => {
    const { cameraBasis, rotateCamera } = await import('../../dist/src/features/globe/motion.js');
    const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
    for (const camera of [
        { lon: 12, lat: 18, roll: 0 },
        { lon: 12, lat: -18, roll: 180 },
        { lon: 12, lat: 90, roll: 0 },
        { lon: 12, lat: -90, roll: 180 },
    ]) {
        const initial = cameraBasis(camera)[2],
            next = cameraBasis(rotateCamera(camera, -8, 6));
        assert.ok(dot(next[0], initial) > 0);
        assert.ok(dot(next[1], initial) < 0);
        let current = camera;
        for (let i = 0; i < 72; i++) {
            current = rotateCamera(current, 0, 5);
            const axes = cameraBasis(current);
            for (const a of axes) assert.ok(Math.abs(Math.hypot(...a) - 1) < 1e-10);
            assert.ok(Math.abs(dot(axes[0], axes[1])) < 1e-10);
        }
        const after = cameraBasis(current),
            before = cameraBasis(camera);
        for (let a = 0; a < 3; a++)
            for (let i = 0; i < 3; i++) assert.ok(Math.abs(after[a][i] - before[a][i]) < 1e-8);
    }
});
