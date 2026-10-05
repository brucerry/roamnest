let last = '',
    repeat = 0;
export function backupFilename(name: string, when = new Date()): string {
    const pad = (n: number, width = 2) => String(n).padStart(width, '0');
    const stamp = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}-${pad(when.getMilliseconds(), 3)}`;
    const base = name.replace(/\.json$/i, '') + '-' + stamp;
    if (base === last) repeat++;
    else {
        last = base;
        repeat = 0;
    }
    return base + (repeat ? '-' + (repeat + 1) : '') + '.json';
}
