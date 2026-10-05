/* ════════════════════════════════════════════════════════════
   LYSÉRIA — cart.js
   Shopping Cart · localStorage · QRIS (Midtrans) Checkout · WhatsApp · Toast
   ════════════════════════════════════════════════════════════ */

// ─── Product Registry ────────────────────────────────────────
// Populated by home.js / catalog.js / detail.js so that
// addToCartBySlug() can look up the full product object.
window._lyseriaProductsMap = window._lyseriaProductsMap || {};

function addToCartBySlug(slug) {
    const product = window._lyseriaProductsMap[slug];
    if (!product) { console.warn('[Lyséria Cart] Product not found:', slug); return; }
    CartManager.addItem(product);
}

// ─── Cart Manager ─────────────────────────────────────────────
const CartManager = {
    WA_NUMBER: '6285181764377',
    STORAGE_KEY: 'lyseria_cart',

    getCart() {
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
        catch { return []; }
    },

    _save(cart) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
        CartUI.updateBadge();
        CartUI.renderItems();
    },

    addItem(product) {
        const cart = this.getCart();
        const existing = cart.find(i => i.slug === product.slug);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({
                id:    product.id,
                slug:  product.slug,
                name:  product.name,
                price: Number(product.price),
                image: product.images[0],
                qty:   1
            });
        }
        this._save(cart);
        showToast(`${product.name} added to cart`);
        CartUI.openDrawer();
    },

    removeItem(slug) {
        this._save(this.getCart().filter(i => i.slug !== slug));
    },

    updateQty(slug, qty) {
        if (qty < 1) { this.removeItem(slug); return; }
        const cart = this.getCart();
        const item  = cart.find(i => i.slug === slug);
        if (item) item.qty = qty;
        this._save(cart);
    },

    clearCart() { this._save([]); },

    getTotal() {
        return this.getCart().reduce((s, i) => s + i.price * i.qty, 0);
    },

    getCount() {
        return this.getCart().reduce((s, i) => s + i.qty, 0);
    },

    openCheckout() {
        const cart = this.getCart();
        if (!cart.length) { showToast('Cart kosong!', 'info'); return; }
        CartUI.openCheckoutModal();
    },

    _getCustomer() {
        const v = id => (document.getElementById(id)?.value || '').trim();
        const selText = id => {
            const el = document.getElementById(id);
            return el && el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '';
        };
        return {
            name: v('co-name'), phone: v('co-phone'), email: v('co-email'),
            address: v('co-address'), 
            city: selText('co-city'), // Now we use the dropdown text for the order
            district: v('co-district'),
            postal: v('co-postal'),
            shipping: v('co-shipping')
        };
    },

    /** Checkout utama: buat order di server lalu tampilkan QRIS. */
    async payWithQris() {
        const form = document.getElementById('ly-checkout-form');
        if (form && !form.reportValidity()) return;

        const cart = this.getCart();
        if (!cart.length) { showToast('Cart kosong!', 'info'); return; }

        const customer = this._getCustomer();
        CartUI.closeCheckoutModal();
        QrisPayment.open();

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(i => ({ slug: i.slug, qty: i.qty })),
                    customer,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal membuat pembayaran');
            QrisPayment.showQr(data);
        } catch (err) {
            QrisPayment.showError(err.message);
        }
    },

    /** Opsi cadangan: kirim pesanan manual via WhatsApp. */
    orderViaWhatsApp() {
        const form = document.getElementById('ly-checkout-form');
        if (form && !form.reportValidity()) return;

        const cart = this.getCart();
        const c = this._getCustomer();
        const ship = parseInt(c.shipping, 10) || 0;

        const lines = cart
            .map(i => `• ${i.name} x${i.qty}  —  Rp ${(i.price * i.qty).toLocaleString('id-ID')}`)
            .join('\n');
            
        let shippingStr = '';
        if (ship > 0) shippingStr = `\nOngkos Kirim: Rp ${ship.toLocaleString('id-ID')}`;

        const total = `Rp ${(this.getTotal() + ship).toLocaleString('id-ID')}`;

        const msg = 
            `Halo LYSÉRIA \n\nSaya ingin memesan:\n\n${lines}${shippingStr}` +
            `\n\n*Total: ${total}*\n\n` +
            `*Data Pengiriman:*\n` +
            `Nama: ${c.name}\n` +
            `No. HP: ${c.phone}\n` +
            `Alamat: ${c.address}\n` +
            `Kota: ${c.city}\n` +
            `Kode Pos: ${c.postal}\n\n` +
            `Mohon konfirmasi ketersediaan ya, terima kasih!`;

        window.open(`https://wa.me/${this.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        CartUI.closeCheckoutModal();
    }
};

// ─── QRIS Payment Modal ──────────────────────────────────────
const QrisPayment = {
    order: null,
    _poll: null,
    _tick: null,

    _el() { return document.getElementById('ly-qris-body'); },

    _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    _rp(n) { return Number(n).toLocaleString('id-ID'); },

    open() {
        const m = document.getElementById('ly-qris-modal');
        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this._el().innerHTML = `
            <div style="padding:60px 0;text-align:center;">
                <div class="ly-spin" style="width:42px;height:42px;margin:0 auto 18px;border:3px solid #EDE8E3;border-top-color:#C79A8B;border-radius:50%;"></div>
                <p style="margin:0;font-size:0.72rem;letter-spacing:0.28em;text-transform:uppercase;color:#9A8880;font-weight:600;">Menyiapkan QRIS…</p>
            </div>`;
    },

    close() {
        if (this.order && this.order.status === 'pending' &&
            !confirm('Pembayaran belum selesai. Tutup halaman QR?')) return;
        this._stop();
        document.getElementById('ly-qris-modal').style.display = 'none';
        document.body.style.overflow = '';
        this.order = null;
    },

    _stop() {
        clearInterval(this._poll); clearInterval(this._tick);
        this._poll = this._tick = null;
    },

    _expiryDate(str) {
        if (!str) return new Date(Date.now() + 15 * 60000);
        // Midtrans mengirim waktu WIB: "YYYY-MM-DD HH:mm:ss"
        return new Date(str.replace(' ', 'T') + '+07:00');
    },

    showQr(order) {
        this.order = order;
        const expiry = this._expiryDate(order.expiryTime);

        this._el().innerHTML = `
            <p style="margin:0;font-size:0.62rem;letter-spacing:0.38em;text-transform:uppercase;color:#C79A8B;font-weight:700;text-align:center;">Scan to Pay</p>
            <h3 style="margin:6px 0 4px;font-family:'Cormorant Garamond',serif;font-size:2rem;color:#1B2A4A;font-weight:600;text-align:center;line-height:1;">QRIS Payment</h3>
            <p style="margin:0 0 20px;font-size:0.72rem;color:#9A8880;text-align:center;">Order <b style="color:#3B312E;">${order.orderId}</b></p>

            <div style="background:#fff;border-radius:20px;padding:18px;margin:0 auto;width:fit-content;box-shadow:0 10px 40px rgba(27,42,74,0.12);border:1px solid #EDE8E3;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px;">
                    <span style="font-weight:800;font-size:0.95rem;letter-spacing:0.04em;color:#1B2A4A;">QRIS</span>
                    <span style="font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:#9A8880;">LYSÉRIA</span>
                </div>
                <img id="ly-qris-img" src="${order.qrUrl}" alt="QRIS ${order.orderId}" style="display:block;width:240px;height:240px;max-width:60vw;max-height:60vw;object-fit:contain;">
            </div>

            <div style="display:flex;justify-content:center;align-items:baseline;gap:6px;color:#1B2A4A;margin:22px 0 4px;">
                <span style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.4rem;">Rp</span>
                <span style="font-size:1.8rem;font-weight:600;letter-spacing:0.02em;">${this._rp(order.grossAmount)}</span>
            </div>

            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:18px;">
                <span class="ly-pulse" style="width:8px;height:8px;border-radius:50%;background:#F59E0B;"></span>
                <span style="font-size:0.75rem;color:#6B5E58;">Menunggu pembayaran · <b id="ly-qris-timer" style="color:#1B2A4A;font-variant-numeric:tabular-nums;">--:--</b></span>
            </div>

            <ol style="margin:0 0 20px;padding:14px 18px 14px 34px;background:#F3EEE8;border-radius:14px;font-size:0.74rem;color:#5A4D48;line-height:1.7;">
                <li>Buka GoPay, OVO, DANA, ShopeePay, atau m-banking</li>
                <li>Pilih <b>Scan / Bayar</b> lalu arahkan ke kode QR</li>
                <li>Konfirmasi pembayaran — halaman ini update otomatis</li>
            </ol>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <a href="${order.qrUrl}" target="_blank" rel="noopener" id="ly-qris-open" class="ly-btn-ghost">Buka QR</a>
                <button type="button" id="ly-qris-check" class="ly-btn-navy" onclick="QrisPayment.check(true)">Cek Status</button>
            </div>

            ${order.isSandbox ? `
            <p style="margin:16px 0 0;font-size:0.68rem;color:#9A8880;text-align:center;line-height:1.6;">
                🧪 Mode Sandbox — tes bayar via
                <a href="https://simulator.sandbox.midtrans.com/v2/qris/index" target="_blank" rel="noopener" style="color:#C79A8B;font-weight:600;">QRIS Simulator</a>
                (paste URL dari tombol "Buka QR").
            </p>` : ''}
        `;

        // Countdown
        const timerEl = document.getElementById('ly-qris-timer');
        const tick = () => {
            const left = Math.max(0, expiry - Date.now());
            const m = String(Math.floor(left / 60000)).padStart(2, '0');
            const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
            if (left <= 0) { clearInterval(this._tick); this.check(); }
        };
        tick();
        this._tick = setInterval(tick, 1000);

        // Polling status tiap 4 detik
        this._poll = setInterval(() => this.check(), 4000);
    },

    async check(manual = false) {
        if (!this.order) return;
        const btn = document.getElementById('ly-qris-check');
        if (manual && btn) { btn.disabled = true; btn.textContent = 'Mengecek…'; }
        try {
            const res  = await fetch(`/api/orders/${encodeURIComponent(this.order.orderId)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (!this.order) return; // modal sudah ditutup
            this.order = { ...this.order, ...data };

            if (data.status === 'paid')         this.showSuccess();
            else if (data.status === 'expired') this.showError('QR sudah kedaluwarsa. Silakan buat pembayaran baru.');
            else if (data.status === 'failed')  this.showError('Pembayaran dibatalkan atau gagal.');
            else if (manual) showToast('Pembayaran belum diterima', 'info');
        } catch (e) {
            if (manual) showToast('Gagal mengecek status', 'error');
        } finally {
            if (manual && btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'Cek Status'; }
        }
    },

    showSuccess() {
        this._stop();
        const o = this.order;
        o.status = 'paid';
        CartManager.clearCart();
        const firstName = o.customerName ? `, ${this._esc(o.customerName.split(' ')[0])}` : '';
        const waMsg = `Halo LYSÉRIA, saya sudah membayar pesanan ${o.orderId} (Rp ${this._rp(o.grossAmount)}). Terima kasih!`;

        this._el().innerHTML = `
            <div style="text-align:center;padding:16px 0 4px;">
                <div class="ly-pop" style="width:84px;height:84px;margin:0 auto 22px;border-radius:50%;background:linear-gradient(135deg,#C79A8B,#1B2A4A);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(199,154,139,0.45);">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                </div>
                <p style="margin:0;font-size:0.62rem;letter-spacing:0.38em;text-transform:uppercase;color:#C79A8B;font-weight:700;">Payment Received</p>
                <h3 style="margin:6px 0 10px;font-family:'Cormorant Garamond',serif;font-size:2.1rem;color:#1B2A4A;font-weight:600;line-height:1.05;">Thank you${firstName}!</h3>
                <p style="margin:0 auto 22px;font-size:0.8rem;color:#6B5E58;max-width:320px;line-height:1.6;">Pembayaran kamu sudah kami terima. Pesanan akan segera kami proses dan kirim.</p>

                <div style="background:#fff;border:1px solid #EDE8E3;border-radius:16px;padding:16px 18px;text-align:left;margin-bottom:20px;">
                    ${(o.items || []).map(i => `
                        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:#3B312E;padding:4px 0;">
                            <span>${this._esc(i.name)} × ${i.quantity}</span><span>Rp ${this._rp(i.price * i.quantity)}</span>
                        </div>`).join('')}
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;color:#1B2A4A;border-top:1px dashed #EDE8E3;margin-top:8px;padding-top:10px;">
                        <span>Total</span><span>Rp ${this._rp(o.grossAmount)}</span>
                    </div>
                    <p style="margin:10px 0 0;font-size:0.68rem;color:#9A8880;">Order ID: <b>${o.orderId}</b></p>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <a class="ly-btn-ghost" target="_blank" rel="noopener"
                       href="https://wa.me/${CartManager.WA_NUMBER}?text=${encodeURIComponent(waMsg)}">Konfirmasi WA</a>
                    <button type="button" class="ly-btn-navy" onclick="QrisPayment.close()">Selesai</button>
                </div>
            </div>`;
    },

    showError(message) {
        this._stop();
        if (this.order) this.order.status = 'failed';
        this._el().innerHTML = `
            <div style="text-align:center;padding:20px 0 4px;">
                <div style="width:72px;height:72px;margin:0 auto 18px;border-radius:50%;background:#FBEAEA;display:flex;align-items:center;justify-content:center;">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D9534F" stroke-width="2.5" stroke-linecap="round"><path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/></svg>
                </div>
                <h3 style="margin:0 0 8px;font-family:'Cormorant Garamond',serif;font-size:1.8rem;color:#1B2A4A;font-weight:600;">Pembayaran Belum Berhasil</h3>
                <p style="margin:0 auto 22px;font-size:0.8rem;color:#6B5E58;max-width:320px;line-height:1.6;">${this._esc(message)}</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <button type="button" class="ly-btn-ghost" onclick="QrisPayment.close()">Tutup</button>
                    <button type="button" class="ly-btn-navy" onclick="QrisPayment.close();CartUI.openCheckoutModal()">Coba Lagi</button>
                </div>
            </div>`;
    }
};

// ─── Shipping UI ───────────────────────────────────────────────
const ShippingUI = {
    async loadProvinces() {
        const el = document.getElementById('co-province');
        if (!el || el.options.length > 1) return;
        try {
            const res = await fetch('/api/shipping/provinces');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            el.innerHTML = '<option value="" disabled selected>Pilih Provinsi</option>' + 
                data.map(p => `<option value="${p.province_id}">${p.province}</option>`).join('');
        } catch (e) {
            el.innerHTML = '<option value="" disabled selected>Gagal memuat provinsi</option>';
            console.error(e);
        }
    },

    async loadCities() {
        const provId = document.getElementById('co-province').value;
        const el = document.getElementById('co-city');
        const ship = document.getElementById('co-shipping');
        if (!provId || !el) return;
        
        el.disabled = true;
        el.innerHTML = '<option value="" disabled selected>Memuat kota...</option>';
        ship.disabled = true;
        ship.innerHTML = '<option value="" disabled selected>Pilih kota tujuan dulu</option>';
        CartUI.updateCheckoutTotal();

        try {
            const res = await fetch(`/api/shipping/cities?province=${provId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            el.innerHTML = '<option value="" disabled selected>Pilih Kota / Kabupaten</option>' + 
                data.map(c => `<option value="${c.city_id}" data-postal="${c.postal_code}">${c.type} ${c.city_name}</option>`).join('');
            el.disabled = false;
        } catch (e) {
            el.innerHTML = '<option value="" disabled selected>Gagal memuat kota</option>';
        }
    },

    async loadCosts() {
        const citySel = document.getElementById('co-city');
        const cityId = citySel.value;
        const postal = citySel.options[citySel.selectedIndex]?.dataset?.postal;
        const el = document.getElementById('co-shipping');
        const postalEl = document.getElementById('co-postal');
        
        if (!cityId || !el) return;
        if (postalEl && postal) postalEl.value = postal;
        
        el.disabled = true;
        el.innerHTML = '<option value="" disabled selected>Menghitung ongkir...</option>';
        CartUI.updateCheckoutTotal();

        // Asumsi berat: 500 gram x qty
        const weight = Math.max(500, CartManager.getCount() * 500); 

        try {
            const res = await fetch('/api/shipping/cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination: cityId, weight, courier: 'jne' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (!data.costs || data.costs.length === 0) {
                el.innerHTML = '<option value="" disabled selected>Kurir tidak tersedia</option>';
                return;
            }

            el.innerHTML = '<option value="" disabled selected>Pilih Layanan JNE</option>' + 
                data.costs.map(c => {
                    const cost = c.cost[0];
                    return `<option value="${cost.value}">JNE ${c.service} (Rp ${Number(cost.value).toLocaleString('id-ID')}) - ${cost.etd} hari</option>`;
                }).join('');
            el.disabled = false;
        } catch (e) {
            el.innerHTML = '<option value="" disabled selected>Gagal menghitung ongkir</option>';
        }
    }
};

// ─── Toast Notification ───────────────────────────────────────
function showToast(msg, type = 'success') {
    let tc = document.getElementById('ly-toast-container');
    if (!tc) {
        tc = document.createElement('div');
        tc.id = 'ly-toast-container';
        Object.assign(tc.style, {
            position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
            display: 'flex', flexDirection: 'column', gap: '10px',
            pointerEvents: 'none'
        });
        document.body.appendChild(tc);
    }

    const icons = { success: '✓', copy: '⎘', info: 'ℹ', error: '✕' };
    const t = document.createElement('div');
    Object.assign(t.style, {
        background: '#1B2A4A', color: '#FAF7F2',
        padding: '14px 20px', borderRadius: '14px',
        fontFamily: "'Inter', sans-serif", fontSize: '0.78rem',
        fontWeight: '500', letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 10px 36px rgba(0,0,0,0.25)',
        pointerEvents: 'auto',
        transform: 'translateY(20px)', opacity: '0',
        transition: 'all 0.35s cubic-bezier(0.2,0.8,0.2,1)',
        minWidth: '210px', maxWidth: '300px',
        borderLeft: '3px solid #C79A8B'
    });
    t.innerHTML = `<span style="color:#C79A8B;font-size:1rem;flex-shrink:0;">${icons[type] || '✓'}</span><span>${msg}</span>`;
    tc.appendChild(t);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        t.style.transform = 'translateY(0)';
        t.style.opacity = '1';
    }));

    setTimeout(() => {
        t.style.transform = 'translateY(20px)';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 380);
    }, 2800);
}

// ─── Cart UI ──────────────────────────────────────────────────
let _drawerOpen = false;

const CartUI = {

    init() {
        this._injectDrawer();
        this._bindNavIcon();
        this.updateBadge();
        this.renderItems();
    },

    _injectDrawer() {
        if (document.getElementById('ly-cart-drawer')) return;

        const el = document.createElement('div');
        el.innerHTML = `
            <style>
                @keyframes ly-spin { to { transform: rotate(360deg); } }
                @keyframes ly-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(1.6); } }
                @keyframes ly-pop { 0% { transform:scale(.4); opacity:0; } 70% { transform:scale(1.08); } 100% { transform:scale(1); opacity:1; } }
                @keyframes ly-rise { from { transform:translateY(24px); opacity:0; } to { transform:translateY(0); opacity:1; } }
                .ly-spin  { animation: ly-spin .8s linear infinite; }
                .ly-pulse { animation: ly-pulse 1.4s ease-in-out infinite; }
                .ly-pop   { animation: ly-pop .55s cubic-bezier(.2,.8,.2,1) both; }
                .ly-rise  { animation: ly-rise .4s cubic-bezier(.2,.8,.2,1) both; }
                .ly-btn-navy, .ly-btn-ghost, .ly-btn-qris {
                    display:flex;align-items:center;justify-content:center;gap:10px;
                    padding:14px 18px;border-radius:999px;cursor:pointer;text-decoration:none;
                    font-family:'Inter',sans-serif;font-size:0.7rem;font-weight:700;
                    letter-spacing:0.18em;text-transform:uppercase;
                    transition:transform .18s, box-shadow .2s, background .2s, color .2s, border-color .2s;
                }
                .ly-btn-navy { background:#1B2A4A;color:#FAF7F2;border:none; }
                .ly-btn-navy:hover { background:#C79A8B;transform:translateY(-2px); }
                .ly-btn-navy:disabled { opacity:.6;cursor:wait;transform:none; }
                .ly-btn-ghost { background:transparent;color:#1B2A4A;border:1.5px solid #D9CFC7; }
                .ly-btn-ghost:hover { border-color:#1B2A4A;transform:translateY(-2px); }
                .ly-btn-qris {
                    width:100%;padding:16px;border:none;color:#fff;font-size:0.78rem;letter-spacing:0.2em;
                    background:linear-gradient(135deg,#1B2A4A 0%,#3A4E78 55%,#C79A8B 130%);
                    box-shadow:0 10px 30px rgba(27,42,74,0.3);
                }
                .ly-btn-qris:hover { transform:translateY(-2px);box-shadow:0 14px 36px rgba(27,42,74,0.38); }
                .ly-btn-wa { width:100%;margin-top:10px;background:transparent;color:#128C7E;border:1.5px solid #CDEBDD; }
                .ly-btn-wa:hover { border-color:#25D366;background:#F1FBF5;transform:translateY(-2px); }
                #ly-checkout-form input,
                #ly-checkout-form textarea {
                    color:#1B2A4A !important;
                    background-color:#FFFFFF !important;
                    -webkit-text-fill-color:#1B2A4A;
                    caret-color:#C79A8B;
                    box-sizing:border-box;
                    outline:none;
                    transition:border-color .2s, box-shadow .2s;
                }
                #ly-checkout-form input::placeholder,
                #ly-checkout-form textarea::placeholder {
                    color:#B7A89B !important;
                    -webkit-text-fill-color:#B7A89B;
                    opacity:1;
                }
                #ly-checkout-form input:focus,
                #ly-checkout-form textarea:focus {
                    border-color:#C79A8B !important;
                    box-shadow:0 0 0 3px rgba(199,154,139,0.18);
                }
                #ly-checkout-form input:-webkit-autofill {
                    -webkit-box-shadow:0 0 0 1000px #FFFFFF inset !important;
                    -webkit-text-fill-color:#1B2A4A !important;
                }
            </style>

            <!-- QRIS Payment Modal -->
            <div id="ly-qris-modal" style="position:fixed;inset:0;z-index:2100;display:none;align-items:center;justify-content:center;">
                <div style="position:absolute;inset:0;background:rgba(8,14,24,0.7);backdrop-filter:blur(6px);"></div>
                <div class="ly-rise" style="position:relative;background:#FAF7F2;width:92%;max-width:420px;border-radius:28px;padding:30px 28px 26px;box-shadow:0 30px 90px rgba(0,0,0,0.35);font-family:'Inter',sans-serif;max-height:94vh;overflow-y:auto;">
                    <button type="button" aria-label="Tutup" onclick="QrisPayment.close()" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:none;background:#EDE8E3;color:#6B5E58;cursor:pointer;font-size:0.85rem;">✕</button>
                    <div id="ly-qris-body"></div>
                </div>
            </div>

            <!-- Checkout Modal -->
            <div id="ly-checkout-modal" style="position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;">
                <div style="position:absolute;inset:0;background:rgba(8,14,24,0.65);backdrop-filter:blur(4px);" onclick="CartUI.closeCheckoutModal()"></div>
                <div style="position:relative;background:#FAF7F2;width:90%;max-width:480px;border-radius:24px;padding:32px;box-shadow:0 24px 80px rgba(0,0,0,0.25);font-family:'Inter',sans-serif;max-height:90vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                        <h3 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:1.8rem;color:#1B2A4A;font-weight:600;">Delivery Details</h3>
                        <button type="button" onclick="CartUI.closeCheckoutModal()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#9A8880;">✕</button>
                    </div>
                    <form id="ly-checkout-form" onsubmit="event.preventDefault(); CartManager.payWithQris()">
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Full Name <span style="color:#ef4444">*</span></label>
                            <input type="text" id="co-name" required style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" placeholder="e.g. Jane Doe">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Phone Number <span style="color:#ef4444">*</span></label>
                            <input type="tel" id="co-phone" required style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" placeholder="e.g. 081234567890">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Email <span style="color:#9A8880;font-weight:400;">(opsional)</span></label>
                            <input type="email" id="co-email" style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" placeholder="e.g. jane@email.com">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Provinsi <span style="color:#ef4444">*</span></label>
                            <select id="co-province" required style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" onchange="ShippingUI.loadCities()">
                                <option value="" disabled selected>Memuat provinsi...</option>
                            </select>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Kota / Kabupaten <span style="color:#ef4444">*</span></label>
                            <select id="co-city" required disabled style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" onchange="ShippingUI.loadCosts()">
                                <option value="" disabled selected>Pilih Provinsi dulu</option>
                            </select>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                            <div>
                                <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Kecamatan</label>
                                <input type="text" id="co-district" required style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" placeholder="Kecamatan">
                            </div>
                            <div>
                                <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Kode Pos <span style="color:#ef4444">*</span></label>
                                <input type="text" id="co-postal" required style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" placeholder="12345">
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Alamat Lengkap <span style="color:#ef4444">*</span></label>
                            <textarea id="co-address" required rows="2" style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;resize:vertical;" placeholder="Nama jalan, gedung, no. rumah..."></textarea>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:0.75rem;font-weight:600;color:#3B312E;margin-bottom:6px;">Kurir & Ongkir <span style="color:#ef4444">*</span></label>
                            <select id="co-shipping" required disabled style="width:100%;padding:10px 14px;border:1px solid #EDE8E3;border-radius:8px;font-family:inherit;font-size:0.9rem;color:#1B2A4A;background:#FFFFFF;" onchange="CartUI.updateCheckoutTotal()">
                                <option value="" disabled selected>Pilih kota tujuan dulu</option>
                            </select>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;margin-bottom:18px;background:#F3EEE8;border-radius:14px;">
                            <span style="font-size:0.68rem;letter-spacing:0.24em;text-transform:uppercase;color:#9A8880;font-weight:600;">Total</span>
                            <span id="ly-co-total" style="font-size:1.15rem;font-weight:700;color:#1B2A4A;">Rp 0</span>
                        </div>
                        <button type="submit" id="ly-pay-qris-btn" class="ly-btn-qris">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>
                            Bayar dengan QRIS
                        </button>
                        <button type="button" id="ly-order-wa-btn" class="ly-btn-ghost ly-btn-wa" onclick="CartManager.orderViaWhatsApp()">
                            Atau pesan via WhatsApp
                        </button>
                        <p style="margin:14px 0 0;font-size:0.66rem;color:#9A8880;text-align:center;">🔒 Pembayaran aman diproses oleh Midtrans</p>
                    </form>
                </div>
            </div>

            <!-- Cart Overlay -->
            <div id="ly-cart-overlay" style="position:fixed;inset:0;z-index:1000;background:rgba(8,14,24,0.55);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity 0.35s ease;"></div>


            <!-- Cart Drawer -->
            <aside id="ly-cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart" style="
                position:fixed;top:0;right:0;height:100dvh;width:420px;max-width:100vw;
                background:#FAF7F2;z-index:1001;
                transform:translateX(100%);
                transition:transform 0.42s cubic-bezier(0.2,0.8,0.2,1);
                display:flex;flex-direction:column;
                box-shadow:-24px 0 80px rgba(0,0,0,0.18);
                font-family:'Inter',sans-serif;
            ">
                <!-- Header -->
                <div style="padding:28px 28px 20px;border-bottom:1px solid #EDE8E3;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                    <div>
                        <p style="margin:0;font-size:0.62rem;letter-spacing:0.38em;text-transform:uppercase;color:#C79A8B;font-weight:700;">Shopping</p>
                        <h2 style="margin:3px 0 0;font-family:'Cormorant Garamond',serif;font-size:2.2rem;color:#1B2A4A;font-weight:600;line-height:1;">Cart</h2>
                    </div>
                    <button id="ly-cart-close" aria-label="Close cart" style="
                        width:42px;height:42px;border-radius:50%;background:#1B2A4A;color:#FAF7F2;
                        border:none;cursor:pointer;font-size:1rem;
                        display:flex;align-items:center;justify-content:center;
                        transition:background 0.2s,transform 0.3s;flex-shrink:0;
                    "
                        onmouseenter="this.style.background='#C79A8B';this.style.transform='rotate(90deg)'"
                        onmouseleave="this.style.background='#1B2A4A';this.style.transform='rotate(0deg)'"
                    >✕</button>
                </div>

                <!-- Items -->
                <div id="ly-cart-items" style="flex:1;overflow-y:auto;padding:16px 28px;scroll-behavior:smooth;"></div>

                <!-- Footer -->
                <div style="padding:20px 28px 28px;border-top:1px solid #EDE8E3;flex-shrink:0;background:#FAF7F2;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;">
                        <span style="font-size:0.68rem;letter-spacing:0.28em;text-transform:uppercase;color:#9A8880;font-weight:500;">Total</span>
                        <div id="ly-cart-total" style="display:flex; align-items:baseline; gap:6px; color:#1B2A4A;">
                            <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.5rem;">Rp</span>
                            <span style="font-family:'Inter',sans-serif; font-size:1.6rem; font-weight:600; letter-spacing:0.02em;">0</span>
                        </div>
                    </div>

                    <!-- Checkout Button -->
                    <button id="ly-checkout-btn" onclick="CartManager.openCheckout()" style="
                        width:100%;padding:16px 24px;
                        background:linear-gradient(135deg,#1B2A4A 0%,#3A4E78 55%,#C79A8B 130%);
                        color:#fff;border:none;border-radius:999px;
                        font-family:'Inter',sans-serif;font-size:0.72rem;font-weight:700;
                        letter-spacing:0.22em;text-transform:uppercase;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
                        box-shadow:0 8px 28px rgba(27,42,74,0.28);
                        transition:opacity 0.2s,transform 0.18s;
                    "
                        onmouseenter="this.style.opacity='0.92';this.style.transform='translateY(-2px)'"
                        onmouseleave="this.style.opacity='1';this.style.transform='translateY(0)'"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>
                        Checkout · QRIS
                    </button>

                    <!-- Clear Cart -->
                    <button onclick="CartManager.clearCart()" style="
                        width:100%;padding:10px;margin-top:10px;
                        background:transparent;color:#B7A89B;
                        border:1.5px solid #EDE8E3;border-radius:999px;
                        font-family:'Inter',sans-serif;font-size:0.68rem;font-weight:500;
                        letter-spacing:0.18em;text-transform:uppercase;
                        cursor:pointer;transition:all 0.2s;
                    "
                        onmouseenter="this.style.color='#1B2A4A';this.style.borderColor='#1B2A4A'"
                        onmouseleave="this.style.color='#B7A89B';this.style.borderColor='#EDE8E3'"
                    >Clear Cart</button>
                </div>
            </aside>
        `;
        document.body.appendChild(el);

        document.getElementById('ly-cart-overlay').addEventListener('click', () => this.closeDrawer());
        document.getElementById('ly-cart-close').addEventListener('click',   () => this.closeDrawer());
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeDrawer(); });
    },

    _bindNavIcon() {
        const btn = document.getElementById('ly-cart-btn');
        if (btn) btn.addEventListener('click', () => this.toggleDrawer());
    },

    openDrawer() {
        _drawerOpen = true;
        document.getElementById('ly-cart-drawer').style.transform = 'translateX(0)';
        const ov = document.getElementById('ly-cart-overlay');
        ov.style.opacity = '1';
        ov.style.pointerEvents = 'auto';
        document.body.style.overflow = 'hidden';
    },

    closeDrawer() {
        _drawerOpen = false;
        const d = document.getElementById('ly-cart-drawer');
        const o = document.getElementById('ly-cart-overlay');
        if (d) d.style.transform = 'translateX(100%)';
        if (o) { o.style.opacity = '0'; o.style.pointerEvents = 'none'; }
        document.body.style.overflow = '';
    },

    toggleDrawer() {
        _drawerOpen ? this.closeDrawer() : this.openDrawer();
    },

    updateCheckoutTotal() {
        const t = document.getElementById('ly-co-total');
        if (t) {
            const ship = parseInt(document.getElementById('co-shipping')?.value || '0', 10);
            t.textContent = `Rp ${(CartManager.getTotal() + ship).toLocaleString('id-ID')}`;
        }
    },

    openCheckoutModal() {
        this.closeDrawer();
        const modal = document.getElementById('ly-checkout-modal');
        if (modal) {
            this.updateCheckoutTotal();
            ShippingUI.loadProvinces();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    closeCheckoutModal() {
        const modal = document.getElementById('ly-checkout-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    updateBadge() {
        const count = CartManager.getCount();
        document.querySelectorAll('.ly-cart-badge').forEach(b => {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    },

    renderItems() {
        const el      = document.getElementById('ly-cart-items');
        const totalEl = document.getElementById('ly-cart-total');
        if (!el) return;

        const cart = CartManager.getCart();

        if (!cart.length) {
            el.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:260px;padding:40px 20px;text-align:center;">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D4C5BC" stroke-width="1.2" style="margin-bottom:20px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                    <p style="font-size:0.78rem;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;color:#9A8880;margin:0 0 8px;">Your cart is empty</p>
                    <p style="font-size:0.73rem;color:#B7A89B;margin:0;">Add some beautiful pieces!</p>
                </div>
            `;
            if (totalEl) totalEl.innerHTML = `<span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.5rem;">Rp</span><span style="font-family:'Inter',sans-serif; font-size:1.6rem; font-weight:600; letter-spacing:0.02em;">0</span>`;
            return;
        }

        el.innerHTML = cart.map(item => `
            <div style="display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid #F0EBE5;">

                <!-- Thumbnail -->
                <div style="width:70px;height:88px;flex-shrink:0;border-radius:12px;overflow:hidden;background:#EDE8E3;">
                    <img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                </div>

                <!-- Info -->
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;font-size:0.6rem;letter-spacing:0.32em;text-transform:uppercase;color:#C79A8B;font-weight:700;">LYSÉRIA</p>
                    <p style="margin:3px 0 4px;font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:#1B2A4A;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</p>
                    <div style="margin:0 0 10px; display:flex; align-items:baseline; gap:4px; color:#9A8880;">
                        <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:0.8rem;">Rp</span>
                        <span style="font-family:'Inter',sans-serif; font-size:0.75rem; font-weight:500; letter-spacing:0.02em;">${item.price.toLocaleString('id-ID')}</span>
                    </div>

                    <!-- Qty Controls -->
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button onclick="CartManager.updateQty('${item.slug}',${item.qty - 1})"
                            style="width:26px;height:26px;border-radius:50%;border:1.5px solid #EDE8E3;background:#fff;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:#1B2A4A;transition:all 0.18s;flex-shrink:0;line-height:1;"
                            onmouseenter="this.style.background='#1B2A4A';this.style.color='#fff';this.style.borderColor='#1B2A4A'"
                            onmouseleave="this.style.background='#fff';this.style.color='#1B2A4A';this.style.borderColor='#EDE8E3'">−</button>
                        <span style="font-size:0.85rem;font-weight:600;color:#1B2A4A;min-width:18px;text-align:center;">${item.qty}</span>
                        <button onclick="CartManager.updateQty('${item.slug}',${item.qty + 1})"
                            style="width:26px;height:26px;border-radius:50%;border:1.5px solid #EDE8E3;background:#fff;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:#1B2A4A;transition:all 0.18s;flex-shrink:0;line-height:1;"
                            onmouseenter="this.style.background='#1B2A4A';this.style.color='#fff';this.style.borderColor='#1B2A4A'"
                            onmouseleave="this.style.background='#fff';this.style.color='#1B2A4A';this.style.borderColor='#EDE8E3'">+</button>
                        <div style="margin-left:auto; display:flex; align-items:baseline; gap:4px; color:#1B2A4A;">
                            <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:0.9rem;">Rp</span>
                            <span style="font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:600; letter-spacing:0.02em;">${(item.price * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                <!-- Remove -->
                <button onclick="CartManager.removeItem('${item.slug}')"
                    aria-label="Remove ${item.name}"
                    style="background:none;border:none;cursor:pointer;color:#D4C5BC;font-size:0.95rem;padding:2px;flex-shrink:0;line-height:1;transition:color 0.18s;"
                    onmouseenter="this.style.color='#C79A8B'"
                    onmouseleave="this.style.color='#D4C5BC'">✕</button>

            </div>
        `).join('');

        if (totalEl) totalEl.innerHTML = `<span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.5rem;">Rp</span><span style="font-family:'Inter',sans-serif; font-size:1.6rem; font-weight:600; letter-spacing:0.02em;">${CartManager.getTotal().toLocaleString('id-ID')}</span>`;
    }
};

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => CartUI.init());
