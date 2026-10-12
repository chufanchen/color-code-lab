import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const port = Number(process.env.COLOR_CODE_PORT ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('COLOR_CODE_PORT must be an integer between 1 and 65535.');
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    const within = relative(directory, path);
    if (within === '..' || within.startsWith('../') || isAbsolute(within)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404);
    response.end(error instanceof URIError ? 'Bad request' : 'Not found');
  }
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Color Code Lab: http://127.0.0.1:${port}`);
  console.log('Press Ctrl+C to stop.');
});
