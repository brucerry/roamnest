import { chromium } from 'playwright-core';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { blankPlan } from '../../dist/src/domain/planner.js';
async function waitForHover(page, button) {
    const element = await button.elementHandle();
    try {
        await page.waitForFunction(
            (node) =>
                Math.abs(new DOMMatrixReadOnly(getComputedStyle(node).transform).m42 + 1) < 0.02,
            element,
        );
    } finally {
        await element.dispose();
    }
}

const plan = blankPlan();
plan.id = 'effects-fixture';
plan.title = 'Effects fixture';
plan.start = '2026-10-28';
plan.stops = [
    {
        id: 'first',
        name: 'Alpha',
        country: 'GB',
        code: 'LHR',
        lat: 51.47,
        lon: -0.45,
        nights: 2,
        days: ['Fixture note', ''],
        pois: [],
    },
    {
        id: 'second',
        name: 'Beta',
        country: 'US',
        code: 'ORD',
        lat: 41.98,
        lon: -87.9,
        nights: 3,
        days: ['Another note', '', ''],
        pois: [],
    },
    {
        id: 'third',
        name: 'Gamma',
        country: 'HK',
        code: 'HKG',
        lat: null,
        lon: null,
        nights: 1,
        days: [''],
        pois: [],
    },
];
const original = JSON.stringify({ version: 1, activeId: plan.id, plans: [plan] }),
    report = { checks: [], performance: [], network: [], errors: [] };
let options = { headless: true };
if (process.platform === 'win32') {
    const root = resolve(process.env.LOCALAPPDATA, 'ms-playwright'),
        dirs = await readdir(root),
        latest = dirs
            .filter((s) => /^chromium-\d+$/.test(s))
            .sort((a, b) => +b.split('-')[1] - +a.split('-')[1])[0];
    options.executablePath = resolve(root, latest, 'chrome-win64', 'chrome.exe');
}
const root = resolve('dist'),
    mime = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.geojson': 'application/geo+json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
    };
const server = http.createServer(async (req, res) => {
    try {
        const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
            file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
        if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw Error();
        res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' });
        res.end(await readFile(file));
    } catch {
        res.writeHead(404);
        res.end();
    }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch(options),
    base = `http://127.0.0.1:${server.address().port}/`,
    check = (name) => {
        report.checks.push(name);
        console.log('PASS ' + name);
    };
try {
    if (!process.env.ROAMNEST_TEST_SKIP_IP) {
        const ipContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await ipContext.addInitScript((raw) => {
            if (!localStorage.getItem('roamnest-plans-v1')) {
                localStorage.setItem('roamnest-plans-v1', raw);
                localStorage.setItem('roamnest-ip-centering', 'off');
                localStorage.setItem('roamnest-language', 'en');
            }
            Object.defineProperty(navigator, 'geolocation', {
                value: { getCurrentPosition: (_success, error) => error({ code: 1 }) },
            });
        }, original);
        let ipCalls = 0;
        await ipContext.route('https://**', (r) => r.abort());
        await ipContext.route('https://get.geojs.io/**', (r) => {
            ipCalls++;
            return r.fulfill({ json: { latitude: '35.68', longitude: '139.76', city: 'Fixture' } });
        });
        const ipPage = await ipContext.newPage();
        await ipPage.goto(base);
        await ipPage.locator('#globe-mode').click();
        await ipPage.waitForTimeout(550);
        assert.equal(ipCalls, 0);
        await ipPage.locator('#reset-location').click();
        await ipPage.waitForTimeout(150);
        assert.equal(ipCalls, 0);
        assert.equal(
            await ipPage.evaluate(async () => {
                const { requestNavigationOrigin } = await import('./src/services/location.js');
                return requestNavigationOrigin();
            }),
            null,
        );
        assert.equal(ipCalls, 0);
        await ipPage.locator('#globe-mode-motion').click();
        await ipPage.locator('#globe-return').click();
        await ipPage.waitForTimeout(550);
        await ipPage.locator('#sources summary').click();
        await ipPage.locator('#ip-centering').check();
        assert.equal(ipCalls, 0);
        await ipPage.locator('#globe-mode').click();
        await ipPage.waitForTimeout(200);
        const centeredView = await ipPage.waitForFunction(() => {
            const globe = document.querySelector('#globe');
            if (globe.dataset.recenterCount !== '1' || globe.dataset.recentering !== 'false')
                return false;
            return {
                longitude: Number(globe.dataset.longitude),
                latitude: Number(globe.dataset.latitude),
            };
        });
        const centered = await centeredView.jsonValue();
        await centeredView.dispose();
        assert.equal(ipCalls, 1);
        assert.equal(await ipPage.locator('#globe').getAttribute('data-motion-paused'), 'false');
        assert.ok(Math.abs(centered.longitude - 139.76) < 0.01);
        assert.ok(Math.abs(centered.latitude - 35.68) < 0.01);
        await ipPage.locator('#globe-return').click();
        await ipPage.waitForTimeout(550);
        assert.equal(await ipPage.locator('#ip-centering').isChecked(), true);
        await ipPage.locator('#ip-centering').uncheck();
        assert.equal(
            await ipPage.evaluate(() => localStorage.getItem('roamnest-ip-centering')),
            'off',
        );
        await ipPage.locator('#ip-centering').check();
        assert.equal(
            await ipPage.evaluate(() => localStorage.getItem('roamnest-ip-centering')),
            'on',
        );
        await ipPage.locator('#globe-mode').click();
        await ipPage.waitForFunction(
            () => document.querySelector('#globe').dataset.recenterCount === '2',
        );
        assert.equal(ipCalls, 1);
        await ipPage.locator('#globe-return').click();
        await ipPage.waitForTimeout(550);
        await ipPage.locator('#ip-centering').uncheck();
        await ipPage.reload();
        assert.equal(await ipPage.locator('#ip-centering').isChecked(), false);
        await ipPage.locator('#globe-mode').click();
        await ipPage.waitForTimeout(550);
        assert.equal(ipCalls, 1);
        assert.equal(
            await ipPage.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
            original,
        );
        check(
            'IP opt-out blocks entry, Reset and navigation fallback; explicit enable applies after Back resumes motion; off persists across reload without trip writes',
        );
        await ipContext.close();
        const lateContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await lateContext.addInitScript(() => localStorage.setItem('roamnest-ip-centering', 'off'));
        await lateContext.route('https://**', (r) => r.abort());
        let releaseReply,
            lateCalls = 0;
        await lateContext.route('https://get.geojs.io/**', async (r) => {
            lateCalls++;
            await new Promise((resolve) => (releaseReply = resolve));
            await r.fulfill({ json: { latitude: 35.68, longitude: 139.76 } }).catch(() => {});
        });
        const late = await lateContext.newPage();
        await late.goto(base);
        await late.locator('#sources summary').click();
        await late.locator('#ip-centering').check();
        await late.locator('#globe-mode').click();
        await late.waitForTimeout(550);
        await late.locator('#globe-return').click();
        await late.waitForTimeout(550);
        await late.locator('#ip-centering').uncheck();
        releaseReply();
        await late.waitForTimeout(200);
        assert.equal(await late.locator('#globe').getAttribute('data-recenter-count'), '0');
        await late.locator('#ip-centering').check();
        await late.locator('#globe-mode').click();
        await late.waitForTimeout(550);
        assert.equal(lateCalls, 1);
        assert.equal(await late.locator('#globe').getAttribute('data-recenter-count'), '0');
        check(
            'Opt-out aborts pending IP reply; re-enable cannot exceed one lookup in a page session',
        );
        await lateContext.close();
    }
    for (const width of [320, 390, 768, 1440]) {
        const context = await browser.newContext({
            viewport: { width, height: 900 },
            deviceScaleFactor: width === 320 ? 3 : width === 390 ? 2 : width === 768 ? 1.5 : 1,
        });
        await context.addInitScript((raw) => {
            if (!localStorage.getItem('roamnest-plans-v1')) {
                localStorage.setItem('roamnest-plans-v1', raw);
                localStorage.setItem('roamnest-ip-centering', 'off');
                localStorage.setItem('roamnest-language', 'en');
            }
        }, original);
        await context.route('https://**', (r) => {
            report.network.push(r.request().url());
            return r.abort();
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => report.errors.push(e.message));
        await page.goto(base);
        await page.waitForFunction(
            () =>
                Number(document.querySelector('#globe').dataset.vegetationFeatures) > 500 &&
                document.querySelector('#globe').dataset.riverFeatures === '13' &&
                !document.querySelector('#simulated-route-trigger').disabled,
        );
        assert.equal(await page.locator('#globe').getAttribute('data-simulation-enabled'), 'false');
        assert.equal(
            await page.locator('.starfield').evaluate((e) => getComputedStyle(e).opacity),
            '0',
        );
        assert.equal(await page.locator('#globe').getAttribute('data-route-segments'), '1');
        check(
            width + ' permanent geographic layers and simulation initially off, itinerary retained',
        );
        await page.locator('#add-stop-form button[type=submit]').click();
        assert.equal(await page.locator('#notice').getAttribute('role'), 'alert');
        assert.equal(await page.locator('#notice').getAttribute('data-kind'), 'warning');
        assert.equal(
            await page.locator('#notice').evaluate((e) => getComputedStyle(e).backgroundColor),
            'rgb(255, 244, 206)',
        );
        check(width + ' invalid input produces pale-yellow accessible warning');
        const dailyPeerBorder = await page
            .locator('#daily .day-row')
            .nth(1)
            .locator('button')
            .evaluate((e) => ({
                color: getComputedStyle(e).borderColor,
                width: getComputedStyle(e).borderWidth,
                style: getComputedStyle(e).borderStyle,
            }));
        for (const stop of plan.stops) {
            let group = page.locator(`#daily-list [data-stop-id="${stop.id}"]`);
            if (!(await group.evaluate((e) => e.open))) await group.locator('summary').click();
            for (const day of [...new Set([0, stop.nights - 1])]) {
                const button = group.locator('.day-row').nth(day).locator('button');
                await button.hover();
                await waitForHover(page, button);
                assert.ok(
                    Math.abs(
                        (await button.evaluate(
                            (e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).m42,
                        )) + 1,
                    ) < 0.02,
                );
                await page.keyboard.press('Tab');
                await button.focus();
                assert.ok(
                    await button.evaluate(
                        (e) =>
                            getComputedStyle(e).outlineStyle !== 'none' &&
                            Number.parseFloat(getComputedStyle(e).outlineWidth) >= 2,
                    ),
                );
                await button.click();
                assert.equal(
                    await page.locator('#poi-context').getAttribute('data-stop-id'),
                    stop.id,
                );
                assert.equal(
                    await page.locator('#poi-context').getAttribute('data-day'),
                    String(day),
                );
                assert.equal(await button.getAttribute('aria-pressed'), 'true');
                await page.locator('#daily').scrollIntoViewIfNeeded();
                await button.hover();
                await waitForHover(page, button);
                assert.ok(
                    Math.abs(
                        (await button.evaluate(
                            (e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).m42,
                        )) + 1,
                    ) < 0.02,
                );
                await page.locator('#trip-name').focus();
                await page.mouse.move(0, 0);
                assert.equal(await group.evaluate((e) => e.open), true);
                await page.waitForFunction(
                    (border) =>
                        [
                            ...document.querySelectorAll(
                                '#daily .daily-stop[open] .day-row>.small-button',
                            ),
                        ].every(
                            (e) =>
                                getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)' &&
                                getComputedStyle(e).borderColor === border.color,
                        ),
                    dailyPeerBorder,
                );
                for (const border of await group
                    .locator('.day-row>button')
                    .evaluateAll((elements) =>
                        elements.map((e) => ({
                            color: getComputedStyle(e).borderColor,
                            width: getComputedStyle(e).borderWidth,
                            style: getComputedStyle(e).borderStyle,
                        })),
                    ))
                    assert.deepEqual(border, dailyPeerBorder);
            }
        }
        assert.equal(
            await page.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
            original,
        );
        check(
            width +
                ' all three cities first/later selected daily buttons match white bases and resting peer borders; hover/focus and 03 bindings retained',
        );
        if (process.env.ROAMNEST_TEST_DAILY_ONLY) {
            await context.close();
            continue;
        }

        await page.locator('#globe-mode').click();
        await page.waitForTimeout(550);
        assert.equal((await page.locator('#reset-location').textContent()).trim(), '');
        assert.equal(await page.locator('#reset-location').getAttribute('aria-label'), 'Locate');
        assert.equal((await page.locator('#simulated-route-trigger').textContent()).trim(), '');
        assert.equal(await page.locator('#globe-cities-trigger svg').count(), 1);
        await page.mouse.move(width * 0.72, 500);
        await page.waitForTimeout(100);
        const radar = await page.locator('#globe').evaluate((e) => {
            const r = e.getBoundingClientRect(),
                p = JSON.parse(e.dataset.rippleCenter);
            return {
                x: r.left + (p.x * r.width) / e.clientWidth,
                y: r.top + (p.y * r.height) / e.clientHeight,
                p,
            };
        });
        assert.ok(Math.abs(radar.x - width * 0.72) < 0.5 && Math.abs(radar.y - 500) < 0.5);
        check(width + ' icon-only accessible toolbar and exact pointer hotspot across DPI');
        await page.locator('#simulated-route-trigger').click();
        await page.waitForSelector('#simulation-origin.form-native');
        const choose = async (id, value) => {
            const trigger = page
                .locator('#' + id)
                .locator('..')
                .locator('.form-select-trigger');
            await trigger.click();
            const popup = page.locator('#' + (await trigger.getAttribute('aria-controls')));
            await popup.locator(`[data-value="${value}"]`).click();
        };
        await choose('simulation-origin-country', 'HK');
        assert.deepEqual(
            await page
                .locator('#simulation-origin option')
                .evaluateAll((xs) => xs.map((x) => x.value)),
            ['HKG'],
        );
        assert.deepEqual(
            await page
                .locator('#simulation-destination-country option')
                .evaluateAll((xs) => xs.map((x) => x.value))
                .then((xs) => xs.sort()),
            ['AE', 'CA', 'TH', 'US'],
        );
        await choose('simulation-destination-country', 'CA');
        assert.deepEqual(
            await page
                .locator('#simulation-destination option')
                .evaluateAll((xs) => xs.map((x) => x.value)),
            ['YVR'],
        );
        check(
            width + ' origin/country selectors whitelist only researched directional destinations',
        );
        await page.locator('#simulation-toggle').click();
        await page.waitForTimeout(700);
        assert.equal(
            await page.locator('#globe').getAttribute('data-simulation-route'),
            'DEMO-HKG-YVR',
        );
        assert.match(await page.locator('#simulated-route-badge').textContent(), /^Routes/);
        assert.equal(await page.locator('#simulated-route-badge small').count(), 0);
        assert.match(
            await page.locator('.simulation-explanation').textContent(),
            /not live or observed/,
        );
        assert.equal(await page.locator('#globe').getAttribute('data-route-segments'), '1');
        assert.equal(
            await page.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
            original,
        );
        const longSpan = Number(
            await page.locator('#globe').getAttribute('data-simulation-draw-ms'),
        );
        assert.ok(Math.abs(4800 / longSpan - 3) < 0.03);
        assert.ok(
            Math.abs(
                Number(await page.locator('#globe').getAttribute('data-simulation-breath-ms')) /
                    longSpan -
                    1.5,
            ) < 0.001,
        );
        await choose('simulation-destination-country', 'TH');
        const shortSpan = Number(
            await page.locator('#globe').getAttribute('data-simulation-draw-ms'),
        );
        assert.ok(shortSpan > longSpan * 1.8);
        assert.ok(
            Math.abs(
                Number(await page.locator('#globe').getAttribute('data-simulation-breath-ms')) /
                    shortSpan -
                    1.5,
            ) < 0.001,
        );
        await page.locator('#simulation-toggle').click();
        assert.equal(await page.locator('#simulated-route-badge').isVisible(), false);
        assert.equal(
            await page.locator('#simulated-route-trigger').getAttribute('aria-pressed'),
            'false',
        );
        await page.locator('#simulation-toggle').click();
        assert.equal(
            await page.locator('#simulated-route-trigger').getAttribute('aria-pressed'),
            'true',
        );
        assert.ok(
            Number(await page.locator('#globe').getAttribute('data-simulation-time')) < shortSpan,
        );
        check(width + ' distance pacing, visible non-live disclosure and hide/show state reset');
        await choose('simulation-destination-country', 'US');
        await page.locator('.simulation-source summary').click();
        assert.match(await page.locator('.simulation-validity').textContent(), /2026-10-24/);
        assert.equal(
            await page
                .locator('#simulated-route-panel')
                .innerText()
                .then((s) => /CX852|CX853/.test(s)),
            false,
        );
        check(
            width +
                ' optional simulation labels and expired-after-window limits, no real animated flight numbers',
        );
        for (const language of ['zh-Hant', 'yue-Hant', 'en']) {
            await page.locator('.simulation-close').click();
            await page.locator('#globe-return').click();
            await page.waitForTimeout(550);
            await page.locator('#language-trigger').click();
            await page.locator(`[data-language="${language}"]`).click();
            await page.locator('#globe-mode').click();
            await page.waitForTimeout(550);
            await page.locator('#simulated-route-trigger').click();
            assert.match(
                await page.locator('#simulated-route-badge').textContent(),
                language === 'en' ? /^Routes/ : /^航線/,
            );
            assert.match(
                await page.locator('#simulation-origin option').textContent(),
                language === 'en' ? /Hong Kong/ : /香港/,
            );
            assert.equal(
                await page.locator('#simulated-route-title').textContent(),
                language === 'en' ? 'Routes' : '航線',
            );
            assert.equal(
                await page.locator('#simulation-toggle').textContent(),
                language === 'en' ? 'Hide route' : '隱藏航線',
            );
            assert.equal(
                await page.locator('#reset-location').getAttribute('aria-label'),
                language === 'en' ? 'Locate' : '定位',
            );
            assert.match(
                await page.locator('#simulated-route-badge>span').textContent(),
                language === 'en' ? /^Routes/ : /^航線/,
            );
            assert.equal(await page.locator('#simulated-route-badge>small').count(), 0);
            assert.match(
                await page.locator('.simulation-explanation').textContent(),
                language === 'en' ? /not live or observed/ : /即時/,
            );
        }
        check(
            width +
                ' en/zh-Hant/yue-Hant short endpoint labels only in toolbar and truthful disclosure retained inside panel',
        );
        assert.equal(await page.locator('#simulated-route-title').textContent(), 'Routes');
        assert.equal(await page.locator('#simulation-toggle').textContent(), 'Hide route');
        assert.match(
            await page.locator('.simulation-explanation').textContent(),
            /not live or observed/,
        );
        await page.locator('.simulation-close').click();
        await page.waitForTimeout(80);
        const staticStars = await page.locator('.starfield').evaluate((e) => ({
            count: e.dataset.steadyStars,
            twinkles: e.dataset.twinkleStars,
            points: [...e.querySelectorAll('.star-accent')].map((s) => ({
                opacity: getComputedStyle(s).opacity,
                animation: getComputedStyle(s).animationName,
                style: s.getAttribute('style'),
            })),
            field: getComputedStyle(e).opacity,
        }));
        await page.waitForTimeout(250);
        assert.deepEqual(
            await page.locator('.starfield').evaluate((e) => ({
                count: e.dataset.steadyStars,
                twinkles: e.dataset.twinkleStars,
                points: [...e.querySelectorAll('.star-accent')].map((s) => ({
                    opacity: getComputedStyle(s).opacity,
                    animation: getComputedStyle(s).animationName,
                    style: s.getAttribute('style'),
                })),
                field: getComputedStyle(e).opacity,
            })),
            staticStars,
        );
        assert.equal(staticStars.count, '1268');
        assert.equal(staticStars.twinkles, '0');
        assert.ok(staticStars.points.every((s) => s.animation === 'none'));
        check(width + ' all 1268 stars static with no animated brightness or update handlers');
        for (const startPaused of [true, false]) {
            if (
                ((await page.locator('#globe-mode-motion').getAttribute('aria-pressed')) ===
                    'true') !==
                startPaused
            )
                await page.locator('#globe-mode-motion').click();
            await page.waitForTimeout(80);
            await page.locator('#globe-return').click();
            await page.waitForTimeout(550);
            const before = Number(await page.locator('#globe').getAttribute('data-longitude'));
            await page.waitForTimeout(350);
            assert.equal(await page.locator('#globe').getAttribute('data-motion-paused'), 'false');
            assert.ok(
                Math.abs(
                    Number(await page.locator('#globe').getAttribute('data-longitude')) - before,
                ) > 0.4,
            );
            await page.locator('#globe-mode').click();
            await page.waitForTimeout(550);
            assert.equal(
                await page.locator('#globe-mode-motion').getAttribute('aria-pressed'),
                'false',
            );
            assert.equal(
                await page.locator('#globe-mode-motion').getAttribute('data-state'),
                'rotating',
            );
            assert.equal(
                await page.locator('#globe-mode-motion').getAttribute('aria-label'),
                'Pause motion',
            );
        }
        check(
            width +
                ' paused/running Explore Back always resumes planner rotation; re-entry icon and state agree',
        );
        await page.locator('#simulated-route-trigger').click();
        await page.locator('.simulation-close').click();
        await page.locator('#globe-mode-motion').click();
        await page.waitForFunction(
            () => document.querySelector('#globe').dataset.motionPaused === 'true',
        );
        const paused = await page.locator('#globe').evaluate((e) => ({ ...e.dataset }));
        await page.waitForTimeout(350);
        const still = await page.locator('#globe').evaluate((e) => ({ ...e.dataset }));
        assert.equal(still.longitude, paused.longitude);
        assert.ok(Number(still.simulationTime) > Number(paused.simulationTime) + 200);
        assert.notEqual(still.simulationGlow, paused.simulationGlow);
        assert.equal(
            await page
                .locator('.star-accent')
                .first()
                .evaluate((e) => getComputedStyle(e).animationName),
            'none',
        );
        await page.mouse.move(width * 0.7, 500);
        await page.mouse.down();
        const hold = Number(await page.locator('#globe').getAttribute('data-simulation-time'));
        await page.waitForTimeout(250);
        assert.ok(
            Number(await page.locator('#globe').getAttribute('data-simulation-time')) > hold + 150,
        );
        await page.mouse.move(width * 0.6, 550, { steps: 8 });
        await page.waitForTimeout(200);
        assert.ok(
            Number(await page.locator('#globe').getAttribute('data-simulation-time')) > hold + 300,
        );
        await page.mouse.up();
        assert.equal(await page.locator('#globe').getAttribute('data-motion-paused'), 'true');
        await page.locator('#globe-mode-motion').click();
        await page.waitForTimeout(300);
        assert.notEqual(
            await page.locator('#globe').getAttribute('data-longitude'),
            still.longitude,
        );
        check(
            width +
                ' stationary pause, held pointer and drag retain independent route progress/glow; resume preserves rotation',
        );
        const performance = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const samples = [],
                        start = performance.now(),
                        count = Number(document.querySelector('#globe').dataset.drawCount);
                    const timer = setInterval(() => {
                        samples.push(Number(document.querySelector('#globe').dataset.drawMs));
                        if (samples.length >= 30) {
                            clearInterval(timer);
                            samples.sort((a, b) => a - b);
                            resolve({
                                elapsed: performance.now() - start,
                                frames:
                                    Number(document.querySelector('#globe').dataset.drawCount) -
                                    count,
                                medianMs: samples[Math.floor(samples.length / 2)],
                                p95Ms: samples[Math.floor(samples.length * 0.95)],
                            });
                        }
                    }, 50);
                }),
        );
        report.performance.push({ width, ...performance });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(200);
        assert.equal(await page.locator('#globe').getAttribute('data-simulation-phase'), 'static');
        assert.equal(
            await page
                .locator('.star-accent')
                .first()
                .evaluate((e) => getComputedStyle(e).animationName),
            'none',
        );
        const staticTime = await page.locator('#globe').getAttribute('data-simulation-time');
        await page.waitForTimeout(200);
        assert.equal(await page.locator('#globe').getAttribute('data-simulation-time'), staticTime);
        check(width + ' reduced motion shows a static sourced arc and steady stars');
        await page.locator('#simulated-route-trigger').click();
        const bounds = await page.locator('#simulated-route-panel').boundingBox();
        assert.ok(
            bounds.x >= 0 &&
                bounds.y >= 0 &&
                bounds.x + bounds.width <= width + 1 &&
                bounds.y + bounds.height <= 900,
        );
        assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
        );
        await page.keyboard.press('Escape');
        assert.equal(
            await page
                .locator('#simulated-route-trigger')
                .evaluate((e) => document.activeElement === e),
            true,
        );
        await page.locator('#globe-return').click();
        await page.waitForTimeout(50);
        assert.equal(await page.locator('#globe').getAttribute('data-simulation-visible'), 'false');
        assert.equal(
            await page.locator('.starfield').evaluate((e) => getComputedStyle(e).opacity),
            '0',
        );
        assert.equal(
            await page.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
            original,
        );
        check(
            width +
                ' bounded responsive panel, keyboard Escape, planner hiding and saved bytes preserved',
        );
        await context.close();
    }
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    if (process.env.ROAMNEST_TEST_REPORT)
        await writeFile(process.env.ROAMNEST_TEST_REPORT, JSON.stringify(report, null, 2));
}
assert.deepEqual(report.errors, []);
assert.deepEqual(report.network, []);
console.log(report.checks.length + ' isolated browser checks passed; zero external requests.');
