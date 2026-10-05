export function travelIcon(mode: 'foot' | 'bike' | 'car'): string {
    const paths =
        mode === 'foot'
            ? '<path d="M10 16v5" /><path d="M14 16v5" /><path d="M9 9h6l-1 7h-4l-1 -7" /><path d="M5 11c1.333 -1.333 2.667 -2 4 -2" /><path d="M19 11c-1.333 -1.333 -2.667 -2 -4 -2" /><path d="M10 4a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />'
            : mode === 'bike'
              ? '<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 5-9 5 9H5l6-5m3-7h3l2 12M8 7h4"/>'
              : '<path d="m4 10 2-6h12l2 6M3 10h18v9H3zm3 9v2m12-2v2"/><circle cx="7" cy="14" r="1"/><circle cx="17" cy="14" r="1"/>';
    return (
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        paths +
        '</svg>'
    );
}
