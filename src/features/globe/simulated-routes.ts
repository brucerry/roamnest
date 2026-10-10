import type { Airport } from '../../domain/logic.js';
import { currentLanguage, t } from '../../i18n/index.js';
import { createSpringSurface } from '../../ui/spring.js';
import { distanceKm } from '../../domain/logic.js';

export type RouteEndpoint = {
    iata: string;
    city: { en: string; zhHant: string };
    countryCode: string;
    country: { en: string; zhHant: string };
};
export type CatalogRoute = {
    id: string;
    origin: RouteEndpoint;
    destination: RouteEndpoint;
    enabled: boolean;
    routeType: string;
    verificationStatus: string;
    checkedDate: string;
    carrier: { iata: string; name: { en: string; zhHant: string } };
    evidence: {
        sourceURL: string;
        sourceTitle: string;
        sourcePublishedDate: string | null;
        validFrom: string | null;
        validThrough: string | null;
        referenceFlightNumbers: string[];
    };
    seasonality: string;
};
export type SimulatedRoute = { id: string; origin: Airport; destination: Airport };
export type RouteCatalog = {
    schemaVersion: number;
    checkedDate: string;
    routes: CatalogRoute[];
    simulation: {
        liveFlightTracking: boolean;
        realDepartureOrArrivalClaims: boolean;
        realFlightNumbersForAnimatedObjects: boolean;
        runtimeFlightAPIRequired: boolean;
    };
};
export type JoinedRoute = CatalogRoute & { from: Airport; to: Airport };
// Fail closed: only explicitly verified directions with exact, valid airport joins.
export function joinVerifiedRoutes(catalog: RouteCatalog, airports: Airport[]): JoinedRoute[] {
    if (
        catalog.schemaVersion !== 2 ||
        !catalog.simulation ||
        catalog.simulation.liveFlightTracking !== false ||
        catalog.simulation.realDepartureOrArrivalClaims !== false ||
        catalog.simulation.realFlightNumbersForAnimatedObjects !== false ||
        catalog.simulation.runtimeFlightAPIRequired !== false ||
        !Array.isArray(catalog.routes)
    )
        return [];
    const seen = new Set<string>();
    return catalog.routes.flatMap((route) => {
        if (
            route.enabled !== true ||
            route.routeType !== 'nonstop' ||
            route.verificationStatus !== 'verified_from_opened_official_content' ||
            route.id !== route.origin?.iata + '-' + route.destination?.iata ||
            route.origin.iata === route.destination.iata ||
            seen.has(route.id)
        )
            return [];
        const match = (endpoint: RouteEndpoint) =>
            airports.find(
                (a) =>
                    a.code === endpoint.iata &&
                    a.country === endpoint.countryCode &&
                    Number.isFinite(a.lat) &&
                    Number.isFinite(a.lon) &&
                    Math.abs(a.lat) <= 90 &&
                    Math.abs(a.lon) <= 180,
            );
        const from = match(route.origin),
            to = match(route.destination);
        if (!from || !to || !/^https:\/\//.test(route.evidence?.sourceURL ?? '')) return [];
        seen.add(route.id);
        return [{ ...route, from, to }];
    });
}
// Both phases travel origin → destination. Timings describe a decorative loop only.
export function routeDrawDuration(route: SimulatedRoute | null): number {
    if (!route) return 4800;
    const km = distanceKm(
        route.origin.lat,
        route.origin.lon,
        route.destination.lat,
        route.destination.lon,
    );
    // HKG–YVR (~10,250 km) runs at roughly 3x the original speed. Shorter
    // directions draw more slowly; this is decoration, never flight time.
    return 4800 / (1 + 2 * Math.min(1, Math.max(0, km) / 10250));
}
export function simulationGlow(elapsed: number, reduced = false, drawMs = 4800): number {
    const span = Number.isFinite(drawMs) ? Math.max(1, drawMs) : 4800;
    return reduced ? 1 : 0.64 + 0.36 * Math.sin((elapsed * Math.PI * 2) / (span * 1.5));
}
export function simulatedArcWindow(
    elapsed: number,
    reduced = false,
    drawMs = 4800,
): { start: number; end: number; phase: string } {
    if (reduced) return { start: 0, end: 1, phase: 'static' };
    const span = Number.isFinite(drawMs) ? Math.max(1, drawMs) : 4800,
        hold = span / 8,
        gap = span / 6,
        cycle = 2 * span + hold + gap;
    const ms = ((elapsed % cycle) + cycle) % cycle;
    if (ms < span) return { start: 0, end: ms / span, phase: 'drawing' };
    if (ms < span + hold) return { start: 0, end: 1, phase: 'holding' };
    if (ms < 2 * span + hold) return { start: (ms - span - hold) / span, end: 1, phase: 'erasing' };
    return { start: 1, end: 1, phase: 'waiting' };
}
export function initializeSimulatedRoutes(
    getAirports: () => Airport[],
    setRoute: (route: SimulatedRoute | null) => void,
    center: (lat: number, lon: number) => void,
): void {
    const words = (en: string, zh: string, yue = zh) =>
        currentLanguage() === 'en' ? en : currentLanguage() === 'yue-Hant' ? yue : zh;
    const root = document.createElement('div');
    root.className = 'simulated-route-settings';
    root.dataset.userContent = '';
    root.dataset.formPopups = '';
    root.innerHTML =
        '<section id="simulated-route-panel" class="simulated-route-panel" role="dialog" aria-modal="false" aria-labelledby="simulated-route-title" hidden><div class="simulation-heading"><h2 id="simulated-route-title"></h2><button type="button" class="simulation-close">×</button></div><p class="simulation-disclosure"></p><div class="simulation-fields"><div><label for="simulation-origin-country"></label><select id="simulation-origin-country"></select><label for="simulation-origin"></label><select id="simulation-origin"></select></div><div><label for="simulation-destination-country"></label><select id="simulation-destination-country"></select><label for="simulation-destination"></label><select id="simulation-destination"></select></div></div><button type="button" id="simulation-toggle" aria-pressed="false" class="simulation-toggle"></button><p class="simulation-explanation"></p><p class="simulation-validity"></p><details class="simulation-source"><summary></summary><p class="simulation-carrier"></p><a class="simulation-source-link" target="_blank" rel="noopener noreferrer"></a></details></section>';
    document.body.append(root);
    const trigger = document.createElement('button');
    trigger.id = 'simulated-route-trigger';
    trigger.type = 'button';
    trigger.className = 'dock-icon simulated-route-trigger';
    trigger.dataset.userContent = '';
    trigger.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 16C5 7 19 17 19 8M10 5l3-2 1 4"/></svg>';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'simulated-route-panel');
    trigger.setAttribute('aria-expanded', 'false');
    const badge = document.createElement('span');
    badge.id = 'simulated-route-badge';
    badge.className = 'simulated-route-badge';
    badge.dataset.userContent = '';
    badge.hidden = true;
    const dock = document.getElementById('globe-dock')!;
    dock.insertBefore(trigger, dock.querySelector('.dock-line-break'));
    dock.insertBefore(badge, dock.querySelector('.dock-line-break'));
    const panel = root.querySelector<HTMLElement>('section')!,
        toggle = root.querySelector<HTMLButtonElement>('#simulation-toggle')!,
        originCountry = root.querySelector<HTMLSelectElement>('#simulation-origin-country')!,
        origin = root.querySelector<HTMLSelectElement>('#simulation-origin')!,
        destinationCountry = root.querySelector<HTMLSelectElement>(
            '#simulation-destination-country',
        )!,
        destination = root.querySelector<HTMLSelectElement>('#simulation-destination')!;
    const spring = createSpringSurface(panel, trigger, false);
    let open = false,
        enabled = false,
        routes: JoinedRoute[] = [],
        catalog: RouteCatalog | null = null,
        failed = false;
    const selected = () =>
        routes.find(
            (r) => r.origin.iata === origin.value && r.destination.iata === destination.value,
        );
    const changes = () => window.dispatchEvent(new Event('roamnest-simulation-change'));
    const set = (value: boolean, focus = false) => {
        open = value;
        trigger.setAttribute('aria-expanded', String(value));
        spring.set(value);
        changes();
        if (value) {
            document.dispatchEvent(new Event('roamnest-form-controls-refresh'));
            panel
                .querySelector<HTMLButtonElement>('.simulation-close')!
                .focus({ preventScroll: true });
        } else if (focus) trigger.focus({ preventScroll: true });
    };
    const endpointName = (e: RouteEndpoint) =>
        `${currentLanguage() === 'en' ? e.city.en : e.city.zhHant} (${e.iata})`;
    const countryName = (e: RouteEndpoint) =>
        currentLanguage() === 'en' ? e.country.en : e.country.zhHant;
    const options = (select: HTMLSelectElement, values: { id: string; label: string }[]) => {
        const previous = select.value;
        select.replaceChildren(...values.map((v) => new Option(v.label, v.id)));
        select.value = values.some((v) => v.id === previous) ? previous : (values[0]?.id ?? '');
        select.disabled = !values.length;
    };
    const unique = (endpoints: RouteEndpoint[], country = false) =>
        [
            ...new Map(
                endpoints.map((e) => [
                    country ? e.countryCode : e.iata,
                    {
                        id: country ? e.countryCode : e.iata,
                        label: country ? countryName(e) : endpointName(e),
                    },
                ]),
            ).values(),
        ].sort((a, b) =>
            a.label.localeCompare(b.label, currentLanguage() === 'en' ? 'en' : 'zh-Hant'),
        );
    function render() {
        const origins = routes.map((r) => r.origin);
        options(originCountry, unique(origins, true));
        options(origin, unique(origins.filter((e) => e.countryCode === originCountry.value)));
        const destinations = routes
            .filter((r) => r.origin.iata === origin.value)
            .map((r) => r.destination);
        options(destinationCountry, unique(destinations, true));
        options(
            destination,
            unique(destinations.filter((e) => e.countryCode === destinationCountry.value)),
        );
        const route = selected();
        if (!route) enabled = false;
        const label = words('Routes', '航線');
        trigger.disabled = !routes.length;
        trigger.setAttribute('aria-label', words('Routes', '航線'));
        trigger.title = trigger.getAttribute('aria-label')!;
        trigger.setAttribute('aria-pressed', String(enabled));
        panel.querySelector('h2')!.textContent = words('Routes', '航線');
        panel
            .querySelector('.simulation-close')!
            .setAttribute('aria-label', words('Close routes', '關閉航線'));
        for (const [id, en, zh] of [
            ['simulation-origin-country', 'Origin country / region', '出發國家／地區'],
            ['simulation-origin', 'Origin airport', '出發機場'],
            ['simulation-destination-country', 'Destination country / region', '目的地國家／地區'],
            ['simulation-destination', 'Destination airport', '目的地機場'],
        ])
            panel.querySelector(`label[for="${id}"]`)!.textContent = words(en!, zh!);
        panel.querySelector('.simulation-disclosure')!.textContent = failed
            ? words('Route catalog unavailable.', '航線資料暫時無法載入。')
            : words(
                  `${routes.length} researched directions · catalog updated ${catalog?.checkedDate ?? 'unknown'} · limited coverage`,
                  `${routes.length} 條已查核方向 · 資料更新 ${catalog?.checkedDate ?? '未知'} · 收錄範圍有限`,
              );
        toggle.textContent = words(
            enabled ? 'Hide route' : 'Show route',
            enabled ? '隱藏航線' : '顯示航線',
        );
        toggle.disabled = !route;
        toggle.setAttribute('aria-pressed', String(enabled));
        panel.querySelector('.simulation-explanation')!.textContent = words(
            'SIMULATED · not live or observed. Researched nonstop endpoints; arc and distance-based pacing are decorative. No actual flight path or date-specific availability is implied.',
            '模擬 · 非即時或觀測航班。端點依已查核的直飛航線資料；弧線及按距離變化的速度為裝飾，不代表實際飛行軌跡或指定日期可訂。',
            '模擬 · 唔係即時或觀測航班。端點用已查核嘅直飛航線資料；弧線同按距離變化嘅速度係裝飾，唔代表真實飛行軌跡或指定日期有航班。',
        );
        const source = panel.querySelector<HTMLDetailsElement>('details')!;
        source.hidden = !route;
        source.querySelector('summary')!.textContent = words(
            'Route evidence & limits',
            '航線依據及限制',
        );
        panel.querySelector('.simulation-validity')!.textContent = '';
        if (route) {
            source.querySelector('.simulation-carrier')!.textContent =
                `${endpointName(route.origin)} → ${endpointName(route.destination)} · ${currentLanguage() === 'en' ? route.carrier.name.en : route.carrier.name.zhHant}`;
            const link = source.querySelector<HTMLAnchorElement>('a')!;
            link.href = route.evidence.sourceURL;
            link.textContent = words('Official source ↗', '官方來源 ↗');
            const period =
                route.evidence.validFrom && route.evidence.validThrough
                    ? words(
                          `Published timetable: ${route.evidence.validFrom}–${route.evidence.validThrough}. Service after this period is not asserted.`,
                          `公開時間表：${route.evidence.validFrom} 至 ${route.evidence.validThrough}。此期間之後的服務未獲確認。`,
                      )
                    : words(
                          'Source snapshot; schedules can change. Individual departures are unverified.',
                          '來源為查核時的資料；時間表可變動，個別航班未獲確認。',
                      );
            panel.querySelector('.simulation-validity')!.textContent =
                words(`Checked ${route.checkedDate}. `, `查核日期 ${route.checkedDate}。`) +
                period +
                ' ' +
                t(route.seasonality);
        }
        badge.hidden = !enabled;
        const caption = document.createElement('span');
        caption.textContent = route
            ? `${label} · ${route.origin.iata} → ${route.destination.iata}`
            : label;
        badge.replaceChildren(caption);
        root.dataset.enabled = String(enabled);
        root.dataset.routeCount = String(routes.length);
        root.dataset.selectedRoute = route?.id ?? '';
        setRoute(
            enabled && route
                ? { id: 'DEMO-' + route.id, origin: route.from, destination: route.to }
                : null,
        );
        changes();
    }
    for (const select of [originCountry, origin, destinationCountry, destination])
        select.addEventListener('change', () => {
            render();
            const r = selected();
            if (enabled && r) center(r.from.lat, r.from.lon);
        });
    toggle.addEventListener('click', () => {
        enabled = !enabled;
        render();
        const r = selected();
        if (enabled && r) center(r.from.lat, r.from.lon);
    });
    trigger.addEventListener('click', () => set(!open));
    panel.querySelector('.simulation-close')!.addEventListener('click', () => set(false, true));
    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            set(false, true);
        }
    });
    document.addEventListener(
        'pointerdown',
        (event) => {
            if (
                open &&
                !panel.contains(event.target as Node) &&
                !trigger.contains(event.target as Node) &&
                !(event.target as Element).closest('.form-popup')
            )
                set(false);
        },
        { passive: true },
    );
    window.addEventListener('roamnest-mode-change', () => set(false));
    window.addEventListener('roamnest-language-change', render);
    new ResizeObserver(changes).observe(panel);
    const join = () => {
        if (catalog) {
            routes = joinVerifiedRoutes(catalog, getAirports());
            render();
        }
    };
    window.addEventListener('roamnest-geography-ready', join);
    void fetch('./data/simulated-routes.json')
        .then(async (response) => {
            if (!response.ok) throw new Error('catalog');
            catalog = (await response.json()) as RouteCatalog;
            join();
        })
        .catch(() => {
            failed = true;
            render();
        });
    render();
}
