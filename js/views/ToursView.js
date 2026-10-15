import { formatearMonedaUSD } from '../models/ToursModel.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

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
    card.appendChild(footer);

    return card;
}

export const ToursView = {
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

    getFiltros() {
        const { filterDate, filterDepartment, filterOffer, filterPlace } = this.elements;
        return {
            fecha: filterDate?.value.trim() || '',
            departamento: filterDepartment?.value.trim() || '',
            oferta: filterOffer?.value.trim() || '',
            lugar: filterPlace?.value.trim() || ''
        };
    },

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

    mostrarCargando() {
        const { stateLoading, stateNoResults, toursGrid, resultsCounter } = this.elements;
        stateLoading?.classList.remove('hidden');
        stateNoResults?.classList.add('hidden');
        toursGrid?.classList.add('hidden');
        if (resultsCounter) resultsCounter.textContent = 'Cargando catálogo de tours...';
    },

    mostrarSinDatos() {
        const { stateLoading, stateNoResults, noResultsMessage, toursGrid, resultsCounter } = this.elements;
        stateLoading?.classList.add('hidden');
        toursGrid?.classList.add('hidden');
        stateNoResults?.classList.remove('hidden');
        if (noResultsMessage) noResultsMessage.textContent = 'No hay datos disponibles para mostrar';
        if (resultsCounter) resultsCounter.textContent = '0 tours encontrados';
    },

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