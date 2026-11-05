/**
 * @file LugaresView.js
 * Vista (patrón MVC) del catálogo de sitios turísticos (lugares-turisticos.html).
 *
 * Responsabilidades:
 *  - Dibujar las tarjetas de lugares (imagen, categoría, calificación, descripción).
 *  - Mostrar los estados de la pantalla: cargando, error, sin resultados y listado.
 *  - Dibujar y actualizar los filtros por categoría y por calificación mínima.
 *
 * La vista no consulta datos: recibe la información del controlador
 * (LugaresController) y le devuelve las acciones del usuario mediante callbacks.
 */
import { coincideCategoria, generarSlug } from '../utils/textUtils.js';
import { calcularPromedioRating } from '../models/CalificacionesModel.js';

/** Imagen de respaldo que se usa cuando el lugar no tiene foto o la URL falla al cargar. */
const IMAGEN_FALLBACK = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80';

/**
 * Crea la tarjeta (artículo HTML) de un sitio turístico.
 * La tarjeta es accesible por teclado: se activa con clic, Enter o Espacio.
 *
 * @param {Object} lugar - Datos del lugar: id, name, description, image_url, category, color y ratings.
 * @param {function(string|number): void} onSelectLugar - Se ejecuta con el id del lugar cuando el usuario lo selecciona.
 * @returns {HTMLElement} Elemento <article> listo para insertarse en la grilla.
 */
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

    // Zona de imagen: foto del lugar y etiqueta de categoría (con su color si existe).
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

    // Cuerpo de la tarjeta: título, calificación y descripción.
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

    // Dibuja 5 estrellas. Una estrella se llena si i <= parte entera del promedio;
    // la siguiente también se llena cuando la parte decimal del promedio es >= 0.4.
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

    // Pie de la tarjeta: texto "Ver detalles" y flecha (SVG).
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

/**
 * Objeto de vista del catálogo de lugares.
 * Agrupa las referencias al DOM y los métodos que modifican la pantalla.
 */
export const LugaresView = {
    /** Referencias a los nodos del DOM de lugares-turisticos.html (se obtienen al cargar el módulo). */
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

    /**
     * Dibuja la grilla de lugares y actualiza el contador de resultados.
     * Si la lista está vacía muestra el estado "sin resultados".
     *
     * @param {Array<Object>} lista - Lugares a mostrar (ya filtrados).
     * @param {number} totalLugares - Total de lugares sin filtrar; se usa en el texto del contador.
     * @param {function(string|number): void} onSelectLugar - Callback al seleccionar una tarjeta.
     */
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

    /**
     * Muestra el indicador de carga y oculta el resto de estados.
     */
    mostrarCargando() {
        const { stateLoading, stateError, stateEmpty, placesGrid, resultsCounter } = this.elements;
        stateLoading?.classList.remove('hidden');
        stateError?.classList.add('hidden');
        stateEmpty?.classList.add('hidden');
        placesGrid?.classList.add('hidden');
        if (resultsCounter) resultsCounter.textContent = 'Cargando sitios turísticos oficiales...';
    },

    /**
     * Muestra el estado de error y, si se indica, su mensaje.
     *
     * @param {string} [mensaje] - Texto explicativo del error para el usuario.
     */
    mostrarError(mensaje) {
        const { stateLoading, stateError, stateErrorMessage, stateEmpty, placesGrid, resultsCounter } = this.elements;
        stateLoading?.classList.add('hidden');
        placesGrid?.classList.add('hidden');
        stateEmpty?.classList.add('hidden');
        stateError?.classList.remove('hidden');
        if (stateErrorMessage && mensaje) stateErrorMessage.textContent = mensaje;
        if (resultsCounter) resultsCounter.textContent = 'Error al consultar datos';
    },

    /**
     * Muestra el estado "sin resultados" y actualiza el contador.
     *
     * @param {number} [totalLugares=0] - Total de lugares existentes (0 = no hay datos; mayor a 0 = los filtros no coinciden).
     */
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

    /**
     * Construye las píldoras de filtro por categoría, conservando el botón "Todas".
     * Cada categoría se dibuja como botón de radio con su color y su slug.
     *
     * @param {Array<{name: string, slug: string, color: string}>|Map<string, string>} categorias - Categorías disponibles. Si es un Map, sus claves son los nombres y sus valores los colores.
     * @param {string} categoriaActiva - Slug de la categoría seleccionada ("todos" si no hay filtro).
     * @param {function(string, HTMLElement, string): void} onSelectCategoria - Recibe slug, botón pulsado y nombre de la categoría.
     */
    inicializarFiltrosCategorias(categorias, categoriaActiva, onSelectCategoria) {
        const { categoryPillsContainer } = this.elements;
        if (!categoryPillsContainer) return;

        // Elimina las píldoras anteriores; solo se conserva la de "Todas".
        categoryPillsContainer.querySelectorAll('.pill-btn').forEach(button => {
            const categoria = button.dataset.category || button.dataset.categoria;
            if (categoria !== 'todos' && categoria !== 'todas') button.remove();
        });

        // Configura el botón "Todas": texto, estado activo y manejador de clic.
        const btnTodos = categoryPillsContainer.querySelector('[data-category="todos"], [data-categoria="todos"]');
        const esTodos = !categoriaActiva || categoriaActiva === 'todos' || categoriaActiva === 'todas';

        if (btnTodos) {
            btnTodos.textContent = 'Todas';
            btnTodos.dataset.category = 'todos';
            btnTodos.dataset.categoria = 'todos';
            btnTodos.classList.toggle('active', esTodos);
            btnTodos.setAttribute('aria-checked', esTodos ? 'true' : 'false');
            btnTodos.onclick = () => onSelectCategoria('todos', btnTodos, 'todos');
        }

        // Normalizar entrada (Array de objetos {name, slug, color} o Map)
        let listaCategorias = [];
        if (Array.isArray(categorias)) {
            listaCategorias = categorias;
        } else if (categorias instanceof Map) {
            categorias.forEach((color, name) => {
                listaCategorias.push({
                    name,
                    slug: generarSlug(name),
                    color
                });
            });
        }

        let hayCoincidenciaActiva = false;

        // Crea una píldora por cada categoría y marca como activa la que coincide con el filtro.
        listaCategorias.forEach(cat => {
            const nombre = cat.name || '';
            const slug = cat.slug || generarSlug(nombre);
            const color = cat.color || null;

            const esActivo = !esTodos && (
                slug === categoriaActiva ||
                coincideCategoria(nombre, categoriaActiva) ||
                coincideCategoria(slug, categoriaActiva)
            );

            if (esActivo) hayCoincidenciaActiva = true;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = `pill-btn ${esActivo ? 'active' : ''}`;
            button.dataset.category = slug;
            button.dataset.categoria = slug;
            button.dataset.slug = slug;
            button.dataset.name = nombre;
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', esActivo ? 'true' : 'false');

            if (color) {
                const dot = document.createElement('span');
                dot.className = 'pill-dot';
                dot.style.color = color;
                button.appendChild(dot);
            }

            const label = document.createElement('span');
            label.textContent = nombre;
            button.appendChild(label);
            button.addEventListener('click', () => onSelectCategoria(slug, button, nombre));
            categoryPillsContainer.appendChild(button);
        });

        if (btnTodos) {
            const marcarTodos = esTodos || !hayCoincidenciaActiva;
            btnTodos.classList.toggle('active', marcarTodos);
            btnTodos.setAttribute('aria-checked', marcarTodos ? 'true' : 'false');
        }
    },

    /**
     * Marca visualmente (clase "active" y aria-checked) la píldora de categoría activa.
     *
     * @param {string} categoriaActiva - Slug de la categoría seleccionada ("todos" para ninguna).
     * @param {HTMLElement|null} [btnSeleccionado] - Botón pulsado; si se indica, tiene prioridad sobre la comparación por slug.
     */
    actualizarCategoriaActiva(categoriaActiva, btnSeleccionado = null) {
        const { categoryPillsContainer } = this.elements;
        const esTodos = !categoriaActiva || categoriaActiva === 'todos' || categoriaActiva === 'todas';

        categoryPillsContainer?.querySelectorAll('.pill-btn').forEach(button => {
            const cat = button.dataset.category || button.dataset.categoria || '';
            let esActivo = false;

            if (btnSeleccionado) {
                esActivo = button === btnSeleccionado;
            } else if (esTodos) {
                esActivo = cat === 'todos' || cat === 'todas';
            } else {
                esActivo = cat === categoriaActiva ||
                    coincideCategoria(cat, categoriaActiva) ||
                    coincideCategoria(button.dataset.name || '', categoriaActiva);
            }

            button.classList.toggle('active', esActivo);
            button.setAttribute('aria-checked', esActivo ? 'true' : 'false');
        });
    },

    /**
     * Marca como activa la píldora del filtro de calificación mínima.
     *
     * @param {number|string} minRatingActivo - Calificación mínima seleccionada (0 = sin filtro).
     */
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
