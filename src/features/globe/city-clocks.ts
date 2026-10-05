import { cityTimezones } from './data/city-timezones.js';
const formatters = new Map<string, Intl.DateTimeFormat>(),
    values = new Map<string, string>();
let minute = -1;
export function cityLocalTime(code: string, language: string, now = Date.now()): string {
    const zone = cityTimezones[code];
    if (!zone || !Number.isFinite(now)) return '';
    const tick = Math.floor(now / 60000);
    if (tick !== minute) {
        minute = tick;
        values.clear();
    }
    const key = language + '|' + zone;
    if (values.has(key)) return values.get(key)!;
    try {
        let formatter = formatters.get(key);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat(language === 'en' ? 'en' : 'zh-Hant', {
                timeZone: zone,
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            });
            formatters.set(key, formatter);
        }
        const time = formatter.format(now);
        values.set(key, time);
        return time;
    } catch {
        return '';
    }
}
