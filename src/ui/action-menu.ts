import { createSpringSurface } from './spring.js';
export function initializeActionMenu(): void {
    const trigger = document.getElementById('trip-actions-trigger')!,
        menu = document.getElementById('trip-actions-menu')!,
        container = trigger.parentElement!;
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const spring = createSpringSurface(menu, trigger);
    let expanded = false;
    const close = (focus = false): void => {
        if (expanded) {
            expanded = false;
            trigger.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
            menu.inert = true;
            spring.set(false);
        }
        if (focus) trigger.focus();
    };
    const open = (last = false): void => {
        expanded = true;
        trigger.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
        menu.inert = false;
        spring.set(true);
        items[last ? items.length - 1 : 0]?.focus();
    };
    trigger.addEventListener('click', () => (expanded ? close() : open()));
    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open(event.key === 'ArrowUp');
        }
    });
    menu.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const i = items.indexOf(document.activeElement as HTMLButtonElement),
                next =
                    event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? items.length - 1
                          : (i + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
            items[next]?.focus();
        }
        if (event.key === 'Tab') close();
    });
    menu.addEventListener('click', (event) => {
        if ((event.target as Element).closest('[role="menuitem"]')) close(true);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && expanded) {
            event.preventDefault();
            close(true);
        }
    });
    document.addEventListener(
        'pointerdown',
        (event) => {
            if (!container.contains(event.target as Node)) close();
        },
        { passive: true },
    );
    container.addEventListener('focusout', (event) => {
        if (event.relatedTarget && !container.contains(event.relatedTarget as Node)) close();
    });
    window.addEventListener('roamnest-mode-change', () => close());
}
