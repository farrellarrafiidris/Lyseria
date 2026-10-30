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
const PAYMENT_TYPE  = (process.env.MIDTRANS_PAYMENT_TYPE || 'gopay').trim(); // 'gopay' (aktif) atau 'qris'
const QRIS_ACQUIRER = (process.env.MIDTRANS_QRIS_ACQUIRER || 'gopay').trim();
const API_BASE      = IS_PRODUCTION ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
const SNAP_BASE     = IS_PRODUCTION ? 'https://app.midtrans.com/snap/v1' : 'https://app.sandbox.midtrans.com/snap/v1';

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

async function createSnapTransaction(body) {
    const res = await fetch(SNAP_BASE + '/transactions', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader(),
        },
        body: JSON.stringify(body),
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

/** Buat order baru + charge ke Midtrans (GoPay / QRIS). */
async function createQrisOrder({ items, customer, paymentType }) {
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
        if (!p.isPreOrder && p.stock !== undefined && p.stock <= 0) {
            throw { status: 400, message: `Maaf, stok ${p.name} sedang habis` };
        }
        if (!p.isPreOrder && p.stock !== undefined && qty > p.stock) {
            throw { status: 400, message: `Jumlah ${p.name} melebihi stok yang tersedia (${p.stock} pcs)` };
        }
        lineItems.push({
            id:       p.slug,
            name:     p.name.slice(0, 50),
            price:    Math.round(Number(p.discount || p.price)),
            quantity: qty,
        });
    }
    const appliedShippingFee = c.shipping > 0 ? c.shipping : SHIPPING_FEE;
    if (appliedShippingFee > 0) {
        lineItems.push({ id: 'shipping', name: 'Ongkos Kirim', price: appliedShippingFee, quantity: 1 });
    }
    const grossAmount = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const orderId = `LYS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const basePayload = {
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
        custom_expiry: { expiry_duration: QR_EXPIRY_MIN, unit: 'minute' },
    };

    const chosenPaymentType = (paymentType || PAYMENT_TYPE || 'gopay').toLowerCase();

    let charge;
    if (chosenPaymentType === 'gopay') {
        charge = await midtransRequest('POST', '/v2/charge', {
            ...basePayload,
            payment_type: 'gopay',
        });
    } else {
        charge = await midtransRequest('POST', '/v2/charge', {
            ...basePayload,
            payment_type: 'qris',
            qris: { acquirer: QRIS_ACQUIRER },
        });
    }

    let snapToken = null;
    let snapRedirectUrl = null;

    if (!['200', '201'].includes(String(charge.status_code))) {
        console.warn(`[Midtrans] Core API (${charge.status_code}: ${charge.status_message}). Beralih otomatis ke Midtrans SNAP...`);
        try {
            // Coba buat Snap transaction dengan GoPay
            const snapRes = await createSnapTransaction({
                ...basePayload,
                // Jangan batasi jika gopay belum aktif di Snap Preferences, agar tidak error "No payment channels available"
                enabled_payments: ['gopay', 'other_qris', 'bank_transfer', 'bni_va', 'bri_va', 'mandiri_bill', 'permata_va', 'cimb_va'],
            });
            if (snapRes.token && snapRes.redirect_url) {
                console.log(`[Midtrans] ✓ Berhasil membuat Snap Token: ${snapRes.token}`);
                snapToken = snapRes.token;
                snapRedirectUrl = snapRes.redirect_url;
            } else {
                console.error('[Midtrans] Snap API respon:', snapRes);
            }
        } catch (snapErr) {
            console.error('[Midtrans] Gagal membuat Snap transaction:', snapErr.message);
        }
    }

    if (!['200', '201'].includes(String(charge.status_code)) && !snapRedirectUrl) {
        console.error('[Midtrans] Charge gagal:', charge);
        let msg = charge.status_message || 'Gagal membuat pembayaran';
        if (String(charge.status_code) === '402' || msg.toLowerCase().includes('not activated')) {
            msg = `Metode pembayaran ${chosenPaymentType.toUpperCase()} sedang dalam proses aktivasi di akun Midtrans Production kamu (memerlukan 1-3 hari kerja). Silakan hubungi admin atau gunakan pemesanan via WhatsApp.`;
        } else if (msg.toLowerCase().includes('pop id')) {
            msg = 'GoPay Dynamic QRIS masih dalam proses aktivasi oleh Midtrans & Bank Indonesia.';
        }
        throw { status: 502, message: msg };
    }

    const qrAction = (charge.actions || []).find(a => a.name === 'generate-qr-code' || a.name === 'generate-qr-code-v2');
    const deeplinkAction = (charge.actions || []).find(a => a.name === 'deeplink-redirect');
    const order = {
        orderId,
        status: 'pending',
        transactionStatus: charge.transaction_status || 'pending',
        transactionId: charge.transaction_id || snapToken || null,
        grossAmount,
        items: lineItems,
        customer: c,
        paymentType: snapRedirectUrl ? 'snap' : (charge.payment_type || chosenPaymentType),
        qrUrl: qrAction ? qrAction.url : null,
        deeplinkUrl: deeplinkAction ? deeplinkAction.url : null,
        snapToken: snapToken,
        snapRedirectUrl: snapRedirectUrl,
        qrString: charge.qr_string || null,
        expiryTime: charge.expiry_time || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🧾 Order ${orderId} dibuat (${order.paymentType.toUpperCase()}) — Rp ${grossAmount.toLocaleString('id-ID')}`);

    return publicOrder(order);
}

/** Cek status terbaru (ke Midtrans) dan sinkronkan ke orders.json. */
async function refreshStatus(orderId) {
    const order = findOrder(orderId);
    if (!order) throw { status: 404, message: 'Order tidak ditemukan' };
    if (order.status === 'paid') return publicOrder(order);

    const st = await midtransRequest('GET', `/v2/${encodeURIComponent(orderId)}/status`);
    if (st.transaction_status) {
        const wasPaid = order.status === 'paid';
        const newStatus = mapStatus(st.transaction_status);
        
        const updated = updateOrder(orderId, {
            transactionStatus: st.transaction_status,
            status: newStatus,
            paidAt: PAID_STATUSES.includes(st.transaction_status) ? (st.settlement_time || new Date().toISOString()) : order.paidAt,
        });

        if (!wasPaid && newStatus === 'paid' && process.env.FONNTE_TOKEN) {
            // Jangan await biar nggak memperlambat respon frontend
            sendWhatsAppReceipt(updated).catch(console.error);
        }

        return publicOrder(updated);
    }
    return publicOrder(order);
}

/** Handler webhook HTTP Notification dari Midtrans. */
async function handleNotification(n) {
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
    const wasPaid = order.status === 'paid';

    updateOrder(n.order_id, {
        transactionStatus: n.transaction_status,
        status,
        paidAt: status === 'paid' ? (n.settlement_time || new Date().toISOString()) : order.paidAt,
    });
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🔔 Webhook ${n.order_id} → ${n.transaction_status}`);

    // Kirim notifikasi WA via Fonnte jika pembayaran baru saja sukses
    if (!wasPaid && status === 'paid' && process.env.FONNTE_TOKEN) {
        await sendWhatsAppReceipt(findOrder(n.order_id));
    }

    return { ok: true };
}

/** Mengirim notifikasi resi WA via Fonnte */
async function sendWhatsAppReceipt(order) {
    try {
        const customerPhone = order.customer?.phone;
        const customerName = order.customer?.name || 'Pelanggan';
        
        if (customerPhone) {
            let phone = customerPhone.replace(/\D/g, '');
            if (phone.startsWith('0')) phone = '62' + phone.substring(1);
            
            const message = `Halo ${customerName}, pembayaran pesanan *#${order.orderId}* sebesar *Rp ${Number(order.grossAmount).toLocaleString('id-ID')}* sudah kami terima!\n\nPesanan LYSÉRIA-mu akan segera kami proses dan kirim ya. Terima kasih! 🌸`;
            
            await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': process.env.FONNTE_TOKEN,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    target: phone,
                    message: message
                })
            });
            console.log(`[WhatsApp] Notifikasi terkirim ke ${phone} untuk order ${order.orderId}`);
        }
    } catch (err) {
        console.error(`[WhatsApp Error] Gagal mengirim pesan ke ${order.customer?.phone}:`, err.message);
    }
}

/** Data order yang aman ditampilkan ke pembeli. */
function publicOrder(o) {
    return {
        orderId: o.orderId,
        status: o.status,
        grossAmount: o.grossAmount,
        items: o.items,
        paymentType: o.paymentType || PAYMENT_TYPE,
        qrUrl: o.qrUrl,
        deeplinkUrl: o.deeplinkUrl || null,
        snapToken: o.snapToken || null,
        snapRedirectUrl: o.snapRedirectUrl || null,
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
    PAYMENT_TYPE,
    createQrisOrder,
    refreshStatus,
    handleNotification,
    readOrders,
};
