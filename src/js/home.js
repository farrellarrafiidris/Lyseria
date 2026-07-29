async function loadProducts() {

    try {

        const response = await fetch("./data/products.json");

        const collections = await response.json();

        const container = document.getElementById("product-list");

        container.innerHTML = "";

        // Gabungkan semua produk dari semua collection
        const products = collections.flatMap(collection => collection.products);

        // Ambil 3 produk pertama
        products.slice(0, 3).forEach(product => {

            const card = `

                <div class="group">

                    <div class="aspect-[3/4] rounded-3xl overflow-hidden bg-pearl">

                        <img
                            src="${product.images[0]}"
                            alt="${product.name}"
                            class="w-full h-full object-cover duration-500 group-hover:scale-105 blur-3xl">

                    </div>

                    <div class="mt-5">

                        <p class="uppercase tracking-[.25em] text-xs text-rosegold">

                            ${product.description.label}

                        </p>

                        <h3 class="font-display text-3xl mt-3 text-navy">

                            ${product.name}

                        </h3>

                        <p class="mt-3">

                            <span class="text-navy">Rp</span><span class="text-red-500 text-medium"> ${product.price.toLocaleString("id-ID")}</span>
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

    }

    catch (error) {

        console.error(error);

    }

}

loadProducts();