import { dictionary } from './locales/zh-Hant.js';
import { cantoneseMessages } from './locales/yue-Hant.js';
import { createSpringSurface } from '../ui/spring.js';

export type Language = 'en' | 'zh-Hant' | 'yue-Hant';

let language: Language = 'yue-Hant';

try {
    const saved =
        localStorage.getItem('roamnest-language') || localStorage.getItem('farenest-language');
    if (saved === 'en' || saved === 'zh-Hant' || saved === 'yue-Hant') language = saved;
} catch {
    /* First visit remains Traditional Cantonese when storage is unavailable. */
}

export const currentLanguage = (): Language => language;

export const locale = (): string => (language === 'en' ? 'en-GB' : 'zh-HK');

const cabins: Record<string, string> = {
    economy: '經濟艙',
    premium: '特選經濟艙',
    'premium economy': '特選經濟艙',
    business: '商務艙',
    first: '頭等艙',
};

export function translate(value: string): string {
    if (language === 'en') return value;
    const trimmed = value.trim(),
        spacing = (translated: string) => value.replace(trimmed, translated);
    if (language === 'yue-Hant' && cantoneseMessages[trimmed])
        return spacing(cantoneseMessages[trimmed]!);
    if (dictionary[trimmed]) return spacing(dictionary[trimmed]!);
    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^Child (\d+) age$/))) return spacing(`兒童 ${m[1]} 年齡`);
    if ((m = trimmed.match(/^(\d+) adults?(?: · (\d+) child(?:ren)?)?(?: · (.+))?$/)))
        return spacing(
            `${m[1]} 位成人${m[2] ? ` · ${m[2]} 位兒童` : ''}${m[3] ? ` · ${cabins[m[3]] || m[3]}` : ''}`,
        );
    if ((m = trimmed.match(/^([\d,.]+) km · great-circle distance$/)))
        return spacing(`${m[1]} 公里 · 大圓距離`);
    if ((m = trimmed.match(/^Globe rotated\. Center (-?\d+)° latitude, (-?\d+)° longitude\.$/)))
        return spacing(`地球已旋轉。中心緯度 ${m[1]}°、經度 ${m[2]}°。`);
    if ((m = trimmed.match(/^Globe zoom (\d+)%\.(.*)$/)))
        return spacing(
            `地球縮放 ${m[1]}%。${m[2] ? (language === 'yue-Hant' ? ' 呢個世界地圖冇酒店街道細節。' : ' 此世界地圖不提供酒店的街道細節。') : ''}`,
        );
    if (
        (m = trimmed.match(
            /^Search links prepared (.+)\. No prices fetched\. Confirm all prefilled fields on the provider site\.$/,
        ))
    )
        return spacing(`搜尋連結準備時間：${m[1]}。未取得價格。請在供應商網站確認所有預填欄位。`);
    if ((m = trimmed.match(/^Snapshot downloaded (.+)\.$/)))
        return spacing(`資料下載時間：${m[1]}。`);
    if ((m = trimmed.match(/^Open (.+) (flights|stays) search in a new tab$/)))
        return spacing(`在新分頁開啟 ${m[1]} ${m[2] === 'flights' ? '航班' : '住宿'}搜尋`);
    if (
        (m = trimmed.match(
            /^Near (.+) · approximate straight-line distances\. Choose an airport; suggestions never overwrite your choice\.(?: IP accuracy radius: (.+) km\.)?$/,
        ))
    )
        return spacing(
            `附近地區：${m[1] === 'your approximate area' ? '您的大概位置' : m[1]} · 大概直線距離。請選擇機場；建議不會覆寫您的選擇。${m[2] ? ` IP 精確度半徑：${m[2]} 公里。` : ''}`,
        );
    if (trimmed.includes('Interactive world globe.'))
        return spacing(
            trimmed
                .replace(/ departure\./g, ' 出發。')
                .replace(/ destination\./g, ' 目的地。')
                .replace(
                    'Interactive world globe. Drag to rotate, wheel or pinch to zoom; keyboard buttons are available. Geographic route only, service unverified.',
                    '互動地球。拖曳以旋轉，滾輪或雙指縮放；亦可使用鍵盤按鈕。僅作地理示意，未核實航班服務。',
                ),
        );
    if (trimmed.includes('This snapshot is over 90 days old.'))
        return spacing(
            trimmed.split(' This snapshot')[0]
                ? translate(trimmed.split(' This snapshot')[0]!) +
                      ' ' +
                      dictionary[
                          'This snapshot is over 90 days old. Confirm airport service on the provider site.'
                      ]
                : dictionary[
                      'This snapshot is over 90 days old. Confirm airport service on the provider site.'
                  ]!,
        );
    if (
        (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d+ travelers?/.test(trimmed)) &&
        trimmed.includes(' traveler')
    )
        return spacing(
            trimmed
                .replace(/one way/g, '單程')
                .replace(/(\d+) travelers?/g, '$1 位旅客')
                .replace(/(\d+) nights?/g, '$1 晚')
                .replace(/(\d+) rooms?/g, '$1 間客房'),
        );
    // Airport/provider proper names, IATA/currency codes and traveler-entered content retain their spelling.
    return value;
}

export const t = (value: string): string => translate(value);

const texts = new WeakMap<Text, { en: string; rendered: string }>();

const attributes = new WeakMap<Element, Map<string, { en: string; rendered: string }>>();

let applying = false;

export function refreshTranslations(): void {
    if (applying) return;
    applying = true;
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
        const text = translate(element.dataset.i18n!);
        if (element.textContent !== text) element.textContent = text;
    });
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const text = node as Text,
            parent = text.parentElement;
        if (!parent || parent.closest('script,style,[data-user-content],[data-language-switch]'))
            continue;
        const old = texts.get(text),
            source = old && text.data === old.rendered ? old.en : text.data;
        const translated = translate(source);
        texts.set(text, { en: source, rendered: translated });
        if (text.data !== translated) text.data = translated;
    }
    document.querySelectorAll('[aria-label],[placeholder],[title]').forEach((element) => {
        if (element.closest('[data-language-switch],[data-user-content]')) return;
        const saved = attributes.get(element) || new Map();
        attributes.set(element, saved);
        for (const key of ['aria-label', 'placeholder', 'title']) {
            const value = element.getAttribute(key);
            if (value === null) continue;
            const old = saved.get(key),
                source = old && value === old.rendered ? old.en : value;
            const zh = translate(source);
            saved.set(key, { en: source, rendered: zh });
            if (value !== zh) element.setAttribute(key, zh);
        }
    });
    document.documentElement.lang = language;
    document.title = translate('roamnest — itinerary & places');
    updateLanguageMenu();
    applying = false;
}

function updateLanguageMenu(): void {
    const label = document.getElementById('language-label');
    const trigger = document.getElementById('language-trigger');
    const name =
        language === 'yue-Hant' ? '繁體廣東話' : language === 'zh-Hant' ? '繁體中文' : 'English';
    if (label && label.textContent !== name) {
        label.textContent = name;
        label.lang = language;
    }
    const accessible =
        language === 'yue-Hant'
            ? '揀語言'
            : language === 'zh-Hant'
              ? '選擇語言'
              : 'Choose language';
    if (trigger && trigger.getAttribute('aria-label') !== accessible)
        trigger.setAttribute('aria-label', accessible);
    document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
        button.hidden = button.dataset.language === language;
    });
}

export function initializeLanguage(): void {
    const trigger = document.getElementById('language-trigger') as HTMLButtonElement;
    const menu = document.getElementById('language-menu')!;
    const container = trigger.parentElement!,
        spring = createSpringSurface(menu, trigger);
    let expanded = false;
    let scrollFrame = 0,
        scrollToken = 0,
        restoreAnchor = (): void => {};
    const preserveScroll = (action: () => void): void => {
        cancelAnimationFrame(scrollFrame);
        restoreAnchor();
        const run = ++scrollToken,
            x = scrollX,
            y = scrollY,
            root = document.documentElement,
            body = document.body,
            rootAnchor = root.style.overflowAnchor,
            bodyAnchor = body.style.overflowAnchor;
        root.style.overflowAnchor = body.style.overflowAnchor = 'none';
        restoreAnchor = () => {
            root.style.overflowAnchor = rootAnchor;
            body.style.overflowAnchor = bodyAnchor;
        };
        action();
        const restore = () => scrollTo({ left: x, top: y, behavior: 'instant' });
        restore();
        // Translation listeners rebuild the itinerary; wait for their observers and layout.
        let frames = 0;
        const settle = () => {
            if (run !== scrollToken) return;
            restore();
            if (++frames < 3) scrollFrame = requestAnimationFrame(settle);
            else restoreAnchor();
        };
        scrollFrame = requestAnimationFrame(settle);
    };
    const interrupt = () => {
        scrollToken++;
        cancelAnimationFrame(scrollFrame);
        restoreAnchor();
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchmove', interrupt, { passive: true });
    const close = (restoreFocus = false): void => {
        expanded = false;
        spring.set(false);
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) trigger.focus({ preventScroll: true });
    };
    const open = (): void => {
        expanded = true;
        spring.set(true);
        trigger.setAttribute('aria-expanded', 'true');
        menu.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus({
            preventScroll: true,
        });
    };
    trigger.addEventListener('click', () => {
        if (!expanded) open();
        else close();
    });
    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open();
        }
    });
    menu.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const choices = Array.from(
                menu.querySelectorAll<HTMLButtonElement>('button:not([hidden])'),
            );
            const index = choices.indexOf(document.activeElement as HTMLButtonElement);
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? choices.length - 1
                      : (index + (event.key === 'ArrowUp' ? -1 : 1) + choices.length) %
                        choices.length;
            choices[next]?.focus({ preventScroll: true });
        }
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
    document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) =>
        button.addEventListener('click', () => {
            preserveScroll(() => {
                const next = button.dataset.language as Language;
                if (next !== language) {
                    language = next;
                    try {
                        localStorage.setItem('roamnest-language', language);
                    } catch {
                        /* Switching works when storage is denied. */
                    }
                    window.dispatchEvent(new Event('roamnest-language-change'));
                    refreshTranslations();
                }
                close(true);
            });
        }),
    );
    refreshTranslations();
    new MutationObserver(() => refreshTranslations()).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'placeholder', 'title'],
    });
}
