#!/usr/bin/env node
'use strict';
/*
 * serve_isolated.js
 *
 * Serves this folder with the two headers browsers require before they allow shared memory (SharedArrayBuffer),
 * so Flow Field Lab 4 can run its simulation on several threads.
 *
 * Usage: put this file next to flow-field-lab-4.html, then run
 *     node serve_isolated.js           (port 8000)
 *     node serve_isolated.js 8080      (another port)
 * and open the address it prints. Needs only Node.js, no packages. Stop it with Ctrl+C.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8000;
const PAGE = 'flow-field-lab-5.html';

// Cross-origin isolation. Everything served here is same-origin, which require-corp always allows.
const HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cache-Control': 'no-store',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const server = http.createServer((req, res) => {
  const reply = (status, body, type, extra) => {
    const buf = Buffer.from(body);
    res.writeHead(status, Object.assign({}, HEADERS, {
      'Content-Type': type || 'text/plain; charset=utf-8',
      'Content-Length': buf.length,
    }, extra));
    res.end(req.method === 'HEAD' ? undefined : buf);
  };

  const sendFile = (file) => fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return reply(404, 'Not found\n');
    res.writeHead(200, Object.assign({}, HEADERS, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
    }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return reply(405, 'Method not allowed\n', null, { Allow: 'GET, HEAD' });
  }

  let urlPath, rel;
  try {
    urlPath = new URL(req.url, 'http://localhost').pathname;
    rel = decodeURIComponent(urlPath);
  } catch (e) {
    return reply(400, 'Bad request\n');
  }
  if (rel.includes('\0')) return reply(400, 'Bad request\n');

  // Never serve anything outside this folder, however the path is written.
  const target = path.resolve(ROOT, '.' + rel);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return reply(403, 'Forbidden\n');

  fs.stat(target, (err, st) => {
    if (err) return reply(404, 'Not found\n');
    if (!st.isDirectory()) return sendFile(target);
    if (!urlPath.endsWith('/')) return reply(301, '', null, { Location: urlPath + '/' });

    const index = path.join(target, 'index.html');
    if (fs.existsSync(index)) return sendFile(index);

    // No index page: list the folder.
    fs.readdir(target, { withFileTypes: true }, (e, entries) => {
      if (e) return reply(500, 'Cannot list this folder\n');
      const items = entries
        .filter((d) => !d.name.startsWith('.'))
        .map((d) => {
          const slash = d.isDirectory() ? '/' : '';
          return `<li><a href="${encodeURIComponent(d.name)}${slash}">${escapeHtml(d.name)}${slash}</a></li>`;
        });
      reply(200,
        `<!doctype html><meta charset="utf-8"><title>${escapeHtml(rel)}</title>` +
        `<h1>${escapeHtml(rel)}</h1><ul>${items.join('')}</ul>\n`,
        'text/html; charset=utf-8');
    });
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Try another: node serve_isolated.js ${PORT + 1}`);
  else console.error(e.message);
  process.exit(1);
});

server.listen(PORT, 'localhost', () => {
  const page = fs.existsSync(path.join(ROOT, PAGE)) ? PAGE : '';
  console.log(`Serving ${ROOT} with cross-origin isolation headers.`);
  console.log(`Open http://localhost:${PORT}/${page}  (Ctrl+C to stop)`);
  if (!page) console.log(`${PAGE} is not in this folder yet; put it next to this script.`);
});
