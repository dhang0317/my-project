const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  ROOT_DIR,
  readLibrary,
  saveLibrary,
  translateFrench,
  fetchArticleFromUrl
} = require('./lib/atelier-core.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API 1: Read database (data/library.json)
  if (pathname === '/api/library' && req.method === 'GET') {
    try {
      return sendJson(res, 200, readLibrary());
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // API 2: Save database locally & optionally commit + push to GitHub repository
  if (pathname === '/api/library' && (req.method === 'POST' || req.method === 'PUT')) {
    try {
      const rawBody = await readRequestBody(req);
      const body = JSON.parse(rawBody);
      const dbData = body.data || body;
      const shouldPush = body.syncToGithub !== false;

      const result = await saveLibrary(dbData, { syncToGithub: shouldPush });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // API 3: Translate & analyze French selection
  if (pathname === '/api/translate' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      let text = '';
      let context = '';
      if (req.method === 'GET') {
        text = parsedUrl.searchParams.get('text') || '';
        context = parsedUrl.searchParams.get('context') || '';
      } else {
        const body = JSON.parse(await readRequestBody(req));
        text = body.text || '';
        context = body.context || '';
      }
      if (!text.trim()) {
        return sendJson(res, 400, { error: 'Missing text parameter' });
      }
      const result = await translateFrench(text.trim(), context.trim());
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // API 4: Fetch and extract French article from URL
  if (pathname === '/api/fetch-url' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readRequestBody(req));
      const extracted = await fetchArticleFromUrl(body.url);
      return sendJson(res, 200, extracted);
    } catch (err) {
      const status = /請輸入有效|無法讀取目標網頁/.test(err.message) ? 400 : 500;
      return sendJson(res, status, { error: err.message });
    }
  }

  // Static file serving
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`L'Atelier de Lecture server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
