export function createSpringSurface(
    element: HTMLElement,
    trigger?: HTMLElement,
    upward: boolean | (() => boolean) = false,
): { set: (open: boolean, onClosed?: () => void) => void; readonly open: boolean } {
    const shift = (y: number) =>
        `translateY(${(typeof upward === 'function' ? upward() : upward) ? -y : y}px)`;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let shown = false,
        animation: Animation | null = null,
        buttonAnimation: Animation | null = null,
        closed: (() => void) | undefined;
    const finish = () => {
        animation = null;
        if (!shown) {
            element.hidden = true;
            const callback = closed;
            closed = undefined;
            callback?.();
        }
    };
    const set = (opening: boolean, onClosed?: () => void): void => {
        if (opening === shown) {
            if (!opening && element.hidden) onClosed?.();
            return;
        }
        shown = opening;
        closed = opening ? undefined : onClosed;
        const current = element.hidden
            ? { opacity: '0', transform: shift(-38) }
            : {
                  opacity: getComputedStyle(element).opacity,
                  transform: getComputedStyle(element).transform,
              };
        animation?.cancel();
        animation = null;
        element.hidden = false;
        element.inert = !opening;
        element.setAttribute('aria-hidden', String(!opening));
        if (reduced.matches) {
            element.hidden = !opening;
            if (!opening) finish();
            return;
        }
        const frames = opening
            ? [
                  { ...current, offset: 0, easing: 'cubic-bezier(.22,.68,.25,1)' },
                  { opacity: '1', transform: shift(12), offset: 0.68, easing: 'ease-out' },
                  { opacity: '1', transform: shift(-2), offset: 0.86, easing: 'ease-out' },
                  { opacity: '1', transform: shift(0), offset: 1 },
              ]
            : [
                  { ...current, offset: 0, easing: 'cubic-bezier(.22,.68,.25,1)' },
                  { opacity: current.opacity, transform: shift(7), offset: 0.28 },
                  {
                      opacity: current.opacity,
                      transform: shift(6),
                      offset: 0.38,
                      easing: 'cubic-bezier(.22,.68,.25,1)',
                  },
                  { opacity: '0', transform: shift(-38), offset: 1 },
              ];
        animation = element.animate(frames, { duration: opening ? 420 : 360, easing: 'linear' });
        animation.onfinish = finish;
        if (trigger) {
            const scale = getComputedStyle(trigger).transform;
            buttonAnimation?.cancel();
            buttonAnimation = trigger.animate(
                [
                    { transform: scale },
                    { transform: 'scale(.96)', offset: 0.25 },
                    { transform: 'scale(1.015)', offset: 0.68 },
                    { transform: 'scale(1)' },
                ],
                { duration: opening ? 420 : 360, easing: 'linear' },
            );
        }
    };
    reduced.addEventListener('change', () => {
        if (reduced.matches) {
            animation?.cancel();
            buttonAnimation?.cancel();
            animation = null;
            buttonAnimation = null;
            element.hidden = !shown;
            if (!shown) finish();
        }
    });
    return {
        set,
        get open() {
            return shown;
        },
    };
}
