import test from 'node:test';
import assert from 'node:assert/strict';
test('native device request coalesces, reuses successful or failed session result, and retries only explicitly', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let calls = 0,
        callback,
        fail;
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
            permissions: { query: async () => ({ state: 'prompt' }) },
            geolocation: {
                getCurrentPosition: (success, error) => {
                    calls++;
                    callback = success;
                    fail = error;
                },
            },
        },
    });
    try {
        const { requestDeviceLocation, getDeviceLocationStatus } =
            await import('../../dist/src/services/location.js?session-test');
        const first = requestDeviceLocation(),
            same = requestDeviceLocation(true);
        assert.equal(first, same);
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(calls, 1);
        callback({ coords: { latitude: 22.6, longitude: 120.2, accuracy: 15 } });
        assert.equal((await first).accuracy, 0.015);
        assert.deepEqual(await requestDeviceLocation(), await first);
        assert.equal(calls, 1);
        const retry = requestDeviceLocation(true);
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(calls, 2);
        fail({ code: 2 });
        assert.equal(await retry, null);
        assert.equal(await requestDeviceLocation(), null);
        assert.equal(await requestDeviceLocation(), null);
        assert.equal(calls, 2);
        assert.deepEqual(getDeviceLocationStatus(), {
            attempted: true,
            requests: 2,
            state: 'unavailable',
            permissionBefore: 'prompt',
            permissionAfter: 'prompt',
            errorCode: 2,
        });
        assert.equal('lat' in getDeviceLocationStatus(), false);
    } finally {
        if (original) Object.defineProperty(globalThis, 'navigator', original);
        else delete globalThis.navigator;
    }
});
