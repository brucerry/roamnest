import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, webkit } from 'playwright-core';
import { readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = resolve('dist'),
    mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.geojson': 'application/geo+json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
    };
const server = http.createServer(async (req, res) => {
    try {
        const u = new URL(req.url, 'http://localhost'),
            prefix = '/roamnest/';
        if (!u.pathname.startsWith(prefix)) {
            res.writeHead(404);
            res.end();
            return;
        }
        const relative = u.pathname.slice(prefix.length) || 'index.html',
            file = resolve(root, relative);
        if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw Error();
        res.writeHead(200, {
            'Content-Type': mime[extname(file)] || 'text/plain',
            'Cache-Control': 'no-store',
        });
        res.end(await readFile(file));
    } catch {
        res.writeHead(404);
        res.end();
    }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/roamnest/`;
let checks = 0;
try {
    for (const engine of process.env.ROAMNEST_TEST_WEBKIT === '1'
        ? ['chromium', 'webkit']
        : ['chromium']) {
        let options = { headless: true };
        if (engine === 'chromium' && process.platform === 'win32') {
            const cache = resolve(process.env.LOCALAPPDATA, 'ms-playwright'),
                dirs = await readdir(cache),
                dir = dirs
                    .filter((d) => /^chromium-\d+$/.test(d))
                    .sort((a, b) => +b.split('-')[1] - +a.split('-')[1])[0];
            options.executablePath = resolve(cache, dir, 'chrome-win64', 'chrome.exe');
        }
        const browser = await (engine === 'chromium' ? chromium : webkit).launch(options);
        try {
            for (const width of [320, 390, 768, 1440]) {
                const c = await browser.newContext({
                    viewport: { width, height: 900 },
                    reducedMotion: 'no-preference',
                    hasTouch: true,
                });
                await c.addInitScript(() => {
                    localStorage.setItem('roamnest-language', 'en');
                    localStorage.setItem('roamnest-ip-centering', 'off');
                    window.navigationLocationRequests = 0;
                    Object.defineProperty(navigator, 'geolocation', {
                        value: {
                            // Simulate an unanswered first-use permission prompt.
                            getCurrentPosition: () => window.navigationLocationRequests++,
                        },
                    });
                });
                await c.route('https://**', (r) => r.abort());
                const p = await c.newPage(),
                    errors = [],
                    bad = [];
                p.on('pageerror', (e) => errors.push(e.message));
                p.on('response', (r) => {
                    if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.url());
                });
                await p.goto(base);
                await p.waitForFunction(
                    () => +document.getElementById('globe').dataset.majorLabels > 100,
                );
                assert.ok(await p.locator('#planner').isVisible());
                assert.ok(
                    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                );
                const saved = p
                    .locator('#saved-trips')
                    .locator('..')
                    .locator('.form-select-trigger');
                assert.ok(await saved.isVisible());
                const widthCheck = await saved.evaluate((e) => ({
                    button: e.getBoundingClientRect().width,
                    root: e.parentElement.getBoundingClientRect().width,
                    font: getComputedStyle(e).fontSize,
                }));
                assert.ok(Math.abs(widthCheck.button - widthCheck.root) < 1);
                assert.equal(widthCheck.font, '15px');
                checks++;
                await p.locator('#city-search').fill('London');
                await p.waitForSelector('#city-options:not([hidden])');
                await p.locator('#city-options [role="option"]').first().click();
                await p.locator('#add-stop-form button[type="submit"]').click();
                await p.waitForSelector('.stop-card');
                await p.locator('#poi-name').fill('Example museum');
                await p.locator('#poi-address').fill('A manually entered address');
                await p.locator('#poi-submit').click();
                await p.waitForSelector('.poi-target');
                await c.route('https://www.google.com/maps/**', (route) =>
                    route.fulfill({
                        contentType: 'text/html',
                        body: '<p>Maps test destination</p>',
                    }),
                );
                for (const [profile, mode] of [
                    ['foot', 'walking'],
                    ['bike', 'bicycling'],
                    ['car', 'driving'],
                ]) {
                    const opened = p.waitForEvent('popup');
                    await p
                        .locator('.poi-navigation .travel-icon.' + profile)
                        .first()
                        .click();
                    const maps = await opened;
                    await maps.waitForURL(
                        (url) => url.hostname === 'www.google.com' && url.pathname === '/maps/dir/',
                        { timeout: 4000 },
                    );
                    const params = new URL(maps.url()).searchParams;
                    assert.equal(params.get('api'), '1');
                    assert.equal(params.get('dir_action'), 'navigate');
                    assert.equal(params.get('travelmode'), mode);
                    assert.equal(
                        params.get('destination'),
                        'Example museum, A manually entered address, London',
                    );
                    assert.equal(params.has('origin'), false);
                    assert.equal(await maps.evaluate(() => window.opener), null);
                    await maps.close();
                    checks++;
                }
                assert.equal(await p.evaluate(() => window.navigationLocationRequests), 0);
                assert.equal(await p.locator('#notice').getAttribute('role'), 'status');
                assert.equal(await p.locator('#notice').getAttribute('data-kind'), 'info');
                assert.equal(
                    await p.locator('#notice').evaluate((e) => getComputedStyle(e).backgroundColor),
                    'rgb(237, 244, 231)',
                );
                await p.waitForFunction(() =>
                    JSON.parse(localStorage.getItem('roamnest-plans-v1') || 'null')?.plans?.some(
                        (plan) => plan.stops.some((stop) => stop.pois.length > 0),
                    ),
                );
                const original = await p.evaluate(() => localStorage.getItem('roamnest-plans-v1'));
                for (const native of await p.locator('#main select').all()) {
                    if (!(await native.isVisible()) || (await native.isDisabled())) continue;
                    const trigger = native.locator('..').locator('.form-select-trigger');
                    await trigger.scrollIntoViewIfNeeded();
                    const timing = await trigger.evaluate((e) => {
                        e.click();
                        const a = document
                            .getElementById(e.getAttribute('aria-controls'))
                            .getAnimations()[0];
                        return {
                            duration: a.effect.getTiming().duration,
                            frames: a.effect.getKeyframes(),
                        };
                    });
                    const id = await trigger.getAttribute('aria-controls'),
                        panel = p.locator('#' + id);
                    assert.equal(timing.duration, 420);
                    assert.ok(
                        timing.frames.some(
                            (f) =>
                                Math.abs(
                                    parseFloat(f.transform.match(/-?[\d.]+(?=px)/)?.[0] || '0'),
                                ) === 12,
                        ),
                    );
                    await p.waitForTimeout(450);
                    await p.keyboard.press('ArrowDown');
                    await p.keyboard.press('Escape');
                    await p.waitForFunction(
                        (id) => document.getElementById(id)?.hidden,
                        await panel.getAttribute('id'),
                        { timeout: 2000 },
                    );
                    assert.equal(
                        await panel.evaluate((e) => e.hidden),
                        true,
                        engine +
                            ' ' +
                            width +
                            ' ' +
                            (await native.getAttribute('id')) +
                            ' popup close ' +
                            JSON.stringify(
                                await p.evaluate(() => ({
                                    focus: document.activeElement?.outerHTML,
                                    open: [
                                        ...document.querySelectorAll('.form-popup:not([hidden])'),
                                    ].map((e) => e.id),
                                })),
                            ),
                    );
                    assert.equal(
                        await trigger.evaluate((e) => e === document.activeElement),
                        true,
                        engine + ' ' + width + ' focus',
                    );
                }
                checks++;
                for (const native of await p.locator('#main input[type="date"]').all()) {
                    const button = native.locator('..').locator('.form-calendar-trigger');
                    await button.scrollIntoViewIfNeeded();
                    const calendarTiming = await button.evaluate((e) => {
                        e.click();
                        return document
                            .getElementById(e.getAttribute('aria-controls'))
                            .getAnimations()[0]
                            .effect.getTiming().duration;
                    });
                    const panel = p.locator('#' + (await button.getAttribute('aria-controls')));
                    assert.equal(calendarTiming, 420);
                    await p.waitForTimeout(450);
                    assert.ok((await panel.locator('[role="grid"] [role="row"]').count()) > 2);
                    await p.keyboard.press('ArrowRight');
                    await p.keyboard.press('PageDown');
                    await p.keyboard.press('Escape');
                    await p.waitForFunction(
                        (id) => document.getElementById(id)?.hidden,
                        await panel.getAttribute('id'),
                        { timeout: 2000 },
                    );
                    assert.equal(await panel.evaluate((e) => e.hidden), true);
                }
                assert.equal(
                    await p.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
                    original,
                );
                checks++;
                const summary = p.locator('#sources summary');
                await summary.scrollIntoViewIfNeeded();
                await summary.click();
                await p.waitForTimeout(800);
                const footer = await p.evaluate(() => {
                    const a = document
                            .querySelector('footer .footer-brand')
                            .getBoundingClientRect(),
                        b = document
                            .querySelector('.footer-disclosure-button')
                            .getBoundingClientRect(),
                        cards = document.querySelector('.source-sections').getBoundingClientRect(),
                        section = document.getElementById('city-planner').getBoundingClientRect(),
                        header = document.querySelector('.masthead').getBoundingClientRect(),
                        row = document.querySelector('#sources summary').getBoundingClientRect();
                    return {
                        group: (a.left + b.right) / 2,
                        cards: (cards.left + cards.right) / 2,
                        section: (section.left + section.right) / 2,
                        gap: row.top - header.bottom,
                    };
                });
                assert.ok(
                    Math.abs(footer.group - footer.section) < 2 &&
                        Math.abs(footer.cards - footer.section) < 2,
                );
                assert.ok(footer.gap >= 23);
                await summary.click();
                await p.waitForTimeout(600);
                assert.ok(
                    await p.evaluate(
                        () =>
                            Math.abs(
                                scrollY - (document.documentElement.scrollHeight - innerHeight),
                            ) < 3,
                    ),
                );
                checks++;
                assert.equal(
                    await p.locator('html').evaluate((e) => getComputedStyle(e).overflowX),
                    'clip',
                );
                const entry = await p.locator('#globe-mode').evaluate((button) => {
                    button.click();
                    return {
                        duration: getComputedStyle(document.getElementById('planner'))
                            .transitionDuration,
                        mapHidden: document.getElementById('city-map-panel').hidden,
                    };
                });
                assert.ok(entry.duration.includes('0.48s'));
                assert.equal(entry.mapHidden, false);
                await p.waitForTimeout(500);
                await p.locator('#globe-cities-trigger').click();
                await p.waitForTimeout(450);
                for (const section of await p.locator('.cities-country').all())
                    assert.equal(
                        await section.locator('button').first().getAttribute('data-kind'),
                        'country',
                    );
                await p.keyboard.press('Escape');
                await p.waitForTimeout(390);
                await p.locator('#globe-return').click();
                assert.equal(
                    await p
                        .locator('#planner')
                        .evaluate((e) => getComputedStyle(e).transitionDuration),
                    entry.duration,
                );
                await p.waitForTimeout(500);
                assert.equal(
                    await p.locator('#saved-trips').inputValue(),
                    await p.evaluate(
                        () => JSON.parse(localStorage.getItem('roamnest-plans-v1')).activeId,
                    ),
                );
                checks++;
                await p.emulateMedia({ reducedMotion: 'reduce' });
                await saved.click();
                const panel = p.locator('#' + (await saved.getAttribute('aria-controls')));
                assert.equal(await panel.evaluate((e) => e.getAnimations().length), 0);
                await p.keyboard.press('Escape');
                assert.deepEqual(errors, []);
                assert.deepEqual(bad, []);
                checks++;
                await c.close();
            }
        } finally {
            await browser.close();
        }
    }
} finally {
    await new Promise((resolve) => server.close(resolve));
}
console.log(
    checks +
        ' portable base-path/form/footer/static browser checks passed. External calls blocked.',
);
