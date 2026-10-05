import { createSpringSurface } from '../../ui/spring.js';
import { geographyLabels } from './data/geography-labels.js';
import { locale, currentLanguage, t } from '../../i18n/index.js';
import type { Airport } from '../../domain/logic.js';
export function initializeCitiesMenu(
    getPlaces: () => Airport[],
    center: (lat: number, lon: number) => void,
): void {
    const root = document.createElement('div');
    root.className = 'globe-cities';
    root.innerHTML =
        '<button id="globe-cities-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="globe-cities-panel"><svg class="cities-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 21V10h6v11M9 21V3h7v18M16 21V8h5v13M2 21h20M12 7h1m-1 4h1m-1 4h1M5 14h1m-1 3h1m13-5h1m-1 4h1"/></svg><span data-i18n="Cities">Cities</span><span aria-hidden="true">▲</span></button><div id="globe-cities-panel" class="globe-cities-panel" role="dialog" aria-modal="false" aria-labelledby="globe-cities-trigger" hidden><p class="cities-explanation"></p><div class="cities-groups"></div></div>';
    document.body.append(root);
    const trigger = root.querySelector<HTMLButtonElement>('button')!,
        panel = root.querySelector<HTMLElement>('.globe-cities-panel')!,
        groups = root.querySelector<HTMLElement>('.cities-groups')!,
        spring = createSpringSurface(panel, trigger, true);
    let open = false;
    const set = (opening: boolean, focus = false) => {
        open = opening;
        trigger.setAttribute('aria-expanded', String(opening));
        trigger.lastElementChild!.textContent = opening ? '▼' : '▲';
        spring.set(opening);
        window.dispatchEvent(new Event('roamnest-cities-change'));
        if (opening) {
            panel.scrollTop = panel.scrollHeight;
            if (focus)
                groups
                    .querySelectorAll<HTMLButtonElement>('button')
                    .item(groups.querySelectorAll('button').length - 1)
                    ?.focus({ preventScroll: true });
        } else if (focus) trigger.focus();
    };
    const render = () => {
        const collator = new Intl.Collator(locale(), { sensitivity: 'base', numeric: true }),
            names = new Intl.DisplayNames([currentLanguage() === 'en' ? 'en' : 'zh-Hant'], {
                type: 'region',
            }),
            byCountry = new Map<string, Airport[]>();
        for (const p of getPlaces())
            if (geographyLabels[p.code]) {
                const list = byCountry.get(p.country) || [];
                list.push(p);
                byCountry.set(p.country, list);
            }
        const countries = [...byCountry.keys()].sort((a, b) =>
            collator.compare(names.of(a) || a, names.of(b) || b),
        );
        groups.replaceChildren();
        const label = (p: Airport) => geographyLabels[p.code]![currentLanguage() === 'en' ? 0 : 1];
        for (const country of countries.reverse()) {
            const list = byCountry
                    .get(country)!
                    .sort((a, b) => collator.compare(label(a), label(b))),
                section = document.createElement('section');
            section.className = 'cities-country';
            section.dataset.country = country;
            const select = (p: Airport, kind: string, name: string) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'city-choice ' + kind;
                button.dataset.kind = kind;
                button.dataset.code = p.code;
                button.dataset.lat = String(p.lat);
                button.dataset.lon = String(p.lon);
                button.textContent = name;
                button.addEventListener('click', () => {
                    center(p.lat, p.lon);
                    set(false, true);
                });
                return button;
            };
            section.append(select(list[0]!, 'country', names.of(country) || country));
            for (const p of [...list].reverse()) section.append(select(p, 'city', label(p)));
            groups.append(section);
        }
        panel.querySelector('.cities-explanation')!.textContent = t(
            'Alphabetical order runs upward. Country views use their first listed city reference.',
        );
        trigger.querySelector('[data-i18n="Cities"]')!.textContent = t('Cities');
        if (open) panel.scrollTop = panel.scrollHeight;
        trigger.disabled = !countries.length;
        window.dispatchEvent(new Event('roamnest-cities-change'));
    };
    trigger.addEventListener('click', () => set(!open, open ? false : true));
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            set(true, true);
        }
    });
    panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            set(false, true);
        } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const buttons = [...groups.querySelectorAll<HTMLButtonElement>('button')],
                i = buttons.indexOf(document.activeElement as HTMLButtonElement),
                next =
                    e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? buttons.length - 1
                          : Math.max(
                                0,
                                Math.min(buttons.length - 1, i + (e.key === 'ArrowUp' ? -1 : 1)),
                            );
            buttons[next]?.focus({ preventScroll: true });
            buttons[next]?.scrollIntoView({ block: 'nearest' });
        }
    });
    panel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    root.addEventListener('focusout', (e) => {
        if (e.relatedTarget && !root.contains(e.relatedTarget as Node)) set(false);
    });
    document.addEventListener(
        'pointerdown',
        (e) => {
            if (!root.contains(e.target as Node)) set(false);
        },
        { passive: true },
    );
    window.addEventListener('roamnest-mode-change', () => set(false));
    window.addEventListener('roamnest-language-change', render);
    window.addEventListener('roamnest-geography-ready', render);
    new ResizeObserver(() => window.dispatchEvent(new Event('roamnest-cities-change'))).observe(
        panel,
    );
    render();
}
