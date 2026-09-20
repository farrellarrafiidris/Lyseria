/**
 * LYSÉRIA — Dev Server
 * Serves static files + REST API untuk baca/tulis data/products.json
 *
 * Endpoints:
 *   GET  /api/products          → baca products.json
 *   PUT  /api/products          → simpan seluruh array ke products.json
 *
 * Jalankan: node server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

// ── MIME types ──────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
};

// ── Helper: baca body dari request ──────────────────────────────────
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end',  ()    => resolve(body));
        req.on('error', reject);
    });
}

// ── Helper: kirim JSON response ─────────────────────────────────────
function sendJSON(res, status, data) {
    const body = JSON.stringify(data, null, 2);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(body);
}

// ── Helper: serve static file ───────────────────────────────────────
function serveStatic(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
}

// ── Server ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url    = req.url.split('?')[0]; // strip query string
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    // ── Custom admin slug — ubah 'studio' ke slug yang kamu mau ────────
    const ADMIN_SLUG = 'studio';

    if (url === `/${ADMIN_SLUG}` || url === `/${ADMIN_SLUG}/`) {
        serveStatic(res, path.join(__dirname, 'admin', 'login.html'));
        return;
    }
    if (url === `/${ADMIN_SLUG}/dashboard` || url === `/${ADMIN_SLUG}/dashboard.html`) {
        serveStatic(res, path.join(__dirname, 'admin', 'dashboard.html'));
        return;
    }

    // ── API: GET /api/products ──────────────────────────────────────
    if (url === '/api/products' && method === 'GET') {
        fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
            if (err) {
                sendJSON(res, 500, { error: 'Gagal membaca products.json', detail: err.message });
                return;
            }
            try {
                sendJSON(res, 200, JSON.parse(raw));
            } catch (e) {
                sendJSON(res, 500, { error: 'JSON tidak valid', detail: e.message });
            }
        });
        return;
    }

    // ── API: PUT /api/products ──────────────────────────────────────
    if (url === '/api/products' && method === 'PUT') {
        try {
            const body = await readBody(req);
            const data = JSON.parse(body); // validasi JSON

            // Pastikan format array
            if (!Array.isArray(data)) {
                sendJSON(res, 400, { error: 'Data harus berupa array' });
                return;
            }

            // Tulis ke file
            fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8', (err) => {
                if (err) {
                    sendJSON(res, 500, { error: 'Gagal menyimpan products.json', detail: err.message });
                    return;
                }
                console.log(`[${new Date().toLocaleTimeString('id-ID')}] ✓ products.json diperbarui (${data.length} koleksi)`);
                sendJSON(res, 200, { ok: true, message: 'Data berhasil disimpan' });
            });
        } catch (e) {
            sendJSON(res, 400, { error: 'Body bukan JSON valid', detail: e.message });
        }
        return;
    }

    // ── Static files ───────────────────────────────────────────────
    let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

    // Kalau path adalah direktori, coba index.html di dalam
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // Security: cegah path traversal keluar dari root
    const root = path.resolve(__dirname);
    if (!path.resolve(filePath).startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    serveStatic(res, filePath);
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║         LYSÉRIA Dev Server           ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  🌐  http://localhost:${PORT}           ║`);
    console.log(`  ║  🔐  http://localhost:${PORT}/admin/login.html  ║`);
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
    console.log('  API Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/api/products`);
    console.log(`  PUT  http://localhost:${PORT}/api/products`);
    console.log('');
});
