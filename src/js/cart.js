/* ════════════════════════════════════════════════════════════
   LYSÉRIA — cart.js
   Shopping Cart · localStorage · WhatsApp Checkout · Toast
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

    checkoutWhatsApp() {
        const cart = this.getCart();
        if (!cart.length) { showToast('Cart kosong!', 'info'); return; }

        const lines = cart
            .map(i => `• ${i.name} x${i.qty}  —  Rp ${(i.price * i.qty).toLocaleString('id-ID')}`)
            .join('\n');

        const total = `Rp ${this.getTotal().toLocaleString('id-ID')}`;

        const msg =
            `Halo LYSÉRIA 🌸\n\nSaya ingin memesan:\n\n${lines}` +
            `\n\n*Total: ${total}*\n\nMohon konfirmasi ketersediaan ya, terima kasih! 🙏`;

        window.open(`https://wa.me/${this.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
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
                        <span id="ly-cart-total" style="font-family:'Cormorant Garamond',serif;font-size:1.9rem;color:#1B2A4A;font-weight:600;line-height:1;">Rp 0</span>
                    </div>

                    <!-- WhatsApp Checkout Button -->
                    <button id="ly-checkout-btn" onclick="CartManager.checkoutWhatsApp()" style="
                        width:100%;padding:16px 24px;
                        background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);
                        color:#fff;border:none;border-radius:999px;
                        font-family:'Inter',sans-serif;font-size:0.72rem;font-weight:700;
                        letter-spacing:0.22em;text-transform:uppercase;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
                        box-shadow:0 8px 28px rgba(37,211,102,0.28);
                        transition:opacity 0.2s,transform 0.18s;
                    "
                        onmouseenter="this.style.opacity='0.9';this.style.transform='translateY(-2px)'"
                        onmouseleave="this.style.opacity='1';this.style.transform='translateY(0)'"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Checkout via WhatsApp
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
            if (totalEl) totalEl.textContent = 'Rp 0';
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
                    <p style="margin:0 0 10px;font-size:0.74rem;color:#9A8880;">Rp ${item.price.toLocaleString('id-ID')}</p>

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
                        <span style="margin-left:auto;font-size:0.82rem;font-weight:700;color:#1B2A4A;">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span>
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

        if (totalEl) totalEl.textContent = `Rp ${CartManager.getTotal().toLocaleString('id-ID')}`;
    }
};

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => CartUI.init());
