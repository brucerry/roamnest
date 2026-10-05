import { addDays, isDate, localDate } from './logic.js';
export const CURRENCIES = [
    'HKD',
    'USD',
    'TWD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'SGD',
    'JPY',
    'THB',
    'NZD',
] as const;
export type Category = 'stay' | 'transport' | 'other';
export type POI = {
    id: string;
    day: number;
    name: string;
    address: string;
    lat: number | null;
    lon: number | null;
    notes: string;
};
export type Stop = {
    id: string;
    name: string;
    country: string;
    code: string;
    lat: number | null;
    lon: number | null;
    nights: number;
    days: string[];
    pois: POI[];
};
export type Expense = {
    id: string;
    category: Category;
    label: string;
    amount: number;
    quantity: number;
    stopId: string | null;
    quoteId: string | null;
};
export type Quote = {
    id: string;
    kind: 'flight' | 'hotel';
    provider: string;
    label: string;
    scope: string;
    amount: number;
    quantity: number;
    extras: number;
    inclusions: string;
    url: string;
    recordedAt: string;
    enteredAt: string;
    context: string;
};
export type Plan = {
    id: string;
    title: string;
    start: string;
    travelers: number;
    currency: string;
    budget: number | null;
    stops: Stop[];
    expenses: Expense[];
    quotes: Quote[];
};
export const DEFAULT_PLAN_ID = 'roamnest-default-trip';
export function defaultPlan(): Plan {
    return { ...blankPlan(), id: DEFAULT_PLAN_ID };
}
export const STORE_KEY = 'roamnest-plans-v1';
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
export function id(): string {
    return crypto.randomUUID();
}
export function blankPlan(): Plan {
    return {
        id: id(),
        title: '',
        start: localDate(),
        travelers: 1,
        currency: 'HKD',
        budget: null,
        stops: [],
        expenses: [],
        quotes: [],
    };
}
export function parseMoney(value: string): number {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
        throw new Error('Enter a nonnegative amount with up to two decimals.');
    const [whole, fraction = ''] = value.trim().split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents > 1_000_000_000)
        throw new Error('Amount must be between 0 and 10,000,000.');
    return cents;
}
export function amountText(cents: number): string {
    return (cents / 100).toFixed(2);
}
export function safeURL(value: string): string {
    if (!value.trim()) return '';
    let u: URL;
    try {
        u = new URL(value.trim());
    } catch {
        throw new Error('Use a complete https booking or source link.');
    }
    if (u.protocol !== 'https:' || u.username || u.password || /[\u0000-\u001f\u007f]/.test(value))
        throw new Error('Use a complete https booking or source link.');
    return u.href;
}
export function itinerary(
    plan: Plan,
): { stop: Stop; arrival: string; departure: string; index: number }[] {
    let date = plan.start;
    return plan.stops.map((stop, index) => {
        const arrival = date;
        date = addDays(date, stop.nights);
        return { stop, arrival, departure: date, index };
    });
}
export function planContext(plan: Plan): string {
    return JSON.stringify({
        start: plan.start,
        travelers: plan.travelers,
        currency: plan.currency,
        stops: plan.stops.map((s) => [s.id, s.name, s.nights]),
    });
}
export function quoteTotal(q: Pick<Quote, 'amount' | 'quantity' | 'extras'>): number {
    return q.amount * q.quantity + q.extras;
}
export function totals(plan: Plan): {
    total: number;
    perPerson: number;
    nights: number;
    categories: Record<Category, number>;
    remaining: number | null;
} {
    const categories = { stay: 0, transport: 0, other: 0 };
    for (const e of plan.expenses) categories[e.category] += e.amount * e.quantity;
    const total = categories.stay + categories.transport + categories.other;
    return {
        total,
        perPerson: Math.round(total / plan.travelers),
        nights: plan.stops.reduce((n, s) => n + s.nights, 0),
        categories,
        remaining: plan.budget === null ? null : plan.budget - total,
    };
}
export function reorder(plan: Plan, stopId: string, direction: -1 | 1): boolean {
    const from = plan.stops.findIndex((s) => s.id === stopId),
        to = from + direction;
    if (from < 0 || to < 0 || to >= plan.stops.length) return false;
    const [stop] = plan.stops.splice(from, 1);
    plan.stops.splice(to, 0, stop!);
    return true;
}
export function removeStop(plan: Plan, stopId: string): void {
    plan.stops = plan.stops.filter((s) => s.id !== stopId);
    plan.expenses = plan.expenses.filter((e) => e.stopId !== stopId);
}
function object(v: unknown): Record<string, unknown> {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid backup format.');
    return v as Record<string, unknown>;
}
function str(v: unknown, max: number, empty = true): string {
    if (typeof v !== 'string' || v.length > max || (!empty && !v.trim()))
        throw new Error('Invalid text in backup.');
    return v;
}
function integer(v: unknown, min: number, max: number): number {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max)
        throw new Error('Invalid number in backup.');
    return v;
}
function identifier(v: unknown): string {
    const s = str(v, 80, false);
    if (!/^[a-zA-Z0-9_-]+$/.test(s)) throw new Error('Invalid identifier in backup.');
    return s;
}
function list(v: unknown, max: number): unknown[] {
    if (!Array.isArray(v) || v.length > max) throw new Error('Backup exceeds supported limits.');
    return v;
}
function timestamp(v: unknown): string {
    const s = str(v, 40, false);
    if (
        !/^\d{4}-\d{2}-\d{2}T/.test(s) ||
        !Number.isFinite(Date.parse(s)) ||
        !isDate(s.slice(0, 10))
    )
        throw new Error('Invalid timestamp in backup.');
    return s;
}
function unique(ids: string[]): void {
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate identifier in backup.');
}
export function validatePlan(value: unknown): Plan {
    const p = object(value),
        start = str(p.start, 10, false);
    if (!isDate(start) || start < '2000-01-01' || start > '2099-12-31')
        throw new Error('Choose a valid start date between 2000 and 2099.');
    const currency = str(p.currency, 3, false);
    if (!(CURRENCIES as readonly string[]).includes(currency))
        throw new Error('Choose a supported currency.');
    const stops = list(p.stops, 30).map((v) => {
        const s = object(v),
            nights = integer(s.nights, 1, 90),
            code = str(s.code, 3);
        if (code && !/^[A-Z]{3}$/.test(code)) throw new Error('Invalid location in backup.');
        const lat = s.lat,
            lon = s.lon;
        if (
            !(lat === null && lon === null) &&
            !(
                typeof lat === 'number' &&
                Number.isFinite(lat) &&
                Math.abs(lat) <= 90 &&
                typeof lon === 'number' &&
                Number.isFinite(lon) &&
                Math.abs(lon) <= 180
            )
        )
            throw new Error('Invalid location in backup.');
        const days = list(s.days, 90).map((d) => str(d, 500));
        if (days.length !== nights) throw new Error('Day notes must match the stop nights.');
        const pois = list(s.pois === undefined ? [] : s.pois, 100).map((v) => {
            const q = object(v),
                day = integer(q.day, 0, nights - 1);
            const lat = q.lat,
                lon = q.lon;
            if (
                !(lat === null && lon === null) &&
                !(
                    typeof lat === 'number' &&
                    Number.isFinite(lat) &&
                    Math.abs(lat) <= 90 &&
                    typeof lon === 'number' &&
                    Number.isFinite(lon) &&
                    Math.abs(lon) <= 180
                )
            )
                throw new Error('Invalid location in backup.');
            return {
                id: identifier(q.id),
                day,
                name: str(q.name, 120, false),
                address: str(q.address, 300),
                notes: str(q.notes, 500),
                lat: lat as number | null,
                lon: lon as number | null,
            };
        });
        unique(pois.map((p) => p.id));
        return {
            id: identifier(s.id),
            name: str(s.name, 120, false),
            country: str(s.country, 80),
            code,
            lat: lat as number | null,
            lon: lon as number | null,
            nights,
            days,
            pois,
        };
    });
    unique(stops.map((s) => s.id));
    if (stops.reduce((n, s) => n + s.pois.length, 0) > 300)
        throw new Error('Keep up to 100 places per stop and 300 per trip.');
    if (stops.reduce((n, s) => n + s.nights, 0) > 365)
        throw new Error('Keep the itinerary within 365 nights and 30 stops.');
    const expenses = list(p.expenses, 200).map((v) => {
        const e = object(v),
            category = e.category;
        if (!['stay', 'transport', 'other'].includes(category as string))
            throw new Error('Invalid expense category.');
        const stopId = e.stopId === null ? null : identifier(e.stopId);
        if (stopId && !stops.some((s) => s.id === stopId))
            throw new Error('Expense refers to a missing stop.');
        return {
            id: identifier(e.id),
            category: category as Category,
            label: str(e.label, 120, false),
            amount: integer(e.amount, 0, 1_000_000_000),
            quantity: integer(e.quantity, 1, 3650),
            stopId,
            quoteId: e.quoteId === null ? null : identifier(e.quoteId),
        };
    });
    const quotes = list(p.quotes, 50).map((v) => {
        const q = object(v);
        if (!['flight', 'hotel'].includes(q.kind as string))
            throw new Error('Invalid quote category.');
        return {
            id: identifier(q.id),
            kind: q.kind as Quote['kind'],
            provider: str(q.provider, 120, false),
            label: str(q.label, 120, false),
            scope: str(q.scope, 240),
            amount: integer(q.amount, 0, 1_000_000_000),
            quantity: integer(q.quantity, 1, 3650),
            extras: integer(q.extras, 0, 1_000_000_000),
            inclusions: str(q.inclusions, 1000),
            url: safeURL(str(q.url, 2000)),
            recordedAt: timestamp(q.recordedAt),
            enteredAt: timestamp(q.enteredAt),
            context: str(q.context, 20000),
        };
    });
    unique(expenses.map((e) => e.id));
    unique(quotes.map((q) => q.id));
    const plan = {
        id: identifier(p.id),
        title: str(p.title, 120),
        start,
        travelers: 1,
        currency,
        budget: p.budget === null ? null : integer(p.budget, 0, 1_000_000_000),
        stops,
        expenses,
        quotes,
    };
    if (!Number.isSafeInteger(totals(plan).total)) throw new Error('Trip total is too large.');
    return plan;
}
export function exportBackup(plan: Plan): string {
    const payload: Partial<Plan> = { ...validatePlan(plan) };
    delete payload.travelers;
    return JSON.stringify(
        { app: 'roamnest', version: 1, exportedAt: new Date().toISOString(), plan: payload },
        null,
        2,
    );
}
export function importBackup(text: string): Plan {
    if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
        throw new Error('Backup must be smaller than 4 MB.');
    let root: Record<string, unknown>;
    try {
        root = object(JSON.parse(text));
    } catch {
        throw new Error('Invalid backup format.');
    }
    if (root.app !== 'roamnest' || root.version !== 1)
        throw new Error('This is not a supported roamnest backup.');
    timestamp(root.exportedAt);
    return validatePlan(root.plan);
}
type Saved = { version: 1; activeId: string; plans: Plan[] };
export class PlanStore {
    private lastRaw: string | null = null;
    error = '';
    raw: string | null = null;
    constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {}
    load(): { plans: Plan[]; activeId: string | null } {
        try {
            this.lastRaw = this.storage.getItem(STORE_KEY);
            this.raw = this.lastRaw;
            if (this.lastRaw === null) return { plans: [], activeId: null };
            const root = object(JSON.parse(this.lastRaw));
            if (root.version !== 1) throw new Error('version');
            const plans = list(root.plans, 10).map(validatePlan);
            unique(plans.map((p) => p.id));
            const activeId = identifier(root.activeId);
            if (activeId !== DEFAULT_PLAN_ID && !plans.some((p) => p.id === activeId))
                throw new Error('active');
            return { plans, activeId };
        } catch {
            this.error =
                this.raw === null
                    ? 'Device storage is unavailable. Export a backup to keep your work.'
                    : 'Saved data could not be read and was left untouched. Export the original data before recovery.';
            return { plans: [], activeId: null };
        }
    }
    save(plans: Plan[], activeId: string): boolean {
        if (this.error) return false;
        try {
            if (this.storage.getItem(STORE_KEY) !== this.lastRaw) {
                this.error =
                    'Another tab changed saved trips. Export your work, then reload before saving.';
                return false;
            }
            if (plans.length > 10) throw new Error('capacity');
            const valid = plans.map(validatePlan);
            unique(valid.map((p) => p.id));
            if (activeId !== DEFAULT_PLAN_ID && !valid.some((p) => p.id === activeId))
                throw new Error('active');
            const data: Saved = { version: 1, activeId, plans: valid };
            const raw = JSON.stringify(data);
            this.storage.setItem(STORE_KEY, raw);
            this.lastRaw = raw;
            this.raw = raw;
            return true;
        } catch {
            this.error =
                'Device storage is full or unavailable. Export a backup to keep your work.';
            return false;
        }
    }
}
