import { chromium } from 'playwright-core';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { blankPlan } from '../../dist/src/domain/planner.js';
const plan = blankPlan();
plan.id = 'view-fixture';
plan.title = 'View fixture';
plan.start = '2026-10-28';
plan.stops = ['Alpha', 'Beta', 'Gamma'].map((name, i) => ({
    id: 'stop-' + i,
    name,
    country: '',
    code: '',
    lat: 20 + i,
    lon: 100 + i,
    nights: i + 1,
    days: Array.from({ length: i + 1 }, (_, d) => 'Note ' + i + '/' + d),
    pois: Array.from({ length: i + 1 }, (_, d) => ({
        id: 'place-' + i + '-' + d,
        name: name + ' place ' + d,
        address: 'Example address',
        notes: 'Preserved fixture note',
        lat: 20 + i + d / 100,
        lon: 100 + i + d / 100,
        day: d,
    })),
}));
const original = JSON.stringify({ app: 'roamnest', version: 1, activeId: plan.id, plans: [plan] }),
    report = {
        checks: [],
        scroll: [],
        footer: [],
        errors: [],
        network: 'All external requests blocked; disposable contexts only.',
    };
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
    base = process.env.ROAMNEST_TEST_URL || `http://127.0.0.1:${server.address().port}/`;
const check = (name) => {
    report.checks.push(name);
    console.log('PASS ' + name);
};
try {
    const sameNamePlans = ['a', 'b', 'c'].map((id, i) => {
            const p = blankPlan();
            p.id = 'saved-' + id;
            p.title = 'Shared trip name';
            p.start = i === 1 ? '2026-10-02' : '2026-10-28';
            return p;
        }),
        savedRaw = JSON.stringify({
            version: 1,
            activeId: sameNamePlans[0].id,
            plans: sameNamePlans,
        });
    const savedContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await savedContext.addInitScript((raw) => {
        localStorage.setItem('roamnest-plans-v1', raw);
        localStorage.setItem('roamnest-ip-centering', 'off');
        localStorage.setItem('roamnest-language', 'en');
    }, savedRaw);
    await savedContext.route('https://**', (r) => r.abort());
    const savedPage = await savedContext.newPage();
    savedPage.on('pageerror', (e) => report.errors.push(e.message));
    await savedPage.goto(base);
    await savedPage.waitForSelector('#saved-trips.form-native');
    const savedTrigger = savedPage
        .locator('#saved-trips')
        .locator('..')
        .locator('.form-select-trigger');
    await savedTrigger.click();
    const savedPopup = savedPage.locator('#' + (await savedTrigger.getAttribute('aria-controls'))),
        savedItems = await savedPopup
            .getByRole('option')
            .evaluateAll((xs) => xs.map((x) => ({ id: x.dataset.value, text: x.textContent })));
    assert.deepEqual(savedItems, [
        { id: 'roamnest-default-trip', text: 'Untitled trip' },
        { id: 'saved-b', text: 'Shared trip name · 2026-10-02' },
        { id: 'saved-c', text: 'Shared trip name · 2026-10-28 · #2' },
    ]);
    assert.equal(
        savedItems.some((o) => o.id === 'saved-a'),
        false,
    );
    assert.equal(new Set(savedItems.map((o) => o.id)).size, savedItems.length);
    assert.equal(
        await savedPage.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
        savedRaw,
    );
    await savedPage.keyboard.press('Escape');
    check(
        'saved-trip popup excludes active ID, preserves distinct same-name/date records and performs no data writes',
    );
    await savedContext.close();
    for (const width of [320, 390, 768, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.addInitScript((raw) => {
            localStorage.setItem('roamnest-plans-v1', raw);
            localStorage.setItem('roamnest-ip-centering', 'off');
            localStorage.setItem('roamnest-language', 'en');
        }, original);
        await context.route('https://**', (r) => r.abort());
        const page = await context.newPage();
        page.on('pageerror', (e) => report.errors.push(e.message));
        await page.goto(base);
        await page.waitForSelector('#poi-stop.form-native');
        const choose = async (id, index) => {
            const trigger = page
                .locator('#' + id)
                .locator('..')
                .locator('.form-select-trigger');
            await trigger.click();
            const panel = page.locator('#' + (await trigger.getAttribute('aria-controls')));
            await panel.getByRole('option').nth(index).click();
        };
        const selection = async (stop, day) => {
            assert.deepEqual(
                await page.evaluate(() =>
                    ['city-stop', 'poi-stop', 'city-day', 'poi-day'].map(
                        (id) => document.getElementById(id).value,
                    ),
                ),
                [stop, stop, String(day), String(day)],
            );
            assert.equal(await page.locator('#poi-context').getAttribute('data-stop-id'), stop);
            assert.equal(await page.locator('#poi-context').getAttribute('data-day'), String(day));
            assert.equal(
                await page.locator('.daily-stop[open]').getAttribute('data-stop-id'),
                stop,
            );
            assert.equal(
                await page.locator('.day-row[aria-current="true"]').getAttribute('data-day'),
                String(day),
            );
            assert.equal(await page.locator('#city-map').getAttribute('data-poi-markers'), '1');
        };
        await choose('poi-stop', 2);
        await choose('poi-day', 2);
        await selection('stop-2', 2);
        await choose('city-stop', 1);
        await choose('city-day', 1);
        await selection('stop-1', 1);
        await page.locator('.daily-stop[data-stop-id="stop-0"] summary').click();
        await selection('stop-0', 0);
        await page.locator('.daily-stop[data-stop-id="stop-0"] .day-row button').click();
        await selection('stop-0', 0);
        await page
            .locator('.stop-card[data-stop-id="stop-2"]')
            .getByRole('button', { name: 'Plan places', exact: true })
            .click();
        await selection('stop-2', 0);
        assert.equal(
            await page.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
            original,
        );
        check(width + ' all view entry points synchronize without saved-data writes');
        const trigger = page.locator('#poi-day').locator('..').locator('.form-select-trigger');
        await trigger.click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await selection('stop-2', 2);
        await trigger.click();
        await page.keyboard.press('Escape');
        assert.equal(await trigger.evaluate((e) => document.activeElement === e), true);
        check(width + ' shared selectors support keyboard selection and Escape focus');
        for (const y of [0, 350, 900]) {
            await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
            await page.waitForTimeout(100);
            const before = await page.evaluate(() => scrollY);
            const rect = await page.locator('#language-trigger').boundingBox();
            await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
            await page.waitForTimeout(450);
            assert.equal(await page.evaluate(() => scrollY), before);
            const next = await page
                .locator('#language-menu button:not([hidden])')
                .first()
                .boundingBox();
            await page.mouse.click(next.x + next.width / 2, next.y + next.height / 2);
            await page.waitForTimeout(500);
            const after = await page.evaluate(() => scrollY);
            assert.equal(after, before);
            report.scroll.push({ width, before, after });
        }
        check(width + ' language opening and switching retain three scroll positions');
        for (const language of ['en', 'zh-Hant', 'yue-Hant']) {
            await page.locator('#language-trigger').click();
            if ((await page.locator('html').getAttribute('lang')) !== language)
                await page.locator('[data-language="' + language + '"]').click();
            else await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
            const summary = page.locator('#sources summary');
            for (const expanded of [false, true]) {
                if (expanded) await summary.click();
                await page.waitForTimeout(700);
                const measurement = await page.evaluate(() => {
                    const a = document.querySelector('.footer-brand').getBoundingClientRect(),
                        b = document
                            .querySelector('.footer-disclosure-button')
                            .getBoundingClientRect(),
                        c = document.querySelector('#city-planner').getBoundingClientRect(),
                        f = document.querySelector('footer').getBoundingClientRect();
                    return {
                        group: (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2,
                        content: (c.left + c.right) / 2,
                        footer: (f.left + f.right) / 2,
                        viewport: innerWidth / 2,
                        overflow: document.documentElement.scrollWidth > innerWidth,
                    };
                });
                assert.ok(Math.abs(measurement.group - measurement.content) < 1);
                assert.ok(Math.abs(measurement.group - measurement.viewport) < 1);
                assert.equal(measurement.overflow, false);
                report.footer.push({ width, language, expanded, ...measurement });
            }
            await summary.click();
            await page.waitForTimeout(450);
        }
        check(width + ' combined footer center in all locales and both states');
        await page.locator('#language-trigger').click();
        await page.locator('[data-language="en"]').click();
        await page.waitForTimeout(450);
        await page
            .locator('.stop-card[data-stop-id="stop-2"]')
            .getByRole('button', { name: 'Move earlier', exact: true })
            .click();
        await selection('stop-2', 2);
        assert.equal(await page.locator('#poi-stop option').nth(1).getAttribute('value'), 'stop-2');
        assert.match(await page.locator('#poi-day option').nth(2).textContent(), /2026-10-31/);
        check(
            width + ' reorder preserves selected stable stop/place IDs and recalculates day dates',
        );
        page.on('dialog', (d) => d.accept());
        await page
            .locator('.stop-card[data-stop-id="stop-1"]')
            .getByRole('button', { name: 'Remove stop', exact: true })
            .click();
        await selection('stop-2', 2);
        assert.equal(await page.locator('#poi-stop option').count(), 2);
        await page.locator('.stop-card[data-stop-id="stop-2"] input[type="number"]').fill('1');
        await page.locator('.stop-card[data-stop-id="stop-2"] input[type="number"]').press('Tab');
        await selection('stop-2', 0);
        assert.equal(await page.locator('#poi-day option').count(), 1);
        await page
            .locator('.stop-card[data-stop-id="stop-2"]')
            .getByRole('button', { name: 'Remove stop', exact: true })
            .click();
        await selection('stop-0', 0);
        await page
            .locator('.stop-card[data-stop-id="stop-0"]')
            .getByRole('button', { name: 'Remove stop', exact: true })
            .click();
        assert.equal(await page.locator('#poi-stop').isDisabled(), true);
        assert.equal(await page.locator('#poi-day').isDisabled(), true);
        check(
            width +
                ' isolated deletion/night reduction safely clears removed scope and disables empty selectors',
        );
        assert.equal(await page.locator('[id*="aircraft"]').count(), 0);
        await page.locator('#globe-mode').click();
        await page.waitForTimeout(550);
        assert.equal(await page.locator('#globe-return').isVisible(), true);
        assert.equal(await page.locator('#globe-cities-trigger').isVisible(), true);
        await page.locator('#globe-return').click();
        await page.waitForTimeout(550);
        check(width + ' Explore and Cities remain available without the removed feature');
        await context.close();
    }
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    if (process.env.ROAMNEST_TEST_REPORT)
        await writeFile(process.env.ROAMNEST_TEST_REPORT, JSON.stringify(report, null, 2));
}
assert.deepEqual(report.errors, []);
console.log(report.checks.length + ' isolated browser checks passed.');
