import { normalizarTexto } from '../utils/textUtils.js';
import { calcularPromedioRating } from '../models/CalificacionesModel.js';

const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

function crearTarjetaLugar(lugar, onSelectLugar) {
    const card = document.createElement('article');
    card.className = 'place-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ver información completa de ${lugar.name || 'sitio turístico'}`);
    card.dataset.id = lugar.id;

    card.addEventListener('click', () => onSelectLugar(lugar.id));
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectLugar(lugar.id);
        }
    });

    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'place-card-media';

    const img = document.createElement('img');
    img.className = 'place-card-image';
    img.alt = lugar.name ? `Fotografía de ${lugar.name}` : 'Fotografía del sitio turístico';
    img.loading = 'lazy';
    img.decoding = 'async';

    const urlOriginal = (lugar.image_url && typeof lugar.image_url === 'string' && lugar.image_url.trim().length > 0)
        ? lugar.image_url.trim()
        : IMAGEN_FALLBACK;

    img.src = urlOriginal;
    img.addEventListener('error', () => {
        if (img.src !== IMAGEN_FALLBACK) {
            img.src = IMAGEN_FALLBACK;
        }
    });
    mediaContainer.appendChild(img);

    if (lugar.category && typeof lugar.category === 'string') {
        const badge = document.createElement('span');
        badge.className = 'place-card-badge';
        badge.textContent = lugar.category;

        if (lugar.color && typeof lugar.color === 'string') {
            badge.style.backgroundColor = lugar.color;
        }

        mediaContainer.appendChild(badge);
    }

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'place-card-body';

    const title = document.createElement('h3');
    title.className = 'place-card-title';
    title.textContent = lugar.name || 'Sitio turístico sin nombre registrado';

    // Componente de calificación por estrellas y promedio (CA-02)
    const infoRating = calcularPromedioRating(lugar.ratings);
    const ratingStrip = document.createElement('div');
    ratingStrip.className = 'place-card-rating';
    ratingStrip.setAttribute('aria-label', infoRating.tieneCalificaciones
        ? `Calificación ${infoRating.texto} de 5 estrellas basada en ${infoRating.total} reseñas`
        : 'Sin calificaciones');

    const starsGraphic = document.createElement('div');
    starsGraphic.className = 'place-card-stars';
    starsGraphic.setAttribute('role', 'img');

    for (let i = 1; i <= 5; i++) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        star.setAttribute('viewBox', '0 0 24 24');
        star.setAttribute('class', 'place-star-icon');
        const isFilled = infoRating.tieneCalificaciones && (
            i <= Math.floor(infoRating.promedio) ||
            (i === Math.floor(infoRating.promedio) + 1 && (infoRating.promedio % 1) >= 0.4)
        );
        if (!isFilled) {
            star.classList.add('empty');
        }
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
        star.appendChild(poly);
        starsGraphic.appendChild(star);
    }

    const ratingLabel = document.createElement('span');
    ratingLabel.className = 'place-card-rating-text';
    if (infoRating.tieneCalificaciones) {
        ratingLabel.textContent = `${infoRating.texto} (${infoRating.total} ${infoRating.total === 1 ? 'reseña' : 'reseñas'})`;
    } else {
        ratingLabel.textContent = 'Sin calificaciones';
    }

    ratingStrip.appendChild(starsGraphic);
    ratingStrip.appendChild(ratingLabel);

    const description = document.createElement('p');
    description.className = 'place-card-description';
    description.textContent = lugar.description || 'No hay descripción disponible actualmente para este sitio.';

    bodyContainer.appendChild(title);
    bodyContainer.appendChild(ratingStrip);
    bodyContainer.appendChild(description);

    const footerContainer = document.createElement('div');
    footerContainer.className = 'place-card-footer';

    const actionText = document.createElement('span');
    actionText.className = 'place-card-action';
    actionText.textContent = 'Ver detalles';

    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('class', 'place-card-arrow');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');
    iconSvg.setAttribute('aria-hidden', 'true');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5');
    line.setAttribute('y1', '12');
    line.setAttribute('x2', '19');
    line.setAttribute('y2', '12');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '12 5 19 12 12 19');

    iconSvg.appendChild(line);
    iconSvg.appendChild(polyline);
    footerContainer.appendChild(actionText);
    footerContainer.appendChild(iconSvg);

    card.appendChild(mediaContainer);
    card.appendChild(bodyContainer);
    card.appendChild(footerContainer);

    return card;
}

export const LugaresView = {
    elements: {
        stateLoading: document.getElementById('state-loading'),
        stateError: document.getElementById('state-error'),
        stateErrorMessage: document.getElementById('state-error-message'),
        stateEmpty: document.getElementById('state-empty'),
        placesGrid: document.getElementById('places-grid'),
        searchInput: document.getElementById('search-input'),
        searchClearBtn: document.getElementById('search-clear-btn'),
        categoryPillsContainer: document.getElementById('category-pills'),
        ratingPillsContainer: document.getElementById('rating-pills'),
        resultsCounter: document.getElementById('results-counter'),
        btnRetry: document.getElementById('btn-retry'),
        btnResetFilters: document.getElementById('btn-reset-filters')
    },

    renderizarGridLugares(lista, totalLugares, onSelectLugar) {
        const { placesGrid, stateLoading, stateError, stateEmpty, resultsCounter } = this.elements;
        if (!placesGrid) return;

        placesGrid.replaceChildren();
        if (resultsCounter) {
            if (totalLugares === 0) {
                resultsCounter.textContent = 'No hay sitios turísticos disponibles';
            } else if (lista.length === totalLugares) {
                resultsCounter.textContent = `Mostrando ${totalLugares} de ${totalLugares} sitios turísticos oficiales`;
            } else {
                resultsCounter.textContent = `Mostrando ${lista.length} de ${totalLugares} sitios turísticos`;
            }
        }

        stateLoading?.classList.add('hidden');
        stateError?.classList.add('hidden');

        if (lista.length === 0) {
            placesGrid.classList.add('hidden');
            stateEmpty?.classList.remove('hidden');
            return;
        }

        stateEmpty?.classList.add('hidden');
        placesGrid.classList.remove('hidden');

        const fragment = document.createDocumentFragment();
        lista.forEach(lugar => fragment.appendChild(crearTarjetaLugar(lugar, onSelectLugar)));
        placesGrid.appendChild(fragment);
    },

    mostrarCargando() {
        const { stateLoading, stateError, stateEmpty, placesGrid, resultsCounter } = this.elements;
        stateLoading?.classList.remove('hidden');
        stateError?.classList.add('hidden');
        stateEmpty?.classList.add('hidden');
        placesGrid?.classList.add('hidden');
        if (resultsCounter) resultsCounter.textContent = 'Cargando sitios turísticos oficiales...';
    },

    mostrarError(mensaje) {
        const { stateLoading, stateError, stateErrorMessage, stateEmpty, placesGrid, resultsCounter } = this.elements;
        stateLoading?.classList.add('hidden');
        placesGrid?.classList.add('hidden');
        stateEmpty?.classList.add('hidden');
        stateError?.classList.remove('hidden');
        if (stateErrorMessage && mensaje) stateErrorMessage.textContent = mensaje;
        if (resultsCounter) resultsCounter.textContent = 'Error al consultar datos';
    },

    mostrarVacio(totalLugares = 0) {
        const { stateLoading, stateError, stateEmpty, placesGrid, resultsCounter } = this.elements;
        stateLoading?.classList.add('hidden');
        stateError?.classList.add('hidden');
        placesGrid?.classList.add('hidden');
        stateEmpty?.classList.remove('hidden');
        if (resultsCounter) {
            resultsCounter.textContent = totalLugares === 0
                ? 'No hay sitios turísticos disponibles'
                : `Mostrando 0 de ${totalLugares} sitios turísticos`;
        }
    },

    inicializarFiltrosCategorias(categoriasMap, categoriaActiva, onSelectCategoria) {
        const { categoryPillsContainer } = this.elements;
        if (!categoryPillsContainer) return;

        categoryPillsContainer.querySelectorAll('.pill-btn').forEach(button => {
            const categoria = button.dataset.category || button.dataset.categoria;
            if (categoria !== 'todos') button.remove();
        });

        const btnTodos = categoryPillsContainer.querySelector('[data-category="todos"], [data-categoria="todos"]');
        if (btnTodos) {
            const esActivo = categoriaActiva === 'todos';
            btnTodos.classList.toggle('active', esActivo);
            btnTodos.setAttribute('aria-checked', esActivo ? 'true' : 'false');
            btnTodos.onclick = () => onSelectCategoria('todos', btnTodos, 'todos');
        }

        categoriasMap.forEach((color, categoria) => {
            const categoriaNormalizada = normalizarTexto(categoria);
            const esActivo = categoriaActiva === categoriaNormalizada;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `pill-btn ${esActivo ? 'active' : ''}`;
            button.dataset.category = categoriaNormalizada;
            button.dataset.categoria = categoriaNormalizada;
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', esActivo ? 'true' : 'false');

            if (color) {
                const dot = document.createElement('span');
                dot.className = 'pill-dot';
                dot.style.color = color;
                button.appendChild(dot);
            }

            const label = document.createElement('span');
            label.textContent = categoria;
            button.appendChild(label);
            button.addEventListener('click', () => onSelectCategoria(categoriaNormalizada, button, categoria.toLowerCase()));
            categoryPillsContainer.appendChild(button);
        });
    },

    actualizarCategoriaActiva(categoriaActiva, btnSeleccionado = null) {
        const { categoryPillsContainer } = this.elements;
        categoryPillsContainer?.querySelectorAll('.pill-btn').forEach(button => {
            const categoria = button.dataset.category || button.dataset.categoria || '';
            const esActivo = btnSeleccionado
                ? button === btnSeleccionado
                : categoria === categoriaActiva;
            button.classList.toggle('active', esActivo);
            button.setAttribute('aria-checked', esActivo ? 'true' : 'false');
        });
    },

    actualizarRatingActivo(minRatingActivo) {
        const { ratingPillsContainer } = this.elements;
        const valor = String(minRatingActivo || 0);
        ratingPillsContainer?.querySelectorAll('.rating-pill-btn').forEach(btn => {
            const ratingValor = btn.dataset.rating || '0';
            const esActivo = ratingValor === valor;
            btn.classList.toggle('active', esActivo);
            btn.setAttribute('aria-checked', esActivo ? 'true' : 'false');
        });
    }
};