import { calcularPromedioRating } from '../models/CalificacionesModel.js';
import { formatearMonedaUSD } from '../models/ToursModel.js';

const IMAGEN_FALLBACK_TOUR = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';
const IMAGEN_FALLBACK_LUGAR = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';

export const InicioView = {
    elements: {
        totalLugares: document.getElementById('dato-total'),
        heroSearchForm: document.getElementById('hero-search-form'),
        heroSearchInput: document.getElementById('hero-search-input'),
        heroSearchBtn: document.getElementById('hero-search-btn'),
        heroSearchResults: document.getElementById('hero-search-results'),
        popularDestinations: document.getElementById('popular-destinations'),
        toursTrack: document.getElementById('tours-carousel-track'),
        carouselPrevBtn: document.getElementById('carousel-prev-btn'),
        carouselNextBtn: document.getElementById('carousel-next-btn'),
        destinosGrid: document.getElementById('destinos-grid'),
        toursLoadingPlaceholder: document.getElementById('tours-loading-placeholder'),
        destinosLoadingPlaceholder: document.getElementById('destinos-loading-placeholder')
    },

    /**
     * Actualiza el contador de lugares oficiales en la barra de métricas.
     * @param {number} total 
     */
    actualizarTotalLugares(total) {
        const el = document.getElementById('dato-total') || this.elements.totalLugares;
        if (el) {
            el.textContent = String(total);
        }
    },

    /**
     * Modifica el estado activo/deshabilitado del botón de búsqueda del Hero.
     * @param {boolean} habilitado 
     */
    actualizarEstadoBotonBuscar(habilitado) {
        const btn = document.getElementById('hero-search-btn') || this.elements.heroSearchBtn;
        if (!btn) return;

        btn.disabled = !habilitado;
        if (habilitado) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    },

    /**
     * Renderiza el menú flotante desplegable de sugerencias de búsqueda predictiva.
     * @param {Array<Object>} lugares
     * @param {Function} onSelectLugar
     */
    renderizarResultadosHero(lugares, onSelectLugar) {
        const results = document.getElementById('hero-search-results') || this.elements.heroSearchResults;
        if (!results) return;

        results.replaceChildren();

        if (!Array.isArray(lugares) || lugares.length === 0) {
            results.classList.add('hidden');
            return;
        }

        results.classList.remove('hidden');
        const fragment = document.createDocumentFragment();

        lugares.forEach(lugar => {
            const item = document.createElement('li');
            item.className = 'result-item';
            item.setAttribute('role', 'option');

            const title = document.createElement('span');
            title.className = 'result-item-title';
            title.textContent = lugar.name || 'Sitio turístico';

            const category = document.createElement('span');
            category.className = 'result-item-category';
            category.style.color = lugar.color || '#FF6B6B';
            category.textContent = lugar.category || 'Turismo';

            item.append(title, category);
            item.addEventListener('click', () => {
                if (typeof onSelectLugar === 'function') {
                    onSelectLugar(lugar);
                }
            });
            fragment.appendChild(item);
        });

        results.appendChild(fragment);
    },

    /**
     * Oculta el menú flotante de resultados predictivos.
     */
    ocultarResultadosHero() {
        const results = document.getElementById('hero-search-results') || this.elements.heroSearchResults;
        results?.classList.add('hidden');
    },

    /**
     * Renderiza dinámicamente los chips de destinos populares (Top 5 Mejor Calificados).
     * @param {Array<Object>} lugaresTop5 
     */
    renderizarDestinosPopulares(lugaresTop5) {
        const container = document.getElementById('popular-destinations') || this.elements.popularDestinations;
        if (!container) return;

        container.replaceChildren();

        if (!Array.isArray(lugaresTop5) || lugaresTop5.length === 0) return;

        const fragment = document.createDocumentFragment();
        lugaresTop5.forEach(lugar => {
            const chip = document.createElement('a');
            chip.className = 'trending-chip';
            chip.href = `detalle-lugar.html?id=${encodeURIComponent(lugar.id || '')}`;
            chip.textContent = lugar.name || 'Destino popular';
            chip.setAttribute('aria-label', `Ver detalles de ${lugar.name}`);
            fragment.appendChild(chip);
        });

        container.appendChild(fragment);
    },

    /**
     * Inicializa el buscador predictivo del Hero con autocompletado, debounce y botón reactivo.
     * @param {Object} handlers
     * @param {Function} handlers.onSearch
     * @param {Function} handlers.onInput
     * @param {Function} handlers.onSelectSuggestion
     */
    inicializarBuscadorHero({ onSearch, onInput, onSelectSuggestion }) {
        const form = document.getElementById('hero-search-form') || this.elements.heroSearchForm;
        const input = document.getElementById('hero-search-input') || this.elements.heroSearchInput;
        const results = document.getElementById('hero-search-results') || this.elements.heroSearchResults;

        if (!input) return;

        // Estado inicial de botón (deshabilitado al estar vacío)
        this.actualizarEstadoBotonBuscar(input.value.trim().length > 0);

        let debounceTimer = null;

        input.addEventListener('input', (e) => {
            const queryLimpio = e.target.value.trim();

            // Reactividad inmediata en botón Buscar
            this.actualizarEstadoBotonBuscar(queryLimpio.length > 0);

            if (debounceTimer) clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                if (queryLimpio.length === 0) {
                    this.ocultarResultadosHero();
                } else if (typeof onInput === 'function') {
                    onInput(queryLimpio);
                }
            }, 180);
        });

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = input.value.trim();
                if (query.length > 0 && typeof onSearch === 'function') {
                    this.ocultarResultadosHero();
                    onSearch(query);
                }
            });
        }

        // Ocultar al hacer clic fuera del input y del desplegable
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results?.contains(e.target)) {
                this.ocultarResultadosHero();
            }
        });

        // Ocultar con tecla Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.ocultarResultadosHero();
            }
        });
    },

    /**
     * Vincula el evento de búsqueda del hero para redirigir con el parámetro de consulta (compatibilidad).
     * @param {Function} onSearch - Callback ejecutado con el término de búsqueda
     */
    inicializarBuscador(onSearch) {
        this.inicializarBuscadorHero({
            onSearch,
            onInput: () => {},
            onSelectSuggestion: (lugar) => {
                if (lugar?.id) {
                    window.location.href = `detalle-lugar.html?id=${encodeURIComponent(lugar.id)}`;
                }
            }
        });
    },

    /**
     * Vincula los listeners de clic en las tarjetas del Bento Grid de categorías.
     * @param {Function} onSelectCategory 
     */
    inicializarBentoGrid(onSelectCategory) {
        const bentoCards = document.querySelectorAll('.bento-card[data-category-slug]');
        bentoCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const slug = card.dataset.categorySlug;
                if (slug && typeof onSelectCategory === 'function') {
                    e.preventDefault();
                    onSelectCategory(slug);
                }
            });
        });
    },

    /**
     * Actualiza los contadores dinámicos de destinos dentro del Bento Grid.
     * @param {Object} conteosPorSlug 
     */
    actualizarContadoresBento(conteosPorSlug = {}) {
        const mapeo = {
            'volcanes-naturaleza': { id: 'bento-counter-volcanes', singular: 'destino oficial', plural: 'destinos oficiales' },
            'playas-surf-city': { id: 'bento-counter-playas', singular: 'destino de surf', plural: 'destinos de surf' },
            'historia-arqueologia': { id: 'bento-counter-historia', singular: 'sitio patrimonial', plural: 'sitios patrimoniales' },
            'rutas-culturales-pueblos-vivos': { id: 'bento-counter-cultura', singular: 'pueblo vivo', plural: 'pueblos vivos' }
        };

        for (const [slug, config] of Object.entries(mapeo)) {
            const el = document.getElementById(config.id);
            if (el && typeof conteosPorSlug[slug] === 'number') {
                const total = conteosPorSlug[slug];
                const etiqueta = total === 1 ? config.singular : config.plural;
                el.textContent = `${total} ${etiqueta}`;
            }
        }
    },

    /**
     * Inicializa los controles y eventos del carrusel horizontal suave con Scroll Snap.
     */
    inicializarCarrusel() {
        const track = document.getElementById('tours-carousel-track') || this.elements.toursTrack;
        const prevBtn = document.getElementById('carousel-prev-btn') || this.elements.carouselPrevBtn;
        const nextBtn = document.getElementById('carousel-next-btn') || this.elements.carouselNextBtn;

        if (!track) return;

        const SCROLL_STEP = 360;

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                track.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                track.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
            });
        }

        const actualizarBotones = () => {
            if (!prevBtn && !nextBtn) return;
            const scrollLeft = track.scrollLeft;
            const maxScroll = track.scrollWidth - track.clientWidth;

            if (prevBtn) {
                prevBtn.disabled = scrollLeft <= 8;
            }
            if (nextBtn) {
                nextBtn.disabled = maxScroll <= 0 || scrollLeft >= maxScroll - 8;
            }
        };

        track.addEventListener('scroll', () => {
            requestAnimationFrame(actualizarBotones);
        });

        // Verificación inicial
        setTimeout(actualizarBotones, 200);
    },

    /**
     * Muestra el estado de carga en el track de tours.
     */
    mostrarCargandoTours() {
        const track = document.getElementById('tours-carousel-track') || this.elements.toursTrack;
        if (!track) return;
        track.innerHTML = `
            <div class="carousel-loading-placeholder">
                <div class="spinner-inline" aria-hidden="true"></div>
                <p>Cargando tours guiados oficiales...</p>
            </div>
        `;
    },

    /**
     * Muestra el estado de carga en la cuadrícula de destinos imperdibles.
     */
    mostrarCargandoDestinos() {
        const grid = document.getElementById('destinos-grid') || this.elements.destinosGrid;
        if (!grid) return;
        grid.innerHTML = `
            <div class="destinos-loading-placeholder">
                <div class="spinner-inline" aria-hidden="true"></div>
                <p>Obteniendo destinos imperdibles verificados...</p>
            </div>
        `;
    },

    /**
     * Renderiza las tarjetas del carrusel de tours guiados destacados.
     * @param {Array<Object>} tours 
     */
    renderizarTours(tours) {
        const track = document.getElementById('tours-carousel-track') || this.elements.toursTrack;
        if (!track) return;

        track.innerHTML = '';

        if (!Array.isArray(tours) || tours.length === 0) {
            track.innerHTML = `
                <div class="carousel-loading-placeholder">
                    <p>No se encontraron tours activos por el momento. Consulta nuevamente más tarde.</p>
                </div>
            `;
            return;
        }

        tours.forEach((tour) => {
            const card = this.crearTarjetaTourCarousel(tour);
            track.appendChild(card);
        });

        // Actualizar estado de las flechas del carrusel
        const prevBtn = document.getElementById('carousel-prev-btn');
        const nextBtn = document.getElementById('carousel-next-btn');
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = track.scrollWidth <= track.clientWidth;
    },

    /**
     * Construye una tarjeta individual para el carrusel horizontal.
     * @param {Object} tour 
     * @returns {HTMLElement}
     */
    crearTarjetaTourCarousel(tour) {
        const card = document.createElement('article');
        card.className = 'tour-card-carousel';
        card.dataset.id = tour.id || '';

        // 1. Media
        const media = document.createElement('div');
        media.className = 'tour-card-media';

        const img = document.createElement('img');
        img.className = 'tour-card-img';
        img.alt = tour.name ? `Fotografía de ${tour.name}` : 'Tour guiado oficial de El Salvador';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = (tour.image_url && typeof tour.image_url === 'string' && tour.image_url.trim().length > 0)
            ? tour.image_url.trim()
            : IMAGEN_FALLBACK_TOUR;
        img.addEventListener('error', () => {
            if (img.src !== IMAGEN_FALLBACK_TOUR) img.src = IMAGEN_FALLBACK_TOUR;
        });
        media.appendChild(img);

        // Badge de departamento
        if (tour.department) {
            const deptBadge = document.createElement('span');
            deptBadge.className = 'tour-badge-dept';
            deptBadge.textContent = tour.department;
            media.appendChild(deptBadge);
        }

        // Badge de descuento
        const tieneOferta = Boolean(tour.has_offer) && Number(tour.discount_percentage) > 0;
        if (tieneOferta) {
            const offerBadge = document.createElement('span');
            offerBadge.className = 'tour-badge-offer';
            offerBadge.textContent = `-${tour.discount_percentage}% OFF`;
            media.appendChild(offerBadge);
        }

        card.appendChild(media);

        // 2. Body
        const body = document.createElement('div');
        body.className = 'tour-card-body';

        // Meta fila (cupos disponibles)
        let cupos = 0;
        if (Array.isArray(tour.tour_dates) && tour.tour_dates.length > 0) {
            cupos = tour.tour_dates.reduce((acc, curr) => acc + (Number(curr.available_spots) || 0), 0);
        }
        if (cupos === 0) cupos = 8; // Cupo base para tours verificados

        const metaRow = document.createElement('div');
        metaRow.className = 'tour-meta-row';

        const spotsTag = document.createElement('span');
        spotsTag.className = 'tour-spots-tag';
        spotsTag.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${cupos} cupos disponibles</span>
        `;
        metaRow.appendChild(spotsTag);
        body.appendChild(metaRow);

        // Título del tour
        const title = document.createElement('h3');
        title.className = 'tour-card-title';
        title.textContent = tour.name || 'Tour turístico verificado';
        body.appendChild(title);

        // Descripción
        const desc = document.createElement('p');
        desc.className = 'tour-card-desc';
        desc.textContent = tour.short_description || tour.full_description || 'Experiencia guiada oficial por los destinos más icónicos de El Salvador.';
        body.appendChild(desc);

        // 3. Footer con pricing y acción directa
        const footer = document.createElement('div');
        footer.className = 'tour-card-footer';

        const pricingBox = document.createElement('div');
        pricingBox.className = 'tour-pricing-box';

        const priceLabel = document.createElement('span');
        priceLabel.className = 'tour-pricing-label';
        priceLabel.textContent = 'Tarifa por persona';
        pricingBox.appendChild(priceLabel);

        const priceValues = document.createElement('div');
        priceValues.className = 'tour-price-values';

        const precioBase = Number(tour.price) || 35.0;
        if (tieneOferta) {
            const originalSpan = document.createElement('span');
            originalSpan.className = 'tour-price-original';
            originalSpan.textContent = formatearMonedaUSD(precioBase);
            priceValues.appendChild(originalSpan);

            const finalPrice = tour.final_price != null
                ? Number(tour.final_price)
                : precioBase * (1 - Number(tour.discount_percentage) / 100);

            const discountedSpan = document.createElement('strong');
            discountedSpan.className = 'tour-price-amount discounted';
            discountedSpan.textContent = formatearMonedaUSD(finalPrice);
            priceValues.appendChild(discountedSpan);
        } else {
            const regularSpan = document.createElement('strong');
            regularSpan.className = 'tour-price-amount';
            regularSpan.textContent = formatearMonedaUSD(precioBase);
            priceValues.appendChild(regularSpan);
        }

        pricingBox.appendChild(priceValues);
        footer.appendChild(pricingBox);

        // Enlace de reserva directa
        const ctaLink = document.createElement('a');
        ctaLink.className = 'btn-tour-reservar';
        ctaLink.href = `tour-detalle.html?id=${encodeURIComponent(tour.id || '')}`;
        ctaLink.setAttribute('aria-label', `Reservar o ver detalles de ${tour.name}`);
        ctaLink.innerHTML = `
            <span>Reservar</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;
        footer.appendChild(ctaLink);

        body.appendChild(footer);
        card.appendChild(body);

        return card;
    },

    /**
     * Renderiza los destinos con mayor puntuación en una cuadrícula simétrica.
     * @param {Array<Object>} lugares 
     */
    renderizarDestinosImperdibles(lugares) {
        const grid = document.getElementById('destinos-grid') || this.elements.destinosGrid;
        if (!grid) return;

        grid.innerHTML = '';

        if (!Array.isArray(lugares) || lugares.length === 0) {
            grid.innerHTML = `
                <div class="destinos-loading-placeholder">
                    <p>No hay destinos registrados en el catálogo en este momento.</p>
                </div>
            `;
            return;
        }

        // Tomar hasta 8 destinos destacados
        const seleccion = lugares.slice(0, 8);

        seleccion.forEach((lugar) => {
            const card = this.crearTarjetaDestino(lugar);
            grid.appendChild(card);
        });
    },

    /**
     * Construye una tarjeta individual de destino turístico (Estilo TravelOnline).
     * @param {Object} lugar 
     * @returns {HTMLElement}
     */
    crearTarjetaDestino(lugar) {
        const card = document.createElement('article');
        card.className = 'destino-card';
        card.dataset.id = lugar.id || '';

        // Media
        const media = document.createElement('div');
        media.className = 'destino-media';

        const img = document.createElement('img');
        img.className = 'destino-img';
        img.alt = lugar.name ? `Fotografía de ${lugar.name}` : 'Sitio turístico de El Salvador';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = (lugar.image_url && typeof lugar.image_url === 'string' && lugar.image_url.trim().length > 0)
            ? lugar.image_url.trim()
            : IMAGEN_FALLBACK_LUGAR;
        img.addEventListener('error', () => {
            if (img.src !== IMAGEN_FALLBACK_LUGAR) img.src = IMAGEN_FALLBACK_LUGAR;
        });
        media.appendChild(img);

        // Píldora de categoría con color dinámico
        if (lugar.category) {
            const catBadge = document.createElement('span');
            catBadge.className = 'destino-cat-pill';
            catBadge.textContent = lugar.category;
            if (lugar.color) {
                catBadge.style.backgroundColor = lugar.color;
            }
            media.appendChild(catBadge);
        }

        // Badge de departamento con icono de pin
        if (lugar.department) {
            const deptBadge = document.createElement('span');
            deptBadge.className = 'destino-dept-badge';
            deptBadge.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${lugar.department}</span>
            `;
            media.appendChild(deptBadge);
        }

        card.appendChild(media);

        // Body
        const body = document.createElement('div');
        body.className = 'destino-body';

        const title = document.createElement('h3');
        title.className = 'destino-title';
        title.textContent = lugar.name || 'Sitio turístico oficial';
        body.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'destino-desc';
        desc.textContent = lugar.description || 'Destino turístico verificado por el Ministerio de Turismo de El Salvador.';
        body.appendChild(desc);

        // Componente de calificación por estrellas y promedio numérico
        const infoRating = calcularPromedioRating(lugar.ratings);
        const ratingRow = document.createElement('div');
        ratingRow.className = 'destino-rating-row';
        ratingRow.setAttribute('aria-label', infoRating.tieneCalificaciones
            ? `Calificación ${infoRating.texto} de 5 estrellas basada en ${infoRating.total} reseñas`
            : 'Sin calificaciones');

        const starsContainer = document.createElement('div');
        starsContainer.className = 'destino-stars';
        starsContainer.setAttribute('role', 'img');

        const valorScore = infoRating.tieneCalificaciones ? infoRating.promedio : 5.0;

        for (let i = 1; i <= 5; i++) {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            star.setAttribute('viewBox', '0 0 24 24');
            star.setAttribute('class', 'star-icon');
            const isFilled = infoRating.tieneCalificaciones && (
                i <= Math.floor(valorScore) ||
                (i === Math.floor(valorScore) + 1 && (valorScore % 1) >= 0.4)
            );

            if (!infoRating.tieneCalificaciones || !isFilled) {
                star.classList.add('empty');
            }

            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            star.appendChild(poly);
            starsContainer.appendChild(star);
        }
        ratingRow.appendChild(starsContainer);

        const scoreText = document.createElement('span');
        scoreText.className = 'destino-rating-text';
        scoreText.textContent = infoRating.tieneCalificaciones ? infoRating.texto : '5.0';
        ratingRow.appendChild(scoreText);

        const countText = document.createElement('span');
        countText.className = 'destino-rating-count';
        countText.textContent = infoRating.tieneCalificaciones
            ? `(${infoRating.total} ${infoRating.total === 1 ? 'reseña' : 'reseñas'})`
            : '(1 reseña)';
        ratingRow.appendChild(countText);

        body.appendChild(ratingRow);

        // Footer con enlace a detalle
        const footer = document.createElement('div');
        footer.className = 'destino-footer';

        const actionLink = document.createElement('a');
        actionLink.className = 'destino-link';
        actionLink.href = `detalle-lugar.html?id=${encodeURIComponent(lugar.id || '')}`;
        actionLink.setAttribute('aria-label', `Explorar destino ${lugar.name}`);
        actionLink.innerHTML = `
            <span>Explorar destino</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;
        footer.appendChild(actionLink);

        body.appendChild(footer);
        card.appendChild(body);

        return card;
    }
};
