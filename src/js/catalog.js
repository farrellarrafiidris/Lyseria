/* ════════════════════════════════════════════════════════════
   LYSÉRIA — catalog.js
   Filter by collection, sort, skeleton loading, filter count
   ════════════════════════════════════════════════════════════ */

let _allCollections = [];

// ─── Load & Bootstrap ────────────────────────────────────────
async function loadCollections() {
    try {
        const response = await fetch('./data/products.json?t=' + Date.now());
        _allCollections = await response.json();

        // Populate filter dropdown with actual collections
        const colSelect = document.getElementById('filter-collection');
        if (colSelect) {
            _allCollections.forEach(col => {
                const opt = document.createElement('option');
                opt.value = col.id;
                opt.textContent = col.name;
                colSelect.appendChild(opt);
            });
        }

        // Hide skeleton, show real content
        const skeleton = document.getElementById('skeleton-list');
        const list     = document.getElementById('collection-list');
        if (skeleton) skeleton.style.display = 'none';
        if (list)     list.classList.remove('hidden');

        renderCatalog();

        // Attach filter/sort listeners (only once after load)
        document.getElementById('filter-collection')?.addEventListener('change', renderCatalog);
        document.getElementById('filter-sort')?.addEventListener('change', renderCatalog);

    } catch (err) {
        console.error('[Lyséria catalog]', err);
        const skeleton = document.getElementById('skeleton-list');
        if (skeleton) skeleton.innerHTML = '<p style="text-align:center;padding:60px;color:#B7A89B;">Gagal memuat koleksi.</p>';
    }
}

// ─── Render with current filter & sort ───────────────────────
function renderCatalog() {
    const container = document.getElementById('collection-list');
    const noResults = document.getElementById('no-results');
    const countEl   = document.getElementById('filter-count');
    const colFilter = document.getElementById('filter-collection')?.value || '';
    const sortMode  = document.getElementById('filter-sort')?.value || 'default';
    const isDesktop = window.innerWidth >= 1024;

    if (!container) return;
    container.innerHTML = '';

    // Filter collections
    let collections = colFilter
        ? _allCollections.filter(c => String(c.id) === colFilter)
        : _allCollections;

    let totalShown = 0;

    collections.forEach(collection => {
        // Sort products within this collection
        let products = [...collection.products];
        if (sortMode === 'name-asc')   products.sort((a, b) => a.name.localeCompare(b.name));
        if (sortMode === 'name-desc')  products.sort((a, b) => b.name.localeCompare(a.name));
        if (sortMode === 'price-asc')  products.sort((a, b) => Number(a.price) - Number(b.price));
        if (sortMode === 'price-desc') products.sort((a, b) => Number(b.price) - Number(a.price));

        totalShown += products.length;

        const isScrollable = !isDesktop || products.length > 4;
        const scrollId     = `scroll-${collection.id}`;
        const cardClass    = isScrollable
            ? 'w-[260px] md:w-[280px] lg:w-[300px] flex-none'
            : 'w-full';

        let cards = '';
        products.forEach(product => {
            const isComingSoon = product.status === 'coming_soon';
            cards += `
                <div class="${cardClass} group">
                    <div class="relative overflow-hidden rounded-2xl">
                        <img
                            src="${product.images[0]}"
                            alt="${product.name}"
                            loading="lazy"
                            class="w-full aspect-3/4 object-cover object-center duration-500 group-hover:scale-105 ${isComingSoon ? 'blur-2xl select-none pointer-events-none' : ''}">

                        <!-- Label LYSÉRIA (Kanan Atas, Bawah ke Atas) -->
                        <span style="position:absolute;top:16px;right:14px;z-index:3;writing-mode:vertical-rl;transform:rotate(180deg);color:#1B2A4A;font-size:11px;font-weight:700;letter-spacing:0.35em;user-select:none;pointer-events:none;background:rgba(255,255,255,0.4);padding:6px 2px;border-radius:4px;backdrop-filter:blur(4px);">
                            LYSÉRIA
                        </span>

                        ${isComingSoon ? `
                            <div class="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
                                <span class="text-white text-xs tracking-widest uppercase px-4 py-2 rounded-full shadow-md font-medium">Coming Soon</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="mt-5">
                        ${isComingSoon
                            ? `<p class="uppercase tracking-[.25em] text-xs text-rosegold">Coming Soon</p>`
                            : `<p class="uppercase tracking-[.25em] text-xs text-rosegold">${product.category}</p>`
                        }

                        <h3 class="font-display text-3xl mt-3 text-navy uppercase">${product.name}</h3>

                        ${isComingSoon
                            ? `<p class="mt-3 font-serif text-xl text-rosegold uppercase tracking-widest">Coming Soon</p>`
                            : `<p class="mt-3 font-serif text-xl text-navy"><span>Rp</span> ${Number(product.price).toLocaleString('id-ID')}</p>`
                        }

                        ${isComingSoon
                            ? `<span class="inline-block border border-gray-300 text-gray-400 rounded-full px-6 py-2.5 mt-5 text-sm cursor-not-allowed">Coming Soon</span>`
                            : `<a href="detail.html?slug=${product.slug}" class="btn btn-outline rounded-full mt-5">View Detail</a>`
                        }
                    </div>
                </div>`;
        });

        container.innerHTML += `
            <section class="mb-28">
                <div class="flex justify-between items-end mb-8">
                    <div>
                        <p class="uppercase tracking-[.3em] text-xs text-rosegold">${collection.year}</p>
                        <h2 class="font-display text-5xl mt-3">${collection.name}</h2>
                        <p class="text-gray-500 mt-3 max-w-xl">${collection.description}</p>
                    </div>

                    ${isScrollable && isDesktop ? `
                    <div class="flex gap-3">
                        <button onclick="document.getElementById('${scrollId}').scrollBy({left:-340,behavior:'smooth'})"
                            class="w-12 h-12 rounded-full border border-gray-300 hover:bg-navy hover:text-white duration-300">←</button>
                        <button onclick="document.getElementById('${scrollId}').scrollBy({left:340,behavior:'smooth'})"
                            class="w-12 h-12 rounded-full border border-gray-300 hover:bg-navy hover:text-white duration-300">→</button>
                    </div>
                    ` : ''}
                </div>

                <div class="bg-[#FCFAF8] rounded-[36px] border border-[#F2ECE6] shadow-sm p-8">
                    <div id="${scrollId}" class="${isScrollable ? 'overflow-x-auto scrollbar-hide scroll-smooth' : ''}">
                        <div class="${isScrollable ? 'flex gap-6 lg:gap-8 w-max' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'}">
                            ${cards}
                        </div>
                    </div>
                </div>
            </section>`;
    });

    // Show/hide no-results state
    const empty = totalShown === 0;
    if (noResults) noResults.classList.toggle('hidden', !empty);

    // Update product count label
    if (countEl) {
        countEl.textContent = empty ? '' : `${totalShown} product${totalShown !== 1 ? 's' : ''}`;
    }
}

// ─── Boot ────────────────────────────────────────────────────
loadCollections();

window.addEventListener('resize', () => {
    clearTimeout(window._resizeTimer);
    window._resizeTimer = setTimeout(renderCatalog, 200);
});