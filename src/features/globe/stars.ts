// Static decorative sky. Create the accent points once; no timers, animation
// handlers or per-frame star work. Visibility follows Explore's CSS mode.
export function initializeStars(): void {
    const field = document.querySelector<HTMLElement>('.starfield');
    if (!field) return;
    for (let i = 0; i < 18; i++) {
        const star = document.createElement('span');
        star.className = 'star-accent';
        star.style.left = ((i % 2 ? 78 : 3) + Math.random() * 19).toFixed(3) + '%';
        star.style.top = (12 + Math.random() * 82).toFixed(3) + '%';
        star.style.setProperty('--star-size', (1.8 + Math.random() * 1.1).toFixed(2) + 'px');
        field.append(star);
    }
    field.dataset.steadyStars = '1268';
    field.dataset.twinkleStars = '0';
}
