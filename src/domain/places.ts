import { distanceKm } from './logic.js';
import type { POI, Stop } from './planner.js';
export type TravelMode = 'foot' | 'car' | 'bike';
export type RoadRoute = {
    coordinates: [number, number][];
    distance: number;
    duration: number;
    fetchedAt: string;
    mode: TravelMode;
};
export function coordinates(lat: string, lon: string): { lat: number | null; lon: number | null } {
    if (!lat.trim() && !lon.trim()) return { lat: null, lon: null };
    const numeric = (s: string): boolean => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s.trim());
    const a = Number(lat),
        b = Number(lon);
    if (
        !numeric(lat) ||
        !numeric(lon) ||
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        Math.abs(a) > 90 ||
        Math.abs(b) > 180
    )
        throw new Error('Enter both valid coordinates: latitude −90 to 90, longitude −180 to 180.');
    return { lat: a, lon: b };
}
export function reorderPOI(stop: Stop, poiId: string, direction: -1 | 1): boolean {
    const from = stop.pois.findIndex((p) => p.id === poiId);
    if (from < 0) return false;
    const day = stop.pois[from]!.day;
    const same = stop.pois.map((p, i) => (p.day === day ? i : -1)).filter((i) => i >= 0),
        position = same.indexOf(from),
        to = same[position + direction];
    if (to === undefined) return false;
    [stop.pois[from], stop.pois[to]] = [stop.pois[to]!, stop.pois[from]!];
    return true;
}
export function dayPlaces(stop: Stop, day: number): POI[] {
    return stop.pois.filter((p) => p.day === day);
}
export function routeKey(pois: POI[], mode: TravelMode): string {
    return JSON.stringify([mode, pois.map((p) => [p.id, p.lat, p.lon])]);
}
export function routingURL(pois: POI[], mode: TravelMode): string {
    if (
        !['foot', 'car', 'bike'].includes(mode) ||
        pois.length < 2 ||
        pois.length > 10 ||
        pois.some((p) => p.lat === null || p.lon === null)
    )
        throw new Error('Road routing needs 2–10 located places on this day.');
    for (let i = 1; i < pois.length; i++) {
        const a = pois[i - 1]!,
            b = pois[i]!;
        if (distanceKm(a.lat!, a.lon!, b.lat!, b.lon!) > 100)
            throw new Error(
                'Keep each city route leg within 100 km. Use external directions for longer journeys.',
            );
    }
    const url = new URL(
        `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${pois.map((p) => `${p.lon},${p.lat}`).join(';')}`,
    );
    url.search = new URLSearchParams({
        overview: 'full',
        geometries: 'geojson',
        steps: 'false',
        alternatives: 'false',
        generate_hints: 'false',
    }).toString();
    return url.href;
}
export function parseRoadRoute(value: unknown, mode: TravelMode): RoadRoute {
    const data = value as {
        code?: unknown;
        routes?: {
            geometry?: { type?: unknown; coordinates?: unknown };
            distance?: unknown;
            duration?: unknown;
        }[];
    };
    const r = data?.routes?.[0];
    if (
        data?.code !== 'Ok' ||
        r?.geometry?.type !== 'LineString' ||
        !Array.isArray(r.geometry.coordinates) ||
        r.geometry.coordinates.length < 2 ||
        r.geometry.coordinates.length > 100_000 ||
        typeof r.distance !== 'number' ||
        !Number.isFinite(r.distance) ||
        r.distance < 0 ||
        typeof r.duration !== 'number' ||
        !Number.isFinite(r.duration) ||
        r.duration < 0
    )
        throw new Error(
            'No usable road route returned. Straight connectors remain; try external directions.',
        );
    const points = r.geometry.coordinates.map((v: unknown) => {
        if (
            !Array.isArray(v) ||
            v.length !== 2 ||
            typeof v[0] !== 'number' ||
            !Number.isFinite(v[0]) ||
            Math.abs(v[0]) > 180 ||
            typeof v[1] !== 'number' ||
            !Number.isFinite(v[1]) ||
            Math.abs(v[1]) > 90
        )
            throw new Error(
                'No usable road route returned. Straight connectors remain; try external directions.',
            );
        return [v[0], v[1]] as [number, number];
    });
    return {
        coordinates: points,
        distance: r.distance,
        duration: r.duration,
        fetchedAt: new Date().toISOString(),
        mode,
    };
}
export function placeLocation(p: POI, city: string): string {
    if (
        p.lat !== null &&
        p.lon !== null &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lon) <= 180
    )
        return `${p.lat},${p.lon}`;
    return p.address.trim() ? [p.name, p.address, city].filter(Boolean).join(', ') : '';
}
export function directionsURL(from: POI | null, to: POI, city: string, mode: TravelMode): string {
    if (!['foot', 'car', 'bike'].includes(mode)) return '';
    const destination = placeLocation(to, city),
        origin = from ? placeLocation(from, city) : '';
    if (!destination || (from && !origin)) return '';
    const params = new URLSearchParams({
        api: '1',
        destination,
        travelmode: mode === 'car' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking',
    });
    if (origin) params.set('origin', origin);
    const url = new URL('https://www.google.com/maps/dir/');
    url.search = params.toString();
    return url.href.length <= 2048 ? url.href : '';
}
