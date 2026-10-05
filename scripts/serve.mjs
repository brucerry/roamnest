import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const port = Number(process.env.PORT || 4173);
const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};
const handler = async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!file.startsWith(root + sep)) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }
        if (!(await stat(file)).isFile()) throw new Error('Not found');
        const body = await readFile(file);
        response.writeHead(200, {
            'Content-Type': mime[extname(file)] || 'application/octet-stream',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        });
        response.end(body);
    } catch {
        response.writeHead(404);
        response.end('Not found. Run npm run build first.');
    }
};
// Explicit loopback sockets support localhost clients that choose either IP family.
// Never bind to an unspecified/all-interface address.
for (const host of ['127.0.0.1', '::1']) {
    const server = http.createServer(handler);
    server.on('error', (error) => {
        console.error(`roamnest loopback ${host}:${port}: ${error.code || error.message}`);
        if (host === '127.0.0.1') process.exitCode = 1;
    });
    server.listen({ port, host, ipv6Only: host === '::1' }, () => {
        console.log(`roamnest preview: http://localhost:${port}/ (${host}, this computer only)`);
    });
}
