/* ═══════════════════════════════════════════════════════════════
   LYSÉRIA — Admin JavaScript
   Auth guard, REST API data layer, CRUD handlers, UI logic
   Data disimpan langsung ke data/products.json via server.js
   ═══════════════════════════════════════════════════════════════ */

// ─── Constants ───────────────────────────────────────────────────
const API_URL     = '/api/products';   // endpoint di server.js
const SESSION_KEY = 'lyseria_admin';

// Prevent overlay close immediately after opening (click-through guard)
let _modalJustOpened = false;

// ─── Auth Guard (runs on dashboard only) ─────────────────────────
function requireAuth() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
        window.location.href = '/studio';
        return false;
    }
    return true;
}

// ─── Data Layer — baca/tulis via REST API ───────────────────────────
async function getCollections() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[Lyséria] Gagal membaca data:', e);
        showToast('Gagal memuat data. Pastikan server.js berjalan.', 'error');
        return [];
    }
}

async function saveCollections(collections) {
    try {
        const res = await fetch(API_URL, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(collections, null, 2),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return true;
    } catch (e) {
        console.error('[Lyséria] Gagal menyimpan data:', e);
        showToast(`Gagal menyimpan: ${e.message}`, 'error');
        return false;
    }
}

// ─── Helpers ─────────────────────────────────────────────────────
function flatProducts(collections) {
    return collections.flatMap(col =>
        col.products.map(p => ({ ...p, _collectionId: col.id, _collectionName: col.name }))
    );
}

function nextId(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

function formatPrice(val) {
    return Number(val).toLocaleString('id-ID');
}

// ─── Drag-and-Drop Reorder (Generic) ─────────────────────────────
/**
 * Attach HTML5 drag-and-drop + ↑↓ button logic to a <tbody>.
 * @param {HTMLElement} tbody
 * @param {(fromIdx: number, toIdx: number) => void} onReorder  called after every move
 */
function initReorder(tbody, onReorder) {
    let dragSrc = null;

    function getRows() { return Array.from(tbody.querySelectorAll('tr')); }

    function clearHighlights() {
        getRows().forEach(r => r.classList.remove('row-drag-over'));
    }

    tbody.addEventListener('dragstart', e => {
        const row = e.target.closest('tr');
        if (!row) return;
        dragSrc = row;
        // slight delay so browser screenshot is taken before we fade it
        requestAnimationFrame(() => row.classList.add('row-dragging'));
        e.dataTransfer.effectAllowed = 'move';
    });

    tbody.addEventListener('dragend', () => {
        if (dragSrc) dragSrc.classList.remove('row-dragging');
        dragSrc = null;
        clearHighlights();
    });

    tbody.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        clearHighlights();
        const row = e.target.closest('tr');
        if (row && row !== dragSrc) row.classList.add('row-drag-over');
    });

    tbody.addEventListener('dragleave', e => {
        if (!tbody.contains(e.relatedTarget)) clearHighlights();
    });

    tbody.addEventListener('drop', e => {
        e.preventDefault();
        clearHighlights();
        const targetRow = e.target.closest('tr');
        if (!targetRow || targetRow === dragSrc || !dragSrc) return;

        const rows = getRows();
        const fromIdx = rows.indexOf(dragSrc);
        const toIdx   = rows.indexOf(targetRow);
        if (fromIdx === -1 || toIdx === -1) return;

        // DOM move
        if (fromIdx < toIdx) {
            tbody.insertBefore(dragSrc, targetRow.nextSibling);
        } else {
            tbody.insertBefore(dragSrc, targetRow);
        }

        onReorder(fromIdx, toIdx);
    });
}

// ─── Save Order Helpers ───────────────────────────────────────────
async function saveProductOrder(collectionId, fromIdx, toIdx) {
    const collections = JSON.parse(JSON.stringify(_collectionsCache));
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;

    const [moved] = col.products.splice(fromIdx, 1);
    col.products.splice(toIdx, 0, moved);

    const ok = await saveCollections(collections);
    if (ok) {
        showToast('Urutan produk disimpan.');
        _collectionsCache = collections;
        renderProducts(getCurrentFilter());
    }
}

async function saveCollectionOrder(fromIdx, toIdx) {
    const collections = JSON.parse(JSON.stringify(_collectionsCache));
    const [moved] = collections.splice(fromIdx, 1);
    collections.splice(toIdx, 0, moved);

    const ok = await saveCollections(collections);
    if (ok) {
        showToast('Urutan koleksi disimpan.');
        _collectionsCache = collections;
        renderCollections();
        populateFilters();
    }
}

function statusBadge(status) {
    if (status === 'released') return `<span class="badge badge-released">Released</span>`;
    return `<span class="badge badge-coming">Coming Soon</span>`;
}

// ─── Toast ───────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = '';

    // Icon
    const iconPath = type === 'error'
        ? 'M6 18L18 6M6 6l12 12'
        : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';

    toast.innerHTML = `
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}"/>
        </svg>
        <span>${msg}</span>`;

    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ─── Confirm Modal ───────────────────────────────────────────────
function confirmModal(title, sub) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-sub').textContent = sub;
        modal.classList.remove('hidden');
        _modalJustOpened = true;
        requestAnimationFrame(() => requestAnimationFrame(() => { _modalJustOpened = false; }));

        const cleanup = (result) => {
            modal.classList.add('hidden');
            const ok     = document.getElementById('confirm-ok');
            const cancel = document.getElementById('confirm-cancel');
            ok.replaceWith(ok.cloneNode(true));
            cancel.replaceWith(cancel.cloneNode(true));
            resolve(result);
        };

        document.getElementById('confirm-ok').addEventListener('click',     () => cleanup(true),  { once: true });
        document.getElementById('confirm-cancel').addEventListener('click',  () => cleanup(false), { once: true });
        modal.addEventListener('click', e => { if (e.target === modal) cleanup(false); }, { once: true });
    });
}

// ─── Section Switcher ────────────────────────────────────────────
function switchSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    document.getElementById(`section-${name}`)?.classList.add('active');
    document.getElementById(`nav-${name}`)?.classList.add('active');

    const titles = { overview: 'Overview', products: 'Products', collections: 'Collections' };
    const subs   = { overview: 'Selamat datang, Admin', products: 'Kelola katalog produk', collections: 'Kelola seri koleksi' };
    document.getElementById('page-title').textContent = titles[name] || name;
    document.getElementById('page-sub').textContent   = subs[name]   || '';
}

// ─── Overview ────────────────────────────────────────────────────
function renderOverview(collections) {
    const all = flatProducts(collections);
    document.getElementById('stat-total').textContent       = all.length;
    document.getElementById('stat-collections').textContent = collections.length;
    document.getElementById('stat-released').textContent    = all.filter(p => p.status === 'released').length;
    document.getElementById('stat-coming').textContent      = all.filter(p => p.status === 'coming_soon').length;

    const tbody  = document.getElementById('overview-table-body');
    const recent = all.slice(-5).reverse();

    if (!recent.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Belum ada produk.</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    ${p.images?.[0]
                        ? `<img src="${p.images[0]}" class="table-product-img" alt="${p.name}" onerror="this.style.display='none'">`
                        : `<div class="table-product-img-placeholder">No img</div>`}
                    <strong>${p.name}</strong>
                </div>
            </td>
            <td>${p._collectionName}</td>
            <td>${p.category || '—'}</td>
            <td>Rp ${formatPrice(p.price)}</td>
            <td>${statusBadge(p.status)}</td>
        </tr>
    `).join('');
}

// ─── Products Table ──────────────────────────────────────────────
let _collectionsCache = [];

/**
 * Render products table.
 * When NO filter is active, drag-and-drop reorder is enabled per-collection.
 * When a filter/search is active, drag handles are hidden (urutan tidak bisa
 * di-reorder karena list tidak merepresentasikan urutan asli di JSON).
 */
function renderProducts(filter = {}) {
    const tbody = document.getElementById('products-table-body');

    // Determine if any filter is active (disables reorder)
    // Reorder dinonaktifkan hanya kalau ada search atau status filter aktif
    // (karena urutan list tidak lagi merepresentasikan urutan asli di JSON).
    // Filter by collection saja TETAP mengaktifkan reorder — produk yang tampil
    // masih berurutan sesuai posisi aslinya dalam collection tersebut.
    const isFiltered = !!(filter.search || filter.status);

    // Build flat list, but keep track of per-collection index
    // (index dalam koleksinya masing-masing, bukan index global)
    let products = [];
    _collectionsCache.forEach(col => {
        col.products.forEach((p, idx) => {
            products.push({
                ...p,
                _collectionId:   col.id,
                _collectionName: col.name,
                _colIdx:         idx,              // index dalam koleksinya
                _colTotal:       col.products.length,
            });
        });
    });

    if (filter.search) {
        const q = filter.search.toLowerCase();
        products = products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            p._collectionName.toLowerCase().includes(q) ||
            (p.slug || '').toLowerCase().includes(q)
        );
    }
    if (filter.status)     products = products.filter(p => p.status === filter.status);
    if (filter.collection) products = products.filter(p => String(p._collectionId) === filter.collection);

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="8">
            <div class="empty-state">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p>Tidak ada produk ditemukan.</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = products.map((p, rowIdx) => {
        const isFirst = p._colIdx === 0;
        const isLast  = p._colIdx === p._colTotal - 1;

        const orderCell = isFiltered
            ? `<td class="td-order"><span class="drag-order-num" style="opacity:.35">${p._colIdx + 1}</span></td>`
            : `<td class="td-order" draggable="false">
                <div class="drag-handle"
                     draggable="true"
                     data-col-id="${p._collectionId}"
                     data-col-idx="${p._colIdx}"
                     title="Drag untuk reorder">
                    <span class="drag-grip-icon">⠿</span>
                    <span class="drag-order-num">${p._colIdx + 1}</span>
                </div>
                <div class="order-btns">
                    <button class="btn-order" title="Naikan"
                            ${isFirst ? 'disabled' : ''}
                            onclick="moveProduct(${p._collectionId}, ${p._colIdx}, -1)">
                        ▲
                    </button>
                    <button class="btn-order" title="Turunkan"
                            ${isLast ? 'disabled' : ''}
                            onclick="moveProduct(${p._collectionId}, ${p._colIdx}, 1)">
                        ▼
                    </button>
                </div>
               </td>`;

        return `
        <tr data-col-id="${p._collectionId}" data-col-idx="${p._colIdx}">
            ${orderCell}
            <td>
                ${p.images?.[0]
                    ? `<img src="${p.images[0]}" class="table-product-img" alt="${p.name}"
                           onerror="this.outerHTML='<div class=\\'table-product-img-placeholder\\'>No img</div>'">`
                    : `<div class="table-product-img-placeholder">No img</div>`}
            </td>
            <td>
                <strong>${p.name}</strong><br>
                <span style="color:#9ca3af;font-size:.72rem;">${p.slug || ''}</span>
            </td>
            <td>${p._collectionName}</td>
            <td>${p.category || '—'}</td>
            <td>Rp ${formatPrice(p.price)}</td>
            <td>${statusBadge(p.status)}</td>
            <td>
                <div class="action-btns">
                    ${p.slug ? `
                    <a class="btn-icon" style="background:#f0fdf4;color:#16a34a;text-decoration:none;"
                        href="/detail.html?slug=${p.slug}" target="_blank" title="Preview di situs">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Preview
                    </a>` : ''}
                    <button class="btn-icon btn-edit"
                        onclick="openProductModal(${p._collectionId}, ${p.id})" title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-icon btn-delete"
                        onclick="deleteProduct(${p._collectionId}, ${p.id})" title="Hapus">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Hapus
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Attach drag-and-drop per collection block (only when not filtered)
    if (!isFiltered) {
        // Group rows by collectionId so we only reorder within same collection
        const colIds = [...new Set(products.map(p => p._collectionId))];
        colIds.forEach(colId => {
            const rows = Array.from(tbody.querySelectorAll(`tr[data-col-id="${colId}"]`));
            if (rows.length < 2) return;

            let dragSrc = null;

            rows.forEach(row => {
                const handle = row.querySelector('.drag-handle');
                if (!handle) return;

                handle.addEventListener('dragstart', e => {
                    dragSrc = row;
                    e.dataTransfer.effectAllowed = 'move';
                    requestAnimationFrame(() => row.classList.add('row-dragging'));
                });

                handle.addEventListener('dragend', () => {
                    if (dragSrc) dragSrc.classList.remove('row-dragging');
                    dragSrc = null;
                    rows.forEach(r => r.classList.remove('row-drag-over'));
                });

                row.addEventListener('dragover', e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    rows.forEach(r => r.classList.remove('row-drag-over'));
                    if (row !== dragSrc) row.classList.add('row-drag-over');
                });

                row.addEventListener('drop', e => {
                    e.preventDefault();
                    rows.forEach(r => r.classList.remove('row-drag-over'));
                    if (!dragSrc || row === dragSrc) return;

                    const fromIdx = parseInt(dragSrc.dataset.colIdx);
                    const toIdx   = parseInt(row.dataset.colIdx);
                    saveProductOrder(colId, fromIdx, toIdx);
                });
            });
        });
    }
}

// Move product by ±1 via ↑↓ button
async function moveProduct(colId, fromIdx, direction) {
    const toIdx = fromIdx + direction;
    const col   = _collectionsCache.find(c => c.id === colId);
    if (!col || toIdx < 0 || toIdx >= col.products.length) return;
    await saveProductOrder(colId, fromIdx, toIdx);
}

// ─── Product Modal ───────────────────────────────────────────────
function openProductModal(collectionId = null, productId = null) {
    const modal = document.getElementById('product-modal');
    const form  = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const err   = document.getElementById('product-form-error');

    form.reset();
    err.classList.add('hidden');
    document.getElementById('pf-image-model-preview-wrap').classList.add('hidden');
    document.getElementById('pf-image-full-preview-wrap').classList.add('hidden');
    document.getElementById('pf-id').value            = '';
    document.getElementById('pf-collection-id').value = '';

    // Isi dropdown koleksi
    const colSel = document.getElementById('pf-collection');
    colSel.innerHTML = _collectionsCache.map(c =>
        `<option value="${c.id}">${c.name}</option>`
    ).join('');

    if (productId !== null) {
        // Mode Edit
        title.textContent = 'Edit Produk';
        const col     = _collectionsCache.find(c => c.id === collectionId);
        const product = col?.products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('pf-id').value            = productId;
        document.getElementById('pf-collection-id').value = collectionId;
        document.getElementById('pf-name').value          = product.name || '';
        document.getElementById('pf-slug').value          = product.slug || '';
        document.getElementById('pf-price').value         = product.price || '';
        document.getElementById('pf-status').value        = product.status || 'released';
        document.getElementById('pf-category').value      = product.category || '';
        document.getElementById('pf-material').value      = product.material || '';
        document.getElementById('pf-size').value          = product.size || '';
        document.getElementById('pf-image-model').value   = product.images?.[0] || '';
        document.getElementById('pf-image-full').value    = product.images?.[1] || product.images?.[0] || '';
        document.getElementById('pf-desc-label').value    = product.description?.label || '';
        document.getElementById('pf-desc-quote').value    = product.description?.quote || '';
        document.getElementById('pf-desc-content').value  = product.description?.content || '';
        
        document.getElementById('pf-cg-palette').value    = product.colorGuide?.palette?.join(', ') || '';
        document.getElementById('pf-cg-hex').value        = product.colorGuide?.paletteHex?.join(', ') || '';
        document.getElementById('pf-cg-warm').value       = product.colorGuide?.undertoneRating?.warm || '';
        document.getElementById('pf-cg-cool').value       = product.colorGuide?.undertoneRating?.cool || '';
        document.getElementById('pf-cg-neutral').value    = product.colorGuide?.undertoneRating?.neutral || '';
        document.getElementById('pf-cg-tip').value        = product.colorGuide?.tip || '';
        
        colSel.value = collectionId;

        // Preview gambar
        if (product.images?.[0]) {
            document.getElementById('pf-image-model-preview').src = product.images[0];
            document.getElementById('pf-image-model-preview-wrap').classList.remove('hidden');
        }
        if (product.images?.[1] || product.images?.[0]) {
            document.getElementById('pf-image-full-preview').src = product.images?.[1] || product.images?.[0];
            document.getElementById('pf-image-full-preview-wrap').classList.remove('hidden');
        }
    } else {
        title.textContent = 'Tambah Produk';
        if (collectionId) colSel.value = collectionId;
    }

    modal.classList.remove('hidden');
    _modalJustOpened = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { _modalJustOpened = false; }));
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

// Preview gambar saat URL diketik
function initImagePreview() {
    ['model', 'full'].forEach(type => {
        const imageInput = document.getElementById(`pf-image-${type}`);
        if (!imageInput) return;
        imageInput.addEventListener('input', () => {
            const url     = imageInput.value.trim();
            const preview = document.getElementById(`pf-image-${type}-preview`);
            const wrap    = document.getElementById(`pf-image-${type}-preview-wrap`);
            if (url) {
                preview.src = url;
                wrap.classList.remove('hidden');
                preview.onerror = () => wrap.classList.add('hidden');
                preview.onload  = () => wrap.classList.remove('hidden');
            } else {
                wrap.classList.add('hidden');
            }
        });
    });
}

// Auto-generate slug dari nama produk
function initSlugGenerate() {
    const nameInput = document.getElementById('pf-name');
    const slugInput = document.getElementById('pf-slug');
    if (!nameInput || !slugInput) return;

    nameInput.addEventListener('input', () => {
        // Hanya auto-generate kalau slug masih kosong atau belum diubah manual
        if (!slugInput.dataset.manual) {
            slugInput.value = nameInput.value
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-');
        }
    });
    slugInput.addEventListener('input', () => {
        slugInput.dataset.manual = '1';
    });
}

async function handleProductSave(e) {
    e.preventDefault();
    const err    = document.getElementById('product-form-error');
    const btn    = document.getElementById('product-form-submit');
    err.classList.add('hidden');

    const name        = document.getElementById('pf-name').value.trim();
    const slug        = document.getElementById('pf-slug').value.trim();
    const price       = document.getElementById('pf-price').value.trim();
    const status      = document.getElementById('pf-status').value;
    const category    = document.getElementById('pf-category').value.trim();
    const material    = document.getElementById('pf-material').value.trim();
    const size        = document.getElementById('pf-size').value.trim();
    const colId       = parseInt(document.getElementById('pf-collection').value);
    const imageModel  = document.getElementById('pf-image-model').value.trim();
    const imageFull   = document.getElementById('pf-image-full').value.trim();
    const descLabel   = document.getElementById('pf-desc-label').value.trim();
    const descQuote   = document.getElementById('pf-desc-quote').value.trim();
    const descContent = document.getElementById('pf-desc-content').value.trim();

    const cgPalette   = document.getElementById('pf-cg-palette').value.trim();
    const cgHex       = document.getElementById('pf-cg-hex').value.trim();
    const cgWarm      = document.getElementById('pf-cg-warm').value.trim();
    const cgCool      = document.getElementById('pf-cg-cool').value.trim();
    const cgNeutral   = document.getElementById('pf-cg-neutral').value.trim();
    const cgTip       = document.getElementById('pf-cg-tip').value.trim();

    // Validasi
    if (!name || !slug || !price || !category || !colId) {
        err.textContent = 'Nama, slug, harga, kategori, dan koleksi wajib diisi.';
        err.classList.remove('hidden');
        return;
    }

    const productData = {
        name, slug, price, status, category, material, size,
        images: [imageModel, imageFull].filter(Boolean),
        description: { label: descLabel, quote: descQuote, content: descContent }
    };

    if (cgPalette || cgHex || cgTip) {
        productData.colorGuide = {
            palette: cgPalette ? cgPalette.split(',').map(s => s.trim()) : [],
            paletteHex: cgHex ? cgHex.split(',').map(s => s.trim()) : [],
            undertoneRating: {
                warm: cgWarm ? parseInt(cgWarm) : 0,
                cool: cgCool ? parseInt(cgCool) : 0,
                neutral: cgNeutral ? parseInt(cgNeutral) : 0
            },
            tip: cgTip
        };
    }

    const collections = JSON.parse(JSON.stringify(_collectionsCache)); // deep copy
    const editId      = document.getElementById('pf-id').value;
    const editColId   = parseInt(document.getElementById('pf-collection-id').value);

    if (editId) {
        // UPDATE
        const oldCol = collections.find(c => c.id === editColId);
        if (oldCol) {
            const idx = oldCol.products.findIndex(p => p.id === parseInt(editId));
            if (editColId !== colId) {
                // Pindah koleksi
                oldCol.products.splice(idx, 1);
                const newCol = collections.find(c => c.id === colId);
                if (newCol) newCol.products.push({ ...productData, id: parseInt(editId) });
            } else {
                oldCol.products[idx] = { ...oldCol.products[idx], ...productData };
            }
        }
    } else {
        // CREATE
        const col = collections.find(c => c.id === colId);
        if (!col) { err.textContent = 'Koleksi tidak ditemukan.'; err.classList.remove('hidden'); return; }
        const newId = nextId(flatProducts(collections));
        col.products.push({ id: newId, ...productData });
    }

    // Simpan ke server (tulis ke products.json)
    btn.disabled    = true;
    btn.textContent = 'Menyimpan…';
    const ok = await saveCollections(collections);
    btn.disabled    = false;
    btn.textContent = 'Simpan Produk';

    if (!ok) return; // error sudah ditampilkan oleh saveCollections

    showToast(editId ? `"${name}" berhasil diperbarui.` : `"${name}" berhasil ditambahkan.`);
    await refreshAll();
    closeProductModal();
}

async function deleteProduct(collectionId, productId) {
    const col     = _collectionsCache.find(c => c.id === collectionId);
    const product = col?.products.find(p => p.id === productId);
    if (!product) return;

    const confirmed = await confirmModal(
        `Hapus "${product.name}"?`,
        'Produk ini akan dihapus permanen dari katalog.'
    );
    if (!confirmed) return;

    const collections = JSON.parse(JSON.stringify(_collectionsCache));
    const targetCol   = collections.find(c => c.id === collectionId);
    targetCol.products = targetCol.products.filter(p => p.id !== productId);

    const ok = await saveCollections(collections);
    if (!ok) return;

    showToast(`"${product.name}" dihapus.`, 'error');
    await refreshAll();
}

// ─── Collections Table ───────────────────────────────────────────
function renderCollections() {
    const tbody = document.getElementById('collections-table-body');
    const cols  = _collectionsCache;

    if (!cols.length) {
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="empty-state">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <p>Belum ada koleksi.</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = cols.map((col, idx) => `
        <tr data-col-order-idx="${idx}">
            <td class="td-order">
                <div class="drag-handle" draggable="true" data-order-idx="${idx}" title="Drag untuk reorder">
                    <span class="drag-grip-icon">⠿</span>
                    <span class="drag-order-num">${idx + 1}</span>
                </div>
                <div class="order-btns">
                    <button class="btn-order" title="Naikan"
                            ${idx === 0 ? 'disabled' : ''}
                            onclick="moveCollection(${idx}, -1)">▲</button>
                    <button class="btn-order" title="Turunkan"
                            ${idx === cols.length - 1 ? 'disabled' : ''}
                            onclick="moveCollection(${idx}, 1)">▼</button>
                </div>
            </td>
            <td><strong>${col.name}</strong></td>
            <td>${col.year}</td>
            <td style="max-width:280px;white-space:normal;">${col.description || '—'}</td>
            <td>
                <span style="font-weight:600;">${col.products.length}</span>
                ${col.products.length > 0 ? `<span style="color:#9ca3af;font-size:.72rem;margin-left:6px;">
                    (${col.products.filter(p => p.status === 'released').length} rilis)
                </span>` : ''}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="openCollectionModal(${col.id})" title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteCollection(${col.id})" title="Hapus">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Hapus
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach drag-and-drop for collections
    if (cols.length > 1) {
        const rows = Array.from(tbody.querySelectorAll('tr[data-col-order-idx]'));
        let dragSrc = null;

        rows.forEach(row => {
            const handle = row.querySelector('.drag-handle');
            if (!handle) return;

            handle.addEventListener('dragstart', e => {
                dragSrc = row;
                e.dataTransfer.effectAllowed = 'move';
                requestAnimationFrame(() => row.classList.add('row-dragging'));
            });

            handle.addEventListener('dragend', () => {
                if (dragSrc) dragSrc.classList.remove('row-dragging');
                dragSrc = null;
                rows.forEach(r => r.classList.remove('row-drag-over'));
            });

            row.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                rows.forEach(r => r.classList.remove('row-drag-over'));
                if (row !== dragSrc) row.classList.add('row-drag-over');
            });

            row.addEventListener('drop', e => {
                e.preventDefault();
                rows.forEach(r => r.classList.remove('row-drag-over'));
                if (!dragSrc || row === dragSrc) return;

                const fromIdx = parseInt(dragSrc.dataset.colOrderIdx);
                const toIdx   = parseInt(row.dataset.colOrderIdx);
                saveCollectionOrder(fromIdx, toIdx);
            });
        });
    }
}

// Move collection by ±1 via ↑↓ button
async function moveCollection(fromIdx, direction) {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= _collectionsCache.length) return;
    await saveCollectionOrder(fromIdx, toIdx);
}

// ─── Collection Modal ────────────────────────────────────────────
function openCollectionModal(collectionId = null) {
    const modal = document.getElementById('collection-modal');
    const form  = document.getElementById('collection-form');
    const title = document.getElementById('collection-modal-title');
    const err   = document.getElementById('collection-form-error');

    form.reset();
    err.classList.add('hidden');
    document.getElementById('cf-id').value = '';

    if (collectionId !== null) {
        title.textContent = 'Edit Koleksi';
        const col = _collectionsCache.find(c => c.id === collectionId);
        if (!col) return;
        document.getElementById('cf-id').value   = collectionId;
        document.getElementById('cf-name').value = col.name        || '';
        document.getElementById('cf-year').value = col.year        || '';
        document.getElementById('cf-desc').value = col.description || '';
    } else {
        title.textContent = 'Tambah Koleksi';
    }

    modal.classList.remove('hidden');
    _modalJustOpened = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { _modalJustOpened = false; }));
}

function closeCollectionModal() {
    document.getElementById('collection-modal').classList.add('hidden');
}

async function handleCollectionSave(e) {
    e.preventDefault();
    const err = document.getElementById('collection-form-error');
    const btn = document.getElementById('collection-form-submit');
    err.classList.add('hidden');

    const name = document.getElementById('cf-name').value.trim();
    const year = parseInt(document.getElementById('cf-year').value);
    const desc = document.getElementById('cf-desc').value.trim();

    if (!name || !year) {
        err.textContent = 'Nama dan tahun koleksi wajib diisi.';
        err.classList.remove('hidden');
        return;
    }

    const collections = JSON.parse(JSON.stringify(_collectionsCache));
    const editId      = document.getElementById('cf-id').value;

    if (editId) {
        const col = collections.find(c => c.id === parseInt(editId));
        if (col) { col.name = name; col.year = year; col.description = desc; }
    } else {
        const newId = nextId(collections);
        collections.push({ id: newId, name, year, description: desc, products: [] });
    }

    btn.disabled    = true;
    btn.textContent = 'Menyimpan…';
    const ok = await saveCollections(collections);
    btn.disabled    = false;
    btn.textContent = 'Simpan Koleksi';

    if (!ok) return;

    showToast(editId ? `Koleksi "${name}" diperbarui.` : `Koleksi "${name}" dibuat.`);
    await refreshAll();
    closeCollectionModal();
}

async function deleteCollection(collectionId) {
    const col = _collectionsCache.find(c => c.id === collectionId);
    if (!col) return;

    const confirmed = await confirmModal(
        `Hapus koleksi "${col.name}"?`,
        `Semua ${col.products.length} produk dalam koleksi ini juga akan dihapus. Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    const collections = _collectionsCache.filter(c => c.id !== collectionId);
    const ok = await saveCollections(collections);
    if (!ok) return;

    showToast(`Koleksi "${col.name}" dihapus.`, 'error');
    await refreshAll();
}

// ─── Filter Dropdowns ────────────────────────────────────────────
function populateFilters() {
    const colFilter = document.getElementById('product-filter-collection');
    if (!colFilter) return;
    const current = colFilter.value;
    colFilter.innerHTML = '<option value="">Semua Koleksi</option>' +
        _collectionsCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    colFilter.value = current;
}

// ─── Export JSON ─────────────────────────────────────────────────
function exportJSON() {
    const data = JSON.stringify(_collectionsCache, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `lyseria-products-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data diekspor sebagai JSON.');
}

// ─── Refresh All Views ───────────────────────────────────────────
async function refreshAll() {
    _collectionsCache = await getCollections();
    populateFilters();
    renderOverview(_collectionsCache);
    renderProducts(getCurrentFilter());
    renderCollections();
}

function getCurrentFilter() {
    return {
        search:     document.getElementById('product-search')?.value           || '',
        status:     document.getElementById('product-filter-status')?.value    || '',
        collection: document.getElementById('product-filter-collection')?.value || '',
    };
}

// ─── Init (Dashboard) ─────────────────────────────────────────────
async function initDashboard() {
    if (!requireAuth()) return;

    await refreshAll();

    initImagePreview();
    initSlugGenerate();

    // Sidebar nav
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchSection(link.dataset.section);
        });
    });

    // Sidebar toggle (mobile)
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    document.addEventListener('click', e => {
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (sidebar && !sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = '/studio';
    });

    // Export
    document.getElementById('export-btn')?.addEventListener('click', exportJSON);

    // ── Product CRUD Events ──
    document.getElementById('add-product-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductModal();
    });
    document.getElementById('product-modal-close')?.addEventListener('click', closeProductModal);
    document.getElementById('product-form-cancel')?.addEventListener('click', closeProductModal);
    document.getElementById('product-form')?.addEventListener('submit', handleProductSave);
    document.getElementById('product-modal')?.addEventListener('click', e => {
        if (_modalJustOpened) return;                          // guard: ignore same-tick click
        if (e.target === e.currentTarget) closeProductModal(); // only close when clicking backdrop
    });

    // ── Collection CRUD Events ──
    document.getElementById('add-collection-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCollectionModal();
    });
    document.getElementById('collection-modal-close')?.addEventListener('click', closeCollectionModal);
    document.getElementById('collection-form-cancel')?.addEventListener('click', closeCollectionModal);
    document.getElementById('collection-form')?.addEventListener('submit', handleCollectionSave);
    document.getElementById('collection-modal')?.addEventListener('click', e => {
        if (_modalJustOpened) return;
        if (e.target === e.currentTarget) closeCollectionModal();
    });

    // Stop propagation inside modal boxes so clicks inside don’t close the overlay
    document.querySelectorAll('.adm-modal-box').forEach(box => {
        box.addEventListener('click', e => e.stopPropagation());
    });

    // ── Filters / Search ──
    let searchTimer;
    document.getElementById('product-search')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderProducts(getCurrentFilter()), 200);
    });
    document.getElementById('product-filter-status')?.addEventListener('change', () => renderProducts(getCurrentFilter()));
    document.getElementById('product-filter-collection')?.addEventListener('change', () => renderProducts(getCurrentFilter()));
}

// ─── Boot// ─── Boot ────────────────────────────────────────────────
if (document.getElementById('section-overview')) {
    // Pastikan initDashboard jalan meskipun DOMContentLoaded sudah fire
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
}
