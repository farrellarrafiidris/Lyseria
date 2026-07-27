async function loadProduct() {

    try {

        // Ambil slug dari URL
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("slug");

        // Ambil data dari JSON
        const response = await fetch("./data/products.json");
        const products = await response.json();

        // Cari produk berdasarkan slug
        const product = products.find(item => item.slug === slug);

        const container = document.getElementById("product-detail");

        // Kalau produk tidak ditemukan
        if (!product) {

            container.innerHTML = `
                <h1 class="text-4xl text-center font-serif">
                    Product Not Found
                </h1>
            `;

            return;
        }

        // Render halaman
        container.innerHTML = `

            <div class="grid lg:grid-cols-2 gap-16">

                <!-- Gambar -->
                <div>

                    <img
                        src="${product.images[0]}"
                        alt="${product.name}"
                        class="rounded-3xl w-full aspect-[3/4] object-cover">

                </div>

                <!-- Informasi -->
                <div class="flex flex-col justify-center">

                    <p class="uppercase tracking-[0.3em] text-xs text-rosegold">

                        ${product.category}

                    </p>

                    <h1 class="font-serif text-6xl mt-5">

                        ${product.name}

                    </h1>

                    <p class="text-2xl mt-6 text-rosegold">

                        Rp ${product.price.toLocaleString("id-ID")}

                    </p>

                    <div class="mt-8">

                        <p class="uppercase tracking-[0.3em] text-xs text-rosegold">

                            ${product.description.label}

                        </p>

                        <blockquote class="mt-4 text-2xl italic font-serif text-navy">

                            "${product.description.quote}"

                        </blockquote>

                        <p class="mt-8 text-gray-600 leading-8">

                            ${product.description.content}

                        </p>

                    </div>

                    <div class="mt-10 space-y-3">

                        <div>

                            <span class="font-semibold">
                                Material :
                            </span>

                            ${product.material}

                        </div>

                        <div>

                            <span class="font-semibold">
                                Size :
                            </span>

                            ${product.size}

                        </div>

                    </div>

                    <button class="btn btn-neutral rounded-full mt-10 w-fit">

                        Contact Us

                    </button>

                </div>

            </div>

        `;

    }

    catch (error) {

        console.error(error);

    }

}

loadProduct();