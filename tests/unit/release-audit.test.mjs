import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const audit = fileURLToPath(new URL('../../scripts/audit-release.mjs', import.meta.url));
const marker = String.fromCodePoint(111, 112, 101, 110, 115, 112, 101, 99);
const run = (file, args, cwd) =>
    spawnSync(file, args, { cwd, encoding: 'utf8', windowsHide: true });
async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), 'roamnest-audit-'));
    t.after(async () => {
        assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
        await rm(root, { recursive: true, force: true });
    });
    assert.equal(run('git', ['init', '-b', 'main'], root).status, 0);
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist/index.html'), '<!doctype html>');
    await writeFile(join(root, '.gitignore'), 'dist/\n');
    await writeFile(join(root, 'README.md'), 'Public description');
    return root;
}
const check = (root) => run(process.execPath, [audit], root);
const commitFixture = (root, name, email, message, signoff = false) =>
    run(
        'git',
        [
            '-c',
            'user.name=' + name,
            '-c',
            'user.email=' + email,
            'commit',
            ...(signoff ? ['--signoff'] : []),
            '-m',
            message,
        ],
        root,
    );

test('release audit accepts nested modules, stylesheet imports and formatting settings', async (t) => {
    const root = await fixture(t);
    for (const file of [
        'dist/src/domain/planner.js',
        'dist/src/i18n/locales/zh-Hant.js',
        'dist/src/styles/index.css',
        'dist/src/styles/base.css',
        '.editorconfig',
        '.gitattributes',
        '.prettierignore',
        '.prettierrc.json',
    ]) {
        await mkdir(dirname(join(root, file)), { recursive: true });
        await writeFile(join(root, file), 'Public fixture');
    }
    const result = check(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('release audit rejects unexpected files inside nested application directories', async (t) => {
    const root = await fixture(t);
    await mkdir(join(root, 'dist/src/domain'), { recursive: true });
    await writeFile(join(root, 'dist/src/domain/notes.json'), '{}');
    const result = check(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unexpected artifact file: src\/domain\/notes\.json/);
});

test('release audit rejects local review scripts even when forcibly tracked', async (t) => {
    const root = await fixture(t);
    await mkdir(join(root, 'tests/local'), { recursive: true });
    await writeFile(join(root, 'tests/local/review.mjs'), 'Local review');
    await writeFile(join(root, '.git/info/exclude'), '/tests/local/\n');
    assert.equal(run('git', ['add', '--force', '--', 'tests/local/review.mjs'], root).status, 0);
    const result = check(root);
    assert.equal(result.status, 1);
    assert.match(
        result.stderr,
        /Unexpected or private path in public tree: tests\/local\/review\.mjs/,
    );
});
test('release audit accepts a standalone public repository and static artifact', async (t) => {
    const root = await fixture(t),
        r = check(root);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(
        JSON.parse(r.stdout).localPlanningReferenceScan,
        'all prospective paths and file contents, including binary assets',
    );
});
for (const file of ['README.md', 'package.json', '.github/workflows/pages.yml', 'VERIFICATION.md'])
    test('release audit rejects local planning content in ' + file, async (t) => {
        const root = await fixture(t);
        await mkdir(resolve(root, file, '..'), { recursive: true });
        await writeFile(join(root, file), 'Reference: ' + marker.toUpperCase());
        assert.equal(run('git', ['add', '--force', '--', file], root).status, 0);
        const r = check(root);
        assert.equal(r.status, 1);
        assert.match(r.stderr, /Forbidden local planning reference:/);
    });
test('release audit examines binary asset bytes as well as text', async (t) => {
    const root = await fixture(t);
    await writeFile(
        join(root, 'dist/flag.png'),
        Buffer.concat([Buffer.from([137, 80, 78, 71]), Buffer.from(marker)]),
    );
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Forbidden local planning reference: artifact\/flag.png/);
});
test('local exclusions preserve private tooling while public files are audited', async (t) => {
    const root = await fixture(t);
    await mkdir(join(root, marker));
    const file = join(root, marker, 'config.yaml'),
        content = 'Retain private ' + marker;
    await writeFile(file, content);
    await writeFile(join(root, '.git/info/exclude'), '/' + marker + '/\n/VERIFICATION.md\n');
    await writeFile(join(root, 'VERIFICATION.md'), 'Retain private ' + marker);
    const r = check(root);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(await readFile(file, 'utf8'), content);
    assert.equal(await readFile(join(root, 'VERIFICATION.md'), 'utf8'), 'Retain private ' + marker);
});
test('release audit rejects a personal contact without exposing its value', async (t) => {
    const root = await fixture(t),
        contact = ['fixture-contact', 'gmail.com'].join('@');
    await writeFile(join(root, 'README.md'), 'Contact: ' + contact);
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Private marker or credential pattern: repository\/README.md/);
    assert.equal(r.stderr.includes(contact), false);
});
test('release audit checks retained history after current-file cleanup', async (t) => {
    const root = await fixture(t),
        contact = ['old-private-contact', 'gmail.com'].join('@');
    await writeFile(join(root, 'README.md'), contact);
    assert.equal(run('git', ['add', 'README.md'], root).status, 0);
    assert.equal(
        run(
            'git',
            [
                '-c',
                'user.name=Fixture',
                '-c',
                'user.email=fixture@example.invalid',
                'commit',
                '-m',
                'Fixture',
            ],
            root,
        ).status,
        0,
    );
    await writeFile(join(root, 'README.md'), 'Clean current content');
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /history .*\/README.md/);
    assert.equal(r.stderr.includes(contact), false);
});

test('release audit accepts public Git identities and their matching DCO trailers', async (t) => {
    const root = await fixture(t),
        contact = ['fixture-author', 'gmail.com'].join('@');
    assert.equal(run('git', ['add', 'README.md'], root).status, 0);
    assert.equal(commitFixture(root, 'Fixture', contact, 'Public change', true).status, 0);
    const r = check(root);
    assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('release audit still rejects personal contacts in commit messages', async (t) => {
    const root = await fixture(t),
        contact = ['fixture-author', 'gmail.com'].join('@');
    assert.equal(run('git', ['add', 'README.md'], root).status, 0);
    assert.equal(commitFixture(root, 'Fixture', contact, 'Contact: ' + contact, true).status, 0);
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /history metadata/);
    assert.equal(r.stderr.includes(contact), false);
});

test('release audit rejects unrelated personal contacts in DCO-shaped lines', async (t) => {
    const root = await fixture(t),
        contact = ['unrelated-person', 'gmail.com'].join('@');
    assert.equal(run('git', ['add', 'README.md'], root).status, 0);
    assert.equal(
        commitFixture(
            root,
            'Fixture',
            'fixture@example.invalid',
            'Public change\n\nSigned-off-by: Someone Else <' + contact + '>',
        ).status,
        0,
    );
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /history metadata/);
    assert.equal(r.stderr.includes(contact), false);
});

test('release audit scans Git attribution for credential patterns', async (t) => {
    const root = await fixture(t),
        credential = ['ghp', 'x'.repeat(32)].join('_');
    assert.equal(run('git', ['add', 'README.md'], root).status, 0);
    assert.equal(
        commitFixture(root, credential, 'fixture@example.invalid', 'Public change', true).status,
        0,
    );
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /history metadata/);
    assert.equal(r.stderr.includes(credential), false);
});

test('release audit rejects local planning artifacts retained only in history', async (t) => {
    const root = await fixture(t),
        file = marker + '/config.yaml';
    await mkdir(join(root, marker));
    await writeFile(join(root, file), 'Local planning');
    assert.equal(run('git', ['add', '--force', '--', file], root).status, 0);
    assert.equal(
        commitFixture(root, 'Fixture', 'fixture@example.invalid', 'Historical fixture').status,
        0,
    );
    assert.equal(run('git', ['rm', '--', file], root).status, 0);
    assert.equal(
        commitFixture(root, 'Fixture', 'fixture@example.invalid', 'Remove historical fixture')
            .status,
        0,
    );
    const r = check(root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Forbidden local planning reference: history/);
});
