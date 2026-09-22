async function loadProducts() {
    try {
        // Tampilkan skeleton dulu
        const container = document.getElementById('product-list');
        if (container) {
            container.innerHTML = [1,2,3].map(() => `
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

        container.innerHTML = '';

        const products = collections.flatMap(collection => collection.products);

        products.slice(0, 3).forEach(product => {
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
                    </div>

                    <div class="mt-5">
                        <p class="uppercase tracking-[.25em] text-xs text-rosegold">
                            ${product.description.label}
                        </p>

                        <h3 class="font-display text-3xl mt-3 text-navy uppercase">
                            ${product.name}
                        </h3>

                        <p class="mt-2 font-serif text-xl text-navy">
                            <span>Rp</span> ${Number(product.price).toLocaleString("id-ID")}</span>
                        </p>

                        <a
                            href="detail.html?slug=${product.slug}"
                            class="btn btn-outline rounded-full mt-5">
                            View Detail
                        </a>
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