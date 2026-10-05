import { initializeSimulatedRoutes } from './features/globe/simulated-routes.js';
import { notificationKind } from './ui/notifications.js';
import { initializeStars } from './features/globe/stars.js';
import { initializeFormPopups } from './ui/form-popups.js';
import { alternateTripOptions } from './domain/saved-trips.js';
import { initializeCitiesMenu } from './features/globe/cities-menu.js';
import { geographyLabels } from './features/globe/data/geography-labels.js';
import { initializeFooterDisclosure } from './ui/footer-disclosure.js';
import { createSpringSurface } from './ui/spring.js';
import { backupFilename } from './domain/backup-filename.js';
import { poiRevision } from './domain/poi-revision.js';
import { initializeControlTooltips } from './ui/control-tooltips.js';
import { initializeActionMenu } from './ui/action-menu.js';
import { coordinateUpdate } from './domain/coordinate-update.js';
import { createCityPlanner } from './features/planner/city.js';
import { createGlobe } from './features/globe/globe.js';
import { initializeLanguage, t, refreshTranslations } from './i18n/index.js';
import { addDays, isDate, nights, searchAirports } from './domain/logic.js';
import type { Airport, AirportData } from './domain/logic.js';
import {
    PlanStore,
    blankPlan,
    defaultPlan,
    DEFAULT_PLAN_ID,
    id,
    itinerary,
    totals,
    reorder,
    removeStop,
    validatePlan,
    exportBackup,
    importBackup,
    MAX_BACKUP_BYTES,
} from './domain/planner.js';
import type { Plan, Stop } from './domain/planner.js';

const $ = <T extends HTMLElement = HTMLElement>(key: string): T =>
    document.getElementById(key) as T;
const input = (key: string): HTMLInputElement => $(key);
const value = (key: string): string =>
    ($(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
const suggestionSpring = createSpringSurface($('city-options')),
    importDialog = $<HTMLDialogElement>('import-dialog'),
    importSpring = createSpringSurface(importDialog);
function closeImportDialog(): void {
    importSpring.set(false, () => importDialog.close());
}
importDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    pendingImport = null;
    pendingRevisionBase = null;
    closeImportDialog();
});
const setValue = (key: string, v: string): void => {
    ($(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value = v;
};
function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls = '',
    text = '',
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) {
        node.textContent = text;
        node.dataset.userContent = '';
    }
    return node;
}
function label(text: string, tag: 'span' | 'p' | 'h3' = 'span', cls = ''): HTMLElement {
    const node = document.createElement(tag);
    node.className = cls;
    node.dataset.i18n = text;
    node.textContent = t(text);
    return node;
}
function button(text: string, action: () => void, cls = 'small-button'): HTMLButtonElement {
    const b = el('button', cls);
    b.type = 'button';
    b.append(label(text));
    b.addEventListener('click', action);
    return b;
}
const store = new PlanStore({
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
});
const loaded = store.load();
let plans = loaded.plans;
let plan: Plan = plans.find((p) => p.id === loaded.activeId) || defaultPlan();
let saved = !!plans.length,
    timer: ReturnType<typeof setTimeout> | undefined,
    pendingImport: Plan | null = null,
    pendingRevisionBase: Plan | null = null;
let airports: Airport[] = [],
    selectedAirport: Airport | null = null,
    results: Airport[] = [],
    activeResult = -1;
let noticeKey = '';
const globe = createGlobe($<HTMLCanvasElement>('globe'));
initializeStars();
initializeSimulatedRoutes(
    () => airports,
    (route) => globe.setSimulation(route),
    (lat, lon) => globe.centerLabel(lat, lon),
);
initializeLanguage();
initializeActionMenu();
initializeControlTooltips();
initializeCitiesMenu(
    () => {
        const seen = new Set<string>();
        return Object.keys(geographyLabels).flatMap((code) => {
            const p = airports.find((p) => p.code === code);
            if (!p) return [];
            const key = geographyLabels[code]![0] + '|' + p.country;
            if (seen.has(key)) return [];
            seen.add(key);
            return [p];
        });
    },
    (lat, lon) => globe.centerLabel(lat, lon),
);
new ResizeObserver((entries) => {
    const height = entries[0]?.contentRect.height;
    if (height)
        requestAnimationFrame(() => {
            const value = Math.ceil(height) + 'px';
            if (
                document.documentElement.style.getPropertyValue('--explore-controls-height') !==
                value
            )
                document.documentElement.style.setProperty('--explore-controls-height', value);
        });
}).observe($('globe-dock'));
const cityPlanner = createCityPlanner(
    () => plan,
    () => {
        changed();
        renderDaily();
    },
    notify,
);
function notify(key: string): void {
    noticeKey = key;
    const notice = $('notice'),
        warning = notificationKind(key) === 'warning';
    notice.classList.toggle('warning', warning);
    notice.dataset.kind = warning ? 'warning' : 'info';
    notice.setAttribute('role', warning ? 'alert' : 'status');
    notice.setAttribute('aria-live', warning ? 'assertive' : 'polite');
    notice.setAttribute('aria-atomic', 'true');
    notice.textContent = t(key);
    notice.hidden = !key;
}
function displayName(p: Plan): string {
    return (
        p.title.trim() ||
        (p.id === DEFAULT_PLAN_ID ? t('Untitled trip') : t('Untitled saved trip') + ' · ' + p.start)
    );
}
function storageStatus(): void {
    $('storage-warning').hidden = !store.error;
    $('storage-warning').textContent = t(store.error);
    $('export-original').hidden = !store.raw || !store.error;
    $('save-status').textContent = t(
        store.error
            ? 'Save failed'
            : saved
              ? 'Saved on this device'
              : hasContent()
                ? 'Unsaved changes'
                : 'Not saved yet',
    );
}
function renderSaved(): void {
    const select = $<HTMLSelectElement>('saved-trips');
    select.replaceChildren();
    const current = new Option(displayName(plan), plan.id);
    current.disabled = true;
    current.hidden = true;
    current.selected = true;
    select.append(current);
    if (plan.id !== DEFAULT_PLAN_ID) select.append(new Option(t('Untitled trip'), DEFAULT_PLAN_ID));
    const others = alternateTripOptions(plans, plan, displayName);
    for (const option of others) select.append(new Option(option.label, option.id));
    select.value = plan.id;
    select.disabled = plan.id === DEFAULT_PLAN_ID && !others.length;
    const remove = $<HTMLButtonElement>('delete-trip');
    remove.hidden = plan.id === DEFAULT_PLAN_ID;
    remove.disabled = !plans.some((p) => p.id === plan.id);
    remove.setAttribute('aria-label', t('Delete saved trip'));
    remove.title = t('Delete saved trip');
}
function saveNow(): boolean {
    clearTimeout(timer);
    if (!readSettings()) return false;
    if (plan.id === DEFAULT_PLAN_ID) {
        const ok = store.save(plans, DEFAULT_PLAN_ID);
        if (ok) saved = true;
        storageStatus();
        return ok;
    }
    try {
        validatePlan(plan);
    } catch (e) {
        notify((e as Error).message);
        return false;
    }
    const next = plans.filter((p) => p.id !== plan.id);
    if (next.length >= 10) {
        notify('Keep up to 10 saved trips. Export backups before adding another.');
        return false;
    }
    next.push(structuredClone(plan));
    const ok = store.save(next, plan.id);
    if (ok) {
        plans = next;
        saved = true;
        renderSaved();
    }
    storageStatus();
    return ok;
}
function changed(): void {
    saved = false;
    storageStatus();
    clearTimeout(timer);
    timer = setTimeout(saveNow, 350);
}
function readSettings(): boolean {
    if (
        Array.from(document.querySelectorAll<HTMLInputElement>('#main input[type="date"]')).some(
            (field) => field.validity.customError,
        )
    ) {
        notify('Choose today or a future date within this stay.');
        return false;
    }
    const title = value('trip-name'),
        start = value('start-date');
    try {
        if (title.length > 120) throw new Error('Invalid text in backup.');
        if (!isDate(start) || start < '2000-01-01' || start > '2099-12-31')
            throw new Error('Choose a valid start date between 2000 and 2099.');
    } catch (e) {
        notify((e as Error).message);
        return false;
    }
    // Legacy currency, budget, costs and quotes remain untouched in saved/backed-up plans.
    if (plan.id === DEFAULT_PLAN_ID && (title.trim() || start !== plan.start || plan.stops.length))
        plan.id = id();
    plan.title = title;
    plan.start = start;
    return true;
}
function renderSettings(): void {
    setValue('trip-name', plan.title);
    setValue('start-date', plan.start);
    renderSaved();
    storageStatus();
}
function renderSummary(): void {
    $('page-trip-name').textContent = displayName(plan);
    $('trip-duration').textContent =
        plan.stops.length + ' ' + t('stops') + ' · ' + totals(plan).nights + ' ' + t('nights');
}
function renderRoute(_fit = false): void {
    globe.setStops(plan.stops);
}
function changeNights(stop: Stop, count: number): void {
    if (!Number.isInteger(count) || count < 1 || count > 90) {
        notify('Choose a city name and 1–90 nights.');
        renderStops();
        return;
    }
    if (totals(plan).nights - stop.nights + count > 365) {
        notify('Keep the itinerary within 365 nights and 30 stops.');
        renderStops();
        return;
    }
    if (
        count < stop.nights &&
        (stop.days.slice(count).some((v) => v.trim()) || stop.pois.some((p) => p.day >= count)) &&
        !confirm(t('Shortening this stay removes later day notes and places. Continue?'))
    ) {
        renderStops();
        return;
    }
    stop.nights = count;
    stop.pois = stop.pois.filter((p) => p.day < count);
    stop.days = Array.from({ length: count }, (_, i) => stop.days[i] || '');
    renderStops();
    renderDaily();
    renderSummary();
    changed();
}
function renderStops(): void {
    const list = $('stops-list');
    list.replaceChildren();
    if (!plan.stops.length) {
        list.append(
            label('Add your first stop', 'h3'),
            label('Stops appear here in travel order.', 'p', 'muted'),
        );
        return;
    }
    for (const { stop, arrival, departure, index } of itinerary(plan)) {
        const card = el('article', 'stop-card');
        card.dataset.stopId = stop.id;
        const head = el('div', 'stop-head'),
            name = el('h3', 'stop-name', `${index + 1}. ${stop.name}`),
            controls = el('div', 'row-actions');
        const earlier = button(
            'Move earlier',
            () => {
                reorder(plan, stop.id, -1);
                renderStops();
                renderDaily();
                renderRoute();
                changed();
            },
            'icon-button',
        );
        earlier.disabled = index === 0;
        const later = button(
            'Move later',
            () => {
                reorder(plan, stop.id, 1);
                renderStops();
                renderDaily();
                renderRoute();
                changed();
            },
            'icon-button',
        );
        later.disabled = index === plan.stops.length - 1;
        controls.append(
            earlier,
            later,
            button(
                'Plan places',
                () =>
                    cityPlanner.selectDay(
                        stop.id,
                        cityPlanner.selection().stopId === stop.id
                            ? cityPlanner.selection().day
                            : 0,
                    ),
                'icon-button',
            ),
            button(
                'Remove stop',
                () => {
                    if (
                        !confirm(
                            t(
                                'Remove this stop, its day notes, attractions and directly linked records? Later stops will move forward and their dates will update.',
                            ),
                        )
                    )
                        return;
                    removeStop(plan, stop.id);
                    renderStops();
                    renderDaily();
                    renderRoute();
                    renderSummary();
                    changed();
                    notify('Stop removed.');
                },
                'icon-button danger',
            ),
        );
        head.append(name, controls);
        card.append(
            head,
            el(
                'p',
                'location-meta',
                t('Representative airport') + ': ' + (stop.code || t('Not set')),
            ),
        );
        const fields = el('div', 'stop-dates');
        fields.append(el('div', 'arrival', `${t('Arrival')} · ${arrival}`));
        const nightLabel = el('label');
        nightLabel.append(label('Nights'));
        const nightInput = el('input');
        nightInput.type = 'number';
        nightInput.min = '1';
        nightInput.max = '90';
        nightInput.value = String(stop.nights);
        nightInput.setAttribute('aria-label', `${t('Nights')} · ${stop.name}`);
        nightInput.addEventListener('change', () => changeNights(stop, Number(nightInput.value)));
        nightLabel.append(nightInput);
        const untilLabel = el('label');
        untilLabel.append(label('Until date'));
        const untilInput = el('input');
        untilInput.type = 'date';
        untilInput.value = departure;
        untilInput.min = addDays(arrival, 1);
        untilInput.max = addDays(arrival, 90);
        untilInput.setAttribute('aria-label', `${t('Until date')} · ${stop.name}`);
        untilInput.addEventListener('change', () => {
            if (!isDate(untilInput.value)) {
                notify('Departure must be 1–90 nights after arrival.');
                renderStops();
                return;
            }
            changeNights(stop, nights(arrival, untilInput.value));
        });
        untilLabel.append(untilInput);
        fields.append(nightLabel, untilLabel);
        card.append(fields);
        list.append(card);
    }
    refreshTranslations();
}
function renderDaily(): void {
    const root = $('daily-list'),
        selection = cityPlanner.selection(),
        openId = plan.stops.some((s) => s.id === selection.stopId)
            ? selection.stopId
            : plan.stops[0]?.id;
    root.replaceChildren();
    if (!plan.stops.length) {
        root.append(label('Stops appear here in travel order.', 'p', 'muted'));
        cityPlanner.refresh();
        return;
    }
    let day = 1;
    for (const { stop, arrival, index } of itinerary(plan)) {
        const details = el('details', 'daily-stop');
        details.dataset.stopId = stop.id;
        details.setAttribute('name', 'daily-stops');
        details.open = stop.id === openId;
        details.addEventListener('toggle', () => {
            if (details.open)
                for (const other of root.querySelectorAll<HTMLDetailsElement>('details'))
                    if (other !== details) other.open = false;
        });
        const summary = el(
            'summary',
            '',
            `${index + 1}. ${stop.name} · ${arrival} · ${stop.nights} ${t('nights')}`,
        );
        summary.addEventListener('click', (event) => {
            event.preventDefault();
            const opening = !details.open;
            details.open = opening;
            if (opening)
                cityPlanner.selectDay(
                    stop.id,
                    cityPlanner.selection().stopId === stop.id ? cityPlanner.selection().day : 0,
                    false,
                );
        });
        details.append(summary);
        for (let i = 0; i < stop.nights; i++, day++) {
            const row = el('div', 'day-row');
            row.dataset.day = String(i);
            row.append(el('span', 'day-date', `${t('Day')} ${day} · ${addDays(arrival, i)}`));
            const note = el('textarea');
            note.rows = 2;
            note.maxLength = 500;
            note.value = stop.days[i] || '';
            note.placeholder = t('Add activities, reservations or reminders');
            note.setAttribute('aria-label', `${t('Day')} ${day} · ${stop.name}`);
            note.dataset.userContent = '';
            note.addEventListener('input', () => {
                stop.days[i] = note.value;
                changed();
            });
            row.append(
                note,
                button('Plan places', () => cityPlanner.selectDay(stop.id, i)),
            );
            const pois = stop.pois.filter((p) => p.day === i);
            if (pois.length)
                row.append(
                    el('p', 'day-places', pois.map((p, j) => `${j + 1}. ${p.name}`).join(' → ')),
                );
            details.append(row);
        }
        root.append(details);
    }
    const end = itinerary(plan).at(-1);
    if (end) root.append(el('p', 'final-departure', `${t('Final departure')} · ${end.departure}`));
    cityPlanner.refresh();
}
function renderAll(): void {
    renderSettings();
    renderStops();
    renderDaily();
    renderRoute();
    renderSummary();
    refreshTranslations();
}
function download(text: string, name: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const a = el('a');
    a.href = url;
    a.download = backupFilename(name);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function hasContent(): boolean {
    return !!(
        plan.title ||
        plan.stops.length ||
        plan.expenses.length ||
        plan.quotes.length ||
        plan.budget !== null ||
        plans.some((p) => p.id === plan.id)
    );
}
function prepareSwitch(): boolean {
    if (!readSettings()) {
        notify('Check the trip fields before switching trips.');
        return false;
    }
    if (hasContent() && !saveNow()) return false;
    clearTimeout(timer);
    return true;
}
function activate(p: Plan): void {
    plan = structuredClone(p);
    saved = plans.some((v) => v.id === p.id);
    cityPlanner.reset();
    renderAll();
}
$('plan-settings').addEventListener('submit', (event) => event.preventDefault());
for (const key of ['trip-name', 'start-date'])
    input(key).addEventListener('input', () => {
        saved = false;
        storageStatus();
        if (!readSettings()) {
            clearTimeout(timer);
            return;
        }
        notify('');
        renderSummary();
        renderSaved();
        if (key === 'start-date') {
            renderStops();
            renderDaily();
        }
        changed();
    });
$('save-now').addEventListener('click', saveNow);
$('roamnest-home').addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
});
$('city-stop').addEventListener('change', () => renderRoute());
window.addEventListener('roamnest-city-selection-change', () => {
    const selection = cityPlanner.selection();
    for (const details of $('daily-list').querySelectorAll<HTMLDetailsElement>('details')) {
        details.open = details.dataset.stopId === selection.stopId;
        for (const row of details.querySelectorAll<HTMLElement>('.day-row')) {
            const selected = details.open && Number(row.dataset.day) === selection.day;
            row.setAttribute('aria-current', String(selected));
            row.querySelector('button')?.setAttribute('aria-pressed', String(selected));
        }
    }
    renderRoute();
});
function closeSuggestions(): void {
    suggestionSpring.set(false);
    input('city-search').setAttribute('aria-expanded', 'false');
    input('city-search').removeAttribute('aria-activedescendant');
    activeResult = -1;
}
function chooseCity(a: Airport): void {
    selectedAirport = a;
    setValue('city-search', `${a.city || a.name} · ${a.country} (${a.code})`);
    closeSuggestions();
    input('city-search').focus();
}
input('city-search').addEventListener('input', () => {
    selectedAirport = null;
    results = searchAirports(airports, value('city-search'));
    activeResult = -1;
    const root = $('city-options');
    root.replaceChildren(
        ...results.map((a, i) => {
            const li = el('li');
            li.id = `city-result-${i}`;
            li.role = 'option';
            const b = button(
                `${a.city || a.name} · ${a.country} (${a.code})`,
                () => chooseCity(a),
                'city-option',
            );
            b.replaceChildren(el('span', '', `${a.city || a.name} · ${a.country} (${a.code})`));
            li.append(b);
            return li;
        }),
    );
    suggestionSpring.set(!!results.length);
    input('city-search').setAttribute('aria-expanded', String(!!results.length));
});
input('city-search').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSuggestions();
        return;
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && results.length) {
        event.preventDefault();
        activeResult =
            (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        $('city-options')
            .querySelectorAll('li')
            .forEach((li, i) => li.setAttribute('aria-selected', String(i === activeResult)));
        input('city-search').setAttribute('aria-activedescendant', `city-result-${activeResult}`);
    }
    if (event.key === 'Enter' && activeResult >= 0 && results[activeResult]) {
        event.preventDefault();
        chooseCity(results[activeResult]!);
    }
});
document.addEventListener(
    'pointerdown',
    (event) => {
        if (!(event.target as Element).closest('.city-lookup')) closeSuggestions();
    },
    { passive: true },
);
$('add-stop-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = value('city-search').trim(),
        count = Number(value('stop-nights'));
    if (!name || name.length > 120 || !Number.isInteger(count) || count < 1 || count > 90) {
        notify('Choose a city name and 1–90 nights.');
        return;
    }
    if (plan.stops.length >= 30 || totals(plan).nights + count > 365) {
        notify('Keep the itinerary within 365 nights and 30 stops.');
        return;
    }
    const a = selectedAirport || airports.find((a) => a.code === name.toUpperCase());
    plan.stops.push({
        id: id(),
        name: a ? a.city || a.name : name,
        country: a?.country || '',
        code: a?.code || '',
        lat: a?.lat ?? null,
        lon: a?.lon ?? null,
        nights: count,
        days: Array(count).fill(''),
        pois: [],
    });
    setValue('city-search', '');
    selectedAirport = null;
    closeSuggestions();
    renderStops();
    renderDaily();
    renderRoute(true);
    renderSummary();
    changed();
    notify('Stop added.');
});
$('new-trip').addEventListener('click', () => {
    if (!prepareSwitch()) return;
    if (plans.length >= 10) {
        notify('Keep up to 10 saved trips. Export backups before adding another.');
        return;
    }
    activate(blankPlan());
    notify('');
});
$('saved-trips').addEventListener('change', () => {
    const target = value('saved-trips');
    if (!prepareSwitch()) {
        renderSaved();
        return;
    }
    const next = target === DEFAULT_PLAN_ID ? defaultPlan() : plans.find((p) => p.id === target);
    if (next) {
        activate(next);
        saveNow();
        notify('');
    }
});
$('delete-trip').addEventListener('click', () => {
    if (plan.id === DEFAULT_PLAN_ID) return;
    if (!confirm(t('Delete this saved trip? Export a backup first if you want to keep it.')))
        return;
    clearTimeout(timer);
    const next = plans.filter((p) => p.id !== plan.id),
        active = defaultPlan();
    if (store.save(next, active.id)) {
        plans = next;
        activate(active);
        notify('Saved trip deleted.');
    }
    storageStatus();
});
$('export-backup').addEventListener('click', () => {
    if (!readSettings()) return;
    try {
        download(exportBackup(plan), `roamnest-${plan.start}.json`);
        notify('Backup exported.');
    } catch (e) {
        notify((e as Error).message);
    }
});
$('export-original').addEventListener('click', () => {
    if (store.raw) download(store.raw, 'roamnest-original-saved-data.json');
});
$('import-backup').addEventListener('click', () => input('import-file').click());
input('import-file').addEventListener('change', async () => {
    const file = input('import-file').files?.[0];
    input('import-file').value = '';
    if (!file) return;
    try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup must be smaller than 4 MB.');
        const raw = await file.text();
        pendingImport = importBackup(raw);
        const root = JSON.parse(raw);
        pendingRevisionBase = root.attractionRevisionBase
            ? importBackup(
                  JSON.stringify({
                      app: 'roamnest',
                      version: 1,
                      exportedAt: root.exportedAt,
                      plan: root.attractionRevisionBase,
                  }),
              )
            : null;
        $('import-error').hidden = true;
        $('import-update-coordinates').hidden = true;
        if (readSettings()) {
            try {
                const update = pendingRevisionBase
                    ? poiRevision(plan, pendingRevisionBase, pendingImport)
                    : coordinateUpdate(plan, pendingImport);
                $('import-update-coordinates').hidden = false;
                $('coordinate-import-count').textContent = String(update.count);
            } catch {
                /* Ordinary backup imports remain separate trips. */
            }
        }
        $('import-summary').replaceChildren(
            el('h3', '', displayName(pendingImport)),
            el('p', '', `${pendingImport.start} · ${pendingImport.stops.length} ${t('stops')}`),
        );
        const updateLabel = $('import-update-coordinates').querySelector<HTMLElement>(
            'span[data-i18n]',
        )!;
        updateLabel.dataset.i18n = pendingRevisionBase
            ? 'Apply reviewed attraction changes to current trip'
            : 'Update missing place details in current trip';
        updateLabel.textContent = t(updateLabel.dataset.i18n);
        if (pendingRevisionBase) {
            try {
                const review = poiRevision(plan, pendingRevisionBase, pendingImport);
                for (const name of review.removed)
                    $('import-summary').append(el('p', '', t('Remove') + ': ' + name));
                for (const row of review.updated)
                    $('import-summary').append(
                        el('p', '', t('Update') + ': ' + row.before + ' → ' + row.after),
                    );
            } catch (e) {
                $('import-error').hidden = false;
                $('import-error').textContent = t((e as Error).message);
            }
        }
        importDialog.showModal();
        importSpring.set(true);
    } catch (e) {
        pendingImport = null;
        pendingRevisionBase = null;
        notify((e as Error).message || 'Backup read failed. Choose a local JSON file.');
    }
});
$('import-cancel').addEventListener('click', () => {
    pendingImport = null;
    pendingRevisionBase = null;
    closeImportDialog();
});
$('import-update-coordinates').addEventListener('click', () => {
    if (!pendingImport || !readSettings()) return;
    try {
        // Recheck current fields at click time. PlanStore also checks another-tab writes.
        const revision = !!pendingRevisionBase,
            update = pendingRevisionBase
                ? poiRevision(plan, pendingRevisionBase, pendingImport)
                : coordinateUpdate(plan, pendingImport),
            next = plans.map((p) => (p.id === plan.id ? structuredClone(update.plan) : p));
        if (!next.some((p) => p.id === plan.id))
            throw new Error('Coordinate update blocked: save this trip first.');
        clearTimeout(timer);
        if (!store.save(next, plan.id)) {
            $('import-error').textContent = t(store.error);
            $('import-error').hidden = false;
            storageStatus();
            return;
        }
        plans = next;
        pendingImport = null;
        pendingRevisionBase = null;
        closeImportDialog();
        activate(update.plan);
        notify(
            revision
                ? 'Reviewed attraction changes applied to the current trip.'
                : 'Missing place details updated in the current trip.',
        );
    } catch (e) {
        $('import-error').textContent = t((e as Error).message);
        $('import-error').hidden = false;
        notify((e as Error).message);
    }
});
$('import-confirm').addEventListener('click', () => {
    if (!pendingImport || !prepareSwitch()) return;
    if (plans.length >= 10) {
        notify('Keep up to 10 saved trips. Export backups before adding another.');
        return;
    }
    const imported = { ...pendingImport, id: id() };
    pendingImport = null;
    pendingRevisionBase = null;
    closeImportDialog();
    activate(imported);
    saveNow();
    notify('Backup imported as a separate trip.');
});
window.addEventListener('roamnest-language-change', () => {
    renderSummary();
    renderSaved();
    renderStops();
    renderRoute();
    const open = document.activeElement;
    if (!(open instanceof HTMLTextAreaElement)) renderDaily();
    storageStatus();
    if (noticeKey) $('notice').textContent = t(noticeKey);
});
window.addEventListener('pagehide', () => {
    if (!saved && hasContent()) saveNow();
});
window.addEventListener('storage', (event) => {
    if (event.key === 'roamnest-plans-v1') {
        store.error =
            'Another tab changed saved trips. Export your work, then reload before saving.';
        clearTimeout(timer);
        storageStatus();
    }
});
initializeFooterDisclosure();
renderAll();
initializeFormPopups();
fetch('./data/airports.json')
    .then((r) => {
        if (!r.ok) throw new Error('catalog');
        return r.json() as Promise<AirportData>;
    })
    .then((data) => {
        airports = data.airports;
        globe.setPlaces(airports);
        window.dispatchEvent(new Event('roamnest-geography-ready'));
        $('data-time').textContent = data.retrievedAt;
    })
    .catch(() => {
        $('data-time').textContent = t('Map data unavailable. You can still add unlisted cities.');
    });
