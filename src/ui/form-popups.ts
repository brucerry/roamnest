import { createSpringSurface } from './spring.js';
import { locale, t } from '../i18n/index.js';
type Control = { refresh: () => void; destroy: () => void };
export function initializeFormPopups(): void {
    const controls = new Map<Element, Control>();
    let serial = 0,
        active: {
            close: (focus?: boolean) => void;
            contains: (node: Node) => boolean;
            position: () => void;
        } | null = null;
    const label = (native: HTMLInputElement | HTMLSelectElement) =>
        native.getAttribute('aria-label') || native.labels?.[0]?.textContent?.trim() || t('Date');
    function popup(
        anchor: HTMLElement,
        trigger: HTMLButtonElement,
        role: string,
        name: () => string,
    ) {
        const panel = document.createElement('div');
        panel.className = 'form-popup';
        panel.id = 'form-popup-' + ++serial;
        panel.setAttribute('role', role);
        panel.hidden = true;
        document.body.append(panel);
        trigger.setAttribute('aria-controls', panel.id);
        trigger.setAttribute('aria-haspopup', role === 'listbox' ? 'listbox' : 'dialog');
        trigger.setAttribute('aria-expanded', 'false');
        let upward = false,
            opened = false,
            positionFrame = 0;
        const spring = createSpringSurface(panel, trigger, () => upward);
        const close = (focus = false) => {
            opened = false;
            cancelAnimationFrame(positionFrame);
            trigger.setAttribute('aria-expanded', 'false');
            spring.set(false);
            if (active?.close === close) active = null;
            if (focus) trigger.focus({ preventScroll: true });
        };
        const contains = (node: Node) => anchor.contains(node) || panel.contains(node);
        const position = () => {
            const r = anchor.getBoundingClientRect(),
                top = document.body.classList.contains('mode-globe')
                    ? 12
                    : document.querySelector('.masthead')!.getBoundingClientRect().bottom + 12,
                below = innerHeight - r.bottom - 16;
            if (r.bottom < top || r.top > innerHeight) {
                close();
                return;
            }
            upward = below < 260 && r.top - top > below;
            const available = Math.max(44, upward ? r.top - top - 10 : below);
            panel.style.width =
                Math.min(Math.max(r.width, role === 'dialog' ? 292 : 180), innerWidth - 24) + 'px';
            panel.style.maxHeight = Math.min(role === 'dialog' ? 370 : 300, available) + 'px';
            panel.style.left =
                Math.max(12, Math.min(r.left, innerWidth - parseFloat(panel.style.width) - 12)) +
                'px';
            panel.style.top = upward ? 'auto' : r.bottom + 8 + 'px';
            panel.style.bottom = upward ? innerHeight - r.top + 8 + 'px' : 'auto';
        };
        const open = () => {
            active?.close();
            opened = true;
            active = { close, contains, position };
            panel.setAttribute('aria-label', name());
            position();
            trigger.setAttribute('aria-expanded', 'true');
            spring.set(true);
            const follow = () => {
                if (opened) {
                    position();
                    positionFrame = requestAnimationFrame(follow);
                }
            };
            positionFrame = requestAnimationFrame(follow);
        };
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(true);
            }
            if (e.key === 'Tab') {
                const focusable = [
                    ...panel.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]'),
                ];
                const next = e.shiftKey ? focusable.at(-1) : focusable[0];
                if (document.activeElement === (e.shiftKey ? focusable[0] : focusable.at(-1))) {
                    e.preventDefault();
                    next?.focus();
                }
            }
        });
        trigger.addEventListener('click', () => {
            if (opened) close();
            else open();
        });
        return {
            panel,
            open,
            close,
            position,
            get opened() {
                return opened;
            },
            destroy: () => {
                close();
                panel.remove();
            },
        };
    }
    function wrap(native: HTMLInputElement | HTMLSelectElement) {
        const root = document.createElement('span');
        root.className = 'form-control';
        native.before(root);
        root.append(native);
        native.classList.add('form-native');
        native.tabIndex = -1;
        native.setAttribute('aria-hidden', 'true');
        return root;
    }
    function watchValue(native: HTMLInputElement | HTMLSelectElement, refresh: () => void) {
        const descriptor = Object.getOwnPropertyDescriptor(
            native instanceof HTMLSelectElement
                ? HTMLSelectElement.prototype
                : HTMLInputElement.prototype,
            'value',
        )!;
        Object.defineProperty(native, 'value', {
            configurable: true,
            get() {
                return descriptor.get!.call(this);
            },
            set(value: string) {
                descriptor.set!.call(this, value);
                refresh();
            },
        });
        native.addEventListener('input', refresh);
        native.addEventListener('change', refresh);
    }
    function select(native: HTMLSelectElement): Control {
        const root = wrap(native),
            trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'form-select-trigger';
        const caption = document.createElement('span'),
            caret = document.createElement('span');
        caption.className = 'form-select-value';
        caret.className = 'form-select-caret';
        caret.textContent = '▾';
        caret.setAttribute('aria-hidden', 'true');
        trigger.append(caption, caret);
        root.append(trigger);
        const pop = popup(root, trigger, 'listbox', () => label(native));
        let typed = '',
            typedAt = 0;
        const refresh = () => {
            caption.textContent = native.selectedOptions[0]?.textContent || '';
            trigger.disabled = native.disabled;
            trigger.setAttribute(
                'aria-label',
                label(native) + ': ' + (native.selectedOptions[0]?.textContent || ''),
            );
            if (pop.opened) render();
        };
        const render = () => {
            const focused = pop.panel.contains(document.activeElement)
                ? (document.activeElement as HTMLElement).dataset.value
                : undefined;
            pop.panel.replaceChildren();
            for (const [i, option] of [...native.options].entries()) {
                if (option.hidden) continue;
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = option.textContent;
                b.setAttribute('role', 'option');
                b.setAttribute('aria-selected', String(option.selected));
                b.tabIndex = -1;
                b.dataset.index = String(i);
                b.dataset.value = option.value;
                b.disabled = option.disabled;
                b.addEventListener('click', () => {
                    native.value = option.value;
                    pop.close(true);
                    native.dispatchEvent(new Event('change', { bubbles: true }));
                });
                pop.panel.append(b);
            }
            pop.position();
            if (focused !== undefined) {
                const items = [
                    ...pop.panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
                ];
                (items.find((b) => b.dataset.value === focused) || items[0])?.focus({
                    preventScroll: true,
                });
            }
        };
        const focusSelected = () => {
            const items = [
                ...pop.panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
            ];
            (items.find((b) => b.getAttribute('aria-selected') === 'true') || items[0])?.focus({
                preventScroll: true,
            });
            const chosen = document.activeElement as HTMLElement | null;
            if (chosen && pop.panel.contains(chosen))
                pop.panel.scrollTop = Math.max(0, chosen.offsetTop - pop.panel.clientHeight / 2);
        };
        trigger.addEventListener('click', () => {
            if (pop.opened) {
                render();
                focusSelected();
            }
        });
        trigger.addEventListener('keydown', (e) => {
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                pop.open();
                render();
                focusSelected();
            }
        });
        pop.panel.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                pop.close();
                const all = [
                        ...document.querySelectorAll<HTMLElement>(
                            'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
                        ),
                    ].filter(
                        (el) =>
                            el.tabIndex >= 0 &&
                            !el.closest('[hidden],[inert]') &&
                            el.getBoundingClientRect().width > 0,
                    ),
                    i = all.indexOf(trigger);
                all[i + (e.shiftKey ? -1 : 1)]?.focus();
                return;
            }
            const items = [
                    ...pop.panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
                ],
                i = items.indexOf(document.activeElement as HTMLButtonElement);
            let next: number | undefined;
            if (e.key === 'ArrowDown') next = Math.min(items.length - 1, i + 1);
            if (e.key === 'ArrowUp') next = Math.max(0, i - 1);
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = items.length - 1;
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
                typed = performance.now() - typedAt > 800 ? e.key : typed + e.key;
                typedAt = performance.now();
                const matches = items.findIndex(
                    (b, k) =>
                        k > i &&
                        b
                            .textContent!.toLocaleLowerCase(locale())
                            .startsWith(typed.toLocaleLowerCase(locale())),
                );
                next =
                    matches >= 0
                        ? matches
                        : items.findIndex((b) =>
                              b
                                  .textContent!.toLocaleLowerCase(locale())
                                  .startsWith(typed.toLocaleLowerCase(locale())),
                          );
            }
            if (next !== undefined) {
                e.preventDefault();
                items[next]?.focus({ preventScroll: true });
                items[next]?.scrollIntoView({ block: 'nearest' });
            }
        });
        native.addEventListener('focus', () => trigger.focus());
        watchValue(native, refresh);
        const observer = new MutationObserver(refresh);
        observer.observe(native, { childList: true, subtree: true, attributes: true });
        refresh();
        return {
            refresh,
            destroy: () => {
                observer.disconnect();
                pop.destroy();
            },
        };
    }
    function date(native: HTMLInputElement): Control {
        const root = wrap(native),
            field = document.createElement('input'),
            trigger = document.createElement('button');
        field.type = 'text';
        field.className = 'form-date-field';
        field.placeholder = 'YYYY-MM-DD';
        field.maxLength = 10;
        field.inputMode = 'text';
        trigger.type = 'button';
        trigger.className = 'form-calendar-trigger';
        trigger.textContent = '▦';
        root.append(field, trigger);
        root.classList.add('form-date');
        const pop = popup(root, trigger, 'dialog', () => label(native));
        pop.panel.classList.add('calendar-popup');
        let month = new Date(),
            focused = '';
        const iso = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const parse = (s: string) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
            const d = new Date(s + 'T12:00:00');
            return !Number.isNaN(+d) && iso(d) === s ? d : null;
        };
        const lower = () => {
            const today = iso(new Date());
            return native.min && native.min > today ? native.min : today;
        };
        const allowed = (s: string) => s >= lower() && (!native.max || s <= native.max);
        const render = () => {
            pop.panel.replaceChildren();
            const head = document.createElement('div');
            head.className = 'calendar-head';
            const title = document.createElement('span');
            title.setAttribute('aria-live', 'polite');
            title.textContent = new Intl.DateTimeFormat(locale(), {
                month: 'long',
                year: 'numeric',
            }).format(month);
            const monthButton = (delta: number) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = delta < 0 ? '‹' : '›';
                b.setAttribute('aria-label', t(delta < 0 ? 'Previous month' : 'Next month'));
                b.addEventListener('click', () => {
                    month = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
                    render();
                    pop.panel
                        .querySelector<HTMLButtonElement>(
                            delta < 0
                                ? '.calendar-head button:first-child'
                                : '.calendar-head button:last-child',
                        )
                        ?.focus();
                });
                return b;
            };
            head.append(monthButton(-1), title, monthButton(1));
            pop.panel.append(head);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.setAttribute('role', 'grid');
            grid.setAttribute('aria-label', title.textContent);
            const headerRow = document.createElement('div');
            headerRow.className = 'calendar-row';
            headerRow.setAttribute('role', 'row');
            grid.append(headerRow);
            for (let week = 0; week < 7; week++) {
                const h = document.createElement('span');
                h.setAttribute('role', 'columnheader');
                h.textContent = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(
                    new Date(2026, 0, 5 + week),
                );
                headerRow.append(h);
            }
            const first = new Date(month.getFullYear(), month.getMonth(), 1, 12),
                offset = (first.getDay() + 6) % 7,
                total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
            let weekRow = document.createElement('div');
            weekRow.className = 'calendar-row';
            weekRow.setAttribute('role', 'row');
            grid.append(weekRow);
            for (let i = 0; i < offset; i++) {
                const empty = document.createElement('span');
                empty.setAttribute('aria-hidden', 'true');
                weekRow.append(empty);
            }
            for (let day = 1; day <= total; day++) {
                if (day > 1 && (offset + day - 1) % 7 === 0) {
                    weekRow = document.createElement('div');
                    weekRow.className = 'calendar-row';
                    weekRow.setAttribute('role', 'row');
                    grid.append(weekRow);
                }
                const d = new Date(month.getFullYear(), month.getMonth(), day, 12),
                    s = iso(d),
                    b = document.createElement('button');
                b.type = 'button';
                b.textContent = String(day);
                b.dataset.date = s;
                b.setAttribute('role', 'gridcell');
                b.setAttribute(
                    'aria-label',
                    new Intl.DateTimeFormat(locale(), { dateStyle: 'full' }).format(d),
                );
                b.setAttribute('aria-selected', String(s === native.value));
                if (s === iso(new Date())) b.setAttribute('aria-current', 'date');
                b.disabled = !allowed(s);
                b.tabIndex = s === focused ? 0 : -1;
                b.addEventListener('click', () => {
                    native.value = s;
                    pop.close(true);
                    native.dispatchEvent(new Event('input', { bubbles: true }));
                    native.dispatchEvent(new Event('change', { bubbles: true }));
                });
                weekRow.append(b);
            }
            pop.panel.append(grid);
        };
        const focusDay = () =>
            pop.panel
                .querySelector<HTMLButtonElement>(`[data-date="${focused}"]:not(:disabled)`)
                ?.focus({ preventScroll: true });
        const refresh = () => {
            if (document.activeElement !== field) {
                field.value = native.value;
                field.setCustomValidity('');
                native.setCustomValidity('');
                field.removeAttribute('aria-invalid');
            }
            field.disabled = trigger.disabled = native.disabled;
            field.setAttribute('aria-label', label(native) + ' (YYYY-MM-DD)');
            trigger.setAttribute('aria-label', t('Choose date') + ': ' + label(native));
        };
        trigger.addEventListener('click', () => {
            if (pop.opened) {
                const today = iso(new Date()),
                    s =
                        native.value ||
                        (native.min && today < native.min
                            ? native.min
                            : native.max && today > native.max
                              ? native.max
                              : today);
                const d = parse(s < lower() ? lower() : s) || new Date();
                month = new Date(d.getFullYear(), d.getMonth(), 1, 12);
                focused = iso(d);
                render();
                focusDay();
            }
        });
        field.addEventListener('change', () => {
            const valid = parse(field.value),
                ok = !!valid && (field.value === native.value || allowed(field.value));
            field.setAttribute('aria-invalid', String(!ok));
            field.setCustomValidity(ok ? '' : t('Choose today or a future date within this stay.'));
            native.setCustomValidity(field.validationMessage);
            if (!ok) {
                field.reportValidity();
                return;
            }
            native.value = field.value;
            native.dispatchEvent(new Event('input', { bubbles: true }));
            native.dispatchEvent(new Event('change', { bubbles: true }));
        });
        field.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' && e.altKey) {
                e.preventDefault();
                trigger.click();
            }
        });
        native.addEventListener('focus', () => field.focus());
        pop.panel.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement;
            if (!target.dataset.date) return;
            const d = parse(target.dataset.date)!;
            let next: Date | undefined;
            const moves: Record<string, number> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
            };
            if (e.key in moves)
                next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + moves[e.key]!, 12);
            else if (e.key === 'Home')
                next = new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate() - ((d.getDay() + 6) % 7),
                    12,
                );
            else if (e.key === 'End')
                next = new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate() + 6 - ((d.getDay() + 6) % 7),
                    12,
                );
            else if (e.key === 'PageUp' || e.key === 'PageDown') {
                const delta = (e.key === 'PageUp' ? -1 : 1) * (e.shiftKey ? 12 : 1),
                    monthStart = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12),
                    last = new Date(
                        monthStart.getFullYear(),
                        monthStart.getMonth() + 1,
                        0,
                    ).getDate();
                next = new Date(
                    monthStart.getFullYear(),
                    monthStart.getMonth(),
                    Math.min(d.getDate(), last),
                    12,
                );
            }
            if (next) {
                e.preventDefault();
                const s = iso(next);
                if (!allowed(s)) return;
                focused = s;
                month = new Date(next.getFullYear(), next.getMonth(), 1, 12);
                render();
                focusDay();
            }
        });
        watchValue(native, refresh);
        refresh();
        return { refresh, destroy: pop.destroy };
    }
    const scan = () => {
        for (const [native, control] of controls)
            if (!native.isConnected) {
                control.destroy();
                controls.delete(native);
            }
        for (const native of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            '#main select,#main input[type="date"],[data-form-popups] select',
        ))
            if (!controls.has(native) && !native.closest('[hidden]'))
                controls.set(
                    native,
                    native instanceof HTMLSelectElement ? select(native) : date(native),
                );
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && active) {
            e.preventDefault();
            e.stopPropagation();
            active.close(true);
        }
    });
    document.addEventListener(
        'pointerdown',
        (e) => {
            if (active && !active.contains(e.target as Node)) active.close();
        },
        { passive: true },
    );
    document.addEventListener('focusin', (e) => {
        if (active && !active.contains(e.target as Node)) active.close();
    });
    window.addEventListener('roamnest-mode-change', () => active?.close());
    window.addEventListener('resize', () => active?.position());
    window.addEventListener('scroll', () => active?.position(), { capture: true, passive: true });
    window.addEventListener('roamnest-language-change', () => {
        active?.close();
        for (const control of controls.values()) control.refresh();
    });
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('roamnest-form-controls-refresh', scan);
    scan();
}
