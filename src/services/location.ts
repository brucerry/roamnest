import { t } from '../i18n/index.js';
export type ApproximateArea = { lat: number; lon: number; label: string; accuracy: number | null };
export const LOCATION_ENDPOINT = 'https://get.geojs.io/v1/ip/geo.json';
export const LOCATION_PREFERENCE = 'roamnest-ip-centering';
let sessionPreference: boolean | undefined;
export function ipCenteringEnabled(): boolean {
    try {
        return localStorage.getItem(LOCATION_PREFERENCE) !== 'off';
    } catch {
        return sessionPreference ?? true;
    }
}
export function parseApproximateArea(value: unknown): ApproximateArea {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid location response');
    const obj = value as Record<string, unknown>;
    const coordinate = (v: unknown, max: number): number => {
        if (typeof v !== 'number' && (typeof v !== 'string' || !/^[-+]?\d+(?:\.\d+)?$/.test(v)))
            throw new Error('Missing coordinates');
        const n = Number(v);
        if (!Number.isFinite(n) || Math.abs(n) > max) throw new Error('Invalid coordinates');
        return n;
    };
    const lat = coordinate(obj.latitude, 90),
        lon = coordinate(obj.longitude, 180);
    const label = [obj.city, obj.region, obj.country]
        .filter((v): v is string => typeof v === 'string' && !!v.trim())
        .map((v) => v.slice(0, 60))
        .join(', ')
        .slice(0, 180);
    return {
        lat,
        lon,
        label,
        accuracy:
            typeof obj.accuracy === 'number' && Number.isFinite(obj.accuracy) && obj.accuracy >= 0
                ? obj.accuracy
                : null,
    };
}
export function createApproximateLocation(onArea: (area: ApproximateArea | null) => void): {
    enter: () => void;
    reset: () => Promise<ApproximateArea | null>;
    readonly enabled: boolean;
} {
    const toggle = document.getElementById('ip-centering') as HTMLInputElement,
        status = document.getElementById('ip-status')!;
    let enabled = ipCenteringEnabled();
    sessionPreference = enabled;
    let attempted = false,
        area: ApproximateArea | null = null,
        cachedArea: ApproximateArea | null = null,
        controller: AbortController | null = null,
        pending: Promise<ApproximateArea | null> | null = null;
    let message = enabled
        ? 'IP centering waits until you open Globe mode.'
        : 'IP centering is off.';
    const render = (): void => {
        status.textContent =
            t(message) +
            (area
                ? ' · ' +
                  area.label +
                  (area.accuracy === null ? '' : ' · ~' + area.accuracy + ' km')
                : '');
    };
    toggle.checked = enabled;
    render();
    const lookup = (): Promise<ApproximateArea | null> => {
        if (!enabled) return Promise.resolve(null);
        if (cachedArea) {
            area = cachedArea;
            message = 'Approximate network area; VPNs may show another place.';
            render();
            return Promise.resolve(area);
        }
        if (pending) return pending;
        if (attempted) return Promise.resolve(null);
        attempted = true;
        controller = new AbortController();
        const signal = controller.signal,
            timer = setTimeout(() => controller?.abort(), 8000);
        message = 'Looking up an approximate IP area…';
        render();
        pending = fetch(LOCATION_ENDPOINT, {
            signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Location unavailable');
                const text = await response.text();
                if (text.length > 16000) throw new Error('Location response too large');
                const next = parseApproximateArea(JSON.parse(text));
                if (!enabled || signal.aborted) return null;
                area = cachedArea = next;
                message = 'Approximate network area; VPNs may show another place.';
                render();
                return area;
            })
            .catch(() => {
                if (enabled) {
                    area = null;
                    message = 'IP area unavailable. The globe keeps its current view.';
                    render();
                }
                return null;
            })
            .finally(() => {
                clearTimeout(timer);
                controller = null;
                pending = null;
            });
        return pending;
    };
    const enter = (): void => {
        void lookup().then((next) => {
            if (next && enabled) onArea(next);
        });
    };
    const applyPreference = (next: boolean): void => {
        enabled = next;
        sessionPreference = enabled;
        toggle.checked = enabled;
        if (!enabled) {
            controller?.abort();
            area = null;
            message = 'IP centering is off.';
            onArea(null);
        } else
            message = cachedArea
                ? 'Approximate network area; VPNs may show another place.'
                : attempted
                  ? 'IP lookup already attempted this page session. Reload to try again.'
                  : 'IP centering waits until you open Globe mode.';
        if (!enabled) {
            navigationIp = null;
            navigationIpController?.abort();
        }
        render();
        window.dispatchEvent(new Event('roamnest-location-preference'));
    };
    toggle.addEventListener('change', () => {
        const next = toggle.checked;
        try {
            localStorage.setItem(LOCATION_PREFERENCE, next ? 'on' : 'off');
        } catch {
            /* Session-only fallback; no trip writes. */
        }
        applyPreference(next);
    });
    window.addEventListener('storage', (event) => {
        if (event.key === LOCATION_PREFERENCE) applyPreference(event.newValue !== 'off');
    });
    window.addEventListener('roamnest-language-change', render);
    return {
        enter,
        reset: lookup,
        get enabled() {
            return enabled;
        },
    };
}
type DeviceStatus = {
    attempted: boolean;
    requests: number;
    state: 'idle' | 'pending' | 'success' | 'unavailable' | 'denied' | 'timeout';
    permissionBefore: string;
    permissionAfter: string;
    errorCode: number | null;
};
let deviceResultAt = 0;
let deviceResult: ApproximateArea | null = null,
    devicePending: Promise<ApproximateArea | null> | null = null;
const deviceStatus: DeviceStatus = {
    attempted: false,
    requests: 0,
    state: 'idle',
    permissionBefore: 'unknown',
    permissionAfter: 'unknown',
    errorCode: null,
};
export function getDeviceLocationStatus(): Readonly<DeviceStatus> {
    return { ...deviceStatus };
}
const permissionState = async (): Promise<string> => {
    try {
        return (await navigator.permissions.query({ name: 'geolocation' })).state;
    } catch {
        return 'unavailable';
    }
};
const deviceChanged = (): void => {
    if (typeof window !== 'undefined')
        window.dispatchEvent(new Event('roamnest-device-location-state'));
};
export function requestDeviceLocation(retry = false): Promise<ApproximateArea | null> {
    if (devicePending) return devicePending;
    if (deviceStatus.attempted && !retry) return Promise.resolve(deviceResult);
    deviceStatus.attempted = true;
    deviceStatus.state = 'pending';
    deviceStatus.errorCode = null;
    deviceResult = null;
    deviceChanged();
    devicePending = (async () => {
        deviceStatus.permissionBefore = await permissionState();
        return new Promise<ApproximateArea | null>((resolve) => {
            let settled = false;
            const finish = (
                area: ApproximateArea | null,
                state: DeviceStatus['state'],
                errorCode: number | null = null,
            ): void => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                deviceResult = area;
                deviceResultAt = Date.now();
                deviceStatus.state = state;
                deviceStatus.errorCode = errorCode;
                void permissionState().then((state) => {
                    deviceStatus.permissionAfter = state;
                    deviceChanged();
                });
                deviceChanged();
                resolve(area);
            };
            // Browser timeout excludes permission waiting; don't prematurely fall back
            // while a person is reading its native prompt. Still bound an unresponsive host.
            const timer = setTimeout(() => finish(null, 'timeout', 3), 45_000);
            if (!navigator.geolocation) {
                finish(null, 'unavailable');
                return;
            }
            deviceStatus.requests++;
            try {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude: lat, longitude: lon, accuracy } = position.coords;
                        const valid =
                            Number.isFinite(lat) &&
                            Number.isFinite(lon) &&
                            Math.abs(lat) <= 90 &&
                            Math.abs(lon) <= 180;
                        finish(
                            valid
                                ? {
                                      lat,
                                      lon,
                                      label: '',
                                      accuracy:
                                          Number.isFinite(accuracy) && accuracy >= 0
                                              ? accuracy / 1000
                                              : null,
                                  }
                                : null,
                            valid ? 'success' : 'unavailable',
                        );
                    },
                    (error) =>
                        finish(
                            null,
                            error.code === 1
                                ? 'denied'
                                : error.code === 3
                                  ? 'timeout'
                                  : 'unavailable',
                            error.code,
                        ),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
                );
            } catch {
                finish(null, 'unavailable');
            }
        });
    })().finally(() => {
        devicePending = null;
    });
    return devicePending;
}

export type NavigationOrigin = { area: ApproximateArea; source: 'device' | 'ip' };
let navigationIp: ApproximateArea | null = null,
    navigationIpAt = 0,
    navigationIpPending: Promise<ApproximateArea | null> | null = null;
let navigationIpController: AbortController | null = null;
export async function requestNavigationOrigin(): Promise<NavigationOrigin | null> {
    const device = await requestDeviceLocation(
        !!deviceResult && Date.now() - deviceResultAt > 120_000,
    );
    if (device) return { area: device, source: 'device' };
    if (!ipCenteringEnabled()) return null;
    if (navigationIp && Date.now() - navigationIpAt < 120_000)
        return { area: navigationIp, source: 'ip' };
    if (!navigationIpPending) {
        const controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 8000);
        navigationIpController = controller;
        navigationIpPending = fetch(LOCATION_ENDPOINT, {
            signal: controller.signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Location unavailable');
                const text = await response.text();
                if (text.length > 16000) throw new Error('Location response too large');
                if (!ipCenteringEnabled() || controller.signal.aborted) return null;
                const area = parseApproximateArea(JSON.parse(text));
                navigationIp = area;
                navigationIpAt = Date.now();
                return area;
            })
            .catch(() => null)
            .finally(() => {
                clearTimeout(timer);
                navigationIpPending = null;
                navigationIpController = null;
            });
    }
    const area = await navigationIpPending;
    return area ? { area, source: 'ip' } : null;
}
