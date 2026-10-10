import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function checkRouteReversal(browser, base, catalog, original, check) {
    const endpoints = ['origin-country', 'origin', 'destination-country', 'destination'];
    const airports = JSON.parse(await readFile('public/data/airports.json', 'utf8')).airports;
    for (const width of [320, 390, 768, 1440]) {
        for (const language of ['en', 'zh-Hant', 'yue-Hant']) {
            const context = await browser.newContext({
                viewport: { width, height: 1000 },
                reducedMotion: 'reduce',
                hasTouch: true,
            });
            const network = [],
                errors = [];
            await context.addInitScript(
                ({ original, language }) => {
                    localStorage.setItem('roamnest-plans-v1', original);
                    localStorage.setItem('roamnest-language', language);
                    localStorage.setItem('roamnest-ip-centering', 'off');
                    window.__routeLocationRequests = 0;
                    for (const method of ['getCurrentPosition', 'watchPosition']) {
                        const native = navigator.geolocation[method].bind(navigator.geolocation);
                        navigator.geolocation[method] = (...args) => {
                            window.__routeLocationRequests++;
                            return native(...args);
                        };
                    }
                },
                { original, language },
            );
            await context.route('https://**', (route) => {
                network.push(route.request().url());
                return route.abort();
            });
            const page = await context.newPage();
            page.on('pageerror', (error) => errors.push(error.message));
            try {
                await page.goto(base);
                await page.waitForFunction(
                    () => !document.querySelector('#simulated-route-trigger').disabled,
                );
                await page.locator('#globe-mode').click();
                await page.locator('#simulated-route-trigger').click();
                const reverse = page.locator('#simulation-reverse');
                assert.equal(
                    await reverse.getAttribute('aria-label'),
                    { en: 'Reverse route', 'zh-Hant': '反轉航線', 'yue-Hant': '調轉航線' }[
                        language
                    ],
                );
                // HKG/TPE also checks different actual operators: CX and JX.
                for (const id of ['HKG-TPE', 'CHC-AKL', 'AKL-SYD']) {
                    const route = catalog.routes.find((r) => r.id === id);
                    const inverse = catalog.routes.find(
                        (r) => r.id === route.destination.iata + '-' + route.origin.iata,
                    );
                    assert.ok(inverse, id + ' test requires verified inverse');
                    const values = (r) => [
                        r.origin.countryCode,
                        r.origin.iata,
                        r.destination.countryCode,
                        r.destination.iata,
                    ];
                    for (const [i, value] of values(route).entries())
                        await page
                            .locator('#simulation-' + endpoints[i])
                            .selectOption(value, { force: true });
                    assert.equal(await reverse.isEnabled(), true);
                    assert.equal(await reverse.getAttribute('aria-describedby'), null);
                    assert.equal(
                        await page.locator('#simulation-toggle').getAttribute('aria-pressed'),
                        'false',
                    );
                    await reverse.focus();
                    assert.equal(
                        await reverse.evaluate((el) => getComputedStyle(el).outlineWidth),
                        '3px',
                    );
                    await reverse.press('Enter');
                    for (const [i, value] of values(inverse).entries()) {
                        const select = page.locator('#simulation-' + endpoints[i]);
                        assert.equal(await select.inputValue(), value);
                        const caption = await select
                            .locator('..')
                            .locator('.form-select-value')
                            .textContent();
                        assert.equal(caption, await select.locator('option:checked').textContent());
                    }
                    assert.equal(
                        await reverse.evaluate((el) => el === document.activeElement),
                        true,
                    );
                    assert.equal(
                        await page
                            .locator('.simulated-route-settings')
                            .getAttribute('data-selected-route'),
                        inverse.id,
                    );
                    assert.equal(
                        await page.locator('#simulation-toggle').getAttribute('aria-pressed'),
                        'false',
                    );
                    assert.equal(
                        await page.locator('.simulation-source-link').getAttribute('href'),
                        inverse.evidence.sourceURL,
                    );
                    const expectedCarrier =
                        language === 'en' ? inverse.carrier.name.en : inverse.carrier.name.zhHant;
                    assert.ok(
                        (await page.locator('.simulation-carrier').textContent()).includes(
                            expectedCarrier,
                        ),
                    );
                    assert.ok(
                        (await page.locator('.simulation-validity').textContent()).includes(
                            inverse.checkedDate,
                        ),
                    );
                    if (inverse.evidence.validThrough)
                        assert.ok(
                            (await page.locator('.simulation-validity').textContent()).includes(
                                inverse.evidence.validThrough,
                            ),
                        );
                    const limits = await page.locator('.simulation-validity').textContent();
                    if (language === 'en') assert.ok(limits.includes(inverse.seasonality));
                    else
                        assert.ok(
                            !limits.includes(inverse.seasonality),
                            'service limits must be translated',
                        );
                    assert.ok(
                        (await page.locator('.simulation-reverse-status').textContent()).includes(
                            inverse.origin.iata + ' → ' + inverse.destination.iata,
                        ),
                    );
                    assert.ok(
                        (await page.locator('.simulation-reverse-status').textContent()).startsWith(
                            {
                                en: 'Route reversed: ',
                                'zh-Hant': '航線已反轉：',
                                'yue-Hant': '航線已調轉：',
                            }[language],
                        ),
                    );
                    assert.equal(
                        await page.locator('.simulation-reverse-status').getAttribute('role'),
                        'status',
                    );
                    assert.equal(
                        await page.locator('.simulation-reverse-status').getAttribute('aria-live'),
                        'polite',
                    );
                    await reverse.press('Space');
                    for (const [i, value] of values(route).entries())
                        assert.equal(
                            await page.locator('#simulation-' + endpoints[i]).inputValue(),
                            value,
                        );
                    await page.locator('#simulation-toggle').click();
                    await reverse.tap();
                    await page.waitForFunction(
                        (id) =>
                            document.querySelector('#globe').dataset.simulationRoute ===
                            'DEMO-' + id,
                        inverse.id,
                    );
                    assert.equal(
                        await page.locator('#simulation-toggle').getAttribute('aria-pressed'),
                        'true',
                    );
                    assert.equal(
                        await page.locator('#globe').getAttribute('data-simulation-phase'),
                        'static',
                    );
                    const airport = airports.find((a) => a.code === inverse.origin.iata);
                    await page.waitForFunction(({ lat, lon }) => {
                        const globe = document.querySelector('#globe');
                        return (
                            Math.abs(Number(globe.dataset.latitude) - lat) < 0.01 &&
                            Math.abs(Number(globe.dataset.longitude) - lon) < 0.01
                        );
                    }, airport);
                    assert.ok(
                        (await page.locator('#simulated-route-badge').textContent()).includes(
                            inverse.origin.iata + ' → ' + inverse.destination.iata,
                        ),
                    );
                    await reverse.tap();
                    await page.waitForFunction(
                        (id) =>
                            document.querySelector('#globe').dataset.simulationRoute ===
                            'DEMO-' + id,
                        route.id,
                    );
                    await page.locator('#simulation-toggle').click();
                }
                const box = await reverse.boundingBox();
                assert.ok(box.width >= 44 && box.height >= 44);
                assert.equal(
                    await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth),
                    false,
                );
                const panel = await page.locator('#simulated-route-panel').boundingBox();
                assert.ok(panel.x >= 0 && panel.x + panel.width <= width);
                assert.equal(
                    await page
                        .locator('.simulation-fields')
                        .evaluate((el) => el.scrollWidth > el.clientWidth),
                    false,
                );
                const fields = await page
                    .locator('.simulation-fields')
                    .evaluate((el) => [...el.children].map((x) => x.id || x.tagName));
                assert.deepEqual(fields, ['DIV', 'simulation-reverse', 'DIV']);
                // Changing language must preserve the selected direction.
                const id = await page
                    .locator('.simulated-route-settings')
                    .getAttribute('data-selected-route');
                await page.locator('.simulation-close').click();
                await page.locator('#globe-return').click();
                await page.locator('#language-trigger').click();
                await page
                    .locator(`[data-language="${language === 'en' ? 'zh-Hant' : 'en'}"]`)
                    .click();
                await page.locator('#globe-mode').click();
                await page.locator('#simulated-route-trigger').click();
                assert.equal(
                    await page
                        .locator('.simulated-route-settings')
                        .getAttribute('data-selected-route'),
                    id,
                );
                assert.equal(
                    await reverse.getAttribute('aria-label'),
                    language === 'en' ? '反轉航線' : 'Reverse route',
                );
                await page.locator('.simulation-close').click();
                await page.locator('#globe-return').click();
                await page.waitForFunction(
                    () => document.querySelector('#globe').dataset.simulationVisible === 'false',
                );
                assert.equal(
                    await page.evaluate(() => localStorage.getItem('roamnest-plans-v1')),
                    original,
                );
                assert.deepEqual(network, []);
                assert.deepEqual(errors, []);
                assert.equal(await page.evaluate(() => window.__routeLocationRequests), 0);
                check(
                    `${width} ${language} exact route reversal, evidence, hidden/shown state, keyboard/touch, static motion and saved bytes`,
                );
            } finally {
                await context.close();
            }
        }
    }
    for (const [failure, language] of [
        ['missing-inverse', 'en'],
        ['missing-inverse', 'zh-Hant'],
        ['missing-inverse', 'yue-Hant'],
        ['invalid-catalog', 'en'],
        ['failed-load', 'en'],
    ]) {
        const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
        await context.addInitScript((language) => {
            localStorage.setItem('roamnest-language', language);
            localStorage.setItem('roamnest-ip-centering', 'off');
        }, language);
        await context.route('https://**', (route) => route.abort());
        const fixture = structuredClone(catalog);
        fixture.routes = fixture.routes.filter((r) => r.id !== 'TPE-HKG');
        if (failure === 'invalid-catalog') fixture.schemaVersion = 0;
        await context.route('**/data/simulated-routes.json', (route) =>
            failure === 'failed-load' ? route.abort() : route.fulfill({ json: fixture }),
        );
        const page = await context.newPage();
        try {
            await page.goto(base);
            await page.waitForFunction(() => document.querySelector('#simulation-reverse'));
            if (failure === 'missing-inverse') {
                await page.waitForFunction(
                    () => !document.querySelector('#simulated-route-trigger').disabled,
                );
                for (const [i, value] of ['HK', 'HKG', 'TW', 'TPE'].entries())
                    await page
                        .locator('#simulation-' + endpoints[i])
                        .selectOption(value, { force: true });
                await page.locator('#globe-mode').click();
                await page.locator('#simulated-route-trigger').click();
                assert.equal(await page.locator('#simulation-reverse-reason').isVisible(), true);
            } else {
                await page.waitForFunction(
                    ({ failure, checkedDate }) => {
                        const text = document.querySelector('.simulation-disclosure').textContent;
                        return failure === 'failed-load'
                            ? text.includes('unavailable')
                            : text.includes(checkedDate);
                    },
                    { failure, checkedDate: catalog.checkedDate },
                );
                await page.locator('#globe-mode').click();
                await page.locator('#simulated-route-trigger').click();
                assert.equal(await page.locator('#simulation-reverse-reason').isVisible(), true);
            }
            assert.equal(await page.locator('#simulation-reverse').isDisabled(), true);
            assert.equal(
                await page.locator('#simulation-reverse').getAttribute('aria-describedby'),
                'simulation-reverse-reason',
            );
            const before = await page
                .locator('.simulated-route-settings')
                .getAttribute('data-selected-route');
            await page
                .locator('#simulation-reverse')
                .evaluate((el) => el.dispatchEvent(new MouseEvent('click')));
            assert.equal(
                await page.locator('.simulated-route-settings').getAttribute('data-selected-route'),
                before,
            );
            assert.ok(
                (await page.locator('#simulation-reverse-reason').textContent()).includes(
                    failure === 'missing-inverse'
                        ? language === 'en'
                            ? 'not available'
                            : '未收錄'
                        : 'No researched',
                ),
            );
            assert.equal(
                await page.locator('#simulation-toggle').getAttribute('aria-pressed'),
                'false',
            );
            check(
                failure +
                    ' ' +
                    language +
                    ' keeps reversal disabled without inferred direction or fallback',
            );
        } finally {
            await context.close();
        }
    }
    const context = await browser.newContext();
    let release;
    const ready = new Promise((resolve) => {
        release = resolve;
    });
    await context.addInitScript(() => localStorage.setItem('roamnest-ip-centering', 'off'));
    await context.route('https://**', (route) => route.abort());
    await context.route('**/data/airports.json', async (route) => {
        await ready;
        await route.continue();
    });
    const page = await context.newPage();
    try {
        await page.goto(base);
        await page.waitForFunction(() => document.querySelector('#simulation-reverse'));
        assert.equal(await page.locator('#simulation-reverse').isDisabled(), true);
        release();
        await page.waitForFunction(
            () => !document.querySelector('#simulated-route-trigger').disabled,
        );
        for (const [i, value] of ['HK', 'HKG', 'TW', 'TPE'].entries())
            await page.locator('#simulation-' + endpoints[i]).selectOption(value, { force: true });
        assert.equal(await page.locator('#simulation-reverse').isEnabled(), true);
        check('delayed geography readiness enables reversal only after exact airport joins');
    } finally {
        release();
        await context.close();
    }
}
