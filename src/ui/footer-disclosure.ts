import { createSpringSurface } from './spring.js';
export function initializeFooterDisclosure(): void {
    const details = document.getElementById('sources') as HTMLDetailsElement,
        summary = details.querySelector('summary')!,
        content = details.querySelector<HTMLElement>('.source-sections')!,
        button = summary.querySelector<HTMLElement>('.footer-disclosure-button')!;
    const spring = createSpringSurface(content, button),
        reduced = matchMedia('(prefers-reduced-motion: reduce)');
    content.hidden = true;
    let open = false,
        token = 0,
        frame = 0,
        heightAnimation: Animation | null = null;
    const cancelScroll = () => {
        token++;
        cancelAnimationFrame(frame);
    };
    const set = (opening: boolean) => {
        cancelScroll();
        const run = token,
            current = content.hidden ? 0 : content.getBoundingClientRect().height,
            currentMargin = content.hidden ? 0 : parseFloat(getComputedStyle(content).marginTop);
        open = opening;
        summary.setAttribute('aria-expanded', String(opening));
        heightAnimation?.cancel();
        details.open = true;
        content.hidden = false;
        content.style.height = 'auto';
        const full = content.scrollHeight,
            startY = scrollY,
            header = document.querySelector<HTMLElement>('.masthead')!,
            gap = innerWidth < 600 ? 24 : 32,
            desired = Math.max(
                0,
                startY +
                    summary.getBoundingClientRect().top -
                    header.getBoundingClientRect().bottom -
                    gap,
            );
        content.style.overflow = 'hidden';
        heightAnimation = reduced.matches
            ? null
            : content.animate(
                  [
                      { height: current + 'px', marginTop: currentMargin + 'px' },
                      { height: (opening ? full : 0) + 'px', marginTop: (opening ? 18 : 0) + 'px' },
                  ],
                  {
                      duration: opening ? 420 : 360,
                      easing: 'cubic-bezier(.22,.68,.25,1)',
                      fill: 'both',
                  },
              );
        const settled = () => {
            heightAnimation?.cancel();
            heightAnimation = null;
            content.style.height = '';
            content.style.overflow = '';
            if (!open) details.open = false;
        };
        spring.set(opening, settled);
        if (opening) {
            if (heightAnimation) heightAnimation.onfinish = settled;
            else settled();
        }
        const duration = reduced.matches ? 0 : opening ? 600 : 360,
            started = performance.now();
        document.documentElement.style.overflowAnchor = 'none';
        const scroll = (now: number) => {
            if (run !== token) {
                document.documentElement.style.overflowAnchor = '';
                return;
            }
            const progress = duration ? Math.min(1, (now - started) / duration) : 1,
                ease = progress * progress * (3 - 2 * progress),
                bottom = Math.max(0, document.documentElement.scrollHeight - innerHeight),
                destination = opening ? Math.min(bottom, desired) : bottom;
            scrollTo({ top: startY + (destination - startY) * ease, behavior: 'instant' });
            if (progress < 1) frame = requestAnimationFrame(scroll);
            else {
                scrollTo({ top: destination, behavior: 'instant' });
                document.documentElement.style.overflowAnchor = '';
            }
        };
        frame = requestAnimationFrame(scroll);
    };
    reduced.addEventListener('change', () => {
        if (reduced.matches) {
            cancelScroll();
            heightAnimation?.cancel();
            heightAnimation = null;
            content.style.height = '';
            content.style.overflow = '';
            content.hidden = !open;
            details.open = open;
            document.documentElement.style.overflowAnchor = '';
            const header = document.querySelector('.masthead')!.getBoundingClientRect(),
                gap = innerWidth < 600 ? 24 : 32;
            scrollTo({
                top: open
                    ? Math.max(
                          0,
                          scrollY + summary.getBoundingClientRect().top - header.bottom - gap,
                      )
                    : Math.max(0, document.documentElement.scrollHeight - innerHeight),
                behavior: 'instant',
            });
        }
    });
    summary.addEventListener('click', (event) => {
        event.preventDefault();
        set(!open);
    });
    const interrupt = (event: Event) => {
        if (event.isTrusted && !summary.contains(event.target as Node)) {
            cancelScroll();
            document.documentElement.style.overflowAnchor = '';
        }
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('pointerdown', interrupt, { passive: true });
    window.addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
            interrupt(event);
    });
    window.addEventListener('roamnest-mode-change', cancelScroll);
}
