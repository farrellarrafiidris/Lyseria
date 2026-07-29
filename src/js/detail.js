async function loadProduct() {

    try {

        // Ambil slug dari URL
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("slug");

        // Ambil semua collection
        const response = await fetch("./data/products.json");
        const collections = await response.json();

        // Cari product & collection
        let product = null;
        let currentCollection = null;

        collections.forEach(collection => {

            const found = collection.products.find(item => item.slug === slug);

            if (found) {

                product = found;
                currentCollection = collection;

            }

        });

        const container = document.getElementById("product-detail");

        if (!product) {

            container.innerHTML = `
                <h1 class="text-5xl text-center">
                    Product Not Found
                </h1>
            `;

            return;

        }

        // Produk lain dalam batch
        const relatedProducts = currentCollection.products.filter(item => item.slug !== slug);

        // Generate Card
        let relatedCards = "";

        relatedProducts.forEach(item => {

            relatedCards += `

                <div class="group">

                    <div class="overflow-hidden rounded-3xl">

                        <img
                            src="${item.images[0]}"
                            alt="${item.name}"
                            class="w-full aspect-[3/4] object-cover duration-500 group-hover:scale-105">

                    </div>

                    <div class="mt-5">

                        <p class="uppercase tracking-[.25em] text-xs text-rosegold">

                            ${item.description.label}

                        </p>

                        <h3 class="font-display text-3xl mt-3">

                            ${item.name}

                        </h3>

                        <p class="mt-3 text-rosegold">

                            Rp ${item.price.toLocaleString("id-ID")}

                        </p>

                        <a
                            href="detail.html?slug=${item.slug}"
                            class="btn btn-outline rounded-full mt-5">

                            View Detail

                        </a>

                    </div>

                </div>

            `;

        });

        container.innerHTML = `

            <div class="grid lg:grid-cols-2 gap-20 items-center">

                <div>

                    <img
                        src="${product.images[0]}"
                        alt="${product.name}"
                        class="w-full rounded-[40px]">

                </div>

                <div>

                    <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                        ${product.category}

                    </p>

                    <h1 class="font-display text-6xl mt-5">

                        ${product.name}

                    </h1>

                    <p class="text-2xl mt-6 text-rosegold">

                        Rp ${product.price.toLocaleString("id-ID")}

                    </p>

                    <div class="mt-10">

                        <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                            ${product.description.label}

                        </p>

                        <h3 class="font-display text-3xl mt-4">

                            "${product.description.quote}"

                        </h3>

                        <p class="mt-8 leading-9 text-gray-600">

                            ${product.description.content}

                        </p>

                    </div>

                    <div class="mt-10 space-y-4">

                        <p><strong>Material :</strong> ${product.material}</p>

                        <p><strong>Size :</strong> ${product.size}</p>

                    </div>

                    <a
                        href="https://wa.me/6281279053999?text=Hello%20LYSÉRIA,%20I'm%20interested%20in%20${encodeURIComponent(product.name)}."
                        target="_blank"
                        class="btn bg-navy text-white rounded-full mt-10">

                        Contact Us

                    </a>

                </div>

            </div>

            <section class="mt-36">

                <div class="text-center">

                    <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                        More From This Collection

                    </p>

                    <h2 class="font-display text-5xl mt-4">

                        In the Same Collection

                    </h2>

                    <p class="mt-5 text-gray-500">

                        Discover more pieces from the ${currentCollection.name}.

                    </p>

                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16">

                    ${relatedCards}

                </div>

            </section>

        `;

    }

    catch(error){

        console.error(error);

    }

}

loadProduct();