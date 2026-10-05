/**
 * LYSÉRIA — Payment module (Midtrans Core API · QRIS)
 *
 * - Harga SELALU dihitung ulang di server dari data/products.json
 *   (client hanya mengirim slug + qty, tidak bisa memanipulasi harga).
 * - Order disimpan di data/orders.json.
 * - Status dicek via Midtrans Status API + webhook (signature diverifikasi).
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT          = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(ROOT, 'data', 'products.json');
const ORDERS_FILE   = path.join(ROOT, 'data', 'orders.json');

// ── .env loader (tanpa dependency) ──────────────────────────────────
function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!m || line.trim().startsWith('#')) continue;
        let val = m[2].replace(/^['"]|['"]$/g, '');
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
}
loadEnv();

const SERVER_KEY    = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const SHIPPING_FEE  = parseInt(process.env.SHIPPING_FEE || '0', 10) || 0;
const QR_EXPIRY_MIN = parseInt(process.env.QR_EXPIRY_MINUTES || '15', 10) || 15;
const API_BASE      = IS_PRODUCTION ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';

const PAID_STATUSES   = ['settlement', 'capture'];
const FAILED_STATUSES = ['expire', 'cancel', 'deny', 'failure'];

function isConfigured() { return Boolean(SERVER_KEY); }

// ── Orders storage ──────────────────────────────────────────────────
function readOrders() {
    try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); }
    catch { return []; }
}
function writeOrders(orders) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}
function findOrder(orderId) {
    return readOrders().find(o => o.orderId === orderId) || null;
}
function updateOrder(orderId, patch) {
    const orders = readOrders();
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...patch, updatedAt: new Date().toISOString() };
    writeOrders(orders);
    return orders[idx];
}

// ── Helpers ─────────────────────────────────────────────────────────
function getProductMap() {
    const collections = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const map = {};
    for (const col of collections) {
        for (const p of (col.products || [])) map[p.slug] = p;
    }
    return map;
}

function authHeader() {
    return 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');
}

async function midtransRequest(method, endpoint, body) {
    const res = await fetch(API_BASE + endpoint, {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader(),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
}

function mapStatus(trxStatus) {
    if (PAID_STATUSES.includes(trxStatus))   return 'paid';
    if (FAILED_STATUSES.includes(trxStatus)) return trxStatus === 'expire' ? 'expired' : 'failed';
    return 'pending';
}

function sanitize(str, max = 200) {
    return String(str || '').trim().slice(0, max);
}

// ── Public API ──────────────────────────────────────────────────────

/** Buat order baru + charge QRIS ke Midtrans. */
async function createQrisOrder({ items, customer }) {
    if (!isConfigured()) {
        throw { status: 500, message: 'Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY di file .env' };
    }
    if (!Array.isArray(items) || !items.length) {
        throw { status: 400, message: 'Keranjang kosong' };
    }

    const c = {
        name:    sanitize(customer?.name, 100),
        phone:   sanitize(customer?.phone, 20),
        email:   sanitize(customer?.email, 100),
        address: sanitize(customer?.address, 300),
        city:    sanitize(customer?.city, 80),
        postal:  sanitize(customer?.postal, 10),
        shipping: parseInt(customer?.shipping, 10) || 0,
    };
    if (!c.name || !c.phone || !c.address || !c.city || !c.postal || isNaN(c.shipping)) {
        throw { status: 400, message: 'Data pengiriman belum lengkap' };
    }

    // Hitung ulang harga dari data server
    const productMap = getProductMap();
    const lineItems = [];
    for (const it of items) {
        const p   = productMap[it.slug];
        const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 1), 99);
        if (!p) throw { status: 400, message: `Produk tidak ditemukan: ${it.slug}` };
        if (p.status === 'coming_soon') throw { status: 400, message: `${p.name} belum tersedia` };
        lineItems.push({
            id:       p.slug,
            name:     p.name.slice(0, 50),
            price:    Math.round(Number(p.price)),
            quantity: qty,
        });
    }
    const appliedShippingFee = c.shipping > 0 ? c.shipping : SHIPPING_FEE;
    if (appliedShippingFee > 0) {
        lineItems.push({ id: 'shipping', name: 'Ongkos Kirim', price: appliedShippingFee, quantity: 1 });
    }
    const grossAmount = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const orderId = `LYS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const charge = await midtransRequest('POST', '/v2/charge', {
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        item_details: lineItems,
        customer_details: {
            first_name: c.name,
            phone: c.phone,
            email: c.email || undefined,
            shipping_address: {
                first_name: c.name, phone: c.phone,
                address: c.address, city: c.city, postal_code: c.postal, country_code: 'IDN',
            },
        },
        qris: { acquirer: 'gopay' },
        custom_expiry: { expiry_duration: QR_EXPIRY_MIN, unit: 'minute' },
    });

    if (!['200', '201'].includes(String(charge.status_code))) {
        console.error('[Midtrans] Charge gagal:', charge);
        throw { status: 502, message: charge.status_message || 'Gagal membuat pembayaran QRIS' };
    }

    const qrAction = (charge.actions || []).find(a => a.name === 'generate-qr-code');
    const order = {
        orderId,
        status: 'pending',
        transactionStatus: charge.transaction_status,
        transactionId: charge.transaction_id,
        grossAmount,
        items: lineItems,
        customer: c,
        qrUrl: qrAction ? qrAction.url : null,
        qrString: charge.qr_string || null,
        expiryTime: charge.expiry_time || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🧾 Order ${orderId} dibuat — Rp ${grossAmount.toLocaleString('id-ID')}`);

    return publicOrder(order);
}

/** Cek status terbaru (ke Midtrans) dan sinkronkan ke orders.json. */
async function refreshStatus(orderId) {
    const order = findOrder(orderId);
    if (!order) throw { status: 404, message: 'Order tidak ditemukan' };
    if (order.status === 'paid') return publicOrder(order);

    const st = await midtransRequest('GET', `/v2/${encodeURIComponent(orderId)}/status`);
    if (st.transaction_status) {
        const updated = updateOrder(orderId, {
            transactionStatus: st.transaction_status,
            status: mapStatus(st.transaction_status),
            paidAt: PAID_STATUSES.includes(st.transaction_status) ? (st.settlement_time || new Date().toISOString()) : order.paidAt,
        });
        return publicOrder(updated);
    }
    return publicOrder(order);
}

/** Handler webhook HTTP Notification dari Midtrans. */
function handleNotification(n) {
    const expected = crypto
        .createHash('sha512')
        .update(`${n.order_id}${n.status_code}${n.gross_amount}${SERVER_KEY}`)
        .digest('hex');
    if (expected !== n.signature_key) {
        throw { status: 403, message: 'Signature tidak valid' };
    }
    const order = findOrder(n.order_id);
    if (!order) throw { status: 404, message: 'Order tidak ditemukan' };

    const status = mapStatus(n.transaction_status);
    updateOrder(n.order_id, {
        transactionStatus: n.transaction_status,
        status,
        paidAt: status === 'paid' ? (n.settlement_time || new Date().toISOString()) : order.paidAt,
    });
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🔔 Webhook ${n.order_id} → ${n.transaction_status}`);
    return { ok: true };
}

/** Data order yang aman ditampilkan ke pembeli. */
function publicOrder(o) {
    return {
        orderId: o.orderId,
        status: o.status,
        grossAmount: o.grossAmount,
        items: o.items,
        qrUrl: o.qrUrl,
        qrString: o.qrString,
        expiryTime: o.expiryTime,
        paidAt: o.paidAt || null,
        customerName: o.customer?.name,
        isSandbox: !IS_PRODUCTION,
    };
}

module.exports = {
    isConfigured,
    IS_PRODUCTION,
    createQrisOrder,
    refreshStatus,
    handleNotification,
    readOrders,
};
