export type Airport = {
    code: string;
    name: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
};

export type AirportData = { retrievedAt: string; airports: Airport[] };

export function localDate(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function isDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function nights(start: string, end: string): number {
    return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rad = (v: number) => (v * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function searchAirports(airports: Airport[], query: string): Airport[] {
    const q = query
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (!q) return [];
    return airports
        .filter((a) =>
            `${a.code} ${a.name} ${a.city} ${a.country}`
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .includes(q),
        )
        .sort((a, b) => Number(b.code.toLowerCase() === q) - Number(a.code.toLowerCase() === q))
        .slice(0, 8);
}
