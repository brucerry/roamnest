import { afterModeTransition } from '../../ui/modes.js';
import { travelIcon } from '../../ui/icons.js';
import { addDays } from '../../domain/logic.js';
import { t, locale } from '../../i18n/index.js';
import { id, validatePlan } from '../../domain/planner.js';
import type { Plan, Stop, POI } from '../../domain/planner.js';
import {
    coordinates,
    dayPlaces,
    reorderPOI,
    routeKey,
    routingURL,
    parseRoadRoute,
    directionsURL,
} from '../../domain/places.js';
import type { TravelMode, RoadRoute } from '../../domain/places.js';
type XY = [number, number];
type Layer = {
    addTo: (map: MapView) => Layer;
    bindPopup: (content: HTMLElement) => Layer;
    on: (event: string, handler: () => void) => Layer;
};
type Group = Layer & { clearLayers: () => void; addLayer: (layer: Layer) => void };
type MapView = {
    getCenter: () => { lat: number; lng: number };
    getZoom: () => number;
    setView: (point: XY, zoom: number) => MapView;
    fitBounds: (points: XY[], options: Record<string, unknown>) => void;
    invalidateSize: () => void;
    on: (event: string, fn: (event: { latlng: { lat: number; lng: number } }) => void) => void;
    removeLayer: (layer: Layer) => void;
};
type Leaflet = {
    map: (node: HTMLElement, options: Record<string, unknown>) => MapView;
    tileLayer: (url: string, options: Record<string, unknown>) => Layer;
    featureGroup: () => Group;
    marker: (point: XY, options: Record<string, unknown>) => Layer;
    divIcon: (options: Record<string, unknown>) => unknown;
    polyline: (points: XY[], options: Record<string, unknown>) => Layer;
};
declare global {
    interface Window {
        L?: Leaflet;
    }
}
export function createCityPlanner(
    getPlan: () => Plan,
    changed: () => void,
    notify: (key: string) => void,
): {
    refresh: () => void;
    selectDay: (stopId: string, day: number, reveal?: boolean) => void;
    selection: () => { stopId: string; day: number };
    reset: () => void;
} {
    const $ = <T extends HTMLElement = HTMLElement>(key: string): T =>
        document.getElementById(key) as T;
    const val = (key: string): string => $<HTMLInputElement>(key).value;
    const set = (key: string, v: string): void => {
        $<HTMLInputElement>(key).value = v;
    };
    const text = (tag: 'p' | 'h3' | 'span' | 'strong', value: string, cls = ''): HTMLElement => {
        const node = document.createElement(tag);
        node.className = cls;
        node.dataset.userContent = '';
        node.textContent = value;
        return node;
    };
    const button = (name: string, action: () => void): HTMLButtonElement => {
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'small-button';
        node.dataset.i18n = name;
        node.textContent = t(name);
        node.addEventListener('click', action);
        return node;
    };
    let stopId = '',
        day = 0,
        editing: string | null = null,
        map: MapView | undefined,
        group: Group | undefined,
        tiles: Layer | undefined,
        picking = false,
        requesting = false,
        lastRequest = 0,
        requests = 0,
        error = '',
        controller: AbortController | undefined;
    const cache = new Map<string, RoadRoute>();
    let previousKey = '',
        previousSelection = '',
        pendingFit = true,
        eligible = false;
    const visible = (): boolean => {
        if (
            !eligible ||
            $('city-map-panel').hidden ||
            document.body.classList.contains('mode-globe')
        )
            return false;
        const b = $('city-map').getBoundingClientRect();
        return (
            b.width > 0 &&
            b.height > 0 &&
            b.bottom > 0 &&
            b.top < innerHeight &&
            b.right > 0 &&
            b.left < innerWidth
        );
    };
    const stop = (): Stop | undefined => getPlan().stops.find((s) => s.id === stopId);
    const places = (): POI[] => {
        const s = stop();
        return s ? dayPlaces(s, day) : [];
    };
    const mode = (): TravelMode => val('road-mode') as TravelMode;
    const key = (): string => routeKey(places(), mode());
    function clearEdit(): void {
        editing = null;
        $<HTMLFormElement>('poi-form').reset();
        $('poi-submit').dataset.i18n = 'Add attraction';
        $('poi-submit').textContent = t('Add attraction');
        $('poi-cancel').hidden = true;
        picking = false;
        $('pick-on-map').setAttribute('aria-pressed', 'false');
    }
    function stateChange(): void {
        controller?.abort();
        error = '';
        requesting = false;
        refresh();
        changed();
    }
    function renderDays(): void {
        const s = stop(),
            selects = ['city-day', 'poi-day'].map((key) => $<HTMLSelectElement>(key));
        for (const select of selects) select.replaceChildren();
        if (!s) {
            day = 0;
            return;
        }
        day = Math.max(0, Math.min(s.nights - 1, day));
        let arrival = getPlan().start;
        for (const current of getPlan().stops) {
            if (current.id === s.id) break;
            arrival = addDays(arrival, current.nights);
        }
        for (const select of selects) {
            for (let i = 0; i < s.nights; i++)
                select.append(
                    new Option(`${t('Day')} ${i + 1} · ${addDays(arrival, i)}`, String(i)),
                );
            select.value = String(day);
        }
    }
    function renderList(): void {
        const root = $('poi-list');
        root.replaceChildren();
        const list = places(),
            s = stop(),
            context = $('poi-context');
        context.dataset.stopId = s?.id || '';
        context.dataset.day = String(day);
        context.replaceChildren();
        if (s) {
            let date = getPlan().start;
            for (const current of getPlan().stops) {
                if (current.id === s.id) break;
                date = addDays(date, current.nights);
            }
            date = addDays(date, day);
            const labels = document.createElement('div');
            labels.className = 'poi-context-labels';
            const detail = (key: string, value: HTMLElement): HTMLElement => {
                const chip = document.createElement('span');
                chip.className = 'poi-context-detail';
                value.classList.add('poi-context-value');
                chip.append(text('span', t(key), 'poi-context-label'), value);
                return chip;
            };
            const dateLabel = document.createElement('time');
            dateLabel.dateTime = date;
            dateLabel.textContent = new Intl.DateTimeFormat(locale(), {
                dateStyle: 'medium',
                timeZone: 'UTC',
            }).format(new Date(date + 'T12:00:00Z'));
            labels.append(
                detail('City day', text('strong', t('Day') + ' ' + (day + 1))),
                detail('Date', dateLabel),
                detail('Attractions', text('strong', list.length + ' ' + t('attractions'))),
            );
            context.append(
                text('span', t('Currently displayed city') + ':', 'poi-context-heading'),
                text('strong', s.name, 'poi-context-city'),
                labels,
            );
        } else context.append(text('p', t('Choose a city and day to see its attractions.')));
        if (!list.length) {
            root.append(text('p', t('Add ordered places for this day.'), 'empty-state'));
            return;
        }
        list.forEach((poi, index) => {
            const card = document.createElement('article');
            card.className = 'poi-card';
            card.dataset.poiId = poi.id;
            card.append(
                text('h3', `${index + 1}. ${poi.name}`),
                text('p', poi.address || t('Address not entered'), 'muted'),
                text(
                    'p',
                    poi.lat === null ? t('Not mapped') : `${poi.lat}, ${poi.lon}`,
                    'poi-coordinates',
                ),
            );
            if (poi.notes) card.append(text('p', poi.notes, 'conditions'));
            const actions = document.createElement('div');
            actions.className = 'row-actions';
            const earlier = button('Move earlier', () => {
                    if (s) {
                        reorderPOI(s, poi.id, -1);
                        stateChange();
                    }
                }),
                later = button('Move later', () => {
                    if (s) {
                        reorderPOI(s, poi.id, 1);
                        stateChange();
                    }
                });
            earlier.disabled = index === 0;
            later.disabled = index === list.length - 1;
            actions.append(
                earlier,
                later,
                button('Edit', () => {
                    editing = poi.id;
                    for (const [field, v] of Object.entries({
                        'poi-name': poi.name,
                        'poi-address': poi.address,
                        'poi-lat': poi.lat === null ? '' : String(poi.lat),
                        'poi-lon': poi.lon === null ? '' : String(poi.lon),
                        'poi-notes': poi.notes,
                    }))
                        set(field, v);
                    $('poi-submit').dataset.i18n = 'Update attraction';
                    $('poi-submit').textContent = t('Update attraction');
                    $('poi-cancel').hidden = false;
                    $<HTMLInputElement>('poi-name').focus();
                }),
                button('Delete', () => {
                    if (!s || !confirm(t('Delete this place?'))) return;
                    s.pois = s.pois.filter((p) => p.id !== poi.id);
                    if (editing === poi.id) clearEdit();
                    stateChange();
                }),
            );
            if (s) {
                const navigation = document.createElement('div');
                navigation.className = 'poi-navigation';
                const target = document.createElement('select');
                target.className = 'poi-target';
                target.setAttribute('aria-label', t('Directions target') + ' · ' + poi.name);
                if (index > 0) target.append(new Option(t('Previous stop'), 'previous'));
                target.append(new Option(t('This stop'), 'this'));
                if (index + 1 < list.length) target.append(new Option(t('Next stop'), 'next'));
                target.value = 'this';
                const links = (['foot', 'bike', 'car'] as const).map((profile) => {
                    const a = document.createElement('a');
                    a.className = 'travel-icon ' + profile;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.innerHTML = travelIcon(profile);
                    navigation.append(a);
                    return { a, profile };
                });
                const originStatus = text('p', '', 'navigation-origin-status');
                originStatus.setAttribute('role', 'status');
                const update = (): void => {
                    const chosen =
                        target.value === 'previous'
                            ? list[index - 1]!
                            : target.value === 'next'
                              ? list[index + 1]!
                              : poi;
                    for (const { a, profile } of links) {
                        const url = directionsURL(
                            target.value === 'this' ? null : poi,
                            chosen,
                            s.name,
                            profile,
                        );
                        if (url) {
                            a.href = url;
                            a.removeAttribute('aria-disabled');
                            a.tabIndex = 0;
                        } else {
                            a.removeAttribute('href');
                            a.setAttribute('aria-disabled', 'true');
                            a.tabIndex = -1;
                        }
                        a.setAttribute(
                            'aria-label',
                            t(
                                profile === 'foot'
                                    ? 'Walking'
                                    : profile === 'bike'
                                      ? 'Cycling'
                                      : 'Driving',
                            ) +
                                ' · ' +
                                chosen.name +
                                ' · Google Maps',
                        );
                        a.title = a.getAttribute('aria-label')!;
                    }
                    originStatus.textContent = t(
                        links.some(({ a }) => !a.hasAttribute('href'))
                            ? 'Directions need coordinates or an address for both selected places.'
                            : target.value === 'this'
                              ? 'Google Maps uses your current location if available; otherwise choose your start there.'
                              : 'Directions start at this attraction and go to the selected adjacent attraction.',
                    );
                };
                for (const { a } of links)
                    a.addEventListener('click', (event) => {
                        if (!a.hasAttribute('href')) {
                            event.preventDefault();
                            return;
                        }
                        // Follow the universal Maps URL during the original user gesture.
                        // Maps resolves the current origin; no blank tab or location wait.
                    });
                target.addEventListener('change', update);
                navigation.prepend(target);
                update();
                card.append(navigation, originStatus);
            }
            card.append(actions);
            root.append(card);
        });
    }
    function paint(fit = false): void {
        const list = places(),
            route = cache.get(key()),
            host = $('city-map');
        host.dataset.poiMarkers = String(list.filter((p) => p.lat !== null).length);
        host.dataset.routeKind = route ? 'road' : 'straight';
        const located = list.filter((p) => p.lat !== null && p.lon !== null),
            missing = list.length - located.length;
        $('map-state').textContent =
            (tiles ? '' : t('Street tiles are off.') + ' ') +
            (missing
                ? t('Places without coordinates') +
                  ': ' +
                  missing +
                  '. ' +
                  t('Add real coordinates to place pins; addresses are text only.')
                : list.length
                  ? ''
                  : t('No places for this day.')) +
            (stop() && stop()!.lat === null
                ? ' ' + t('This city has no map position; the map uses a world overview.')
                : '');
        const empty = $('city-map-empty');
        empty.hidden = !!tiles || !!located.length;
        empty.textContent =
            t('Street tiles are off. Turn on the street map to see streets.') +
            (missing
                ? ' ' + t('Add real coordinates to place pins; addresses are text only.')
                : '');
        if (map && group && window.L) {
            const L = window.L;
            group.clearLayers();
            const points: XY[] = [];
            list.forEach((poi, index) => {
                if (poi.lat === null || poi.lon === null) return;
                const p: XY = [poi.lat, poi.lon];
                points.push(p);
                const popup = document.createElement('div');
                popup.append(
                    text('strong', `${index + 1}. ${poi.name}`),
                    text('p', poi.address || t('Address not entered')),
                    text('p', `${poi.lat}, ${poi.lon}`),
                );
                group!.addLayer(
                    L.marker(p, {
                        icon: L.divIcon({
                            className: 'poi-map-pin',
                            html: String(index + 1),
                            iconSize: [28, 28],
                            iconAnchor: [14, 14],
                        }),
                        keyboard: true,
                        title: poi.name,
                    }).bindPopup(popup),
                );
            });
            if (route)
                group.addLayer(
                    L.polyline(
                        route.coordinates.map((p) => [p[1], p[0]]),
                        { color: '#2563a4', weight: 4, opacity: 0.9 },
                    ),
                );
            else
                for (let i = 1; i < list.length; i++) {
                    const a = list[i - 1]!,
                        b = list[i]!;
                    if (a.lat !== null && a.lon !== null && b.lat !== null && b.lon !== null)
                        group.addLayer(
                            L.polyline(
                                [
                                    [a.lat, a.lon],
                                    [b.lat, b.lon],
                                ],
                                { color: '#aa7831', weight: 2, dashArray: '5 7' },
                            ),
                        );
                }
            if (fit && !visible()) pendingFit = true;
            if (fit && visible()) {
                pendingFit = false;
                if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 16 });
                else if (points[0]) map.setView(points[0], 15);
                else if (stop()?.lat !== null && stop()?.lat !== undefined)
                    map.setView([stop()!.lat!, stop()!.lon!], 11);
                else map.setView([20, 0], 2);
            }
        }
        if (error) $('road-status').textContent = t(error);
        else if (requesting) $('road-status').textContent = t('Requesting road route…');
        else if (route)
            $('road-status').textContent =
                `${t('Road route')} · ${t(route.mode === 'foot' ? 'Walking' : route.mode === 'car' ? 'Driving' : 'Cycling')} · ${(route.distance / 1000).toFixed(2)} km · ${t('Estimated travel time')}: ${Math.round(route.duration / 60)} min · ${t('Fetched')}: ${new Date(route.fetchedAt).toLocaleString(locale())} · FOSSGIS / OSRM`;
        else {
            const reasons: string[] = [];
            if (list.length > 10)
                reasons.push(
                    t('Road routing needs 2–10 places, all with coordinates.') +
                        ' ' +
                        t('Places') +
                        ': ' +
                        list.length +
                        '.',
                );
            if (missing)
                reasons.push(
                    t('Places without coordinates') +
                        ': ' +
                        list
                            .filter((p) => p.lat === null || p.lon === null)
                            .map((p) => p.name)
                            .join('、') +
                        '. ' +
                        t(
                            'Choose a specific venue or enter its verified coordinates before road routing.',
                        ),
                );
            if (list.length < 2)
                reasons.push(t('Add at least two mapped places to request a road route.'));
            $('road-status').textContent =
                reasons.join(' ') +
                (reasons.length ? ' ' : '') +
                t('Dashed lines show visit order only, not roads or journey times.') +
                ' ' +
                t('Changing travel mode does not change these planned connectors.');
        }
        $('request-road').setAttribute('aria-describedby', 'road-status');
        $<HTMLButtonElement>('request-road').disabled =
            requesting ||
            list.length < 2 ||
            list.length > 10 ||
            list.some((p) => p.lat === null || p.lon === null);
    }
    function refresh(): void {
        const plan = getPlan();
        eligible = plan.stops.some(
            (s) => !!s.name.trim() && s.nights > 0 && s.days.length === s.nights,
        );
        const horizon = $('city-horizon');
        horizon.inert = !eligible;
        horizon.setAttribute('aria-hidden', String(!eligible));
        horizon.classList.toggle('map-eligible', eligible);
        if (!eligible) {
            $('city-map-panel').hidden = true;
            if (tiles && map) map.removeLayer(tiles);
            tiles = undefined;
        }
        requestAnimationFrame(resizePanel);
        const s = plan.stops.find((s) => s.id === stopId);
        if (!s) {
            stopId = (plan.stops.find((s) => s.pois.length) || plan.stops[0])?.id || '';
            day = 0;
            clearEdit();
        }
        if (s && day >= s.nights) {
            day = s.nights - 1;
            clearEdit();
        }
        if (editing && !stop()?.pois.some((p) => p.id === editing)) clearEdit();
        for (const key of ['city-stop', 'poi-stop']) {
            const select = $<HTMLSelectElement>(key);
            select.replaceChildren(
                ...plan.stops.map((s, i) => new Option(`${i + 1}. ${s.name}`, s.id)),
            );
            select.value = stopId;
            select.disabled = !plan.stops.length;
        }
        $<HTMLFieldSetElement>('poi-fields').disabled = !plan.stops.length;
        for (const key of ['city-day', 'poi-day'])
            $<HTMLSelectElement>(key).disabled = !plan.stops.length;
        renderDays();
        renderList();
        $('poi-location-note').textContent = t(
            picking
                ? 'Tap the correct place on the map. This selects coordinates; it does not verify an address.'
                : 'Manual coordinates only; an address is not automatically geocoded.',
        );
        const next = key(),
            selection = stopId + '|' + day;
        if (next !== previousKey) {
            controller?.abort();
            requesting = false;
            error = '';
            previousKey = next;
        }
        if (selection !== previousSelection) {
            previousSelection = selection;
            pendingFit = true;
        }
        paint(pendingFit);
        autoMap();
        window.dispatchEvent(
            new CustomEvent('roamnest-city-selection-change', { detail: { stopId, day } }),
        );
    }
    function selectDay(nextStop: string, nextDay: number, reveal = false): void {
        const target = getPlan().stops.find((s) => s.id === nextStop);
        if (!target) return;
        const bounded = Number.isInteger(nextDay)
            ? Math.max(0, Math.min(target.nights - 1, nextDay))
            : 0;
        if (stopId !== target.id || day !== bounded) {
            controller?.abort();
            stopId = target.id;
            day = bounded;
            clearEdit();
            error = '';
            refresh();
        }
        if (reveal)
            $('city-planner').scrollIntoView({
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
            });
    }
    for (const key of ['city-stop', 'poi-stop'])
        $(key).addEventListener('change', () => selectDay(val(key), val(key) === stopId ? day : 0));
    for (const key of ['city-day', 'poi-day'])
        $(key).addEventListener('change', () => selectDay(stopId, Number(val(key))));
    $('road-mode').addEventListener('change', () => {
        controller?.abort();
        requesting = false;
        error = '';
        renderList();
        paint();
    });
    $('poi-cancel').addEventListener('click', clearEdit);
    $('poi-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const s = stop();
        if (!s) return;
        try {
            const name = val('poi-name').trim();
            if (!name || name.length > 120) throw new Error('Enter a place name.');
            if (
                !editing &&
                (s.pois.length >= 100 ||
                    getPlan().stops.reduce((n, s) => n + s.pois.length, 0) >= 300)
            )
                throw new Error('Keep up to 100 places per stop and 300 per trip.');
            const point = coordinates(val('poi-lat'), val('poi-lon'));
            const poi: POI = {
                id: editing || id(),
                day,
                name,
                address: val('poi-address').trim(),
                notes: val('poi-notes'),
                ...point,
            };
            const next = editing
                ? s.pois.map((p) => (p.id === editing ? poi : p))
                : [...s.pois, poi];
            validatePlan({
                ...getPlan(),
                stops: getPlan().stops.map((p) => (p.id === s.id ? { ...s, pois: next } : p)),
            });
            s.pois = next;
            clearEdit();
            stateChange();
            notify('Place saved.');
        } catch (e) {
            notify((e as Error).message);
        }
    });
    function ensureMap(): void {
        if (map || !window.L) return;
        try {
            map = window.L.map($('city-map'), {
                scrollWheelZoom: true,
                zoomControl: true,
                attributionControl: false,
                dragging: true,
                touchZoom: true,
                doubleClickZoom: true,
            });
            map.setView([20, 0], 2);
            map.on('moveend', () => {
                const c = map!.getCenter();
                $('city-map').dataset.camera = JSON.stringify({
                    lat: c.lat,
                    lon: c.lng,
                    zoom: map!.getZoom(),
                });
            });
            group = window.L.featureGroup();
            group.addTo(map);
            $('city-map-placeholder').hidden = true;
            paint(true);
            map.on('click', (event) => {
                if (!picking) return;
                set('poi-lat', event.latlng.lat.toFixed(6));
                set('poi-lon', event.latlng.lng.toFixed(6));
                picking = false;
                $('pick-on-map').setAttribute('aria-pressed', 'false');
                $('poi-location-note').textContent = t(
                    'Map point selected. Confirm it matches your address before saving.',
                );
            });
            paint(true);
            new ResizeObserver(() => {
                if (visible()) map?.invalidateSize();
            }).observe($('city-map'));
            new IntersectionObserver((entries) => {
                if (entries[0]?.isIntersecting && map) {
                    map.invalidateSize();
                    if (pendingFit) paint(true);
                }
            }).observe($('city-map'));
        } catch {
            notify('Street map unavailable. Places and external directions still work.');
        }
    }
    function addTiles(): void {
        if (!map || !window.L || tiles) return;
        let failed = false;
        $('tile-status').textContent = t('Loading street map…');
        $('retry-city-map').hidden = true;
        tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            minZoom: 2,
            updateWhenIdle: true,
            keepBuffer: 0,
            detectRetina: false,
            noWrap: true,
        });
        tiles.on('tileerror', () => {
            failed = true;
            $('tile-status').textContent = t(
                'Street map unavailable. Retry or use external directions.',
            );
            $('retry-city-map').hidden = false;
        });
        tiles.on('load', () => {
            if (!failed) {
                $('tile-status').textContent = '';
                $('retry-city-map').hidden = true;
            }
        });
        tiles.addTo(map);
        $<HTMLButtonElement>('pick-on-map').disabled = false;
        paint();
    }
    $('retry-city-map').addEventListener('click', () => {
        if (tiles && map) map.removeLayer(tiles);
        tiles = undefined;
        addTiles();
    });
    $('pick-on-map').addEventListener('click', () => {
        picking = !picking;
        $('pick-on-map').setAttribute('aria-pressed', String(picking));
        $('poi-location-note').textContent = t(
            picking
                ? 'Tap the correct place on the map. This selects coordinates; it does not verify an address.'
                : 'Manual coordinates only; an address is not automatically geocoded.',
        );
    });
    $('request-road').addEventListener('click', async () => {
        try {
            if (requesting) return;
            const list = places(),
                requestKey = key(),
                profile = mode(),
                url = routingURL(list, profile);
            if (cache.has(requestKey)) {
                error = '';
                paint();
                return;
            }
            let shared = 0;
            try {
                shared = Number(localStorage.getItem('roamnest-road-last-request') || 0);
            } catch {
                /* Per-tab guard remains. */
            }
            const now = Date.now();
            if (now - Math.max(lastRequest, shared) < 3000)
                throw new Error('Wait at least 3 seconds before another road request.');
            if (requests >= 20)
                throw new Error('Prototype routing limit reached. Use external directions.');
            lastRequest = now;
            requests++;
            try {
                localStorage.setItem('roamnest-road-last-request', String(now));
            } catch {
                /* No account needed. */
            }
            controller = new AbortController();
            const active = controller,
                timeout = setTimeout(() => active.abort(), 12_000);
            requesting = true;
            error = '';
            paint();
            try {
                const response = await fetch(url, {
                    signal: active.signal,
                    credentials: 'omit',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                });
                if (!response.ok)
                    throw new Error(
                        'Road service unavailable. Straight connectors remain; try external directions.',
                    );
                const route = parseRoadRoute(await response.json(), profile);
                if (requestKey === key()) cache.set(requestKey, route);
            } catch (e) {
                if (requestKey === key())
                    error =
                        (e as Error).name === 'AbortError'
                            ? 'Road request timed out or was cancelled. Try external directions.'
                            : (e as Error).message ===
                                'No usable road route returned. Straight connectors remain; try external directions.'
                              ? (e as Error).message
                              : 'Road service unavailable. Straight connectors remain; try external directions.';
            } finally {
                clearTimeout(timeout);
                if (controller === active) {
                    requesting = false;
                    controller = undefined;
                }
                paint();
            }
        } catch (e) {
            error = (e as Error).message;
            paint();
        }
    });
    window.addEventListener('roamnest-language-change', refresh);
    function resizePanel(): void {
        const horizon = $('city-horizon');
        // Measure content only for the automatic reveal; the card stays in ordinary page flow.
        horizon.style.maxHeight = eligible
            ? Math.ceil(horizon.firstElementChild!.getBoundingClientRect().height) + 'px'
            : '0px';
        if (visible()) map?.invalidateSize();
    }
    new ResizeObserver(() => requestAnimationFrame(resizePanel)).observe(
        $('city-horizon').firstElementChild!,
    );
    window.addEventListener('resize', () => requestAnimationFrame(resizePanel));
    window.addEventListener('roamnest-language-change', () => requestAnimationFrame(resizePanel));
    $('city-horizon').addEventListener('transitionend', () => {
        if (visible()) {
            map?.invalidateSize();
            if (pendingFit) paint(true);
        }
    });
    window.addEventListener('roamnest-mode-change', () =>
        requestAnimationFrame(() => {
            resizePanel();
            if (visible()) {
                map?.invalidateSize();
                if (pendingFit) paint(true);
            }
        }),
    );
    let cancelMapCompletion = (): void => {};
    function autoMap(): void {
        cancelMapCompletion();
        const show = eligible && document.body.dataset.mode !== 'globe';
        if (show) $('city-map-panel').hidden = false;
        else if (
            document.body.dataset.mode === 'globe' &&
            !matchMedia('(prefers-reduced-motion: reduce)').matches
        )
            cancelMapCompletion = afterModeTransition(() => {
                if (document.body.dataset.mode === 'globe') $('city-map-panel').hidden = true;
            });
        else $('city-map-panel').hidden = true;
        if (show) {
            ensureMap();
            addTiles();
            requestAnimationFrame(() => {
                resizePanel();
                map?.invalidateSize();
                if (pendingFit) paint(true);
            });
        } else if (tiles && map) {
            map.removeLayer(tiles);
            tiles = undefined;
        }
        resizePanel();
    }
    window.addEventListener('roamnest-mode-change', autoMap);

    return {
        refresh,
        selection: () => ({ stopId, day }),
        reset: () => {
            controller?.abort();
            stopId = '';
            day = 0;
            clearEdit();
            refresh();
        },
        selectDay: (nextStop, nextDay, reveal = true) => selectDay(nextStop, nextDay, reveal),
    };
}
