async function loadProduct() {

    try {

        const params = new URLSearchParams(window.location.search);
        const slug = params.get("slug");

        const response = await fetch("./data/products.json");
        const collections = await response.json();

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
                <h1 class="text-center text-5xl">
                    Product Not Found
                </h1>
            `;

            return;

        }

        // ===========================
        // Related Product
        // ===========================

        const relatedProducts = currentCollection.products.filter(item => item.slug !== slug);

        const isDesktop = window.innerWidth >= 1024;
        const isScrollable = !isDesktop || relatedProducts.length > 4;
        const scrollId = "related-scroll";

        const cardClass = isScrollable
            ? "w-[260px] md:w-[280px] lg:w-[300px] flex-none"
            : "w-full";

        let relatedCards = "";

        relatedProducts.forEach(item => {

            relatedCards += `

                <div class="${cardClass} group">

                    <div class="overflow-hidden rounded-3xl bg-pearl">

                        <img
                            src="${item.images[0]}"
                            alt="${item.name}"
                            class="w-full aspect-[3/4] object-cover duration-500 group-hover:scale-105 blur-3xl">

                    </div>

                    <div class="mt-5">

                        <p class="uppercase tracking-[.25em] text-xs text-rosegold">

                            ${item.description.label}

                        </p>

                        <h3 class="font-display text-3xl mt-3">

                            ${item.name}

                        </h3>

                        <p class="mt-3>

                            <span class="text-rosegold line-through">Rp ${product.price.toLocaleString("id-ID")}</span><span class="text-red-500 font-medium"> Coming Soon</span>

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

            <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                <div>

                    <img
                        src="${product.images[0]}"
                        alt="${product.name}"
                        class="w-full rounded-[40px] blur-3xl">

                </div>

                <div>

                    <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                        ${product.category}

                    </p>

                    <h1 class="font-display text-5xl lg:text-6xl mt-3">

                        ${product.name}

                    </h1>

                    <p class="text-xl lg:text-2xl mt-4">

                        <span class="text-rosegold line-through">Rp ${product.price.toLocaleString("id-ID")}</span><span class="text-red-500 font-medium"> Coming Soon</span>

                    </p>

                    <div class="mt-8">

                        <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                            ${product.description.label}

                        </p>

                        <h3 class="font-display text-2xl lg:text-3xl mt-3 italic leading-snug">

                            "${product.description.quote}"

                        </h3>

                        <p class="mt-5 leading-8 text-gray-600">

                            ${product.description.content}

                        </p>

                    </div>

                    <div class="mt-10 space-y-3">

                        <p>

                            <span class="font-semibold">
                                Material :
                            </span>

                            ${product.material}

                        </p>

                        <p>

                            <span class="font-semibold">
                                Size :
                            </span>

                            ${product.size}

                        </p>

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

                <div class="flex justify-between items-end mb-8">

                    <div>

                        <p class="uppercase tracking-[.3em] text-xs text-rosegold">

                            Continue Exploring

                        </p>

                        <h2 class="font-display text-5xl mt-3">

                            In The Same Collection

                        </h2>

                        <p class="mt-3 text-gray-500">

                            Discover more pieces from the ${currentCollection.name}.

                        </p>

                    </div>

                    ${isScrollable && isDesktop ? `

                    <div class="flex gap-3">

                        <button
                            onclick="document.getElementById('${scrollId}').scrollBy({left:-340,behavior:'smooth'})"
                            class="w-12 h-12 rounded-full border border-gray-300 hover:bg-navy hover:text-white duration-300">

                            ←

                        </button>

                        <button
                            onclick="document.getElementById('${scrollId}').scrollBy({left:340,behavior:'smooth'})"
                            class="w-12 h-12 rounded-full border border-gray-300 hover:bg-navy hover:text-white duration-300">

                            →

                        </button>

                    </div>

                    ` : ""}

                </div>

                <div class="bg-[#FCFAF8] rounded-[36px] border border-[#F2ECE6] shadow-sm p-8">

                    <div
                        id="${scrollId}"
                        class="${isScrollable ? "overflow-x-auto scrollbar-hide scroll-smooth" : ""}">

                        <div class="${
                            isScrollable
                                ? "flex gap-6 lg:gap-8 w-max"
                                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                        }">

                            ${relatedCards}

                        </div>

                    </div>

                </div>

            </section>

        `;

    }

    catch (error) {

        console.error(error);

    }

}

loadProduct();

window.addEventListener("resize", () => {

    clearTimeout(window.detailResize);

    window.detailResize = setTimeout(() => {

        loadProduct();

    }, 200);

});