import { t } from '../i18n/index.js';

export const MODE_TRANSITION_MS = 480;

// Wait for rendered transitions, including a late first frame, rather than a wall-clock timeout.
export function afterModeTransition(complete: () => void): () => void {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
        const animations = Array.from(
            document.querySelectorAll(
                '.planning-column>section,.view-column>section,.city-workspace,.workspace-bar,.source-notes,.masthead,footer',
            ),
        ).flatMap((panel) => panel.getAnimations());
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
            if (!cancelled) complete();
        });
    });
    return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
    };
}

export function initializeModes(canvas: HTMLCanvasElement, onMode: (globe: boolean) => void): void {
    const toggle = document.getElementById('globe-mode') as HTMLButtonElement;
    const back = document.getElementById('globe-return') as HTMLButtonElement;
    const main = document.getElementById('main')!;
    const chrome = Array.from(document.querySelectorAll<HTMLElement>('.masthead,footer,.skip'));
    document.documentElement.style.setProperty('--mode-duration', `${MODE_TRANSITION_MS}ms`);
    const measurePanelExits = (): void => {
        for (const panel of document.querySelectorAll<HTMLElement>(
            '.planning-column>section,.view-column>section,.city-workspace',
        )) {
            const box = panel.getBoundingClientRect(),
                transform = getComputedStyle(panel).transform;
            const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform);
            const left = box.left - (matrix?.m41 ?? 0),
                top = box.top - (matrix?.m42 ?? 0);
            const x = panel.closest('.planning-column')
                ? -(left + box.width + 16)
                : innerWidth - left + 16;
            panel.style.setProperty('--mode-exit-x', `${x}px`);
            panel.style.setProperty('--mode-exit-y', `${Math.max(16, innerHeight - top + 16)}px`);
        }
    };
    let globe = false,
        savedScroll = 0,
        lastPlannerFocus: HTMLElement | null = null,
        savedFocus: HTMLElement | null = null;
    let cancelModeCompletion = (): void => {};
    let selection: [number | null, number | null] | null = null;
    const render = (): void => {
        delete toggle.dataset.i18n;
        toggle.innerHTML =
            '<svg class="explore-eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c3-5 6-7 10-7s7 2 10 7c-3 5-6 7-10 7S5 17 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        const exploreLabel = document.createElement('span');
        exploreLabel.dataset.i18n = 'Explore';
        exploreLabel.textContent = t('Explore');
        toggle.append(exploreLabel);
        toggle.title = t('Explore');
        toggle.setAttribute('aria-label', t('Explore'));
        toggle.setAttribute('aria-pressed', String(globe));
        back.innerHTML = '<span class="back-hand" aria-hidden="true">👈</span>';
        const backLabel = document.createElement('span');
        backLabel.textContent = t('Back');
        back.append(backLabel);
        back.setAttribute('aria-label', t('Back'));
        back.title = t('Back');
        canvas.setAttribute(
            'aria-label',
            t(
                globe
                    ? 'Interactive globe. Drag to rotate; wheel or pinch to zoom. Arrow keys rotate, plus/minus zoom, Home fits the planned route. Escape returns to the planner.'
                    : 'Decorative globe. Use Explore to rotate it. Planned geographic links do not confirm transport service.',
            ),
        );
    };
    document.addEventListener('focusin', (event) => {
        if (!globe && event.target instanceof HTMLElement && main.contains(event.target))
            lastPlannerFocus = event.target;
    });
    const setMode = (next: boolean): void => {
        if (globe === next) return;
        if (next) {
            savedScroll = scrollY;
            window.scrollTo({ top: savedScroll, behavior: 'instant' });
            measurePanelExits();
            document.body.dataset.inputScroll = String(savedScroll);
            savedFocus =
                document.activeElement instanceof HTMLElement &&
                main.contains(document.activeElement)
                    ? document.activeElement
                    : lastPlannerFocus;
            selection = null;
            if (
                savedFocus instanceof HTMLInputElement ||
                savedFocus instanceof HTMLTextAreaElement
            ) {
                try {
                    selection = [savedFocus.selectionStart, savedFocus.selectionEnd];
                } catch {
                    /* Date/number fields have no selection. */
                }
            }
        }
        cancelModeCompletion();
        globe = next;
        document.body.classList.toggle('mode-globe', globe);
        document.documentElement.classList.toggle('mode-globe', globe);
        document.body.dataset.mode = globe ? 'globe' : 'input';
        for (const e of [main, ...chrome]) {
            e.inert = globe;
            if (globe) e.setAttribute('aria-hidden', 'true');
            else e.removeAttribute('aria-hidden');
        }
        back.hidden = !globe;
        document.getElementById('globe-dock')!.hidden = !globe;
        canvas.tabIndex = globe ? 0 : -1;
        render();
        onMode(globe);
        window.dispatchEvent(new Event('roamnest-mode-change'));
        if (globe) {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches)
                window.scrollTo({ top: 0, behavior: 'instant' });
            else
                cancelModeCompletion = afterModeTransition(() => {
                    if (globe) window.scrollTo({ top: 0, behavior: 'instant' });
                });
            back.focus({ preventScroll: true });
        } else {
            window.scrollTo({ top: savedScroll, behavior: 'instant' });
            const target =
                savedFocus?.isConnected && !savedFocus.closest('[hidden]') ? savedFocus : toggle;
            target.focus({ preventScroll: true });
            if (
                selection &&
                (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
            ) {
                try {
                    target.setSelectionRange(selection[0], selection[1]);
                } catch {
                    /* No selection on date/number controls. */
                }
            }
        }
    };
    toggle.addEventListener('click', () => setMode(true));
    back.addEventListener('click', () => setMode(false));
    for (const button of document.querySelectorAll<HTMLElement>(
        '#globe-mode,#globe-dock button,#globe-return',
    ))
        enableTouchActivation(button);
    document.addEventListener('keydown', (event) => {
        if (globe && event.key === 'Escape') {
            event.preventDefault();
            setMode(false);
        }
    });
    window.addEventListener('roamnest-language-change', render);
    document.body.dataset.mode = 'input';
    canvas.tabIndex = -1;
    back.hidden = true;
    render();
}

// Activate floating buttons reliably after a cancelled native multi-touch gesture.
export function enableTouchActivation(button: HTMLElement): void {
    let start: [number, number] | null = null,
        moved = false;
    button.addEventListener(
        'touchstart',
        (event) => {
            const p = event.touches[0];
            start = event.touches.length === 1 && p ? [p.clientX, p.clientY] : null;
            moved = false;
        },
        { passive: true },
    );
    button.addEventListener(
        'touchmove',
        (event) => {
            const p = event.touches[0];
            if (start && p && Math.hypot(p.clientX - start[0], p.clientY - start[1]) > 12)
                moved = true;
        },
        { passive: true },
    );
    button.addEventListener(
        'touchcancel',
        () => {
            start = null;
        },
        { passive: true },
    );
    button.addEventListener(
        'touchend',
        (event) => {
            const p = event.changedTouches[0],
                hit = p ? document.elementFromPoint(p.clientX, p.clientY) : null;
            if (start && !moved && event.touches.length === 0 && hit && button.contains(hit)) {
                event.preventDefault();
                button.click();
            }
            start = null;
        },
        { passive: false },
    );
}
