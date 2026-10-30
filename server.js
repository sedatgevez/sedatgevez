/**
 * SedoX VPS API — Node.js alternatifi (PHP yoksa)
 * Çalıştır:  node server.js
 * Ortam:     SEDOX_TOKEN=gizli SEDOX_PORT=3847 node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const SECRET = process.env.SEDOX_TOKEN || 'sedox-gizli-anahtar-degistir';
const PORT = parseInt(process.env.SEDOX_PORT || '3847', 10);
const DATA_DIR = path.join(__dirname, 'data');
const ALLOWED = new Set(['alerts', 'workspace', 'watchlist', 'screens', 'session', 'all']);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-SedoX-Token',
  });
  res.end(body);
}

function readToken(req, query, bodyObj) {
  const h = req.headers['x-sedox-token'];
  if (h) return String(h);
  if (query && query.token) return String(query.token);
  if (bodyObj && bodyObj.token) return String(bodyObj.token);
  return '';
}

function safeKey(k) {
  return String(k || '').toLowerCase().replace(/[^a-z0-9_\-]/g, '') || null;
}

function filePath(key) {
  return path.join(DATA_DIR, key + '.json');
}

function loadKey(key) {
  const p = filePath(key);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveKey(key, data) {
  const p = filePath(key);
  const tmp = p + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, p);
  return true;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-SedoX-Token',
    });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  // /api/data veya /data.php benzeri yollar
  if (!/\/(api\/)?data(\.php)?$/.test(parsed.pathname || '')) {
    return send(res, 404, { ok: false, error: 'not_found' });
  }

  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 8e6) req.destroy(); });
  req.on('end', () => {
    let bodyObj = null;
    if (body) {
      try { bodyObj = JSON.parse(body); } catch (e) { bodyObj = null; }
    }
    const token = readToken(req, parsed.query, bodyObj);
    if (token !== SECRET) return send(res, 401, { ok: false, error: 'unauthorized' });

    if (req.method === 'GET') {
      const key = safeKey(parsed.query.key || 'all');
      if (!key || !ALLOWED.has(key)) return send(res, 400, { ok: false, error: 'invalid_key' });
      if (key === 'all') {
        const out = {};
        for (const k of ['alerts', 'workspace', 'watchlist', 'screens', 'session']) out[k] = loadKey(k);
        return send(res, 200, { ok: true, data: out, serverTime: Math.floor(Date.now() / 1000) });
      }
      return send(res, 200, { ok: true, key, data: loadKey(key), serverTime: Math.floor(Date.now() / 1000) });
    }

    if (req.method === 'POST') {
      if (!bodyObj) return send(res, 400, { ok: false, error: 'invalid_json' });
      const key = safeKey(bodyObj.key);
      if (!key || !ALLOWED.has(key)) return send(res, 400, { ok: false, error: 'invalid_key' });
      if (bodyObj.data === undefined) return send(res, 400, { ok: false, error: 'missing_data' });

      if (key === 'all') {
        if (typeof bodyObj.data !== 'object' || !bodyObj.data) {
          return send(res, 400, { ok: false, error: 'data_must_be_object' });
        }
        const saved = [];
        for (const k of ['alerts', 'workspace', 'watchlist', 'screens', 'session']) {
          if (Object.prototype.hasOwnProperty.call(bodyObj.data, k)) {
            try {
              saveKey(k, bodyObj.data[k]);
              saved.push(k);
            } catch (e) {
              return send(res, 500, { ok: false, error: 'write_failed', key: k });
            }
          }
        }
        return send(res, 200, { ok: true, saved, serverTime: Math.floor(Date.now() / 1000) });
      }

      try {
        saveKey(key, bodyObj.data);
      } catch (e) {
        return send(res, 500, { ok: false, error: 'write_failed' });
      }
      return send(res, 200, { ok: true, key, serverTime: Math.floor(Date.now() / 1000) });
    }

    send(res, 405, { ok: false, error: 'method_not_allowed' });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('SedoX API http://0.0.0.0:' + PORT + '  (token ayarlı)');
});
