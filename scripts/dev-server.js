#!/usr/bin/env node
/**
 * Local dev server: static site + /api/* serverless functions.
 *
 * Mirrors vercel.json (cleanUrls, /api/(.*) rewrites) so `npm run dev`
 * behaves like production without needing the Vercel CLI.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const PORT = Number(process.env.PORT) || 3000;

// Load .env if present (Node 20.6+)
try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  /* no .env — API routes report which keys are missing */
}
process.env.SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

/** Give the handler the Express-ish res helpers Vercel provides. */
function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    const payload = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(payload);
    return res;
  };
  res.send = (body) => {
    res.end(body);
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      const type = req.headers['content-type'] || '';
      if (type.includes('application/json')) {
        try {
          return resolve(JSON.parse(raw));
        } catch {
          return resolve(raw);
        }
      }
      if (type.includes('application/x-www-form-urlencoded')) {
        return resolve(Object.fromEntries(new URLSearchParams(raw)));
      }
      resolve(raw);
    });
  });
}

async function handleApi(req, res, name) {
  const file = path.join(API_DIR, `${name}.js`);
  if (!file.startsWith(API_DIR + path.sep) || !fs.existsSync(file)) return false;

  // Fresh require each time so edits to api/*.js take effect without a restart
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  const handler = mod.default || mod;

  req.body = await readBody(req);
  decorate(res);
  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[api/${name}]`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
    else res.end();
  }
  return true;
}

function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  let file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  // cleanUrls: /boutique -> boutique.html
  if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) {
    file = `${file}.html`;
  }
  if (!fs.existsSync(file)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<h1>404</h1>');
  }

  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const started = Date.now();
  res.on('finish', () =>
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`)
  );

  const api = pathname.match(/^\/api\/([\w-]+)$/);
  if (api && (await handleApi(req, res, api[1]))) return;
  if (api) {
    decorate(res).status(404).json({ error: `No such function: api/${api[1]}` });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  const configured = ['STRIPE_SECRET_KEY', 'MOLLIE_API_KEY', 'COINBASE_COMMERCE_API_KEY'].filter(
    (k) => process.env[k]
  );
  console.log(`\n  Carlay Art dev server  →  http://localhost:${PORT}\n`);
  console.log(`  API routes: ${fs.readdirSync(API_DIR).map((f) => '/api/' + f.replace(/\.js$/, '')).join(', ')}`);
  console.log(`  Payment keys loaded: ${configured.length ? configured.join(', ') : 'none (add .env to enable checkout)'}\n`);
});
