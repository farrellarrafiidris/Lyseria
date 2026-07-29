async function loadCollections() {

    try {

        const response = await fetch("./data/products.json");
        const collections = await response.json();

        const container = document.getElementById("collection-list");

        container.innerHTML = "";

        const isDesktop = window.innerWidth >= 1024;

        collections.forEach((collection, index) => {

            const isScrollable = !isDesktop || collection.products.length > 4;

            const scrollId = `scroll-${index}`;

            const cardClass = isScrollable
                ? "w-[260px] md:w-[280px] lg:w-[300px] flex-none"
                : "w-full";

            let cards = "";

            collection.products.forEach(product => {

                cards += `

                    <div class="${cardClass} group">

                        <div class="overflow-hidden rounded-3xl bg-pearl">

                            <img
                                src="${product.images[0]}"
                                alt="${product.name}"
                                class="w-full aspect-[3/4] object-cover duration-500 group-hover:scale-105 blur-3xl">

                        </div>

                        <div class="mt-5">

                            <p class="uppercase tracking-[.25em] text-xs text-rosegold">
                                ${product.category}
                            </p>

                            <h3 class="font-display text-3xl mt-3">
                                ${product.name}
                            </h3>

                            <p class="mt-3>
                               <span class="text-rosegold line-through">Rp ${product.price.toLocaleString("id-ID")}</span><span class="text-red-500 font-medium"> Coming Soon</span>
                            </p>

                            <a
                                href="detail.html?slug=${product.slug}"
                                class="btn btn-outline rounded-full mt-5">

                                View Detail

                            </a>

                        </div>

                    </div>

                `;

            });

            container.innerHTML += `

                <section class="mb-28">

                    <div class="flex justify-between items-end mb-8">

                        <div>

                            <p class="uppercase tracking-[.3em] text-xs text-rosegold">
                                ${collection.year}
                            </p>

                            <h2 class="font-display text-5xl mt-3">
                                ${collection.name}
                            </h2>

                            <p class="text-gray-500 mt-3 max-w-xl">
                                ${collection.description}
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

                                ${cards}

                            </div>

                        </div>

                    </div>

                </section>

            `;

        });

    }

    catch (err) {

        console.error(err);

    }

}

loadCollections();

window.addEventListener("resize", () => {

    clearTimeout(window.resizeTimer);

    window.resizeTimer = setTimeout(() => {

        loadCollections();

    }, 200);

});