async function loadProducts() {

    const response = await fetch("./data/products.json");

    const products = await response.json();

    const container = document.getElementById("product-list");

    container.innerHTML = "";

    // Home cuma tampil 3 produk pertama
    products.slice(0, 3).forEach(product => {

        const card = `
            <div class="group">

                <div class="aspect-[3/4] bg-sand rounded-3xl overflow-hidden">

                    <img
                        src="${product.images[0]}"
                        alt="${product.name}"
                        class="w-full h-full object-cover group-hover:scale-105 transition duration-300">

                </div>

                <div class="mt-5">

                        <p class="text-sm uppercase tracking-widest text-gray-400">
                            ${product.category}
                        </p>

                        <h2 class="font-serif text-3xl mt-2 text-black">
                            ${product.name}
                        </h2>

                        <p class="mt-2 text-lg text-rosegold">
                            Rp ${product.price.toLocaleString("id-ID")}
                        </p>

                        <a
                            href="detail.html?slug=${product.slug}"
                            class="btn btn-outline mt-5 rounded-full">

                            View Detail

                        </a>

                    </div>

            </div>
        `;

        container.innerHTML += card;

    });

}

loadProducts();