async function loadProduct() {
    try {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("slug");

        const response = await fetch("./data/products.json");
        const collections = await response.json();

        let product = null;
        let currentCollection = null;

        collections.forEach(collection => {
            const found = collection.products.find(
                item => item.slug === slug
            );

            if (found) {
                product = found;
                currentCollection = collection;
            }
        });

        // Register in global product map for cart
        if (product) {
            window._lyseriaProductsMap = window._lyseriaProductsMap || {};
            window._lyseriaProductsMap[product.slug] = product;
        }

        const container = document.getElementById("product-detail");

        // ===========================
        // PRODUCT NOT FOUND
        // ===========================
        if (!product) {
            container.innerHTML = `
                <h1 class="text-center text-5xl">
                    Product Not Found
                </h1>
            `;
            return;
        }

        // ===========================
        // RELATED PRODUCTS
        // ===========================
        const relatedProducts = currentCollection.products.filter(
            item => item.slug !== slug
        );

        const isDesktop = window.innerWidth >= 1024;
        const isScrollable = !isDesktop || relatedProducts.length > 4;
        const scrollId = "related-scroll";

        const cardClass = isScrollable
            ? "w-[260px] md:w-[280px] lg:w-[300px] flex-none"
            : "w-full";

        let relatedCards = "";

        relatedProducts.forEach(item => {
            const isItemComingSoon =
                item.status === "coming_soon";

            relatedCards += `
                <div class="${cardClass} group">

                    <!-- RELATED PRODUCT IMAGE -->
                    <div class="
                        relative
                        aspect-3/4
                        overflow-hidden
                        rounded-3xl
                        bg-pearl
                    ">

                        <img
                            src="${item.images[0]}"
                            alt="${item.name}"
                            class="
                                w-full
                                h-full
                                object-cover
                                object-center
                                duration-500
                                group-hover:scale-105
                                ${isItemComingSoon
                    ? "blur-2xl select-none pointer-events-none"
                    : ""
                }
                            "
                        >

                        <!-- LYSÉRIA LABEL -->
                        <span 
                            style="
                                position: absolute;
                                top: 16px;
                                right: 14px;
                                z-index: 3;
                                writing-mode: vertical-rl;
                                transform: rotate(180deg);
                                color: #1B2A4A;
                                font-size: 11px;
                                font-weight: 700;
                                letter-spacing: 0.35em;
                                user-select: none;
                                pointer-events: none;
                                background: rgba(255, 255, 255, 0.4);
                                padding: 6px 2px;
                                border-radius: 4px;
                                backdrop-filter: blur(4px);
                            "
                        >
                            LYSÉRIA
                        </span>

                        ${isItemComingSoon ? `
                            <div class="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                bg-black/20
                                backdrop-blur-[2px]
                            ">
                                <span class="
                                    text-white
                                    text-xs
                                    tracking-widest
                                    uppercase
                                    px-4
                                    py-2
                                    rounded-full
                                    shadow-md
                                    font-medium
                                ">
                                    Coming Soon
                                </span>
                            </div>
                        ` : ""}

                    </div>

                    <!-- RELATED PRODUCT INFO -->
                    <div class="mt-5 ">

                        <p class="
                            uppercase
                            tracking-[.25em]
                            text-xs
                            text-rosegold
                        ">
                            ${item.description.label}
                        </p>

                        <h3 class="
                            font-display
                            text-3xl
                            mt-3
                            text-navy
                            uppercase
                        ">
                            ${item.name}
                        </h3>

                        <p class="
                            mt-3
                            font-serif
                            text-md
                        ">
                            Rp 
                            <span>
                                ${Number(item.price).toLocaleString("id-ID")}
                            </span>
                        </p>

                        ${isItemComingSoon ? `
                            <span class="
                                inline-block
                                border
                                border-gray-300
                                text-gray-400
                                rounded-full
                                px-6
                                py-2.5
                                mt-5
                                text-sm
                                cursor-not-allowed
                            ">
                                Coming Soon
                            </span>
                        ` : `
                            <a
                                href="detail.html?slug=${item.slug}"
                                class="btn btn-outline rounded-full mt-5"
                            >
                                View Detail
                            </a>
                        `}

                    </div>

                </div>
            `;
        });

        // ===========================
        // MAIN PRODUCT STATUS
        // ===========================
        const isMainComingSoon =
            product.status === "coming_soon";

        // ===========================
        // MAIN PAGE
        // ===========================
        container.innerHTML = `

            <div class="
                grid
                lg:grid-cols-2
                gap-12
                lg:gap-16
                items-center
            ">

                <!-- ================= -->
                <!-- MAIN PRODUCT IMAGE -->
                <!-- ================= -->

                <div class="
                    relative
                    flex
                    items-center
                    justify-center
                ">

                    <!-- OUTER FRAME -->
                    <div class="
                        relative
                        w-full
                        aspect-3/4
                        rounded-[40px]
                        bg-[#E9E2D9]
                        p-5
                        shadow-[0_20px_60px_rgba(0,0,0,0.10)]
                    ">

                        <!-- INNER FRAME -->
                        <div class="
                            relative
                            w-full
                            h-full
                            rounded-[28px]
                            bg-pearl
                            p-3
                            overflow-hidden
                            border
                            border-white/80
                        ">

                            <!-- PHOTO AREA -->
                            <div
                                id="main-product-frame"
                                class="
                                    relative
                                    w-full
                                    h-full
                                    overflow-hidden
                                    rounded-[20px]
                                    bg-[#EEE8E0]
                                    cursor-zoom-in
                                "
                            >

                                <!-- PRODUCT IMAGE -->
                                <img
                                    id="main-product-image"
                                    src="${product.images[0]}"
                                    alt="${product.name}"

                                    class="
                                        absolute
                                        inset-0
                                        w-full
                                        h-full
                                        object-cover
                                        select-none
                                        pointer-events-none
                                        will-change-transform
                                        transition-transform
                                        duration-300
                                        ease-out

                                        ${isMainComingSoon
                ? "blur-2xl"
                : ""
            }
                                    "

                                    style="
                                        transform: scale(1);
                                        transform-origin: center center;
                                    "
                                >

                                <!-- DARK OVERLAY FOR COMING SOON -->
                                ${isMainComingSoon ? `
                                    <div class="
                                        absolute
                                        inset-0
                                        z-20
                                        flex
                                        items-center
                                        justify-center
                                        bg-black/20
                                        backdrop-blur-[2px]
                                    ">

                                        <span class="
                                            text-white
                                            text-sm
                                            tracking-widest
                                            uppercase
                                            px-6
                                            py-3
                                            rounded-full
                                            shadow-md
                                            font-semibold
                                        ">
                                            Coming Soon
                                        </span>

                                    </div>
                                ` : ""}

                            </div>

                        </div>


                        <!-- FRAME CORNER DETAILS -->

                        <div class="
                            absolute
                            top-8
                            left-8
                            w-5
                            h-5
                            border-t
                            border-l
                            border-white/80
                        "></div>

                        <div class="
                            absolute
                            top-8
                            right-8
                            w-5
                            h-5
                            border-t
                            border-r
                            border-white/80
                        "></div>

                        <div class="
                            absolute
                            bottom-8
                            left-8
                            w-5
                            h-5
                            border-b
                            border-l
                            border-white/80
                        "></div>

                        <div class="
                            absolute
                            bottom-8
                            right-8
                            w-5
                            h-5
                            border-b
                            border-r
                            border-white/80
                        "></div>

                    </div>

                </div>


                <!-- ================= -->
                <!-- PRODUCT INFORMATION -->
                <!-- ================= -->

                <div>

                    <p class="
                        uppercase
                        tracking-[.3em]
                        text-xs
                        text-rosegold
                    ">
                        ${product.category}
                    </p>


                    <h1 class="
                        font-display
                        text-5xl
                        lg:text-6xl
                        mt-3
                        text-navy
                    ">
                        ${product.name}
                    </h1>


                    <p class="
                        text-xl
                        lg:text-2xl
                        mt-4
                        font-serif
                    ">
                        Rp
                        <span>
                            ${Number(product.price).toLocaleString("id-ID")}
                        </span>
                    </p>


                    <!-- DESCRIPTION -->
                    <div class="mt-8">

                        <p class="
                            uppercase
                            tracking-[.3em]
                            text-xs
                            text-rosegold
                            text-justify
                        ">
                            ${product.description.label}
                        </p>


                        <h3 class="
                            font-display
                            text-2xl
                            lg:text-3xl
                            mt-3
                            italic
                            leading-snug
                        ">
                            "${product.description.quote}"
                        </h3>


                        <p class="
                            mt-5
                            leading-8
                            text-gray-600
                        ">
                            ${product.description.content}
                        </p>

                    </div>


                    <!-- PRODUCT DETAILS -->
                    <div class="
                        mt-10
                        space-y-3
                    ">

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


                    <!-- BUTTON AREA -->
                    ${isMainComingSoon ? `

                        <span class="
                            inline-block
                            border
                            border-gray-300
                            text-gray-400
                            rounded-full
                            px-8
                            py-3.5
                            mt-10
                            text-sm
                            cursor-not-allowed
                        ">
                            Product Coming Soon
                        </span>

                    ` : `

                        <div style="display:flex;gap:12px;align-items:center;margin-top:40px;flex-wrap:wrap;">

                            <!-- Add to Cart -->
                            <button
                                onclick="addToCartBySlug('${product.slug}')"
                                id="detail-add-cart-btn"
                                style="flex:1;min-width:180px;padding:16px 24px;background:#1B2A4A;color:#FAF7F2;border:none;border-radius:999px;font-family:'Inter',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background 0.2s,transform 0.18s;box-shadow:0 8px 28px rgba(27,42,74,0.18);"
                                onmouseenter="this.style.background='#C79A8B';this.style.transform='translateY(-2px)'"
                                onmouseleave="this.style.background='#1B2A4A';this.style.transform='translateY(0)'"
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                Add to Cart
                            </button>

                            <!-- WhatsApp Contact Icon -->
                            <a
                                href="https://wa.me/6285181764377?text=Hello%20LYS%C3%89RIA%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}."
                                target="_blank"
                                style="width:52px;height:52px;flex-shrink:0;border-radius:50%;border:1.5px solid #EDE8E3;background:#fff;display:flex;align-items:center;justify-content:center;color:#25D366;transition:all 0.22s;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,0.06);"
                                title="Chat via WhatsApp" aria-label="Contact us on WhatsApp"
                                onmouseenter="this.style.background='#25D366';this.style.color='#fff';this.style.borderColor='#25D366'"
                                onmouseleave="this.style.background='#fff';this.style.color='#25D366';this.style.borderColor='#EDE8E3'"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>

                        </div>

                        <!-- Share Row -->
                        <div style="display:flex;align-items:center;gap:14px;margin-top:20px;">
                            <span style="font-size:0.63rem;letter-spacing:0.28em;text-transform:uppercase;color:#9A8880;font-weight:500;flex-shrink:0;">Share</span>
                            <div style="height:1px;background:#EDE8E3;flex:1;"></div>

                            <!-- Share via WhatsApp -->
                            <button onclick="shareProductViaWA('${product.name}', '${product.slug}')" title="Share via WhatsApp"
                                style="width:38px;height:38px;border-radius:50%;border:1.5px solid #EDE8E3;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#25D366;transition:all 0.2s;"
                                onmouseenter="this.style.background='#25D366';this.style.color='#fff';this.style.borderColor='#25D366'"
                                onmouseleave="this.style.background='#fff';this.style.color='#25D366';this.style.borderColor='#EDE8E3'">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>

                            <!-- Copy Link -->
                            <button onclick="copyProductLink()" title="Copy product link"
                                style="width:38px;height:38px;border-radius:50%;border:1.5px solid #EDE8E3;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1B2A4A;transition:all 0.2s;"
                                onmouseenter="this.style.background='#1B2A4A';this.style.color='#FAF7F2';this.style.borderColor='#1B2A4A'"
                                onmouseleave="this.style.background='#fff';this.style.color='#1B2A4A';this.style.borderColor='#EDE8E3'">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                        </div>

                    `}

                </div>

            </div>

            <!-- ================= -->
            <!-- FULL PRODUCT IMAGE -->
            <!-- ================= -->

            <section class="mt-24">

                <!-- SECTION TITLE -->
                <div class="text-center mb-10">

                    <p class="
                        uppercase
                        tracking-[.3em]
                        text-xs
                        text-rosegold
                    ">
                        The Complete Piece
                    </p>

                    <h2 class="
                        font-display
                        text-4xl
                        lg:text-5xl
                        mt-3
                        text-navy
                    ">
                        See The Full Design
                    </h2>

                    <p class="
                        mt-4
                        text-gray-500
                        max-w-xl
                        mx-auto
                        leading-relaxed
                    ">
                        Discover every detail and the complete beauty of ${product.name}.
                    </p>

                </div>


                <!-- FULL PRODUCT IMAGE -->
                <div class="
                    relative
                    w-full
                    overflow-hidden
                    bg-pearl
                    shadow-[0_20px_60px_rgba(0,0,0,0.12)]
                ">

                    <img
                        src="${product.images[0]}"
                        alt="Full view of ${product.name}"

                        class="
                            block
                            w-full
                            h-auto
                            object-contain
                            transition-transform
                            duration-700
                            ease-out
                            hover:scale-[1.02]
                        "
                    >

                </div>

            </section>


            <!-- ================= -->
            <!-- COLOR GUIDE       -->
            <!-- ================= -->

            ${product.colorGuide ? `
            <section class="mt-24">

                <!-- Section Header -->
                <div class="text-center mb-12">
                    <p class="uppercase tracking-[.3em] text-xs text-rosegold">Styling Guide</p>
                    <h2 class="font-display text-4xl lg:text-5xl mt-3 text-navy">Color Guide</h2>
                    <p class="mt-4 text-gray-500 max-w-xl mx-auto leading-relaxed">
                        Discover the most suitable undertone and the best way to style ${product.name}.
                    </p>
                </div>

                <div style="
                    background: linear-gradient(135deg, #FAF7F2 0%, #F2EBE3 100%);
                    border: 1px solid #EDE8E3;
                    border-radius: 36px;
                    padding: 48px;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 40px;
                ">

                    <!-- Top Row: Palette + Undertone -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;">

                        <!-- Palette Swatches -->
                        <div>
                            <p style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:#C79A8B;font-weight:700;margin:0 0 16px;">Color Palette</p>
                            <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">
                                ${product.colorGuide.paletteHex.map((hex, i) => `
                                    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                                        <div style="
                                            width:52px;height:52px;border-radius:50%;
                                            background:${hex};
                                            box-shadow:0 4px 16px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.4);
                                            border:2px solid rgba(255,255,255,0.7);
                                        "></div>
                                        <span style="font-size:0.6rem;color:#7A6A62;text-align:center;max-width:60px;line-height:1.3;">${product.colorGuide.palette[i]}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Undertone Labels -->
                        <div>
                            <p style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:#C79A8B;font-weight:700;margin:0 0 16px;">Undertone Suitability</p>

                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px 24px; align-items: center;">
                                <!-- Warm -->
                                <span style="font-size:0.85rem;color:#1B2A4A;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Warm</span>
                                <div style="display:flex;gap:4px;">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= product.colorGuide.undertoneRating.warm ? '#1B2A4A' : 'none'}" stroke="${star <= product.colorGuide.undertoneRating.warm ? '#1B2A4A' : '#D4C5BC'}" stroke-width="1.5" stroke-linejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    `).join('')}
                                </div>
                                
                                <!-- Cool -->
                                <span style="font-size:0.85rem;color:#1B2A4A;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Cool</span>
                                <div style="display:flex;gap:4px;">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= product.colorGuide.undertoneRating.cool ? '#1B2A4A' : 'none'}" stroke="${star <= product.colorGuide.undertoneRating.cool ? '#1B2A4A' : '#D4C5BC'}" stroke-width="1.5" stroke-linejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    `).join('')}
                                </div>
                                
                                <!-- Neutral -->
                                <span style="font-size:0.85rem;color:#1B2A4A;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Neutral</span>
                                <div style="display:flex;gap:4px;">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= product.colorGuide.undertoneRating.neutral ? '#1B2A4A' : 'none'}" stroke="${star <= product.colorGuide.undertoneRating.neutral ? '#1B2A4A' : '#D4C5BC'}" stroke-width="1.5" stroke-linejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Divider -->
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#EDE8E3,transparent);"></div>

                    <!-- Styling Tip -->
                    <div style="display:flex;gap:20px;align-items:flex-start;">
                        <div style="
                            width:44px;height:44px;flex-shrink:0;
                            border-radius:50%;
                            background:linear-gradient(135deg,#C79A8B,#D4AFA0);
                            display:flex;align-items:center;justify-content:center;
                            box-shadow:0 4px 14px rgba(199,154,139,0.3);
                        ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                            </svg>
                        </div>
                        <div>
                            <p style="font-size:0.65rem;letter-spacing:0.25em;text-transform:uppercase;color:#C79A8B;font-weight:700;margin:0 0 8px;">Styling Tip</p>
                            <p style="font-size:0.92rem;color:#3B312E;line-height:1.8;margin:0;">${product.colorGuide.tip}</p>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div style="margin-top: 10px;">
                        <p style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:#9A8880;font-weight:600;margin:0 0 12px;">Legend</p>
                        <div style="display:flex; flex-wrap: wrap; gap: 16px; font-size: 0.75rem; color: #7A6A62;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="display:flex;gap:2px;">
                                    ${[1, 2, 3, 4, 5].map(star => `<svg width="10" height="10" viewBox="0 0 24 24" fill="${star <= 5 ? '#C79A8B' : 'none'}" stroke="${star <= 5 ? '#C79A8B' : '#D4C5BC'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}
                                </div>
                                <span>Very suitable</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="display:flex;gap:2px;">
                                    ${[1, 2, 3, 4, 5].map(star => `<svg width="10" height="10" viewBox="0 0 24 24" fill="${star <= 4 ? '#C79A8B' : 'none'}" stroke="${star <= 4 ? '#C79A8B' : '#D4C5BC'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}
                                </div>
                                <span>Highly suitable</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="display:flex;gap:2px;">
                                    ${[1, 2, 3, 4, 5].map(star => `<svg width="10" height="10" viewBox="0 0 24 24" fill="${star <= 3 ? '#C79A8B' : 'none'}" stroke="${star <= 3 ? '#C79A8B' : '#D4C5BC'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}
                                </div>
                                <span>Moderately suitable</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="display:flex;gap:2px;">
                                    ${[1, 2, 3, 4, 5].map(star => `<svg width="10" height="10" viewBox="0 0 24 24" fill="${star <= 2 ? '#C79A8B' : 'none'}" stroke="${star <= 2 ? '#C79A8B' : '#D4C5BC'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}
                                </div>
                                <span>Less suitable</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="display:flex;gap:2px;">
                                    ${[1, 2, 3, 4, 5].map(star => `<svg width="10" height="10" viewBox="0 0 24 24" fill="${star <= 1 ? '#C79A8B' : 'none'}" stroke="${star <= 1 ? '#C79A8B' : '#D4C5BC'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}
                                </div>
                                <span>Least suitable</span>
                            </div>
                        </div>
                    </div>

                </div>

            </section>
            ` : ''}


            <!-- ================= -->
            <!-- RELATED PRODUCTS  -->
            <!-- ================= -->

            <section class="mt-36">


                <div class="
                    flex
                    justify-between
                    items-end
                    mb-8
                ">

                    <div>

                        <p class="
                            uppercase
                            tracking-[.3em]
                            text-xs
                            text-rosegold
                        ">
                            Continue Exploring
                        </p>


                        <h2 class="
                            font-display
                            text-5xl
                            mt-3
                            text-navy
                        ">
                            In The Same Collection
                        </h2>


                        <p class="
                            mt-3
                            text-gray-500
                        ">
                            Discover more pieces from the
                            ${currentCollection.name}.
                        </p>

                    </div>


                    <!-- DESKTOP SCROLL BUTTON -->
                    ${isScrollable && isDesktop ? `

                        <div class="flex gap-3">

                            <button
                                onclick="
                                    document
                                        .getElementById('${scrollId}')
                                        .scrollBy({
                                            left: -340,
                                            behavior: 'smooth'
                                        })
                                "

                                class="
                                    w-12
                                    h-12
                                    rounded-full
                                    border
                                    border-gray-300
                                    hover:bg-navy
                                    hover:text-white
                                    duration-300
                                "
                            >
                                ←
                            </button>


                            <button
                                onclick="
                                    document
                                        .getElementById('${scrollId}')
                                        .scrollBy({
                                            left: 340,
                                            behavior: 'smooth'
                                        })
                                "

                                class="
                                    w-12
                                    h-12
                                    rounded-full
                                    border
                                    border-navy
                                    hover:bg-navy
                                    hover:text-white
                                    duration-300
                                "
                            >
                                →
                            </button>

                        </div>

                    ` : ""}

                </div>


                <!-- RELATED PRODUCT CONTAINER -->
                <div class="
                    bg-[#FCFAF8]
                    rounded-[36px]
                    border
                    border-[#F2ECE6]
                    shadow-sm
                    p-8
                ">

                    <div
                        id="${scrollId}"

                        class="
                            ${isScrollable
                ? "overflow-x-auto scrollbar-hide scroll-smooth"
                : ""
            }
                        "
                    >

                        <div class="
                            ${isScrollable

                ? "flex gap-6 lg:gap-8 w-max"

                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            }
                        ">

                            ${relatedCards}

                        </div>

                    </div>

                </div>

            </section>

        `;


        // ===========================
        // INTERACTIVE IMAGE ZOOM
        // ===========================

        const frame = document.getElementById("main-product-frame");
        const image = document.getElementById("main-product-image");

        if (frame && image && !isMainComingSoon) {

            frame.addEventListener("mouseenter", () => {
                image.style.transition =
                    "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)";

                image.style.transform = "scale(1.8)";
            });


            frame.addEventListener("mousemove", (event) => {

                const rect = frame.getBoundingClientRect();

                const x =
                    (event.clientX - rect.left) /
                    rect.width;

                const y =
                    (event.clientY - rect.top) /
                    rect.height;


                /*
                    Cursor kiri  -> gambar fokus kiri
                    Cursor kanan -> gambar fokus kanan
                    Cursor atas   -> gambar fokus atas
                    Cursor bawah  -> gambar fokus bawah
                */

                const originX = x * 100;
                const originY = y * 100;

                image.style.transformOrigin =
                    `${originX}% ${originY}%`;

                image.style.transform =
                    "scale(1.8)";
            });


            frame.addEventListener("mouseleave", () => {

                image.style.transition =
                    "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";

                image.style.transformOrigin =
                    "center center";

                image.style.transform =
                    "scale(1)";
            });

        }

    } catch (error) {
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


// ─── Share Helpers ────────────────────────────────────────────

function shareProductViaWA(productName, slug) {
    const url = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}detail.html?slug=${slug}`;
    const msg = `✨ Lihat produk cantik dari LYSÉRIA!\n\n*${productName}*\n\n${url}\n\nBuat tampil anggun setiap hari 🌸`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function copyProductLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            if (typeof showToast === 'function') {
                showToast('Link copied to clipboard!', 'copy');
            }
        })
        .catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = window.location.href;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (typeof showToast === 'function') {
                showToast('Link copied to clipboard!', 'copy');
            }
        });
}