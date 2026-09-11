async function loadProducts() {
    try {
        const response = await fetch("./data/products.json");
        const collections = await response.json();
        const container = document.getElementById("product-list");

        container.innerHTML = "";

        const products = collections.flatMap(collection => collection.products);

        products.slice(0, 3).forEach(product => {
            const card = `
                <div class="group">
                    <div class="relative aspect-[3/4] rounded-3xl overflow-hidden bg-pearl">
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

                        <h3 class="font-display text-3xl mt-3 text-navy">
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