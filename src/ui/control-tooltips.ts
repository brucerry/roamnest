export function initializeControlTooltips(): void {
    const tooltip = document.createElement('div');
    tooltip.id = 'explore-control-tooltip';
    tooltip.className = 'explore-tooltip';
    tooltip.role = 'tooltip';
    tooltip.hidden = true;
    document.body.append(tooltip);
    let current: HTMLElement | null = null,
        hovered: HTMLElement | null = null,
        focused: HTMLElement | null = null,
        keyboard = false,
        allowHover = false,
        frame = 0;
    const hide = (): void => {
        current?.removeAttribute('aria-describedby');
        current = null;
        tooltip.hidden = true;
    };
    const render = (): void => {
        frame = 0;
        const button = (keyboard && focused === document.activeElement ? focused : null) || hovered;
        if (
            !button ||
            button.closest('[hidden]') ||
            !document.body.classList.contains('mode-globe')
        ) {
            hide();
            return;
        }
        const b = button.getBoundingClientRect();
        if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight) {
            hide();
            return;
        }
        current?.removeAttribute('aria-describedby');
        current = button;
        tooltip.textContent = button.getAttribute('aria-label') || button.textContent || '';
        tooltip.hidden = !tooltip.textContent;
        button.setAttribute('aria-describedby', tooltip.id);
        const box = tooltip.getBoundingClientRect();
        tooltip.style.left = Math.max(12, Math.min(innerWidth - box.width - 12, b.left)) + 'px';
        tooltip.style.top =
            Math.max(12, Math.min(innerHeight - box.height - 12, b.bottom + 9)) + 'px';
    };
    const schedule = (): void => {
        if (!frame) frame = requestAnimationFrame(render);
    };
    document.addEventListener('keydown', (event) => {
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            keyboard = true;
            hovered = null;
        }
        if (event.key === 'Escape') hide();
    });
    document.addEventListener(
        'pointerdown',
        (event) => {
            keyboard = false;
            focused = null;
            hovered =
                event.pointerType === 'mouse' && allowHover
                    ? (event.target as Element).closest<HTMLElement>('#globe-dock button')
                    : null;
            hide();
            schedule();
        },
        { passive: true },
    );
    document.addEventListener(
        'pointermove',
        (event) => {
            if (event.pointerType === 'touch') return;
            allowHover = true;
            keyboard = false;
            focused = null;
            hovered = (event.target as Element).closest<HTMLElement>('#globe-dock button');
            schedule();
        },
        { passive: true },
    );
    for (const button of document.querySelectorAll<HTMLElement>('#globe-dock button')) {
        button.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'touch' && allowHover) {
                hovered = button;
                schedule();
            }
        });
        button.addEventListener('pointerleave', () => {
            if (hovered === button) hovered = null;
            if (!keyboard || focused !== button) hide();
            schedule();
        });
        button.addEventListener('focus', () => {
            if (keyboard) {
                focused = button;
                schedule();
            }
        });
        button.addEventListener('blur', () => {
            if (focused === button) focused = null;
            if (hovered !== button) hide();
            schedule();
        });
        new MutationObserver(() => {
            if (current === button || hovered === button || focused === button) schedule();
        }).observe(button, { attributes: true, attributeFilter: ['aria-label', 'hidden'] });
    }
    window.addEventListener('roamnest-mode-change', () => {
        hovered = focused = null;
        keyboard = false;
        allowHover = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        hide();
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('blur', () => {
        hovered = focused = null;
        hide();
    });
}
