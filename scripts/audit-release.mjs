import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve('.'),
    dist = resolve('dist'),
    failures = [],
    needles = [];
const localPlanningMarker = String.fromCodePoint(111, 112, 101, 110, 115, 112, 101, 99);
if (process.env.ROAMNEST_AUDIT_BACKUP) {
    const raw = JSON.parse(await readFile(process.env.ROAMNEST_AUDIT_BACKUP, 'utf8')),
        plan = raw.plan;
    needles.push(plan.id, plan.title);
    for (const stop of plan.stops) {
        needles.push(...stop.days.filter((s) => s.length >= 12));
        for (const place of stop.pois) {
            needles.push(place.id);
            if (place.name.length >= 4) needles.push(place.name);
            if (place.address) needles.push(place.address);
            if (place.notes.length >= 12) needles.push(place.notes);
            for (const n of [place.lat, place.lon])
                if (n !== null && String(n).length >= 8) needles.push(String(n));
        }
    }
}
if (process.env.ROAMNEST_AUDIT_PRIVATE_MARKERS) {
    const markers = JSON.parse(await readFile(process.env.ROAMNEST_AUDIT_PRIVATE_MARKERS, 'utf8'));
    if (!Array.isArray(markers) || markers.some((s) => typeof s !== 'string' || s.length < 6))
        throw new Error('Invalid private audit marker list.');
    needles.push(...markers);
}
const walk = async (folder) => {
    const files = [];
    for (const name of await readdir(folder)) {
        const path = resolve(folder, name),
            s = await lstat(path);
        if (s.isSymbolicLink()) {
            failures.push('Symbolic link: ' + relative(root, path));
            continue;
        }
        if (s.isDirectory()) files.push(...(await walk(path)));
        else files.push(path);
    }
    return files;
};
const prospective = execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { encoding: 'utf8' },
    )
        .split('\0')
        .filter(Boolean),
    publicFiles = await walk(dist);
const credentialPattern =
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}/i;
const personalContactPattern = /[A-Z0-9._%+-]+@gmail\.com/i;
const hasSensitive = (content) =>
    needles.filter(Boolean).some((needle) => content.includes(needle)) ||
    /C:[\\/]Users[\\/]/.test(content) ||
    credentialPattern.test(content);
const hasPrivate = (content) => hasSensitive(content) || personalContactPattern.test(content);
const allowedRoots = new Set([
    '.editorconfig',
    '.gitattributes',
    '.prettierignore',
    '.prettierrc.json',
    '.github',
    '.gitignore',
    'README.md',
    'THIRD_PARTY.md',
    'LICENSE',
    'index.html',
    'package-lock.json',
    'package.json',
    'public',
    'scripts',
    'src',
    'tests',
    'tsconfig.json',
]);
for (const path of prospective)
    if (
        !allowedRoots.has(path.split('/')[0]) ||
        path.startsWith('tests/local/') ||
        /private|enriched|roamnest-20\d\d/i.test(path)
    )
        failures.push('Unexpected or private path in public tree: ' + path);
for (const [path, tree] of [
    ...prospective.map((p) => [resolve(p), 'repository']),
    ...publicFiles.map((p) => [p, 'artifact']),
]) {
    const name = relative(tree === 'artifact' ? dist : root, path).replaceAll('\\', '/');
    if (
        tree === 'artifact' &&
        !/^(index\.html|LICENSE|\.nojekyll|flag(-16|-32)?\.(svg|png)|starfield\.svg|src\/(?:[\w-]+\/)*[\w-]+\.(js|css)|data\/(airports\.json|land\.geojson|country-boundaries\.geojson|provenance\.json|city-timezone-provenance\.json|simulated-routes\.json|geography-provenance\.json|vegetation\.geojson|rivers\.geojson)|vendor\/(leaflet|d3|tabler|airportsdata)\/[^/]+)$/.test(
            name,
        )
    )
        failures.push('Unexpected artifact file: ' + name);
    {
        const content = await readFile(path, 'utf8');
        if ((name + '\n' + content).toLowerCase().includes(localPlanningMarker))
            failures.push('Forbidden local planning reference: ' + tree + '/' + name);
        if (hasPrivate(content))
            failures.push('Private marker or credential pattern: ' + tree + '/' + name);
    }
}
const commits = execFileSync('git', ['rev-list', '--all'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
let historicalFiles = 0;
for (const commit of commits) {
    const metadata = execFileSync(
        'git',
        ['show', '-s', '--format=%an%x00%ae%x00%cn%x00%ce%x00%B', commit],
        { encoding: 'utf8' },
    );
    const [authorName, authorEmail, committerName, committerEmail, message] = metadata.split('\0');
    // Git author/committer identities and matching DCO trailers are public attribution.
    // Credential/private-marker checks still cover the complete metadata, and contacts
    // elsewhere in commit messages or any file remain release-blocking findings.
    const attribution = new Set([
        `Signed-off-by: ${authorName} <${authorEmail}>`,
        `Signed-off-by: ${committerName} <${committerEmail}>`,
    ]);
    const reviewedMessage = message
        .split('\n')
        .filter((line) => !attribution.has(line))
        .join('\n');
    if (
        hasSensitive(metadata) ||
        hasPrivate([authorName, committerName, reviewedMessage].join('\n'))
    )
        failures.push('Private marker or credential pattern: history metadata ' + commit);
    const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', commit], {
        encoding: 'utf8',
    })
        .split('\0')
        .filter(Boolean);
    for (const path of paths) {
        historicalFiles++;
        const content = execFileSync('git', ['show', commit + ':' + path], {
            encoding: 'utf8',
            maxBuffer: 32 * 1024 * 1024,
        });
        if ((path + '\n' + content).toLowerCase().includes(localPlanningMarker))
            failures.push('Forbidden local planning reference: history ' + commit + '/' + path);
        if (/^(?:\.agents|\.codex|evidence|tests\/local)\//.test(path))
            failures.push('Private path in history: ' + commit + '/' + path);
        if (hasPrivate(content))
            failures.push('Private marker or credential pattern: history ' + commit + '/' + path);
    }
}
// The audit's own marker list is intentionally not a trip artifact; do not publish private identifiers as scan fixtures.
console.log(
    JSON.stringify({
        result: failures.length ? 'fail' : 'pass',
        prospectiveRepositoryFiles: prospective.length,
        staticArtifactFiles: publicFiles.length,
        privateMarkersChecked: needles.length,
        historyCommitsChecked: commits.length,
        historicalFilesChecked: historicalFiles,
        localPlanningReferenceScan:
            'all prospective paths and file contents, including binary assets',
        findings: [...new Set(failures)],
        notice: 'Local exclusions and reachable history were checked; no files staged/published. Findings omit private values. Pattern checks cannot guarantee absence of every possible secret.',
    }),
);
if (failures.length) {
    console.error([...new Set(failures)].join('\n'));
    process.exitCode = 1;
}
