import { execFileSync } from 'node:child_process';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');

// Only this project's generated build directory may be removed.
if (dirname(output) !== resolve(root) || output !== join(resolve(root), 'dist')) {
    throw new Error('Build output must stay inside the project.');
}
await rm(output, { recursive: true, force: true });
execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc')], {
    cwd: root,
    stdio: 'inherit',
});

await mkdir(output, { recursive: true });
await copyFile(join(root, 'index.html'), join(output, 'index.html'));
await writeFile(join(output, '.nojekyll'), '');
await cp(join(root, 'src/styles'), join(output, 'src/styles'), { recursive: true });
await cp(join(root, 'public'), output, { recursive: true });
await copyFile(join(root, 'LICENSE'), join(output, 'LICENSE'));

const data = JSON.parse(await readFile(join(output, 'data/airports.json'), 'utf8'));
if (data.airports.length < 1000) {
    throw new Error('Airport dataset missing or unexpectedly small');
}
console.log(
    `Static build ready in dist/ (${data.airports.length} airports, bundled runtime assets; no CDN).`,
);
