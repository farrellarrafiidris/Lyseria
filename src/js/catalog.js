async function loadProducts() {

    try {

        const response = await fetch("./data/products.json");

        const products = await response.json();

        const container = document.getElementById("product-list");

        container.innerHTML = "";

        products.forEach(product => {

            const card = `
                <div class="group">

                    <div class="overflow-hidden rounded-3xl">

                        <img
                            src="${product.images[0]}"
                            alt="${product.name}"
                            class="w-full aspect-[3/4] object-cover group-hover:scale-105 duration-300 blur-2xl">

                    </div>

                    <div class="mt-5">

                        <p class="text-sm uppercase tracking-widest text-gray-400">
                            ${product.category}
                        </p>

                        <h2 class="font-serif text-3xl mt-2">
                            ${product.name}
                        </h2>

                        <p class="mt-2 text-lg">
                            <span class=" line-through text-rosegold">Rp ${product.price.toLocaleString("id-ID")}</span> <span class="text-red-500">Coming Soon</span>
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

    catch (error) {

        console.error(error);

    }

}

loadProducts();