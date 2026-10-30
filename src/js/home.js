async function loadProducts() {
    try {
        // Tampilkan skeleton dulu
        const container = document.getElementById('product-list');
        if (container) {
            container.innerHTML = [1, 2, 3].map(() => `
                <div>
                    <div style="border-radius:24px;overflow:hidden;background:linear-gradient(90deg,#ede8e3 25%,#f5f0eb 50%,#ede8e3 75%);background-size:600px 100%;animation:shimmer 1.4s infinite linear;aspect-ratio:3/4;"></div>
                    <div style="margin-top:20px;">
                        <div style="height:10px;width:80px;border-radius:6px;background:linear-gradient(90deg,#ede8e3 25%,#f5f0eb 50%,#ede8e3 75%);background-size:600px 100%;animation:shimmer 1.4s infinite linear;margin-bottom:10px;"></div>
                        <div style="height:28px;width:160px;border-radius:6px;background:linear-gradient(90deg,#ede8e3 25%,#f5f0eb 50%,#ede8e3 75%);background-size:600px 100%;animation:shimmer 1.4s infinite linear;margin-bottom:10px;"></div>
                        <div style="height:14px;width:100px;border-radius:6px;background:linear-gradient(90deg,#ede8e3 25%,#f5f0eb 50%,#ede8e3 75%);background-size:600px 100%;animation:shimmer 1.4s infinite linear;"></div>
                    </div>
                </div>
            `).join('');
        }

        // Baca langsung dari products.json (diupdate oleh server.js)
        const response = await fetch('./data/products.json?t=' + Date.now());
        const collections = await response.json();

        // Populate About Carousel with fade logic
        const aboutCarousel = document.getElementById('about-carousel');
        if (aboutCarousel) {
            const signeCollection = collections.find(c => c.name.toUpperCase().includes('SIGNE BY CHÉI') || c.id === 1);
            if (signeCollection && signeCollection.products) {
                const photos = signeCollection.products
                    .map(p => p.images[0])
                    .filter(Boolean);

                if (photos.length > 0) {
                    aboutCarousel.innerHTML = photos.map((photo, idx) => `
                        <div class="absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" data-carousel-slide="${idx}">
                            <img src="${photo}" alt="Signé by Chei" class="w-full h-full object-cover object-center">
                        </div>
                    `).join('');

                    const dotsContainer = document.getElementById('about-carousel-dots');
                    if (dotsContainer) {
                        dotsContainer.innerHTML = photos.map((_, idx) => `
                            <button class="h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-white w-6' : 'bg-white/50 w-2'}" data-carousel-dot="${idx}" aria-label="Go to slide ${idx + 1}"></button>
                        `).join('');
                    }

                    // Carousel Logic
                    window.aboutCarouselCurrentIdx = 0;
                    window.aboutCarouselTotal = photos.length;

                    window.updateAboutCarousel = (newIdx) => {
                        const slides = document.querySelectorAll('[data-carousel-slide]');
                        const dots = document.querySelectorAll('[data-carousel-dot]');
                        if (!slides.length) return;
                        
                        // Hide old
                        if (slides[window.aboutCarouselCurrentIdx]) {
                            slides[window.aboutCarouselCurrentIdx].classList.replace('opacity-100', 'opacity-0');
                            slides[window.aboutCarouselCurrentIdx].classList.replace('z-10', 'z-0');
                        }
                        if (dots[window.aboutCarouselCurrentIdx]) {
                            dots[window.aboutCarouselCurrentIdx].classList.replace('bg-white', 'bg-white/50');
                            dots[window.aboutCarouselCurrentIdx].classList.replace('w-6', 'w-2');
                        }

                        // Update index
                        window.aboutCarouselCurrentIdx = (newIdx + window.aboutCarouselTotal) % window.aboutCarouselTotal;

                        // Show new
                        if (slides[window.aboutCarouselCurrentIdx]) {
                            slides[window.aboutCarouselCurrentIdx].classList.replace('opacity-0', 'opacity-100');
                            slides[window.aboutCarouselCurrentIdx].classList.replace('z-0', 'z-10');
                        }
                        if (dots[window.aboutCarouselCurrentIdx]) {
                            dots[window.aboutCarouselCurrentIdx].classList.replace('bg-white/50', 'bg-white');
                            dots[window.aboutCarouselCurrentIdx].classList.replace('w-2', 'w-6');
                        }
                    };

                    const prevBtn = document.getElementById('about-btn-prev');
                    const nextBtn = document.getElementById('about-btn-next');
                    
                    if (prevBtn) prevBtn.onclick = () => window.updateAboutCarousel(window.aboutCarouselCurrentIdx - 1);
                    if (nextBtn) nextBtn.onclick = () => window.updateAboutCarousel(window.aboutCarouselCurrentIdx + 1);

                    document.querySelectorAll('[data-carousel-dot]').forEach(dot => {
                        dot.onclick = (e) => {
                            const targetIdx = parseInt(e.target.getAttribute('data-carousel-dot'));
                            window.updateAboutCarousel(targetIdx);
                        };
                    });

                    // Swipe logic
                    let touchStartX = 0;
                    let touchEndX = 0;
                    aboutCarousel.addEventListener('touchstart', e => {
                        touchStartX = e.changedTouches[0].screenX;
                    }, {passive: true});
                    
                    aboutCarousel.addEventListener('touchend', e => {
                        touchEndX = e.changedTouches[0].screenX;
                        handleSwipe();
                    }, {passive: true});

                    function handleSwipe() {
                        const threshold = 50;
                        if (touchEndX < touchStartX - threshold) {
                            window.updateAboutCarousel(window.aboutCarouselCurrentIdx + 1); // Swipe left (next)
                        }
                        if (touchEndX > touchStartX + threshold) {
                            window.updateAboutCarousel(window.aboutCarouselCurrentIdx - 1); // Swipe right (prev)
                        }
                    }

                } else {
                    aboutCarousel.innerHTML = '<div class="w-full h-full bg-sand flex items-center justify-center"><p class="text-espresso/50">No photos available</p></div>';
                }
            }
        }

        container.innerHTML = '';

        const products = collections.flatMap(collection => collection.products);

        products.slice(0, 3).forEach(product => {
            // Register in global map for cart lookup
            window._lyseriaProductsMap = window._lyseriaProductsMap || {};
            window._lyseriaProductsMap[product.slug] = product;

            const isPreOrder   = Boolean(product.isPreOrder);
            const isOutOfStock = !isPreOrder && (product.stock !== undefined && product.stock <= 0);

            const card = `
                <div class="group">
                    <div class="relative aspect-3/4 rounded-3xl overflow-hidden bg-pearl">
                        <img
                            src="${product.images[0]}"
                            alt="${product.name}"
                            class="w-full h-full object-cover object-center duration-500 group-hover:scale-105">

                        <!-- TULISAN LYSÉRIA (KANAN ATAS, BAWAH KE ATAS) -->
                        <span 
                            style="position: absolute; top: 16px; right: 14px; z-index: 3; writing-mode: vertical-rl; transform: rotate(180deg); color: #1B2A4A; font-size: 11px; font-weight: 700; letter-spacing: 0.35em; user-select: none; pointer-events: none; background: rgba(255, 255, 255, 0.4); padding: 6px 2px; border-radius: 4px; backdrop-filter: blur(4px);">
                            LYSÉRIA
                        </span>

                        ${isPreOrder ? `
                            <span style="position:absolute;top:16px;left:14px;z-index:3;color:#fff;background:rgba(157,23,77,0.9);backdrop-filter:blur(6px);padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 2px 8px rgba(157,23,77,0.3);">
                                Pre-Order
                            </span>
                        ` : (isOutOfStock ? `
                            <span style="position:absolute;top:16px;left:14px;z-index:3;color:#fff;background:rgba(31,41,55,0.88);backdrop-filter:blur(6px);padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                                Stok Habis
                            </span>
                        ` : '')}
                    </div>

                    <div class="mt-5">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <p class="uppercase tracking-[.25em] text-xs text-rosegold">
                                ${product.description.label}
                            </p>
                            ${isPreOrder ? `
                                <span style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:#9d174d;background:#fdf2f8;border:1px solid #fbcfe8;padding:2px 8px;border-radius:999px;text-transform:uppercase;">Pre-Order</span>
                            ` : (product.stock !== undefined ? (
                                product.stock <= 0 ? `<span style="font-size:10.5px;font-weight:600;color:#dc2626;">Stok Habis</span>` :
                                product.stock <= 5 ? `<span style="font-size:10.5px;font-weight:600;color:#d97706;">Sisa ${product.stock} pcs!</span>` :
                                `<span style="font-size:10.5px;font-weight:500;color:#16a34a;">Stok: ${product.stock}</span>`
                            ) : '')}
                        </div>

                        <h3 class="font-display text-3xl mt-3 text-navy uppercase">
                            ${product.name}
                        </h3>

                        <div class="mt-2 flex items-baseline gap-1.5">
                            ${product.discount ? `
                                <span class="font-sans text-[0.9rem] line-through text-gray-400">Rp ${Number(product.price).toLocaleString("id-ID")}</span>
                                <span class="font-sans text-[0.7rem] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded mr-1 ml-1">-${Math.round(((product.price - product.discount) / product.price) * 100)}%</span>
                                <span class="font-serif italic text-lg text-navy">Rp</span> 
                                <span class="font-sans font-medium text-[1.1rem] tracking-wide text-navy">${Number(product.discount).toLocaleString("id-ID")}</span>
                            ` : `
                                <span class="font-serif italic text-lg text-navy">Rp</span> 
                                <span class="font-sans font-medium text-[1.1rem] tracking-wide text-navy">${Number(product.price).toLocaleString("id-ID")}</span>
                            `}
                        </div>

                        <div style="display:flex;gap:10px;align-items:center;margin-top:20px;flex-wrap:wrap;">
                            <a
                                href="detail.html?slug=${product.slug}"
                                class="btn btn-outline rounded-full"
                                style="flex:1;min-width:130px;text-align:center;">
                                ${product.isBundle && product.bundleItems ? `View ${product.bundleItems.length} Items` : 'View Detail'}
                            </a>
                            ${isOutOfStock ? `
                                <button
                                    disabled
                                    title="Stok sedang habis"
                                    aria-label="${product.name} stok habis"
                                    style="width:44px;height:44px;border-radius:50%;border:1.5px solid #E5E7EB;background:#F3F4F6;cursor:not-allowed;display:flex;align-items:center;justify-content:center;color:#9CA3AF;flex-shrink:0;">
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                </button>
                            ` : (isPreOrder ? `
                                <button
                                    onclick="addToCartBySlug('${product.slug}')"
                                    title="Pre-Order ${product.name}"
                                    aria-label="Pre-Order ${product.name}"
                                    style="width:44px;height:44px;border-radius:50%;border:1.5px solid #be185d;background:#fdf2f8;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#9d174d;transition:all 0.25s;flex-shrink:0;"
                                    onmouseenter="this.style.background='#9d174d';this.style.color='#FAF7F2'"
                                    onmouseleave="this.style.background='#fdf2f8';this.style.color='#9d174d'">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </button>
                            ` : `
                                <button
                                    onclick="addToCartBySlug('${product.slug}')"
                                    title="Add to Cart"
                                    aria-label="Add ${product.name} to cart"
                                    style="width:44px;height:44px;border-radius:50%;border:1.5px solid #1B2A4A;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1B2A4A;transition:all 0.25s;flex-shrink:0;"
                                    onmouseenter="this.style.background='#1B2A4A';this.style.color='#FAF7F2'"
                                    onmouseleave="this.style.background='transparent';this.style.color='#1B2A4A'">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                                    </svg>
                                </button>
                            `)}
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML += card;
        });
    } catch (error) {
        console.error(error);
    }
}

loadProducts();