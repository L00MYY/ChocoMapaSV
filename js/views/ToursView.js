/**
 * @file ToursView.js
 * Vista (patrón MVC) del catálogo de tours oficiales (tours.html).
 *
 * Responsabilidades:
 *  - Dibujar las tarjetas de tours con su precio, oferta y departamento.
 *  - Llenar los selectores de filtro (departamento y lugar) y leer sus valores.
 *  - Mostrar los estados de la pantalla: cargando, sin datos y listado.
 *
 * La vista no consulta datos: los recibe del controlador (ToursController).
 */
import { formatearMonedaUSD } from '../models/ToursModel.js';

/** Imagen de respaldo cuando el tour no tiene foto o la URL falla al cargar. */
const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

/**
 * Crea la tarjeta (artículo HTML) de un tour.
 * Es accesible por teclado: se activa con clic, Enter o Espacio.
 *
 * @param {Object} tour - Datos del tour: id, name, image_url, department, short_description, guide_name, price, has_offer, discount_percentage y final_price.
 * @param {function(string|number): void} onSelectTour - Se ejecuta con el id del tour al seleccionarlo.
 * @returns {HTMLElement} Elemento <article> listo para insertarse en la grilla.
 */
function crearTarjetaTour(tour, onSelectTour) {
    const card = document.createElement('article');
    card.className = 'tour-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ver detalles completos del tour ${tour.name || ''}`);
    card.dataset.id = tour.id;
    card.addEventListener('click', () => onSelectTour(tour.id));
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectTour(tour.id);
        }
    });

    const media = document.createElement('div');
    media.className = 'tour-card-media';

    const image = document.createElement('img');
    image.className = 'tour-card-image';
    image.alt = `Fotografía de ${tour.name || 'Tour oficial'}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = tour.image_url?.trim() || IMAGEN_FALLBACK;
    image.addEventListener('error', () => {
        if (image.src !== IMAGEN_FALLBACK) image.src = IMAGEN_FALLBACK;
    });
    media.appendChild(image);

    // Hay oferta solo si has_offer es true y el porcentaje de descuento es mayor a 0.
    const conOferta = tour.has_offer === true && Number(tour.discount_percentage) > 0;
    if (conOferta) {
        const badge = document.createElement('span');
        badge.className = 'tour-card-discount-badge';
        badge.textContent = `-${tour.discount_percentage}% Descuento`;
        media.appendChild(badge);
    }
    card.appendChild(media);

    const body = document.createElement('div');
    body.className = 'tour-card-body';
    const header = document.createElement('div');
    header.className = 'tour-card-header';

    const title = document.createElement('h3');
    title.className = 'tour-card-title';
    title.textContent = tour.name || 'Tour turístico';
    header.appendChild(title);

    if (tour.department) {
        const department = document.createElement('span');
        department.className = 'tour-card-dept';
        department.textContent = tour.department;
        header.appendChild(department);
    }
    body.appendChild(header);

    const description = document.createElement('p');
    description.className = 'tour-card-description';
    description.textContent = tour.short_description || 'Sin descripción disponible para este tour.';
    body.appendChild(description);

    const meta = document.createElement('div');
    meta.className = 'tour-card-meta';
    const guide = document.createElement('div');
    guide.className = 'tour-card-guide';
    guide.textContent = `Guía: ${tour.guide_name || 'Certificado'}`;
    meta.appendChild(guide);

    const pricing = document.createElement('div');
    pricing.className = 'tour-card-pricing';
    const priceLabel = document.createElement('span');
    priceLabel.className = 'price-label';
    priceLabel.textContent = 'Precio';
    pricing.appendChild(priceLabel);

    const priceValues = document.createElement('div');
    priceValues.className = 'price-values';
    if (conOferta) {
        const original = document.createElement('span');
        original.className = 'price-original';
        original.textContent = formatearMonedaUSD(tour.price);
        priceValues.appendChild(original);

        const discounted = document.createElement('strong');
        discounted.className = 'price-amount price-discounted';
        // Usa el precio final que trae el tour; si no existe, lo calcula aplicando el descuento.
        const finalPrice = tour.final_price ?? (Number(tour.price) * (1 - Number(tour.discount_percentage) / 100));
        discounted.textContent = formatearMonedaUSD(finalPrice);
        priceValues.appendChild(discounted);
    } else {
        const regular = document.createElement('strong');
        regular.className = 'price-amount';
        regular.textContent = formatearMonedaUSD(tour.price);
        priceValues.appendChild(regular);
    }
    pricing.appendChild(priceValues);
    meta.appendChild(pricing);
    body.appendChild(meta);
    card.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'tour-card-footer';
    const action = document.createElement('span');
    action.className = 'tour-card-action';
    action.textContent = 'Ver detalles y fechas';
    footer.appendChild(action);

    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.setAttribute('fill', 'none');
    arrowSvg.setAttribute('stroke', 'currentColor');
    arrowSvg.setAttribute('stroke-width', '2');
    arrowSvg.setAttribute('stroke-linecap', 'round');
    arrowSvg.setAttribute('stroke-linejoin', 'round');
    arrowSvg.setAttribute('width', '16');
    arrowSvg.setAttribute('height', '16');
    arrowSvg.setAttribute('aria-hidden', 'true');
    arrowSvg.classList.add('place-card-arrow');
    arrowSvg.classList.add('tour-card-arrow');

    const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrowLine.setAttribute('x1', '5');
    arrowLine.setAttribute('y1', '12');
    arrowLine.setAttribute('x2', '19');
    arrowLine.setAttribute('y2', '12');

    const arrowPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrowPoly.setAttribute('points', '12 5 19 12 12 19');

    arrowSvg.appendChild(arrowLine);
    arrowSvg.appendChild(arrowPoly);
    footer.appendChild(arrowSvg);

    card.appendChild(footer);

    return card;
}

/**
 * Objeto de vista del catálogo de tours: referencias al DOM y métodos que modifican la pantalla.
 */
export const ToursView = {
    /** Referencias a los nodos del DOM de tours.html (filtros, contador, estados y grilla). */
    elements: {
        filterDate: document.getElementById('filter-date'),
        filterDepartment: document.getElementById('filter-department'),
        filterOffer: document.getElementById('filter-offer'),
        filterPlace: document.getElementById('filter-place'),
        btnClearFilters: document.getElementById('btn-clear-filters'),
        btnResetEmpty: document.getElementById('btn-reset-empty'),
        resultsCounter: document.getElementById('results-counter'),
        stateLoading: document.getElementById('state-loading'),
        stateNoResults: document.getElementById('state-no-results'),
        noResultsMessage: document.getElementById('no-results-message'),
        toursGrid: document.getElementById('tours-grid')
    },

    /**
     * Lee los valores actuales de los filtros de la pantalla.
     *
     * @returns {{fecha: string, departamento: string, oferta: string, lugar: string}} Valores ya sin espacios; cadena vacía si el filtro no está aplicado.
     */
    getFiltros() {
        const { filterDate, filterDepartment, filterOffer, filterPlace } = this.elements;
        return {
            fecha: filterDate?.value.trim() || '',
            departamento: filterDepartment?.value.trim() || '',
            oferta: filterOffer?.value.trim() || '',
            lugar: filterPlace?.value.trim() || ''
        };
    },

    /**
     * Llena los selectores de departamento y de lugar.
     * Los departamentos salen de los tours (sin repetir y ordenados); los lugares, del catálogo de sitios.
     *
     * @param {Array<Object>} tours - Tours de los que se extraen los departamentos.
     * @param {Array<Object>} lugares - Sitios turísticos para el selector "Todos los lugares".
     */
    poblarSelectores(tours, lugares) {
        const { filterDepartment, filterPlace } = this.elements;
        if (filterDepartment) {
            filterDepartment.replaceChildren(new Option('Todos los departamentos', ''));
            const departamentos = new Set(tours.map(tour => tour.department?.trim()).filter(Boolean));
            Array.from(departamentos).sort().forEach(departamento => {
                filterDepartment.appendChild(new Option(departamento, departamento));
            });
        }

        if (filterPlace) {
            filterPlace.replaceChildren(new Option('Todos los lugares', ''));
            lugares.forEach(lugar => {
                const nombre = lugar.name ? `${lugar.name} (${lugar.department || 'El Salvador'})` : 'Sitio turístico';
                filterPlace.appendChild(new Option(nombre, lugar.id));
            });
        }
    },

    /**
     * Muestra el indicador de carga y oculta la grilla y el estado sin resultados.
     */
    mostrarCargando() {
        const { stateLoading, stateNoResults, toursGrid, resultsCounter } = this.elements;
        stateLoading?.classList.remove('hidden');
        stateNoResults?.classList.add('hidden');
        toursGrid?.classList.add('hidden');
        if (resultsCounter) resultsCounter.textContent = 'Cargando catálogo de tours...';
    },

    /**
     * Muestra el estado "No hay datos disponibles" y deja el contador en 0.
     */
    mostrarSinDatos() {
        const { stateLoading, stateNoResults, noResultsMessage, toursGrid, resultsCounter } = this.elements;
        stateLoading?.classList.add('hidden');
        toursGrid?.classList.add('hidden');
        stateNoResults?.classList.remove('hidden');
        if (noResultsMessage) noResultsMessage.textContent = 'No hay datos disponibles para mostrar';
        if (resultsCounter) resultsCounter.textContent = '0 tours encontrados';
    },

    /**
     * Dibuja la grilla de tours y actualiza el contador de resultados.
     * Si la lista está vacía, distingue entre "no hay datos" (total = 0) y "ningún tour coincide con los filtros".
     *
     * @param {Array<Object>} lista - Tours a mostrar (ya filtrados).
     * @param {number} total - Total de tours sin filtrar.
     * @param {function(string|number): void} onSelectTour - Callback al seleccionar una tarjeta.
     */
    renderizarTours(lista, total, onSelectTour) {
        const { stateNoResults, noResultsMessage, toursGrid, resultsCounter } = this.elements;
        if (!toursGrid) return;
        toursGrid.replaceChildren();

        if (resultsCounter) {
            resultsCounter.textContent = lista.length === 1
                ? 'Mostrando 1 tour oficial'
                : `Mostrando ${lista.length} de ${total} tours oficiales`;
        }

        if (lista.length === 0) {
            toursGrid.classList.add('hidden');
            stateNoResults?.classList.remove('hidden');
            if (noResultsMessage) {
                noResultsMessage.textContent = total === 0
                    ? 'No hay datos disponibles para mostrar'
                    : 'No hay tours que coincidan con los filtros seleccionados';
            }
            return;
        }

        stateNoResults?.classList.add('hidden');
        toursGrid.classList.remove('hidden');
        const fragment = document.createDocumentFragment();
        lista.forEach(tour => fragment.appendChild(crearTarjetaTour(tour, onSelectTour)));
        toursGrid.appendChild(fragment);
    }
};